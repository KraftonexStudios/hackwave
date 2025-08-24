import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText, streamText } from "ai";
import { z } from "zod";
import type { Agent } from "@/database.types";

// AI Provider configuration
export type AIProvider = "openai" | "anthropic";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

const defaultConfigs: Record<AIProvider, AIConfig> = {
  openai: {
    provider: "openai",
    model: "gpt-4-turbo-preview",
    temperature: 0.7,
    maxTokens: 2000,
  },
  anthropic: {
    provider: "anthropic",
    model: "claude-3-sonnet-20240229",
    temperature: 0.7,
    maxTokens: 2000,
  },
};

// Get AI model instance based on provider
function getModel(config: AIConfig) {
  switch (config.provider) {
    case "openai":
      return openai(config.model);
    case "anthropic":
      return anthropic(config.model);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

// Schema for task distribution response
const TaskDistributionSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
      requiredExpertise: z.array(z.string()),
      estimatedComplexity: z.number().min(1).max(10),
    })
  ),
  recommendedAgents: z.array(
    z.object({
      agentId: z.string(),
      taskIds: z.array(z.string()),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  overallStrategy: z.string(),
});

// Schema for validation response
const ValidationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  responses: z.array(
    z.object({
      responseId: z.string(),
      score: z.number().min(0).max(100),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      suggestions: z.array(z.string()),
      isAcceptable: z.boolean(),
    })
  ),
  consensus: z.object({
    hasConsensus: z.boolean(),
    consensusPoints: z.array(z.string()),
    disagreements: z.array(z.string()),
  }),
  nextSteps: z.object({
    shouldContinue: z.boolean(),
    recommendedActions: z.array(z.string()),
    focusAreas: z.array(z.string()),
  }),
});

// Task Distributor Agent
export class TaskDistributorAgent {
  private config: AIConfig;

  constructor(provider: AIProvider = "openai") {
    this.config = defaultConfigs[provider];
  }

  async distributeTask(
    query: string,
    availableAgents: Agent[],
    context?: string
  ) {
    const model = getModel(this.config);

    const systemPrompt = `You are a Task Distributor Agent responsible for analyzing complex queries and breaking them down into specific tasks for specialized agents.

Your role:
1. Analyze the input query and understand its complexity
2. Break it down into specific, actionable tasks
3. Recommend which agents should handle each task based on their expertise
4. Provide an overall strategy for approaching the problem

Available Agents:
${availableAgents
  .map(
    (agent) =>
      `- ${agent.name}: ${
        agent.description
      }\n  Expertise: ${agent.prompt.substring(0, 200)}...`
  )
  .join("\n")}

${context ? `Additional Context: ${context}` : ""}

Provide a structured response that will guide the debate process effectively.`;

    try {
      const result = await generateObject({
        model,
        schema: TaskDistributionSchema,
        system: systemPrompt,
        prompt: `Analyze this query and create a task distribution plan: "${query}"`,
        temperature: this.config.temperature,
      });

      return {
        success: true,
        data: result.object,
        usage: result.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }
}

// Individual Agent Response Generator
export class AgentResponseGenerator {
  private config: AIConfig;

  constructor(provider: AIProvider = "openai") {
    this.config = defaultConfigs[provider];
  }

  async generateResponse(
    agent: Agent,
    query: string,
    context?: string,
    previousResponses?: Array<{ agentName: string; response: string }>
  ) {
    const model = getModel(this.config);

    const systemPrompt = `${agent.prompt}

You are participating in a multi-agent debate system. Your role is to provide thoughtful, well-reasoned responses based on your expertise.

Guidelines:
1. Stay true to your defined role and expertise
2. Provide specific, actionable insights
3. Consider previous responses but maintain your unique perspective
4. Be concise but thorough
5. Include reasoning for your conclusions
6. Acknowledge limitations or uncertainties

${context ? `Context: ${context}` : ""}

${
  previousResponses && previousResponses.length > 0
    ? `Previous responses in this debate:
${previousResponses.map((r) => `${r.agentName}: ${r.response}`).join("\n\n")}`
    : ""
}`;

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: query,
        providerOptions: {
          groq: {
            reasoningFormat: "parsed",
            reasoningEffort: "default",
            parallelToolCalls: true,
            serviceTier: "flex",
          },
        },
        temperature: this.config.temperature,
      });

      return {
        success: true,
        response: result.text,
        usage: result.usage,
        reasoning: this.extractReasoning(result.text),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        response: "",
      };
    }
  }

  async generateStreamingResponse(
    agent: Agent,
    query: string,
    context?: string,
    previousResponses?: Array<{ agentName: string; response: string }>
  ) {
    const model = getModel(this.config);

    const systemPrompt = `${agent.prompt}

You are participating in a multi-agent debate system. Provide thoughtful, well-reasoned responses based on your expertise.

${context ? `Context: ${context}` : ""}

${
  previousResponses && previousResponses.length > 0
    ? `Previous responses:
${previousResponses.map((r) => `${r.agentName}: ${r.response}`).join("\n\n")}`
    : ""
}`;

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: query,
        providerOptions: {
          groq: {
            reasoningFormat: "parsed",
            reasoningEffort: "default",
            parallelToolCalls: true,
            serviceTier: "flex",
          },
        },
        temperature: this.config.temperature,
      });

      return {
        success: true,
        stream: result.text,
        usage: result.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stream: null,
      };
    }
  }

  private extractReasoning(response: string): string {
    // Simple heuristic to extract reasoning - look for common reasoning patterns
    const reasoningPatterns = [
      /because\s+(.+?)\./gi,
      /since\s+(.+?)\./gi,
      /therefore\s+(.+?)\./gi,
      /the reason\s+(.+?)\./gi,
    ];

    const reasoningParts: string[] = [];

    reasoningPatterns.forEach((pattern) => {
      const matches = response.match(pattern);
      if (matches) {
        reasoningParts.push(...matches);
      }
    });

    return reasoningParts.join(" ") || "No explicit reasoning provided.";
  }
}

// Validator Agent
export class ValidatorAgent {
  private config: AIConfig;

  constructor(provider: AIProvider = "anthropic") {
    this.config = defaultConfigs[provider];
  }

  async validateResponses(
    query: string,
    responses: Array<{
      id: string;
      agentName: string;
      response: string;
      reasoning?: string;
    }>,
    criteria?: string[]
  ) {
    const model = getModel(this.config);

    const defaultCriteria = [
      "Accuracy and factual correctness",
      "Relevance to the original query",
      "Logical consistency",
      "Completeness of the response",
      "Clarity and coherence",
      "Evidence and supporting arguments",
    ];

    const evaluationCriteria = criteria || defaultCriteria;

    const systemPrompt = `You are a Validator Agent responsible for evaluating and synthesizing responses from multiple AI agents in a debate system.

Your responsibilities:
1. Evaluate each response against the specified criteria
2. Identify strengths and weaknesses
3. Assess overall consensus and disagreements
4. Provide recommendations for next steps
5. Determine if responses are acceptable for the current round

Evaluation Criteria:
${evaluationCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Original Query: "${query}"

Responses to evaluate:
${responses
  .map(
    (r, i) =>
      `Response ${i + 1} (${r.agentName}):\n${r.response}\n${
        r.reasoning ? `Reasoning: ${r.reasoning}` : ""
      }`
  )
  .join("\n\n")}

Provide a comprehensive validation analysis.`;

    try {
      const result = await generateObject({
        model,
        schema: ValidationSchema,
        system: systemPrompt,
        prompt:
          "Evaluate these responses and provide your validation analysis.",
        temperature: 0.3, // Lower temperature for more consistent validation
      });

      return {
        success: true,
        validation: result.object,
        usage: result.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        validation: null,
      };
    }
  }
}

// Report Generator Agent
export class ReportGeneratorAgent {
  private config: AIConfig;

  constructor(provider: AIProvider = "anthropic") {
    this.config = defaultConfigs[provider];
  }

  async generateReport(
    sessionData: {
      query: string;
      rounds: Array<{
        roundNumber: number;
        responses: Array<{
          agentName: string;
          response: string;
          reasoning?: string;
        }>;
        validation?: any;
        userFeedback?: string;
      }>;
    },
    reportType: "interim" | "final" | "summary" = "final"
  ) {
    const model = getModel(this.config);

    const systemPrompt = `You are a Report Generator Agent responsible for creating comprehensive reports from multi-agent debate sessions.

Your task is to generate a ${reportType} report that:
1. Summarizes the debate process and key findings
2. Highlights consensus points and disagreements
3. Provides actionable recommendations
4. Includes methodology and process transparency
5. Presents information in a clear, structured format

Report Type: ${reportType.toUpperCase()}
Original Query: "${sessionData.query}"

Debate Summary:
${sessionData.rounds
  .map(
    (round, i) =>
      `Round ${round.roundNumber}:\n${round.responses
        .map((r) => `- ${r.agentName}: ${r.response.substring(0, 200)}...`)
        .join("\n")}\n${
        round.userFeedback ? `User Feedback: ${round.userFeedback}` : ""
      }`
  )
  .join("\n\n")}

Generate a comprehensive ${reportType} report in markdown format.`;

    try {
      const result = await streamText({
        model,
        system: systemPrompt,
        prompt: `Create a detailed ${reportType} report analyzing this multi-agent debate session.`,
        temperature: 0.4,
      });

      return {
        success: true,
        report: result.text,
        usage: result.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        report: "",
      };
    }
  }
}

// Search Engine Agent for web scraping
export class SearchEngineAgent {
  private config: AIConfig;

  constructor(provider: AIProvider = "openai") {
    this.config = defaultConfigs[provider];
  }

  async searchAndFormat(query: string, context?: string) {
    const startTime = Date.now();
    console.log(
      "🤖 SearchEngineAgent: Starting search and format for query:",
      query
    );
    console.log("📝 Context provided:", context ? "Yes" : "No");

    try {
      // This will be implemented with Puppeteer API call
      console.log("🔍 SearchEngineAgent: Performing web search...");
      const searchResults = await this.performWebSearch(query);
      console.log(
        "📊 SearchEngineAgent: Raw search results received:",
        searchResults.length,
        "items"
      );

      // Format results using AI
      console.log("🎨 SearchEngineAgent: Formatting results with AI...");
      const formattedResults = await this.formatSearchResults(
        searchResults,
        query
      );
      console.log(
        "✨ SearchEngineAgent: AI formatting complete:",
        formattedResults.length,
        "formatted items"
      );

      const processingTime = Date.now() - startTime;
      console.log(
        "⏱️ SearchEngineAgent: Total processing time:",
        processingTime,
        "ms"
      );

      return {
        success: true,
        data: {
          query,
          results: formattedResults,
          timestamp: new Date().toISOString(),
          totalResults: searchResults.length,
          processingTime,
        },
      };
    } catch (error) {
      console.error(
        "❌ SearchEngineAgent: Error during search and format:",
        error
      );
      console.error("🔍 SearchEngineAgent: Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        query,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
        data: null,
      };
    }
  }

  private async performWebSearch(query: string) {
    console.log(
      "🌐 SearchEngineAgent: Calling Playwright API for query:",
      query
    );

    // This will call the Playwright API endpoint
    const response = await fetch("/api/search/playwright", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    console.log(
      "📡 SearchEngineAgent: Puppeteer API response status:",
      response.status
    );

    if (!response.ok) {
      console.error(
        "❌ SearchEngineAgent: Puppeteer API failed with status:",
        response.status
      );
      throw new Error("Web search failed");
    }

    const data = await response.json();
    console.log("📦 SearchEngineAgent: Puppeteer API data received:", {
      success: data.success,
      resultsCount: data.results?.length || 0,
      totalResults: data.totalResults,
      processingTime: data.processingTime,
    });

    return data.results || [];
  }

  private async formatSearchResults(results: any[], query: string) {
    console.log(
      "🎨 SearchEngineAgent: Starting AI formatting for",
      results.length,
      "results"
    );
    console.log(
      "📋 SearchEngineAgent: Raw results preview:",
      results.map((r, i) => ({
        index: i + 1,
        title: r.title?.substring(0, 30) + "...",
        source: r.source,
        hasSnippet: !!r.snippet,
      }))
    );

    const model = getModel(this.config);

    const systemPrompt = `You are a search result formatter. Your task is to take raw web search results and format them into clean, structured data suitable for UI display.

Format each result with:
- Clean, readable title
- Concise snippet (max 150 characters)
- Source domain name
- Relevance score (0-1) based on query match

Prioritize the most relevant results and ensure snippets are informative.`;

    try {
      console.log("🤖 SearchEngineAgent: Calling AI model for formatting...");
      const result = await generateObject({
        model,
        schema: z.object({
          formattedResults: z.array(
            z.object({
              title: z.string(),
              url: z.string(),
              snippet: z.string().max(150),
              source: z.string(),
              relevanceScore: z.number().min(0).max(1),
            })
          ),
        }),
        system: systemPrompt,
        prompt: `Format these search results for query "${query}":\n\n${JSON.stringify(
          results.slice(0, 10),
          null,
          2
        )}`,
        temperature: 0.3,
      });

      const formattedResults = result.object.formattedResults.slice(0, 5); // Top 5 results
      console.log(
        "✅ SearchEngineAgent: AI formatting successful, returning",
        formattedResults.length,
        "results"
      );
      console.log(
        "📊 SearchEngineAgent: Formatted results summary:",
        formattedResults.map((r, i) => ({
          index: i + 1,
          title: r.title.substring(0, 30) + "...",
          source: r.source,
          relevanceScore: r.relevanceScore,
          snippetLength: r.snippet.length,
        }))
      );

      return formattedResults;
    } catch (error) {
      console.warn(
        "⚠️ SearchEngineAgent: AI formatting failed, using fallback formatting"
      );
      console.error("🔍 SearchEngineAgent: AI formatting error:", error);

      // Fallback formatting
      const fallbackResults = results
        .slice(0, 5)
        .map((result: any, index: number) => ({
          title: result.title || `Search Result ${index + 1}`,
          url: result.url || "#",
          snippet:
            result.snippet || result.description || "No description available",
          source:
            result.source ||
            new URL(result.url || "https://example.com").hostname,
          relevanceScore: 0.8 - index * 0.1,
        }));

      console.log(
        "🔄 SearchEngineAgent: Fallback formatting complete, returning",
        fallbackResults.length,
        "results"
      );
      return fallbackResults;
    }
  }
}

// Factory function to create agent instances
export function createAgentSystem(provider: AIProvider = "openai") {
  return {
    taskDistributor: new TaskDistributorAgent(provider),
    responseGenerator: new AgentResponseGenerator(provider),
    validator: new ValidatorAgent("anthropic"), // Use Anthropic for validation
    reportGenerator: new ReportGeneratorAgent("anthropic"), // Use Anthropic for reports
    searchEngine: new SearchEngineAgent(provider), // New search engine agent
  };
}

// Utility function to estimate processing time
export function estimateProcessingTime(
  query: string,
  agentCount: number,
  provider: AIProvider = "openai"
): number {
  const baseTime = 5000; // 5 seconds base
  const queryComplexity = Math.min(query.length / 100, 5); // Max 5x multiplier
  const agentMultiplier = Math.log(agentCount + 1);
  const providerMultiplier = provider === "anthropic" ? 1.2 : 1.0;

  return Math.round(
    baseTime * queryComplexity * agentMultiplier * providerMultiplier
  );
}

// Error handling utilities
export class AIAgentError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public agentType: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "AIAgentError";
  }
}

export function handleAIError(
  error: unknown,
  provider: AIProvider,
  agentType: string
): AIAgentError {
  if (error instanceof AIAgentError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unknown AI error";
  return new AIAgentError(
    message,
    provider,
    agentType,
    error instanceof Error ? error : undefined
  );
}
