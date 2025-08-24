'use client';

import React from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const testMarkdownContent = `# Chart Rendering Test

This page tests various chart and diagram rendering capabilities based on the actual system patterns.

## Mermaid Flowchart Test

\`\`\`mermaid
flowchart TD
    A[User Query] --> B[Query Distributor]
    B --> C[Agent 1: Analyst]
    B --> D[Agent 2: Critic]
    B --> E[Agent 3: Validator]
    C --> F[Response 1]
    D --> G[Response 2]
    E --> H[Response 3]
    F --> I[Validation Engine]
    G --> I
    H --> I
    I --> J[Final Report]
\`\`\`

## Mermaid Sequence Diagram Test

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant S as System
    participant A1 as Agent 1
    participant A2 as Agent 2
    participant V as Validator
    
    U->>S: Submit Query
    S->>A1: Process Query
    S->>A2: Process Query
    A1->>S: Response 1
    A2->>S: Response 2
    S->>V: Validate Responses
    V->>S: Validation Results
    S->>U: Final Report
\`\`\`

## Chart.js Bar Chart Test

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

## Chart.js Line Chart Test

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

## Chart.js Pie Chart Test

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

## Simple Code Block Test

\`\`\`javascript
const agentResponse = {
  id: 'agent-001',
  confidence: 0.85,
  response: 'Analysis complete',
  processingTime: 1200
};
console.log('Agent response:', agentResponse);
\`\`\`

## Inline code test

This response has a confidence level of \`85%\` and processing time of \`1.2 seconds\`.`;

export default function ChartsTestPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chart Rendering Debug Page</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownRenderer content={testMarkdownContent} />
        </CardContent>
      </Card>
    </div>
  );
}