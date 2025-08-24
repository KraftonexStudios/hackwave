import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";

interface AgentConfig {
  role: "advocate" | "opponent" | "moderator";
  name: string;
  systemPrompt: string;
  id?: string;
}

interface AgentResponse {
  agentId: string;
  agentName: string;
  role: "advocate" | "opponent" | "moderator";
  response: string;
  confidence: number;
  sentiment: "positive" | "negative" | "neutral";
  processingTime: number;
  reasoning: string[];
  evidence: string[];
}

interface ValidationResult {
  id: string;
  claim: string;
  isValid: boolean;
  confidence: number;
  evidence: string;
  logicalFallacies: string[];
  supportingFacts: string[];
  selected: boolean;
}

type AIProvider = "gemini" | "groq";

class UnifiedAIClient {
  private getModel(provider: AIProvider) {
    switch (provider) {
      case "gemini":
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY environment variable is required");
        }
        return google("gemini-1.5-pro");
      case "groq":
        if (!process.env.GROQ_API_KEY) {
          throw new Error("GROQ_API_KEY environment variable is required");
        }
        return groq("llama-3.3-70b-versatile");
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private getAgentSystemPrompt(role: string): string {
    const prompts = {
      advocate: `You are an expert advocate agent specializing in logical argumentation and evidence-based reasoning. Your role is to:
1. Construct compelling arguments supporting the given position
2. Identify and present factual evidence, statistics, and expert opinions
3. Use logical reasoning patterns (deductive, inductive, abductive)
4. Address potential counterarguments proactively
5. Maintain intellectual honesty while advocating strongly
6. Provide confidence scores based on evidence strength
7. Structure arguments with clear premises and conclusions
8. Use rhetorical techniques appropriately (ethos, pathos, logos)
9. Cite credible sources and acknowledge limitations
10. Engage constructively with opposing viewpoints
11. Create visual diagrams and charts using Mermaid syntax to illustrate complex relationships, processes, and data

Visual Enhancement Guidelines:
- Use flowcharts to show logical reasoning chains and decision processes
- Create mind maps to illustrate argument structures and supporting evidence
- Generate pie charts or bar charts for statistical data presentation
- Use sequence diagrams for cause-and-effect relationships
- Include timeline diagrams for historical context or process flows

Always provide:
- Clear reasoning chain with visual flowcharts when applicable
- Supporting evidence with data visualizations
- Confidence level (0-100)
- Potential counterarguments
- Sentiment analysis of your response
- At least one Mermaid diagram to enhance understanding

Mermaid Diagram Guidelines:
These diagram patterns are TESTED and WORKING in the system:

Flowcharts for process flows:
\`\`\`mermaid
flowchart TD
    A[User Query] --> B[Query Distributor]
    B --> C[Agent 1: Analyst]
    B --> D[Agent 2: Critic]
    C --> F[Response 1]
    D --> G[Response 2]
    F --> I[Validation Engine]
    G --> I
    I --> J[Final Report]
\`\`\`

Sequence diagrams for interactions:
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant S as System
    participant A1 as Agent 1
    participant A2 as Agent 2
    U->>S: Submit Query
    S->>A1: Process Query
    S->>A2: Process Query
    A1->>S: Response 1
    A2->>S: Response 2
    S->>U: Final Report
\`\`\`

Syntax Rules:
- Always start with a valid diagram type: flowchart TD, sequenceDiagram, graph LR, etc.
- Use proper node syntax: A[Label], B(Label), C{Decision}
- Use correct arrow syntax: A --> B, A -.-> B, A ==> B
- Avoid pipe characters in node labels - use parentheses or brackets instead
- Keep node IDs simple: use letters, numbers, underscores only

Chart.js Data Visualization Guidelines:
You can create interactive charts using Chart.js syntax. These patterns are TESTED and WORKING:

Bar charts for confidence/performance metrics:
\`\`\`chart bar
{
  "labels": ["Agent 1", "Agent 2", "Agent 3", "Agent 4", "Agent 5"],
  "datasets": [{
    "label": "Response Confidence",
    "data": [85, 92, 78, 88, 95],
    "backgroundColor": "rgba(54, 162, 235, 0.6)",
    "borderColor": "rgba(54, 162, 235, 1)",
    "borderWidth": 2
  }]
}
\`\`\`

Line charts for time-series data:
\`\`\`chart line
{
  "labels": ["Round 1", "Round 2", "Round 3", "Round 4", "Round 5"],
  "datasets": [{
    "label": "Processing Time (ms)",
    "data": [1200, 980, 1100, 850, 920],
    "borderColor": "rgba(75, 192, 192, 1)",
    "backgroundColor": "rgba(75, 192, 192, 0.2)",
    "tension": 0.4
  }]
}
\`\`\`

Pie charts for categorical breakdowns:
\`\`\`chart pie
{
  "labels": ["Validated", "Rejected", "Pending"],
  "datasets": [{
    "data": [65, 25, 10],
    "backgroundColor": [
      "rgba(34, 197, 94, 0.8)",
      "rgba(239, 68, 68, 0.8)",
      "rgba(251, 191, 36, 0.8)"
    ],
    "borderWidth": 2
  }]
}
\`\`\`

Format your response in Markdown with proper headings, bullet points, and embedded Mermaid diagrams using triple backtick mermaid syntax or Chart.js visualizations using triple backtick chart [type] syntax.`,

      opponent: `You are an expert opponent agent specializing in critical analysis and counterargumentation. Your role is to:
1. Identify weaknesses, gaps, and logical fallacies in arguments
2. Present alternative perspectives and contradictory evidence
3. Challenge assumptions and question underlying premises
4. Expose biases and methodological flaws
5. Construct strong counterarguments with supporting evidence
6. Maintain objectivity while arguing against positions
7. Use critical thinking frameworks (falsifiability, burden of proof)
8. Highlight inconsistencies and contradictions
9. Provide alternative explanations and interpretations
10. Engage in good-faith intellectual discourse
11. Create visual diagrams and charts using Mermaid syntax to illustrate flaws, alternatives, and critical analysis

Visual Enhancement Guidelines:
- Use flowcharts to expose logical fallacies and reasoning gaps
- Create comparison charts to contrast opposing viewpoints
- Generate network diagrams to show interconnected issues and dependencies
- Use decision trees to illustrate alternative paths and outcomes
- Include error analysis diagrams to highlight methodological problems

Always provide:
- Specific criticisms with evidence and visual analysis
- Alternative viewpoints with comparative diagrams
- Logical fallacy identification with visual representations
- Confidence in your critique (0-100)
- Constructive suggestions for improvement
- At least one Mermaid diagram to illustrate critical points

Mermaid Diagram Guidelines:
These diagram patterns are TESTED and WORKING in the system:

Flowcharts for critical analysis:
\`\`\`mermaid
flowchart TD
    A[Original Argument] --> B{Valid Logic?}
    B -->|No| C[Identify Fallacy]
    B -->|Yes| D[Check Evidence]
    C --> E[Counter-Argument]
    D --> F{Strong Evidence?}
    F -->|No| G[Weak Foundation]
    F -->|Yes| H[Alternative Interpretation]
\`\`\`

Sequence diagrams for critique process:
\`\`\`mermaid
sequenceDiagram
    participant P as Proponent
    participant O as Opponent
    participant E as Evidence
    P->>O: Present Argument
    O->>E: Verify Claims
    E->>O: Evidence Assessment
    O->>P: Counter-Evidence
    P->>O: Rebuttal
    O->>P: Final Critique
\`\`\`

Syntax Rules:
- Always start with a valid diagram type: flowchart TD, sequenceDiagram, graph LR, etc.
- Use proper node syntax: A[Label], B(Label), C{Decision}
- Use correct arrow syntax: A --> B, A -.-> B, A ==> B
- Avoid pipe characters in node labels - use parentheses or brackets instead
- Keep node IDs simple: use letters, numbers, underscores only

Chart.js Data Visualization Guidelines:
You can create interactive charts using Chart.js syntax:

Bar charts for evidence comparison:
\`\`\`chart bar
{
  "labels": ["Original Claim", "Counter Evidence", "Alternative View"],
  "datasets": [{
    "label": "Strength of Evidence",
    "data": [30, 85, 70],
    "backgroundColor": ["rgba(239, 68, 68, 0.6)", "rgba(34, 197, 94, 0.6)", "rgba(251, 191, 36, 0.6)"]
  }]
}
\`\`\`

Line charts for trend analysis:
\`\`\`chart line
{
  "labels": ["Initial", "After Review", "Post-Critique", "Final"],
  "datasets": [{
    "label": "Argument Validity (%)",
    "data": [80, 65, 45, 30],
    "borderColor": "rgba(239, 68, 68, 1)",
    "backgroundColor": "rgba(239, 68, 68, 0.2)",
    "tension": 0.4
  }]
}
\`\`\`

Pie charts for fallacy breakdown:
\`\`\`chart pie
{
  "labels": ["Logical Fallacies", "Weak Evidence", "Valid Points"],
  "datasets": [{
    "data": [40, 35, 25],
    "backgroundColor": [
      "rgba(239, 68, 68, 0.8)",
      "rgba(251, 191, 36, 0.8)",
      "rgba(34, 197, 94, 0.8)"
    ]
  }]
}
\`\`\`

Format your response in Markdown with proper headings, bullet points, and embedded Mermaid diagrams using triple backtick mermaid syntax or Chart.js visualizations using triple backtick chart [type] syntax.`,

      moderator: `You are an expert moderator agent specializing in balanced analysis and synthesis. Your role is to:
1. Evaluate arguments from multiple perspectives objectively
2. Identify common ground and areas of disagreement
3. Synthesize insights from different viewpoints
4. Assess the strength and validity of competing claims
5. Facilitate productive discourse between opposing sides
6. Highlight the most compelling evidence from all sides
7. Identify areas requiring further investigation
8. Provide balanced summaries and conclusions
9. Suggest compromises and middle-ground solutions
10. Maintain neutrality while ensuring intellectual rigor
11. Create comprehensive visual summaries using Mermaid syntax to synthesize complex discussions

Visual Enhancement Guidelines:
- Use mind maps to show relationships between different viewpoints
- Create balance scales or comparison matrices for argument evaluation
- Generate synthesis diagrams showing how different perspectives connect
- Use Gantt charts or timelines for process recommendations
- Include consensus-building flowcharts and decision frameworks

Always provide:
- Balanced assessment of all arguments with visual summaries
- Synthesis of key insights using comprehensive diagrams
- Areas of consensus and disagreement with visual mapping
- Recommendations for resolution with process flowcharts
- Overall confidence in conclusions (0-100)
- At least one comprehensive Mermaid diagram to synthesize the discussion

Mermaid Diagram Guidelines:
These diagram patterns are TESTED and WORKING in the system:

Flowcharts for synthesis process:
\`\`\`mermaid
flowchart TD
    A[Proponent View] --> C[Analysis]
    B[Opponent View] --> C
    C --> D{Common Ground?}
    D -->|Yes| E[Consensus Areas]
    D -->|No| F[Key Differences]
    E --> G[Synthesis]
    F --> H[Resolution Strategy]
    G --> I[Final Recommendation]
    H --> I
\`\`\`

Sequence diagrams for moderation:
\`\`\`mermaid
sequenceDiagram
    participant P as Proponent
    participant M as Moderator
    participant O as Opponent
    P->>M: Present Argument
    O->>M: Present Counter
    M->>P: Clarification Request
    M->>O: Clarification Request
    P->>M: Response
    O->>M: Response
    M->>M: Synthesize Views
    M->>P: Balanced Summary
    M->>O: Balanced Summary
\`\`\`

Syntax Rules:
- Always start with a valid diagram type: flowchart TD, sequenceDiagram, graph LR, etc.
- Use proper node syntax: A[Label], B(Label), C{Decision}
- Use correct arrow syntax: A --> B, A -.-> B, A ==> B
- Avoid pipe characters in node labels - use parentheses or brackets instead
- Keep node IDs simple: use letters, numbers, underscores only

Chart.js Data Visualization Guidelines:
You can create interactive charts using Chart.js syntax:

Bar charts for argument synthesis:
\`\`\`chart bar
{
  "labels": ["Proponent Strength", "Opponent Strength", "Consensus Areas"],
  "datasets": [{
    "label": "Argument Quality Score",
    "data": [75, 68, 90],
    "backgroundColor": ["rgba(34, 197, 94, 0.6)", "rgba(239, 68, 68, 0.6)", "rgba(59, 130, 246, 0.6)"]
  }]
}
\`\`\`

Line charts for debate progression:
\`\`\`chart line
{
  "labels": ["Round 1", "Round 2", "Round 3", "Round 4", "Final"],
  "datasets": [{
    "label": "Overall Agreement Level",
    "data": [20, 35, 50, 65, 75],
    "borderColor": "rgba(59, 130, 246, 1)",
    "backgroundColor": "rgba(59, 130, 246, 0.2)",
    "tension": 0.4
  }]
}
\`\`\`

Pie charts for resolution breakdown:
\`\`\`chart pie
{
  "labels": ["Resolved", "Partially Resolved", "Unresolved"],
  "datasets": [{
    "data": [60, 30, 10],
    "backgroundColor": [
      "rgba(34, 197, 94, 0.8)",
      "rgba(251, 191, 36, 0.8)",
      "rgba(239, 68, 68, 0.8)"
    ]
  }]
}
\`\`\`

Format your response in Markdown with proper headings, bullet points, and embedded Mermaid diagrams using triple backtick mermaid syntax or Chart.js visualizations using triple backtick chart [type] syntax.`,
    };
    return prompts[role as keyof typeof prompts] || prompts.moderator;
  }

  async generateAgentResponse(
    agent: AgentConfig,
    query: string,
    context?: string,
    provider: AIProvider = "groq"
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const model = this.getModel(provider);
      const systemPrompt =
        agent.systemPrompt || this.getAgentSystemPrompt(agent.role);

      const contextText = context || "No additional context provided";

      const prompt = `${systemPrompt}

Context: ${contextText}

Query: ${query}

Please provide a comprehensive response that includes:
1. Your main argument/position
2. Supporting evidence and reasoning
3. Confidence level (0-100)
4. Sentiment of your response (positive/negative/neutral)
5. Key reasoning steps
6. Supporting evidence points

Format your response as a detailed analysis addressing the query from your role perspective.`;

      const result = await generateText({
        model,
        prompt,
        providerOptions: {
          groq: {
            parallelToolCalls: true,
          },
        },
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;
      const response = result.text;

      // Extract confidence with better error handling
      const confidenceMatch =
        response.match(/confidence[:\s]*([0-9]+)/i) ||
        response.match(/([0-9]+)%?\s*confident/i);
      const confidence = confidenceMatch
        ? Math.min(Math.max(parseInt(confidenceMatch[1], 10), 0), 100)
        : 75;

      // Determine sentiment based on keywords and tone
      const sentiment = this.analyzeSentiment(response);

      // Extract reasoning and evidence
      const reasoning = this.extractReasoning(response);
      const evidence = this.extractEvidence(response);

      return {
        agentId: agent.id || agent.name.toLowerCase().replace(/\s+/g, "-"),
        agentName: agent.name,
        role: agent.role,
        response,
        confidence: isNaN(confidence) ? 75 : confidence,
        sentiment,
        processingTime,
        reasoning,
        evidence,
      };
    } catch (error) {
      console.error(
        `Error generating response for agent ${agent.name}:`,
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate agent response: ${errorMessage}`);
    }
  }

  private analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
    if (!text || typeof text !== "string") return "neutral";

    const positiveWords = [
      "support",
      "agree",
      "excellent",
      "strong",
      "compelling",
      "effective",
      "beneficial",
      "advantage",
    ];
    const negativeWords = [
      "oppose",
      "disagree",
      "weak",
      "flawed",
      "problematic",
      "concerning",
      "disadvantage",
      "harmful",
    ];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) =>
      lowerText.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerText.includes(word)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  private extractReasoning(text: string): string[] {
    if (!text || typeof text !== "string") return [];

    const reasoningPatterns = [
      /(?:because|since|due to|given that|considering)\s+([^.!?]+[.!?])/gi,
      /(?:therefore|thus|consequently|as a result)\s+([^.!?]+[.!?])/gi,
      /(?:first|second|third|finally|moreover|furthermore)\s+([^.!?]+[.!?])/gi,
    ];

    const reasoning: string[] = [];

    reasoningPatterns.forEach((pattern) => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach((match) => {
        if (
          match[1] &&
          typeof match[1] === "string" &&
          match[1].trim().length > 10
        ) {
          reasoning.push(match[1].trim());
        }
      });
    });

    return reasoning.slice(0, 5); // Limit to 5 reasoning points
  }

  private extractEvidence(text: string): string[] {
    if (!text || typeof text !== "string") return [];

    const evidencePatterns = [
      /(?:studies show|research indicates|data suggests|evidence shows)\s+([^.!?]+[.!?])/gi,
      /(?:according to|based on|statistics show)\s+([^.!?]+[.!?])/gi,
      /(?:for example|for instance|such as)\s+([^.!?]+[.!?])/gi,
    ];

    const evidence: string[] = [];

    evidencePatterns.forEach((pattern) => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach((match) => {
        if (
          match[1] &&
          typeof match[1] === "string" &&
          match[1].trim().length > 10
        ) {
          evidence.push(match[1].trim());
        }
      });
    });

    return evidence.slice(0, 5); // Limit to 5 evidence points
  }

  async validateResponses(
    responses: AgentResponse[],
    originalQuery: string,
    provider: AIProvider = "groq"
  ): Promise<ValidationResult[]> {
    try {
      if (!Array.isArray(responses) || responses.length === 0) {
        throw new Error("No responses provided for validation");
      }

      const model = this.getModel(provider);

      const responsesText = responses
        .map((r, i) => {
          if (
            !r ||
            typeof r.agentName !== "string" ||
            typeof r.response !== "string"
          ) {
            return `${i + 1}. Invalid response format`;
          }
          return `${i + 1}. ${r.agentName} (${r.role}): ${r.response}`;
        })
        .join("\n\n");

      // Use different approaches based on provider
      if (provider === "groq") {
        // Groq doesn't support JSON schema, use text generation with parsing
        const prompt = `Analyze and validate the following agent responses to the query: "${originalQuery}"

Responses:
${responsesText}

For each response, provide validation in this exact format:
[VALIDATION_START]
ID: validation-[number]
Claim: [main claim]
Valid: [true/false]
Confidence: [0-100]
Evidence: [supporting evidence]
Fallacies: [comma-separated list or "none"]
Facts: [comma-separated supporting facts]
[VALIDATION_END]

Focus on logical consistency, evidence quality, and reasoning soundness.`;

        const result = await generateText({
          model,
          prompt,
          temperature: 0.3,
        });

        return this.parseValidationText(result.text, responses.length);
      } else {
        // Use structured generation for Gemini
        const validationSchema = z.object({
          validations: z.array(
            z.object({
              id: z.string(),
              claim: z.string(),
              isValid: z.boolean(),
              confidence: z.number().min(0).max(100),
              evidence: z.string(),
              logicalFallacies: z.array(z.string()),
              supportingFacts: z.array(z.string()),
            })
          ),
        });

        const prompt = `Analyze and validate the following agent responses to the query: "${originalQuery}"

Responses:
${responsesText}

For each response, provide validation including:
- Unique ID
- Main claim being made
- Whether the claim is logically valid
- Confidence in validation (0-100)
- Supporting evidence
- Any logical fallacies identified
- Supporting facts

Focus on logical consistency, evidence quality, and reasoning soundness.`;

        const result = await generateObject({
          model,
          schema: validationSchema,
          prompt,
          temperature: 0.3,
        });

        if (!result.object || !Array.isArray(result.object.validations)) {
          throw new Error("Invalid validation response format");
        }

        return result.object.validations.map((validation) => ({
          ...validation,
          selected: false, // Default to not selected
        }));
      }
    } catch (error) {
      console.error("Error validating responses:", error);
      // Return basic validation results as fallback
      return responses.map((response, index) => ({
        id: `validation-${index}`,
        claim:
          response && response.response && typeof response.response === "string"
            ? response.response.substring(0, 100) + "..."
            : "Invalid response format",
        isValid: true,
        confidence: 50,
        evidence: "Fallback validation due to error",
        logicalFallacies: [],
        supportingFacts: [],
        selected: false,
      }));
    }
  }

  private parseValidationText(
    text: string,
    expectedCount: number
  ): ValidationResult[] {
    const validations: ValidationResult[] = [];
    const blocks = text.split("[VALIDATION_START]").slice(1);

    blocks.forEach((block, index) => {
      const endIndex = block.indexOf("[VALIDATION_END]");
      if (endIndex === -1) return;

      const content = block.substring(0, endIndex);
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      const validation: Partial<ValidationResult> = {
        id: `validation-${index}`,
        selected: false,
      };

      lines.forEach((line) => {
        if (line.startsWith("ID:")) {
          validation.id = line.substring(3).trim();
        } else if (line.startsWith("Claim:")) {
          validation.claim = line.substring(6).trim();
        } else if (line.startsWith("Valid:")) {
          validation.isValid =
            line.substring(6).trim().toLowerCase() === "true";
        } else if (line.startsWith("Confidence:")) {
          const conf = parseInt(line.substring(11).trim(), 10);
          validation.confidence = isNaN(conf)
            ? 50
            : Math.min(Math.max(conf, 0), 100);
        } else if (line.startsWith("Evidence:")) {
          validation.evidence = line.substring(9).trim();
        } else if (line.startsWith("Fallacies:")) {
          const fallacies = line.substring(10).trim();
          validation.logicalFallacies =
            fallacies === "none"
              ? []
              : fallacies.split(",").map((f) => f.trim());
        } else if (line.startsWith("Facts:")) {
          const facts = line.substring(6).trim();
          validation.supportingFacts = facts
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f);
        }
      });

      // Ensure all required fields are present
      if (
        validation.claim &&
        validation.isValid !== undefined &&
        validation.confidence !== undefined
      ) {
        validations.push({
          id: validation.id || `validation-${index}`,
          claim: validation.claim,
          isValid: validation.isValid,
          confidence: validation.confidence,
          evidence: validation.evidence || "No evidence provided",
          logicalFallacies: validation.logicalFallacies || [],
          supportingFacts: validation.supportingFacts || [],
          selected: false,
        });
      }
    });

    // Fill in missing validations if needed
    while (validations.length < expectedCount) {
      validations.push({
        id: `validation-${validations.length}`,
        claim: "Unable to parse validation",
        isValid: true,
        confidence: 50,
        evidence: "Parsing error occurred",
        logicalFallacies: [],
        supportingFacts: [],
        selected: false,
      });
    }

    return validations;
  }

  async generateText(
    options: {
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    },
    provider: AIProvider = "groq"
  ): Promise<{ text: string }> {
    try {
      const model = this.getModel(provider);

      // Convert messages to a single prompt
      const prompt = options.messages.map((msg) => msg.content).join("\n\n");

      const result = await generateText({
        model,
        prompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        providerOptions: {
          groq: {
            parallelToolCalls: true,
          },
        },
      });

      return { text: result.text };
    } catch (error) {
      console.error("Error in generateText:", error);
      throw new Error(
        `Failed to generate text: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async generateInsights(
    responses: AgentResponse[],
    validationResults: ValidationResult[],
    userFeedback?: string,
    provider: AIProvider = "groq"
  ): Promise<string[]> {
    try {
      if (!Array.isArray(responses) || responses.length === 0) {
        throw new Error("No responses provided for insight generation");
      }

      const model = this.getModel(provider);

      const responsesText = responses
        .map((r) => {
          if (
            !r ||
            typeof r.agentName !== "string" ||
            typeof r.response !== "string"
          ) {
            return "- Invalid response format";
          }
          const truncatedResponse =
            r.response.length > 200
              ? r.response.substring(0, 200) + "..."
              : r.response;
          return `- ${r.agentName}: ${truncatedResponse}`;
        })
        .join("\n");

      const validationText = validationResults
        .map((v) => {
          if (!v || typeof v.claim !== "string") {
            return "- Invalid validation format";
          }
          return `- ${v.claim}: ${v.isValid ? "Valid" : "Invalid"} (${
            v.confidence
          }% confidence)`;
        })
        .join("\n");

      const feedbackText =
        userFeedback && typeof userFeedback === "string"
          ? `User Feedback: ${userFeedback}`
          : "";

      const prompt = `Generate key insights from this debate analysis:

Agent Responses:
${responsesText}

Validation Results:
${validationText}

${feedbackText}

Provide 5-7 key insights about:
1. Strongest arguments presented
2. Common themes and patterns
3. Areas of consensus and disagreement
4. Quality of evidence and reasoning
5. Recommendations for further exploration
6. Potential biases or limitations
7. Overall assessment of the debate quality

Format as a numbered list of concise insights.`;

      const result = await generateText({
        model,
        prompt,
        providerOptions: {
          groq: {
            reasoningFormat: "parsed",
            reasoningEffort: "default",
            parallelToolCalls: true,
            serviceTier: "flex",
          },
        },
        temperature: 0.6,
      });

      if (!result.text || typeof result.text !== "string") {
        throw new Error("Invalid insight generation response");
      }

      // Parse the numbered list into an array
      const insights = result.text
        .split("\n")
        .filter((line) => /^\d+\./.test(line.trim()))
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((insight) => insight.length > 0);

      return insights.length > 0
        ? insights
        : [
            "Multiple perspectives were presented with varying degrees of evidence.",
            "Further analysis may be needed to reach definitive conclusions.",
            "The debate highlighted important considerations for decision-making.",
          ];
    } catch (error) {
      console.error("Error generating insights:", error);
      return [
        "Analysis completed with multiple agent perspectives.",
        "Various arguments and evidence were presented.",
        "Further review of the responses may provide additional insights.",
      ];
    }
  }
}

export const unifiedAIClient = new UnifiedAIClient();
export type { AgentResponse, ValidationResult, AgentConfig, AIProvider };
