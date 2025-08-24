import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unifiedAIClient } from "@/lib/ai/unified-client";

interface GlobalVisualizerRequest {
  query: string;
  visualizationType?:
    | "auto"
    | "chart"
    | "diagram"
    | "network"
    | "flow"
    | "mindmap";
  context?: string;
  dataType?: string;
}

interface GlobalVisualizerResponse {
  query: string;
  visualizationType: string;
  chartType?: string;
  data?: any[];
  mermaidCode?: string;
  plotlyConfig?: any;
  networkData?: {
    nodes: Array<{ id: string; name: string; group: number }>;
    links: Array<{ source: string; target: string; value: number }>;
  };
  title: string;
  description: string;
  timestamp: string;
  processingTime: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await (await supabase).auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    const body: GlobalVisualizerRequest = await request.json();
    const { query, visualizationType = "auto", context, dataType } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const aiClient = unifiedAIClient;
    const prompt = generateVisualizationPrompt(
      query,
      visualizationType,
      context,
      dataType
    );

    try {
      const aiResponse = await aiClient.generateText(prompt);
      const responseText = aiResponse.text || "";

      // Try to extract JSON from the response
      let parsedResponse;
      try {
        const jsonMatch =
          responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
          responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.warn(
          "Failed to parse AI response, using fallback:",
          parseError
        );
        parsedResponse = generateFallbackVisualization(
          query,
          visualizationType
        );
      }

      const processingTime = Date.now() - startTime;
      const response = processVisualizationData(
        parsedResponse,
        query,
        processingTime
      );

      return NextResponse.json(response);
    } catch (aiError) {
      console.error("AI generation failed:", aiError);
      const processingTime = Date.now() - startTime;
      const fallbackResponse = generateFallbackVisualization(
        query,
        visualizationType
      );
      const response = processVisualizationData(
        fallbackResponse,
        query,
        processingTime
      );

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error("Global visualizer API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateVisualizationPrompt(
  query: string,
  visualizationType: string,
  context?: string,
  dataType?: string
): string {
  const basePrompt = `
Analyze the following query and create the most appropriate visualization:

Query: "${query}"
Visualization Type: ${visualizationType}
${context ? `Context: ${context}` : ""}
${dataType ? `Data Type: ${dataType}` : ""}

Based on the query, determine the best visualization approach and provide the response in JSON format.

For different visualization types, provide:

1. **Charts** (bar, line, pie): Provide 'data' array with objects containing name, value, and other relevant fields
2. **Mermaid Diagrams**: Provide 'mermaidCode' with valid Mermaid syntax for flowcharts, sequence diagrams, etc.
3. **Network Graphs**: Provide 'networkData' with nodes and links arrays
4. **Plotly**: Provide 'plotlyConfig' with Plotly.js configuration

Response format:
\`\`\`json
{
  "visualizationType": "chart|mermaid|d3-network|plotly",
  "chartType": "bar|line|pie|flowchart|mindmap|etc",
  "title": "Descriptive title",
  "description": "Brief description of the visualization",
  "data": [...] // For chart types
  "mermaidCode": "..." // For Mermaid diagrams
  "networkData": {...} // For network graphs
  "plotlyConfig": {...} // For Plotly charts
}
\`\`\`

Choose the visualization type that best represents the data or concept in the query.
`;

  return basePrompt;
}

function processVisualizationData(
  parsedResponse: any,
  query: string,
  processingTime: number
): GlobalVisualizerResponse {
  const response: GlobalVisualizerResponse = {
    query,
    visualizationType: parsedResponse.visualizationType || "chart",
    title: parsedResponse.title || "Generated Visualization",
    description:
      parsedResponse.description ||
      "AI-generated visualization based on your query",
    timestamp: new Date().toISOString(),
    processingTime,
  };

  // Add type-specific data
  if (parsedResponse.chartType) {
    response.chartType = parsedResponse.chartType;
  }

  if (parsedResponse.data) {
    response.data = parsedResponse.data;
  }

  if (parsedResponse.mermaidCode) {
    response.mermaidCode = parsedResponse.mermaidCode;
  }

  if (parsedResponse.plotlyConfig) {
    response.plotlyConfig = parsedResponse.plotlyConfig;
  }

  if (parsedResponse.networkData) {
    response.networkData = parsedResponse.networkData;
  }

  return response;
}

function generateFallbackVisualization(
  query: string,
  visualizationType: string
): any {
  const fallbackData = {
    visualizationType: "chart",
    chartType: "bar",
    title: `Analysis: ${query}`,
    description: "Sample visualization generated from your query",
    data: [
      { name: "Category A", value: 30, color: "#8884d8" },
      { name: "Category B", value: 45, color: "#82ca9d" },
      { name: "Category C", value: 25, color: "#ffc658" },
      { name: "Category D", value: 60, color: "#ff7c7c" },
      { name: "Category E", value: 35, color: "#8dd1e1" },
    ],
  };

  // Customize based on visualization type
  if (visualizationType === "diagram" || visualizationType === "flow") {
    return {
      visualizationType: "mermaid",
      chartType: "flowchart",
      title: `Process Flow: ${query}`,
      description: "Generated process flow diagram",
      mermaidCode: `
flowchart TD
    A[Start: ${query}] --> B[Process Data]
    B --> C{Decision Point}
    C -->|Yes| D[Action 1]
    C -->|No| E[Action 2]
    D --> F[Result]
    E --> F
    F --> G[End]
`,
    };
  }

  if (visualizationType === "network") {
    return {
      visualizationType: "d3-network",
      chartType: "d3-network",
      title: `Network: ${query}`,
      description: "Generated network visualization",
      networkData: {
        nodes: [
          { id: "node1", name: "Central Node", group: 1 },
          { id: "node2", name: "Connected A", group: 2 },
          { id: "node3", name: "Connected B", group: 2 },
          { id: "node4", name: "Connected C", group: 3 },
          { id: "node5", name: "Connected D", group: 3 },
        ],
        links: [
          { source: "node1", target: "node2", value: 10 },
          { source: "node1", target: "node3", value: 15 },
          { source: "node2", target: "node4", value: 8 },
          { source: "node3", target: "node5", value: 12 },
        ],
      },
    };
  }

  return fallbackData;
}

export async function GET() {
  return NextResponse.json({
    message: "Global Visualizer API",
    description: "AI-powered visualization generation endpoint",
    supportedTypes: ["auto", "chart", "diagram", "network", "flow", "mindmap"],
  });
}
