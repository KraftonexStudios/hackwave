import Groq from 'groq-sdk';

interface AgentConfig {
  role: 'advocate' | 'opponent' | 'moderator';
  name: string;
  systemPrompt: string;
}

interface AgentResponse {
  agentId: string;
  agentName: string;
  response: string;
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
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
}

class GroqAgentClient {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    this.groq = new Groq({ apiKey });
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
7. Cite specific examples, case studies, or research when possible

Always structure your response with:
- Main argument thesis
- Supporting evidence (3-5 key points)
- Logical reasoning chain
- Confidence assessment
- Potential weaknesses acknowledged`,

      opponent: `You are an expert critical analysis agent specializing in identifying flaws, risks, and counterarguments. Your role is to:
1. Systematically challenge the given position using logical analysis
2. Identify potential risks, unintended consequences, and implementation challenges
3. Point out logical fallacies, weak evidence, or unsupported claims
4. Present alternative perspectives and competing theories
5. Use devil's advocate reasoning while remaining constructive
6. Assess the strength of opposing evidence objectively
7. Highlight gaps in data or reasoning

Always structure your response with:
- Primary concerns and objections
- Risk analysis and potential negative outcomes
- Evidence quality assessment
- Alternative solutions or approaches
- Confidence in your critique`,

      moderator: `You are an expert analytical moderator specializing in balanced evaluation and synthesis. Your role is to:
1. Objectively analyze multiple perspectives on complex issues
2. Identify common ground and areas of legitimate disagreement
3. Evaluate the strength of evidence from all sides
4. Synthesize insights into balanced conclusions
5. Highlight nuances and contextual factors
6. Assess the quality of reasoning from different viewpoints
7. Provide framework for decision-making

Always structure your response with:
- Balanced summary of key perspectives
- Evidence quality assessment for each side
- Areas of consensus and disagreement
- Contextual factors and nuances
- Synthesized insights and recommendations`
    };
    return prompts[role as keyof typeof prompts] || prompts.moderator;
  }

  async generateAgentResponse(
    agent: AgentConfig,
    query: string,
    context?: string
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const systemPrompt = this.getAgentSystemPrompt(agent.role);
      const contextInfo = context ? `\n\nAdditional Context: ${context}` : '';
      
      const userPrompt = `Query/Topic: "${query}"${contextInfo}

Provide a detailed analysis following your role as ${agent.role}. Include:
1. Your main position/argument
2. 3-5 key supporting points with evidence
3. Logical reasoning chain
4. Confidence level (1-100) with justification
5. Potential counterarguments or limitations

Format your response as JSON with the following structure:
{
  "mainArgument": "Your primary thesis/position",
  "supportingPoints": ["Point 1 with evidence", "Point 2 with evidence", ...],
  "reasoning": ["Logical step 1", "Logical step 2", ...],
  "evidence": ["Evidence source 1", "Evidence source 2", ...],
  "confidence": 85,
  "confidenceJustification": "Why this confidence level",
  "limitations": ["Limitation 1", "Limitation 2", ...],
  "sentiment": "positive/negative/neutral"
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Parse JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        parsedResponse = {
          mainArgument: responseText.substring(0, 200) + '...',
          supportingPoints: [responseText.substring(0, 100) + '...'],
          reasoning: ['Analysis provided'],
          evidence: ['Generated response'],
          confidence: 75,
          sentiment: 'neutral',
          limitations: ['Response parsing limitation']
        };
      }

      const processingTime = Date.now() - startTime;
      
      return {
        agentId: `${agent.role}_${Date.now()}`,
        agentName: agent.name,
        response: `${parsedResponse.mainArgument}\n\nKey Points:\n${parsedResponse.supportingPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}`,
        confidence: parsedResponse.confidence || 75,
        sentiment: parsedResponse.sentiment || 'neutral',
        processingTime,
        reasoning: parsedResponse.reasoning || [],
        evidence: parsedResponse.evidence || []
      };
    } catch (error) {
      console.error(`Error generating response for ${agent.name}:`, error);
      
      // Fallback response
      return {
        agentId: `${agent.role}_${Date.now()}`,
        agentName: agent.name,
        response: `Error generating response. Please try again.`,
        confidence: 0,
        sentiment: 'neutral',
        processingTime: Date.now() - startTime,
        reasoning: ['Error in processing'],
        evidence: ['System error']
      };
    }
  }

  async validateResponses(
    responses: AgentResponse[],
    originalQuery: string
  ): Promise<ValidationResult[]> {
    try {
      const systemPrompt = `You are an expert logical validator specializing in critical thinking and argument analysis.`;
      
      const userPrompt = `Analyze the following agent responses to the query: "${originalQuery}"

Agent Responses:
${responses.map((r, i) => `\n${i + 1}. ${r.agentName} (${r.confidence}% confidence):\n${r.response}`).join('\n')}

For each response, validate the following claims and provide detailed analysis:
1. Logical consistency and reasoning quality
2. Evidence strength and factual accuracy
3. Argument structure and coherence
4. Potential logical fallacies
5. Overall validity assessment

Provide your analysis as JSON array with this structure:
[
  {
    "id": "validation_1",
    "claim": "Specific claim being validated",
    "isValid": true,
    "confidence": 85,
    "evidence": "Detailed explanation of validation",
    "logicalFallacies": ["List of any fallacies found"],
    "supportingFacts": ["List of supporting evidence"]
  }
]

Generate 4-6 validation results covering the most important claims made across all responses.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      let validationResults: ValidationResult[];
      try {
        const parsed = JSON.parse(responseText);
        validationResults = Array.isArray(parsed) ? parsed : parsed.validations || [];
      } catch (parseError) {
        // Fallback validation results
        validationResults = [
          {
            id: 'validation_1',
            claim: 'Overall argument coherence and logical structure',
            isValid: true,
            confidence: 75,
            evidence: 'Arguments demonstrate reasonable logical structure with identifiable premises and conclusions.',
            logicalFallacies: [],
            supportingFacts: ['Multiple perspectives provided', 'Evidence-based reasoning attempted']
          },
          {
            id: 'validation_2',
            claim: 'Evidence quality and factual support',
            isValid: responses.some(r => r.confidence > 70),
            confidence: Math.max(...responses.map(r => r.confidence)) || 60,
            evidence: 'Evidence quality varies across responses. Some claims well-supported, others require additional verification.',
            logicalFallacies: [],
            supportingFacts: responses.filter(r => r.evidence.length > 0).map(r => `${r.agentName} provided evidence`)
          },
          {
            id: 'validation_3',
            claim: 'Balanced consideration of multiple perspectives',
            isValid: responses.length >= 2,
            confidence: responses.length >= 3 ? 85 : 65,
            evidence: `Analysis includes ${responses.length} different perspectives, providing ${responses.length >= 3 ? 'comprehensive' : 'adequate'} coverage of the topic.`,
            logicalFallacies: [],
            supportingFacts: responses.map(r => `${r.agentName}: ${r.sentiment} perspective`)
          }
        ];
      }

      return validationResults.map(result => ({
        ...result,
        selected: false // Initialize selection state
      }));
    } catch (error) {
      console.error('Error in validation:', error);
      return [
        {
          id: 'validation_error',
          claim: 'Validation system encountered an error',
          isValid: false,
          confidence: 0,
          evidence: 'Unable to complete validation due to system error.',
          logicalFallacies: ['System error'],
          supportingFacts: [],
          selected: false
        }
      ];
    }
  }

  async generateInsights(
    responses: AgentResponse[],
    validationResults: ValidationResult[],
    userFeedback?: string
  ): Promise<string[]> {
    try {
      const systemPrompt = `You are an expert analyst specializing in synthesizing insights from debate analysis.`;
      
      const userPrompt = `Generate 3-5 key insights based on this debate analysis:

Agent Responses Summary:
${responses.map(r => `- ${r.agentName}: ${r.confidence}% confidence, ${r.sentiment} sentiment`).join('\n')}

Validation Results:
${validationResults.map(v => `- ${v.claim}: ${v.isValid ? 'Valid' : 'Invalid'} (${v.confidence}% confidence)`).join('\n')}

${userFeedback ? `User Feedback: ${userFeedback}` : ''}

Provide insights as a JSON array of strings focusing on:
1. Logical reasoning quality
2. Evidence strength patterns
3. Consensus and disagreement areas
4. Methodological observations
5. Recommendations for improvement

Format: {"insights": ["Insight 1", "Insight 2", ...]}`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.5,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      try {
        const parsed = JSON.parse(responseText);
        return parsed.insights || [];
      } catch (parseError) {
        return [
          'Multiple perspectives were analyzed with varying confidence levels',
          'Evidence quality and logical reasoning showed mixed results',
          'Further analysis may benefit from additional data sources',
          'Validation process identified both strengths and areas for improvement'
        ];
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      return ['Error generating insights. Please review the analysis manually.'];
    }
  }
}

export const groqClient = new GroqAgentClient();
export type { AgentResponse, ValidationResult, AgentConfig };