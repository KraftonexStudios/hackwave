import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unifiedAIClient } from "@/lib/ai/unified-client";

interface ChartRequest {
  query: string;
  chartType?:
    | "bar"
    | "line"
    | "pie"
    | "mermaid"
    | "d3-network"
    | "plotly"
    | "flowchart"
    | "mindmap";
  dataSource?: string;
  visualizationType?: "chart" | "diagram" | "network" | "flow";
}

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartResponse {
  success: boolean;
  data?: ChartData[] | any;
  chartType?:
    | "bar"
    | "line"
    | "pie"
    | "mermaid"
    | "d3-network"
    | "plotly"
    | "flowchart"
    | "mindmap";
  title?: string;
  description?: string;
  error?: string;
  processingTime?: number;
  timestamp?: string;
  mermaidCode?: string;
  plotlyConfig?: any;
  networkData?: {
    nodes: Array<{ id: string; name: string; group?: number }>;
    links: Array<{ source: string; target: string; value?: number }>;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("Charts API - POST request received");

  try {
    // Check authentication
    let user = null;
    let authError = null;
    console.log("Charts API - Starting authentication process");

    try {
      // Try to get user from cookies first (server-side auth)
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.getUser();
        user = data.user;
        authError = error;
        console.log("Charts API - Cookie auth result:", {
          user: !!user,
          error: !!error,
        });
      } catch (cookieError) {
        console.log(
          "Charts API - Cookie auth failed, trying Bearer token:",
          cookieError
        );
        // If cookie auth fails, try Bearer token
        const authHeader = request.headers.get("authorization");
        console.log(
          "Charts API - Auth header:",
          authHeader ? "Bearer token present" : "No auth header"
        );
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          // Create a new Supabase client for Bearer token authentication
          const { createClient: createSupabaseClient } = await import(
            "@supabase/supabase-js"
          );
          const tokenSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            }
          );
          const { data, error } = await tokenSupabase.auth.getUser();
          user = data.user;
          authError = error;
          console.log("Charts API - Bearer auth result:", {
            user: !!user,
            error: !!error,
          });
        }
      }

      if (authError || !user) {
        console.error("Charts API - Authentication failed:", {
          authError,
          hasUser: !!user,
        });
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }

      console.log("Charts API - Authentication successful for user:", user.id);
    } catch (authProcessError) {
      console.error(
        "Charts API - Authentication process error:",
        authProcessError
      );
      return NextResponse.json(
        { success: false, error: "Authentication process failed" },
        { status: 401 }
      );
    }

    const body: ChartRequest = await request.json();
    const { query, chartType = "bar", dataSource, visualizationType } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    // Get AI client
    const aiClient = unifiedAIClient;

    // Create a prompt based on visualization type
    const prompt = generatePromptForVisualizationType(
      query,
      chartType,
      dataSource,
      visualizationType
    );

    // Generate chart data using AI with Groq provider
    const response = await aiClient.generateText({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      maxTokens: 1000,
    }, "groq");

    let chartData;
    try {
      // Try to parse the AI response as JSON
      const aiResponse = response.text.trim();

      // Extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;

      chartData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);

      // Fallback: Generate sample data based on query
      chartData = generateFallbackData(query, chartType);
    }

    const processingTime = Date.now() - startTime;

    // Process response based on chart type
    const result: ChartResponse = processVisualizationResponse(
      chartData,
      chartType,
      query,
      processingTime
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "No valid data generated" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Charts API error:", error);

    const processingTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        processingTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function generatePromptForVisualizationType(
  query: string,
  chartType: string,
  dataSource?: string,
  visualizationType?: string
): string {
  const baseContext = `Query: "${query}"\nChart Type: ${chartType}\nData Source Context: ${
    dataSource || "General analysis"
  }`;

  switch (chartType) {
    case "mermaid":
    case "flowchart":
    case "mindmap":
      return `
You are a diagram expert. Create a Mermaid diagram based on the following query.

${baseContext}

Generate a response with this JSON structure:
{
  "mermaidCode": "graph TD\n    A[Start] --> B[Process]\n    B --> C[End]",
  "title": "Diagram Title",
  "description": "Brief description"
}

Use appropriate Mermaid syntax for ${
        chartType === "flowchart"
          ? "flowcharts"
          : chartType === "mindmap"
          ? "mindmaps"
          : "diagrams"
      }.`;

    case "d3-network":
      return `
You are a network visualization expert. Create network data based on the following query.

${baseContext}

Generate a response with this JSON structure:
{
  "networkData": {
    "nodes": [{"id": "node1", "name": "Node 1", "group": 1}],
    "links": [{"source": "node1", "target": "node2", "value": 1}]
  },
  "title": "Network Title",
  "description": "Brief description"
}

Create 5-15 nodes with meaningful connections.`;

    case "plotly":
      return `
You are a Plotly visualization expert. Create advanced chart configuration based on the following query.

${baseContext}

Generate a response with this JSON structure:
{
  "plotlyConfig": {
    "data": [{"x": [1,2,3], "y": [1,4,2], "type": "scatter"}],
    "layout": {"title": "Chart Title"}
  },
  "title": "Chart Title",
  "description": "Brief description"
}

Use appropriate Plotly chart types and configurations.`;

    default:
      return `
You are a data visualization expert. Based on the following query, generate appropriate chart data and analysis.

${baseContext}

Please provide:
1. A JSON array of data points with 'name' and 'value' properties
2. A descriptive title for the chart
3. A brief description explaining the data
4. Ensure the data is realistic and relevant to the query

Format your response as a JSON object with the following structure:
{
  "data": [
    {"name": "Category 1", "value": 100},
    {"name": "Category 2", "value": 200}
  ],
  "title": "Chart Title",
  "description": "Brief description of the data"
}

Make sure to provide at least 3-8 data points that are meaningful for the query.`;
  }
}

function processVisualizationResponse(
  chartData: any,
  chartType: string,
  query: string,
  processingTime: number
): ChartResponse {
  const baseResponse = {
    success: true,
    chartType: chartType as any,
    title:
      chartData.title ||
      `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Analysis`,
    description: chartData.description || `Analysis results for: ${query}`,
    processingTime,
    timestamp: new Date().toISOString(),
  };

  switch (chartType) {
    case "mermaid":
    case "flowchart":
    case "mindmap":
      if (!chartData.mermaidCode) {
        return { ...baseResponse, success: false };
      }
      return {
        ...baseResponse,
        mermaidCode: chartData.mermaidCode,
      };

    case "d3-network":
      if (!chartData.networkData || !chartData.networkData.nodes) {
        return { ...baseResponse, success: false };
      }
      return {
        ...baseResponse,
        networkData: chartData.networkData,
      };

    case "plotly":
      if (!chartData.plotlyConfig) {
        return { ...baseResponse, success: false };
      }
      return {
        ...baseResponse,
        plotlyConfig: chartData.plotlyConfig,
      };

    default:
      const validatedData = validateChartData(chartData.data || []);
      if (validatedData.length === 0) {
        return { ...baseResponse, success: false };
      }
      return {
        ...baseResponse,
        data: validatedData,
      };
  }
}

function generateFallbackData(query: string, chartType: string): any {
  switch (chartType) {
    case "mermaid":
    case "flowchart":
      return {
        mermaidCode: `graph TD\n    A[${query}] --> B[Analysis]\n    B --> C[Results]\n    C --> D[Conclusion]`,
        title: `${
          chartType.charAt(0).toUpperCase() + chartType.slice(1)
        } Diagram`,
        description: `Generated diagram for: ${query}`,
      };

    case "mindmap":
      return {
        mermaidCode: `mindmap\n  root((${query}))\n    Branch1\n      Idea1\n      Idea2\n    Branch2\n      Concept1\n      Concept2`,
        title: "Mind Map",
        description: `Generated mind map for: ${query}`,
      };

    case "d3-network":
      return {
        networkData: {
          nodes: [
            { id: "center", name: query, group: 1 },
            { id: "node1", name: "Related 1", group: 2 },
            { id: "node2", name: "Related 2", group: 2 },
            { id: "node3", name: "Related 3", group: 3 },
          ],
          links: [
            { source: "center", target: "node1", value: 1 },
            { source: "center", target: "node2", value: 1 },
            { source: "center", target: "node3", value: 1 },
          ],
        },
        title: "Network Diagram",
        description: `Generated network for: ${query}`,
      };

    case "plotly":
      const sampleData = Array.from({ length: 5 }, (_, i) => ({
        x: `Item ${i + 1}`,
        y: Math.floor(Math.random() * 100) + 50,
      }));
      return {
        plotlyConfig: {
          data: [
            {
              x: sampleData.map((d) => d.x),
              y: sampleData.map((d) => d.y),
              type: "bar",
            },
          ],
          layout: {
            title: `Analysis: ${query}`,
          },
        },
        title: "Plotly Chart",
        description: `Generated chart for: ${query}`,
      };

    default:
      const defaultData = [
        { name: "Category A", value: Math.floor(Math.random() * 100) + 50 },
        { name: "Category B", value: Math.floor(Math.random() * 100) + 50 },
        { name: "Category C", value: Math.floor(Math.random() * 100) + 50 },
        { name: "Category D", value: Math.floor(Math.random() * 100) + 50 },
        { name: "Category E", value: Math.floor(Math.random() * 100) + 50 },
      ];
      return {
        data: defaultData,
        title: `${
          chartType.charAt(0).toUpperCase() + chartType.slice(1)
        } Chart`,
        description: `Generated chart data for: ${query}`,
      };
  }
}

function validateChartData(data: any[]): ChartData[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        typeof item.value === "number" &&
        !isNaN(item.value)
    )
    .map((item) => ({
      name: item.name.toString().trim(),
      value: Number(item.value),
      ...Object.fromEntries(
        Object.entries(item).filter(
          ([key]) => key !== "name" && key !== "value"
        )
      ),
    }));
}

// Export the core chart generation logic for internal use
export async function generateChartData(
  query: string,
  chartType:
    | "bar"
    | "line"
    | "pie"
    | "mermaid"
    | "d3-network"
    | "plotly"
    | "flowchart"
    | "mindmap" = "bar",
  dataSource?: string,
  visualizationType?: "chart" | "diagram" | "network" | "flow"
): Promise<ChartResponse> {
  const startTime = Date.now();

  if (!query) {
    return {
      success: false,
      error: "Query is required",
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Get AI client
    const aiClient = unifiedAIClient;

    // Create a prompt based on visualization type
    const prompt = generatePromptForVisualizationType(
      query,
      chartType,
      dataSource,
      visualizationType
    );

    // Generate chart data using AI
    const response = await aiClient.generateText({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      maxTokens: 1000,
    });

    let chartData;
    try {
      // Try to parse the AI response as JSON
      const aiResponse = response.text.trim();

      // Extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;

      chartData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);

      // Fallback: Generate sample data based on query
      chartData = generateFallbackData(query, chartType);
    }

    const processingTime = Date.now() - startTime;

    // Process response based on chart type
    const result: ChartResponse = processVisualizationResponse(
      chartData,
      chartType,
      query,
      processingTime
    );

    return result;
  } catch (error) {
    console.error("Chart generation error:", error);

    const processingTime = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      processingTime,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "Charts API endpoint",
      methods: ["POST"],
      description: "Generate chart data based on queries using AI",
    },
    { status: 200 }
  );
}
