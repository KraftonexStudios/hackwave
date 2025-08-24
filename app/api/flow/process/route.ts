import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unifiedAIClient } from "@/lib/ai/unified-client";
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
  sessionId?: string;
}

// Using imported interfaces from AI client

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
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { query, selectedAgents, sessionId }: ProcessRequest =
      await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(
      "Processing query for user:",
      user.id,
      "Query:",
      query.substring(0, 50)
    );

    // Step 1: Get available agents or use selected ones
    let agents = [];
    if (selectedAgents && selectedAgents.length > 0) {
      const { data: selectedAgentData } = await supabase
        .from("agents")
        .select("*")
        .in("id", selectedAgents);
      agents = selectedAgentData || [];
    } else {
      // Get default agents for processing
      const { data: defaultAgents } = await supabase
        .from("agents")
        .select("*")
        .eq("status", "active")
        .limit(3);
      agents = defaultAgents || [];
    }

    if (agents.length === 0) {
      return NextResponse.json(
        { error: "No active agents available" },
        { status: 400 }
      );
    }

    // Step 2: Create or update session
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

    // Step 3: Task Distribution - Use AI clients for real processing
    const agentResponses: AgentResponse[] = await Promise.all(
      agents.map(async (agent) => {
        return await generateAgentResponse(agent, query);
      })
    );

    // Step 4: Validator Agent Processing
    const validationResults: ValidationResult[] = await validateResponses(
      agentResponses,
      query
    );

    // Step 5: Save round data
    if (currentSessionId) {
      await supabase.from("debate_rounds").insert({
        session_id: currentSessionId,
        query,
        agent_responses: agentResponses,
        validation_results: validationResults,
        round_number: 1, // This should be incremented based on existing rounds
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: currentSessionId,
      query,
      agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
      agentResponses,
      validationResults,
      processingTime: Math.max(...agentResponses.map((r) => r.processingTime)),
    });
  } catch (error) {
    console.error("Flow processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateAgentResponse(
  agent: any,
  query: string,
  context?: string
): Promise<AgentResponse> {
  const agentConfig: AgentConfig = {
    role: agent.role,
    name: agent.name,
    systemPrompt: agent.system_prompt || "",
    id: agent.id,
  };

  try {
    return await unifiedAIClient.generateAgentResponse(
      agentConfig,
      query,
      context,
      AI_PROVIDER
    );
  } catch (error) {
    console.error(`Error generating response for ${agent.name}:`, error);

    // Fallback response
    return {
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      response: `Unable to generate response due to system error. Please check AI service configuration.`,
      confidence: 0,
      sentiment: "neutral",
      processingTime: 0,
      reasoning: [],
      evidence: [],
    };
  }
}

function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  // This is now primarily handled by the AI clients
  // Keeping as fallback for legacy compatibility
  const positiveWords = [
    "support",
    "benefit",
    "advantage",
    "positive",
    "effective",
    "success",
    "improvement",
    "valuable",
  ];
  const negativeWords = [
    "oppose",
    "risk",
    "problem",
    "negative",
    "ineffective",
    "failure",
    "concern",
    "disadvantage",
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach((word) => {
    if (positiveWords.some((pw) => word.includes(pw))) positiveCount++;
    if (negativeWords.some((nw) => word.includes(nw))) negativeCount++;
  });

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

async function validateResponses(
  responses: AgentResponse[],
  query: string
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

    return await unifiedAIClient.validateResponses(
      aiResponses,
      query,
      AI_PROVIDER
    );
  } catch (error) {
    console.error("Error in AI validation:", error);

    // Fallback validation logic
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
      {
        claim: "Reasoning quality and logical structure",
        evidence:
          "Reasoning chains provided with varying levels of detail and logical rigor",
        logicalFallacies:
          responses.filter(
            (r) => !(r as any).reasoning || (r as any).reasoning.length === 0
          ).length > 0
            ? ["Insufficient reasoning provided"]
            : [],
        supportingFacts: responses
          .filter(
            (r) => (r as any).reasoning && (r as any).reasoning.length > 0
          )
          .map((r) => `${r.agentName} provided reasoning chain`),
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
}
