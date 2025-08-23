import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

interface AgentConfig {
  role: "advocate" | "opponent" | "moderator";
  name: string;
  systemPrompt: string;
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

type AIProvider = 'gemini' | 'groq';

class UnifiedAIClient {
  private getModel(provider: AIProvider) {
    switch (provider) {
      case 'gemini':
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY environment variable is required');
        }
        return google('gemini-1.5-pro');
      case 'groq':
        if (!process.env.GROQ_API_KEY) {
          throw new Error('GROQ_API_KEY environment variable is required');
        }
        return groq('llama-3.3-70b-versatile');
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

Always provide:
- Clear reasoning chain
- Supporting evidence
- Confidence level (0-100)
- Potential counterarguments
- Sentiment analysis of your response`,

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

Always provide:
- Specific criticisms with evidence
- Alternative viewpoints
- Logical fallacy identification
- Confidence in your critique (0-100)
- Constructive suggestions for improvement`,

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

Always provide:
- Balanced assessment of all arguments
- Synthesis of key insights
- Areas of consensus and disagreement
- Recommendations for resolution
- Overall confidence in conclusions (0-100)`
    };
    return prompts[role as keyof typeof prompts] || prompts.moderator;
  }

  async generateAgentResponse(
    agent: AgentConfig,
    query: string,
    context?: string,
    provider: AIProvider = 'gemini'
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const model = this.getModel(provider);
      const systemPrompt = agent.systemPrompt || this.getAgentSystemPrompt(agent.role);
      
      const prompt = `${systemPrompt}

Context: ${context || 'No additional context provided'}

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
            parallelToolCalls: true
          }
        },
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;
      
      // Parse the response to extract structured information
      const response = result.text;
      
      // Extract confidence (look for patterns like "confidence: 85" or "85% confident")
      const confidenceMatch = response.match(/confidence[:\s]*([0-9]+)/i) || response.match(/([0-9]+)%?\s*confident/i);
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;
      
      // Determine sentiment based on keywords and tone
      const sentiment = this.analyzeSentiment(response);
      
      // Extract reasoning and evidence (simplified extraction)
      const reasoning = this.extractReasoning(response);
      const evidence = this.extractEvidence(response);

      return {
        agentId: agent.name.toLowerCase().replace(/\s+/g, '-'),
        agentName: agent.name,
        role: agent.role,
        response,
        confidence: Math.min(Math.max(confidence, 0), 100),
        sentiment,
        processingTime,
        reasoning,
        evidence
      };
    } catch (error) {
      console.error(`Error generating response for agent ${agent.name}:`, error);
      throw new Error(`Failed to generate agent response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
    const positiveWords = ['support', 'agree', 'excellent', 'strong', 'compelling', 'effective', 'beneficial', 'advantage'];
    const negativeWords = ['oppose', 'disagree', 'weak', 'flawed', 'problematic', 'concerning', 'disadvantage', 'harmful'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractReasoning(text: string): string[] {
    const reasoningPatterns = [
      /(?:because|since|due to|given that|considering)\s+([^.!?]+[.!?])/gi,
      /(?:therefore|thus|consequently|as a result)\s+([^.!?]+[.!?])/gi,
      /(?:first|second|third|finally|moreover|furthermore)\s+([^.!?]+[.!?])/gi
    ];
    
    const reasoning: string[] = [];
    reasoningPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          reasoning.push(match[1].trim());
        }
      }
    });
    
    return reasoning.slice(0, 5); // Limit to 5 reasoning points
  }

  private extractEvidence(text: string): string[] {
    const evidencePatterns = [
      /(?:studies show|research indicates|data suggests|evidence shows)\s+([^.!?]+[.!?])/gi,
      /(?:according to|based on|statistics show)\s+([^.!?]+[.!?])/gi,
      /(?:for example|for instance|such as)\s+([^.!?]+[.!?])/gi
    ];
    
    const evidence: string[] = [];
    evidencePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          evidence.push(match[1].trim());
        }
      }
    });
    
    return evidence.slice(0, 5); // Limit to 5 evidence points
  }

  async validateResponses(
    responses: AgentResponse[],
    originalQuery: string,
    provider: AIProvider = 'gemini'
  ): Promise<ValidationResult[]> {
    try {
      const model = this.getModel(provider);
      
      const validationSchema = z.object({
        validations: z.array(z.object({
          id: z.string(),
          claim: z.string(),
          isValid: z.boolean(),
          confidence: z.number().min(0).max(100),
          evidence: z.string(),
          logicalFallacies: z.array(z.string()),
          supportingFacts: z.array(z.string())
        }))
      });

      const prompt = `Analyze and validate the following agent responses to the query: "${originalQuery}"

Responses:
${responses.map((r, i) => `${i + 1}. ${r.agentName} (${r.role}): ${r.response}`).join('\n\n')}

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

      return result.object.validations.map(validation => ({
        ...validation,
        selected: false // Default to not selected
      }));
    } catch (error) {
      console.error('Error validating responses:', error);
      // Return basic validation results as fallback
      return responses.map((response, index) => ({
        id: `validation-${index}`,
        claim: response.response.substring(0, 100) + '...',
        isValid: true,
        confidence: response.confidence,
        evidence: 'Automated validation unavailable',
        logicalFallacies: [],
        supportingFacts: [],
        selected: false
      }));
    }
  }

  async generateInsights(
    responses: AgentResponse[],
    validationResults: ValidationResult[],
    userFeedback?: string,
    provider: AIProvider = 'gemini'
  ): Promise<string[]> {
    try {
      const model = this.getModel(provider);
      
      const prompt = `Generate key insights from this debate analysis:

Agent Responses:
${responses.map(r => `- ${r.agentName}: ${r.response.substring(0, 200)}...`).join('\n')}

Validation Results:
${validationResults.map(v => `- ${v.claim}: ${v.isValid ? 'Valid' : 'Invalid'} (${v.confidence}% confidence)`).join('\n')}

${userFeedback ? `User Feedback: ${userFeedback}` : ''}

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
            reasoningFormat: 'parsed',
            reasoningEffort: 'default',
            parallelToolCalls: true,
            serviceTier: 'flex'
          }
        },
        temperature: 0.6,
      });

      // Parse the numbered list into an array
      const insights = result.text
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(insight => insight.length > 0);

      return insights.length > 0 ? insights : [
        'Multiple perspectives were presented with varying degrees of evidence.',
        'Further analysis may be needed to reach definitive conclusions.',
        'The debate highlighted important considerations for decision-making.'
      ];
    } catch (error) {
      console.error('Error generating insights:', error);
      return [
        'Analysis completed with multiple agent perspectives.',
        'Various arguments and evidence were presented.',
        'Further review of the responses may provide additional insights.'
      ];
    }
  }
}

export const unifiedAIClient = new UnifiedAIClient();
export type { AgentResponse, ValidationResult, AgentConfig, AIProvider };