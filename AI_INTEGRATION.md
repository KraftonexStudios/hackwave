# AI Integration Documentation

## Overview

This system has been upgraded to use real AI providers (Gemini and Groq) instead of mock data, focusing on logical reasoning and evidence-based analysis.

## Supported AI Providers

### 1. Google Gemini (Default)

- **Model**: Gemini-1.5-Pro
- **Strengths**: Advanced reasoning, comprehensive analysis, structured responses
- **Use Case**: Complex logical analysis, evidence evaluation, balanced perspectives

### 2. Groq (Alternative)

- **Model**: Llama-3.1-70B-Versatile
- **Strengths**: Fast inference, structured JSON responses, consistent formatting
- **Use Case**: High-throughput analysis, rapid prototyping, cost-effective processing

## Configuration

### Environment Variables

```bash
# Choose your AI provider
AI_PROVIDER=gemini  # or 'groq'

# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Groq Configuration
GROQ_API_KEY=your_groq_api_key_here
```

### Getting API Keys

#### Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env.local` file

#### Groq API Key

1. Visit [Groq Console](https://console.groq.com/keys)
2. Create a new API key
3. Copy the key to your `.env.local` file

## Agent System Architecture

### Agent Roles

1. **Advocate Agent (Dr. Sarah Chen)**

   - Constructs compelling arguments supporting positions
   - Provides evidence-based reasoning
   - Uses deductive, inductive, and abductive logic
   - Addresses counterarguments proactively

2. **Opponent Agent (Prof. Michael Torres)**

   - Systematically challenges positions
   - Identifies risks and unintended consequences
   - Points out logical fallacies and weak evidence
   - Presents alternative perspectives

3. **Moderator Agent (Dr. Elena Rodriguez)**
   - Provides balanced analysis of multiple perspectives
   - Synthesizes insights from different viewpoints
   - Identifies common ground and disagreements
   - Offers decision-making frameworks

### AI Processing Pipeline

1. **Query Processing**

   - User submits a query/topic
   - System distributes to all active agents
   - Each agent processes with role-specific prompts

2. **Parallel Agent Processing**

   - Agents generate responses simultaneously
   - Each response includes:
     - Main argument/position
     - Supporting evidence (3-5 points)
     - Logical reasoning chain
     - Confidence score (1-100)
     - Potential limitations

3. **Validation & Analysis**

   - AI validator analyzes all responses
   - Checks for logical consistency
   - Evaluates evidence quality
   - Identifies logical fallacies
   - Generates validation results

4. **Insight Generation**
   - AI synthesizes key insights
   - Analyzes reasoning patterns
   - Identifies consensus areas
   - Provides improvement recommendations

## Response Structure

### Agent Response Format

```typescript
interface AgentResponse {
  agentId: string;
  agentName: string;
  response: string; // Main formatted response
  confidence: number; // 1-100 confidence score
  sentiment: "positive" | "negative" | "neutral";
  processingTime: number; // Processing time in ms
  reasoning: string[]; // Logical reasoning steps
  evidence: string[]; // Supporting evidence sources
}
```

### Validation Result Format

```typescript
interface ValidationResult {
  id: string;
  claim: string; // Specific claim being validated
  isValid: boolean; // Validation result
  confidence: number; // Validation confidence (1-100)
  evidence: string; // Detailed validation explanation
  logicalFallacies: string[]; // Identified fallacies
  supportingFacts: string[]; // Supporting evidence
}
```

## Key Features

### 1. Real Logical Reasoning

- **Deductive Logic**: Premises → Conclusions
- **Inductive Logic**: Patterns → Generalizations
- **Abductive Logic**: Observations → Best Explanations
- **Fallacy Detection**: Identifies common logical errors

### 2. Evidence-Based Analysis

- Cites specific examples and case studies
- References statistical data when available
- Evaluates source credibility
- Cross-references multiple perspectives

### 3. Confidence Scoring

- Based on evidence strength
- Considers reasoning quality
- Accounts for uncertainty
- Provides justification for scores

### 4. Interactive Validation

- User can select specific claims
- Provide feedback on analysis quality
- Trigger additional rounds of analysis
- Generate comprehensive reports

## Performance Considerations

### Gemini

- **Latency**: 2-5 seconds per request
- **Quality**: High reasoning quality
- **Cost**: Moderate
- **Rate Limits**: 60 requests/minute

### Groq

- **Latency**: 0.5-2 seconds per request
- **Quality**: Good reasoning quality
- **Cost**: Lower
- **Rate Limits**: 30 requests/minute

## Error Handling

### Fallback Mechanisms

1. **AI Service Failure**: Falls back to structured templates
2. **Rate Limiting**: Implements exponential backoff
3. **Invalid Responses**: Uses parsing fallbacks
4. **Network Issues**: Provides cached responses when possible

### Monitoring

- Processing time tracking
- Confidence score analysis
- Error rate monitoring
- User feedback collection

## Usage Examples

### Basic Query

```
Input: "Should companies implement remote work policies?"

Output:
- Advocate: Presents benefits (productivity, cost savings, employee satisfaction)
- Opponent: Highlights challenges (communication, culture, management)
- Moderator: Synthesizes both perspectives with balanced recommendations
- Validator: Checks logical consistency and evidence quality
```

### Complex Analysis

```
Input: "Evaluate the effectiveness of carbon pricing mechanisms"

Output:
- Multi-round analysis with economic, environmental, and policy perspectives
- Evidence from multiple jurisdictions and studies
- Validation of economic models and assumptions
- Comprehensive report with actionable insights
```

## Best Practices

1. **Query Formulation**

   - Be specific and clear
   - Provide context when helpful
   - Avoid overly broad topics

2. **Result Interpretation**

   - Consider confidence scores
   - Review validation results
   - Look for consensus patterns
   - Note identified limitations

3. **Iterative Analysis**
   - Use feedback to refine analysis
   - Explore different angles
   - Build on previous rounds
   - Generate comprehensive reports

## Troubleshooting

### Common Issues

1. **"AI service configuration error"**

   - Check API keys in environment variables
   - Verify API key permissions
   - Ensure correct AI_PROVIDER setting

2. **Low confidence scores**

   - Provide more specific queries
   - Add relevant context
   - Consider topic complexity

3. **Validation failures**
   - Review logical consistency
   - Check evidence quality
   - Consider alternative perspectives

### Support

For technical issues or questions about the AI integration:

1. Check environment configuration
2. Review API provider documentation
3. Monitor system logs for detailed error messages
4. Consider switching AI providers if issues persist
