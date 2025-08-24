import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unifiedAIClient } from "@/lib/ai/unified-client";
import { generateChartData } from "@/app/api/charts/route";
import { generateProsConsAnalysis } from "@/app/api/proscons/route";
import { performWebSearch } from "@/app/api/search/playwright/route";
import type {
  AgentResponse,
  ValidationResult,
  AgentConfig,
  AIProvider,
} from "@/lib/ai/unified-client";

// Choose AI provider based on environment variable
const AI_PROVIDER = (process.env.AI_PROVIDER || "groq") as AIProvider;

interface ProcessRequest {
  query: string;
  selectedAgents?: string[];
  enabledSystemAgents?: string[];
  sessionId?: string;
}

interface StreamEvent {
  type:
    | "node_added"
    | "node_updated"
    | "agent_processing"
    | "agent_response"
    | "validation_start"
    | "validation_result"
    | "complete"
    | "error";
  data: any;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let user = null;
    let authError = null;

    // Try to get user from cookies first (server-side auth)
    try {
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    } catch (cookieError) {
      // If cookie auth fails, try Bearer token
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data, error } = await supabase.auth.getUser(token);
        user = data.user;
        authError = error;
      }
    }

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      query,
      selectedAgents,
      enabledSystemAgents,
      sessionId,
    }: ProcessRequest = await request.json();

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: StreamEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        };

        try {
          console.log(
            "Processing streaming query for user:",
            user.id,
            "Query:",
            query.substring(0, 50)
          );

          // Step 1: Send initial setup event
          sendEvent({
            type: "node_added",
            data: {
              id: "start",
              type: "question",
              position: { x: 400, y: 50 },
              data: {
                label: "Processing Query",
                question: query,
                status: "processing",
              },
            },
            timestamp: new Date().toISOString(),
          });

          // Step 2: Get available agents
          let agents = [];
          if (selectedAgents && selectedAgents.length > 0) {
            const { data: selectedAgentData } = await supabase
              .from("agents")
              .select("*")
              .in("id", selectedAgents);
            agents = selectedAgentData || [];
          } else {
            const { data: defaultAgents } = await supabase
              .from("agents")
              .select("*")
              .eq("status", "active")
              .limit(3);
            agents = defaultAgents || [];
          }

          if (agents.length === 0) {
            sendEvent({
              type: "error",
              data: { error: "No active agents available" },
              timestamp: new Date().toISOString(),
            });
            controller.close();
            return;
          }

          // Step 3: Add distributor node
          sendEvent({
            type: "node_added",
            data: {
              id: "distributor",
              type: "debate",
              position: { x: 400, y: 150 },
              data: {
                topic: "Task Distribution",
                status: "active",
                rounds: 1,
                participants: agents.map((a: any) => a.name),
              },
            },
            timestamp: new Date().toISOString(),
          });

          // Initialize system agent data variables
          let searchEngineData: any = null;
          let chartAgentData: any = null;
          let prosConsAgentData: any = null;

          // Step 3.5: Add search engine node if enabled
          if (enabledSystemAgents?.includes("search-engine")) {
            sendEvent({
              type: "node_added",
              data: {
                id: "search-engine",
                type: "searchEngine",
                position: { x: 600, y: 150 },
                data: {
                  query: query,
                  results: [],
                  timestamp: new Date().toISOString(),
                  isLoading: true,
                },
              },
              timestamp: new Date().toISOString(),
            });

            // Process search engine request
            try {
              console.log(
                "Flow stream - Performing web search directly for query:",
                query
              );

              // Call search function directly
              const searchData = await performWebSearch(query);

              if (searchData.success) {
                searchEngineData = searchData; // Store for validator

                // Update search engine node with results
                sendEvent({
                  type: "node_updated",
                  data: {
                    id: "search-engine",
                    type: "searchEngine",
                    position: { x: 600, y: 150 },
                    data: {
                      query: query,
                      results: searchData.results || [],
                      timestamp: new Date().toISOString(),
                      totalResults: searchData.totalResults,
                      processingTime: searchData.processingTime,
                      isLoading: false,
                    },
                  },
                  timestamp: new Date().toISOString(),
                });
              } else {
                // Handle error response
                sendEvent({
                  type: "node_updated",
                  data: {
                    id: "search-engine",
                    type: "searchEngine",
                    position: { x: 600, y: 150 },
                    data: {
                      query: query,
                      results: [],
                      timestamp: new Date().toISOString(),
                      isLoading: false,
                      error: searchData.error || "Search failed",
                    },
                  },
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (searchError) {
              console.error("Search engine error:", searchError);
              // Update with error state
              sendEvent({
                type: "node_updated",
                data: {
                  id: "search-engine",
                  type: "searchEngine",
                  position: { x: 600, y: 150 },
                  data: {
                    query: query,
                    results: [],
                    timestamp: new Date().toISOString(),
                    isLoading: false,
                    error: searchError instanceof Error ? searchError.message : "Search engine unavailable",
                  },
                },
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Step 3.6: Add chart agent node if enabled
          if (enabledSystemAgents?.includes("chart-agent")) {
            sendEvent({
              type: "node_added",
              data: {
                id: "chart-agent",
                type: "chart-agent",
                position: { x: 800, y: 150 },
                data: {
                  query: query,
                  chartData: {
                    type: "bar",
                    data: [],
                    isLoading: true,
                    error: null,
                  },
                  status: "processing",
                },
              },
              timestamp: new Date().toISOString(),
            });

            // Process chart agent request
            try {
              console.log(
                "Flow stream - Generating chart data directly for query:",
                query
              );

              // Call chart generation function directly
              const chartData = await generateChartData(query, "bar");

              if (chartData.success) {
                chartAgentData = chartData; // Store for validator

                // Update chart agent node with results
                sendEvent({
                  type: "node_updated",
                  data: {
                    id: "chart-agent",
                    updates: {
                      data: {
                        query: query,
                        chartData: {
                          type: chartData.chartType || "bar",
                          data: chartData.data || [],
                          mermaidCode: chartData.mermaidCode,
                          plotlyConfig: chartData.plotlyConfig,
                          networkData: chartData.networkData,
                          title: chartData.title,
                          description: chartData.description,
                          isLoading: false,
                          error: null,
                        },
                        status: "completed",
                      },
                    },
                  },
                  timestamp: new Date().toISOString(),
                });
              } else {
                // Handle error response
                sendEvent({
                  type: "node_updated",
                  data: {
                    id: "chart-agent",
                    updates: {
                      data: {
                        query: query,
                        chartData: {
                          type: "bar",
                          data: [],
                          isLoading: false,
                          error: chartData.error || "Chart generation failed",
                        },
                        status: "error",
                      },
                    },
                  },
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (chartError) {
              console.error("Chart agent error:", chartError);
              // Update with error state
              sendEvent({
                type: "node_updated",
                data: {
                  id: "chart-agent",
                  updates: {
                    data: {
                      query: query,
                      chartData: {
                        type: "bar",
                        data: [],
                        isLoading: false,
                        error: "Chart agent unavailable",
                      },
                      status: "error",
                    },
                  },
                },
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Step 3.7: Add pros/cons agent node if enabled
          if (enabledSystemAgents?.includes("proscons-agent")) {
            sendEvent({
              type: "node_added",
              data: {
                id: "proscons-agent",
                type: "proscons-agent",
                position: { x: 1000, y: 150 },
                data: {
                  query: query,
                  prosConsData: {
                    pros: [],
                    cons: [],
                    summary: "",
                    recommendation: "",
                    isLoading: true,
                    error: null,
                  },
                  status: "processing",
                },
              },
              timestamp: new Date().toISOString(),
            });

            // Process pros/cons agent request
            try {
              console.log(
                "Flow stream - Generating pros/cons analysis directly for query:",
                query
              );

              // Call pros/cons generation function directly
              const prosConsData = await generateProsConsAnalysis(query);

              if (prosConsData.success) {
                prosConsAgentData = prosConsData; // Store for validator

                // Update pros/cons agent node with results
                sendEvent({
                  type: "node_updated",
                  data: {
                    id: "proscons-agent",
                    updates: {
                      data: {
                        query: query,
                        prosConsData: {
                          pros: prosConsData.pros,
                          cons: prosConsData.cons,
                          summary: prosConsData.summary,
                          recommendation: prosConsData.recommendation,
                          isLoading: false,
                          error: null,
                        },
                        status: "completed",
                      },
                    },
                  },
                  timestamp: new Date().toISOString(),
                });
              } else {
                // Handle error response
                sendEvent({
                  type: "node_updated",
                  data: {
                    id: "proscons-agent",
                    updates: {
                      data: {
                        query: query,
                        prosConsData: {
                          pros: [],
                          cons: [],
                          summary: "",
                          recommendation: "",
                          isLoading: false,
                          error:
                            prosConsData.error || "Pros/cons analysis failed",
                        },
                        status: "error",
                      },
                    },
                  },
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (prosConsError) {
              console.error("Pros/cons agent error:", prosConsError);
              // Update with error state
              sendEvent({
                type: "node_updated",
                data: {
                  id: "proscons-agent",
                  updates: {
                    data: {
                      query: query,
                      prosConsData: {
                        pros: [],
                        cons: [],
                        summary: "",
                        recommendation: "",
                        isLoading: false,
                        error: "Pros/cons agent unavailable",
                      },
                      status: "error",
                    },
                  },
                },
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Step 4: Add agent nodes and start processing
          const agentResponses: AgentResponse[] = [];

          for (let index = 0; index < agents.length; index++) {
            const agent = agents[index];

            // Add agent node
            sendEvent({
              type: "node_added",
              data: {
                id: `agent-${agent.id}`,
                type: "agent",
                position: { x: 200 + index * 200, y: 300 },
                data: {
                  name: agent.name,
                  role: agent.role,
                  status: "processing",
                  topic: query,
                },
              },
              timestamp: new Date().toISOString(),
            });

            // Send processing event
            sendEvent({
              type: "agent_processing",
              data: {
                agentId: agent.id,
                agentName: agent.name,
                status: "processing",
              },
              timestamp: new Date().toISOString(),
            });

            // Generate agent response with streaming
            try {
              const response = await generateAgentResponseStreaming(
                agent,
                query,
                sendEvent
              );
              agentResponses.push(response);

              // Split response into points for progressive display
              const responsePoints = response.response
                .split(/[.!?]\s+/)
                .filter((point) => point.trim().length > 10)
                .slice(0, 5); // Limit to 5 points

              // Add response node with initial empty state
              sendEvent({
                type: "node_added",
                data: {
                  id: `response-${response.agentId}`,
                  type: "response",
                  position: { x: 200 + index * 200, y: 450 },
                  data: {
                    agent: response.agentName,
                    response: "",
                    points: [],
                    sentiment: response.sentiment,
                    confidence: response.confidence,
                    wordCount: response.response.split(" ").length,
                    timestamp: new Date().toLocaleTimeString(),
                    isStreaming: true,
                  },
                },
                timestamp: new Date().toISOString(),
              });

              // Stream points progressively
              for (let i = 0; i < responsePoints.length; i++) {
                await new Promise((resolve) =>
                  setTimeout(resolve, 600 + Math.random() * 400)
                );

                const currentPoints = responsePoints.slice(0, i + 1);
                sendEvent({
                  type: "node_updated",
                  data: {
                    id: `response-${response.agentId}`,
                    updates: {
                      data: {
                        agent: response.agentName,
                        response: response.response,
                        points: currentPoints,
                        sentiment: response.sentiment,
                        confidence: response.confidence,
                        wordCount: response.response.split(" ").length,
                        timestamp: new Date().toLocaleTimeString(),
                        isStreaming: i < responsePoints.length - 1,
                      },
                    },
                  },
                  timestamp: new Date().toISOString(),
                });
              }

              // Final update to mark streaming complete
              sendEvent({
                type: "node_updated",
                data: {
                  id: `response-${response.agentId}`,
                  updates: {
                    data: {
                      agent: response.agentName,
                      response: response.response,
                      points: responsePoints,
                      sentiment: response.sentiment,
                      confidence: response.confidence,
                      wordCount: response.response.split(" ").length,
                      timestamp: new Date().toLocaleTimeString(),
                      isStreaming: false,
                    },
                  },
                },
                timestamp: new Date().toISOString(),
              });

              // Update agent status to completed
              sendEvent({
                type: "node_updated",
                data: {
                  id: `agent-${agent.id}`,
                  updates: {
                    data: {
                      name: agent.name,
                      role: agent.role,
                      status: "completed",
                      topic: query,
                    },
                  },
                },
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              console.error(
                `Error generating response for ${agent.name}:`,
                error
              );

              // Add error response
              const errorResponse: AgentResponse = {
                agentId: agent.id,
                agentName: agent.name,
                role: agent.role,
                response: `Unable to generate response due to system error.`,
                confidence: 0,
                sentiment: "neutral",
                processingTime: 0,
                reasoning: [],
                evidence: [],
              };
              agentResponses.push(errorResponse);

              sendEvent({
                type: "agent_response",
                data: {
                  ...errorResponse,
                  error: true,
                },
                timestamp: new Date().toISOString(),
              });
            }

            // Add a small delay between agents for better UX
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // Step 5: Add validator node
          sendEvent({
            type: "node_added",
            data: {
              id: "validator",
              type: "agent",
              position: { x: 400, y: 600 },
              data: {
                name: "Validator Agent",
                role: "moderator",
                status: "processing",
                topic: "Validation",
              },
            },
            timestamp: new Date().toISOString(),
          });

          // Step 6: Start validation
          sendEvent({
            type: "validation_start",
            data: {
              message: "Starting response validation...",
              responseCount: agentResponses.length,
            },
            timestamp: new Date().toISOString(),
          });

          // Step 7: Validate responses
          const validationResults = await validateResponsesStreaming(
            agentResponses,
            query,
            sendEvent,
            searchEngineData
          );

          // Step 8: Update validator status
          sendEvent({
            type: "node_updated",
            data: {
              id: "validator",
              updates: {
                data: {
                  name: "Validator Agent",
                  role: "moderator",
                  status: "completed",
                  topic: "Validation",
                },
              },
            },
            timestamp: new Date().toISOString(),
          });

          // Step 9: Create or update session
          let currentSessionId = sessionId;
          if (!currentSessionId) {
            const { data: newSession } = await supabase
              .from("debate_sessions")
              .insert({
                title: `Query: ${query.substring(0, 50)}...`,
                status: "active",
                created_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            currentSessionId = newSession?.id;
          }

          // Step 10: Save round data
          if (currentSessionId) {
            await supabase.from("debate_rounds").insert({
              session_id: currentSessionId,
              query,
              agent_responses: agentResponses,
              validation_results: validationResults,
              round_number: 1,
              created_at: new Date().toISOString(),
            });
          }

          // Step 11: Send completion event
          sendEvent({
            type: "complete",
            data: {
              success: true,
              sessionId: currentSessionId,
              query,
              agents: agents.map((a) => ({
                id: a.id,
                name: a.name,
                role: a.role,
              })),
              agentResponses,
              validationResults,
              processingTime: Math.max(
                ...agentResponses.map((r) => r.processingTime)
              ),
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Streaming error:", error);
          sendEvent({
            type: "error",
            data: { error: "Internal server error" },
            timestamp: new Date().toISOString(),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Stream setup error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function generateAgentResponseStreaming(
  agent: any,
  query: string,
  sendEvent: (event: StreamEvent) => void,
  context?: string
): Promise<AgentResponse> {
  const agentConfig: AgentConfig = {
    role: agent.role,
    name: agent.name,
    systemPrompt: agent.system_prompt || "",
    id: agent.id,
  };

  try {
    // Send progressive updates to simulate streaming behavior
    const progressSteps = [
      { progress: 20, status: "analyzing", message: "Analyzing query..." },
      {
        progress: 40,
        status: "researching",
        message: "Gathering information...",
      },
      { progress: 60, status: "reasoning", message: "Formulating response..." },
      {
        progress: 80,
        status: "validating",
        message: "Validating arguments...",
      },
      { progress: 100, status: "completed", message: "Response ready" },
    ];

    // Send progressive updates with delays
    for (const step of progressSteps) {
      sendEvent({
        type: "node_updated",
        data: {
          id: `agent-${agent.id}`,
          updates: {
            data: {
              name: agent.name,
              role: agent.role,
              status: step.status,
              progress: step.progress,
              message: step.message,
              topic: query,
            },
          },
        },
        timestamp: new Date().toISOString(),
      });

      // Add realistic delay between progress updates
      await new Promise((resolve) =>
        setTimeout(resolve, 800 + Math.random() * 400)
      );
    }

    // Generate the actual response
    const response = await unifiedAIClient.generateAgentResponse(
      agentConfig,
      query,
      context,
      AI_PROVIDER
    );

    // Send the final response event
    sendEvent({
      type: "agent_response",
      data: response,
      timestamp: new Date().toISOString(),
    });

    return response;
  } catch (error) {
    console.error(`Error generating response for ${agent.name}:`, error);

    // Send error update
    sendEvent({
      type: "node_updated",
      data: {
        id: `agent-${agent.id}`,
        updates: {
          data: {
            name: agent.name,
            role: agent.role,
            status: "error",
            message: "Failed to generate response",
            topic: query,
          },
        },
      },
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

async function validateResponsesStreaming(
  responses: AgentResponse[],
  query: string,
  sendEvent: (event: StreamEvent) => void,
  searchEngineData?: any
): Promise<ValidationResult[]> {
  try {
    // Transform database AgentResponse to AI client format
    const aiResponses = responses.map((r) => ({
      agentId: r.agentId,
      agentName: r.agentName || "Unknown Agent",
      role: "moderator" as const,
      response: r.response,
      confidence: r.confidence,
      sentiment: "neutral" as const,
      processingTime: 0,
      reasoning: (r as any).reasoning || [],
      evidence: (r as any).evidence || [],
    }));

    // Include search engine data in validation context if available
    let validationContext = query;
    if (searchEngineData && searchEngineData.results) {
      const searchContext = searchEngineData.results
        .slice(0, 3) // Use top 3 results
        .map((result: any) => `${result.title}: ${result.snippet}`)
        .join("\n");
      validationContext = `${query}\n\nAdditional Context from Web Search:\n${searchContext}`;
    }

    const validationResults = await unifiedAIClient.validateResponses(
      aiResponses,
      validationContext,
      AI_PROVIDER
    );

    // Send validation results one by one
    for (const result of validationResults) {
      sendEvent({
        type: "validation_result",
        data: result,
        timestamp: new Date().toISOString(),
      });

      // Small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return validationResults;
  } catch (error) {
    console.error("Error in streaming validation:", error);

    // Fallback validation with streaming
    const fallbackResults = generateFallbackValidation(responses);

    for (const result of fallbackResults) {
      sendEvent({
        type: "validation_result",
        data: result,
        timestamp: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return fallbackResults;
  }
}

function generateFallbackValidation(
  responses: AgentResponse[]
): ValidationResult[] {
  const validationTemplates = [
    {
      claim: "Logical consistency of arguments presented",
      evidence:
        "Arguments follow clear logical structure with premises leading to conclusions",
      logicalFallacies: [],
      supportingFacts: [
        "Structured reasoning",
        "Clear premise-conclusion flow",
      ],
    },
    {
      claim: "Quality and reliability of evidence cited",
      evidence:
        "Evidence sources vary in quality; some claims well-supported, others require additional verification",
      logicalFallacies: responses.some((r) => r.confidence < 50)
        ? ["Low confidence indicators"]
        : [],
      supportingFacts: responses
        .filter((r) => (r as any).evidence && (r as any).evidence.length > 0)
        .map((r) => `${r.agentName} provided evidence`),
    },
    {
      claim: "Balanced consideration of multiple perspectives",
      evidence: `Analysis includes ${responses.length} different perspectives with varying confidence levels`,
      logicalFallacies: [],
      supportingFacts: responses.map(
        (r) =>
          `${r.agentName}: ${r.sentiment} perspective (${r.confidence}% confidence)`
      ),
    },
  ];

  return validationTemplates.map((template, index) => ({
    id: `validation_${index + 1}`,
    claim: template.claim,
    isValid: responses.length > 0 && responses.some((r) => r.confidence > 60),
    confidence: Math.max(...responses.map((r) => r.confidence)) || 50,
    evidence: template.evidence,
    logicalFallacies: template.logicalFallacies,
    supportingFacts: template.supportingFacts,
    selected: false,
  }));
}
