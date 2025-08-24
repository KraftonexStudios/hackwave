import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unifiedAIClient } from "@/lib/ai/unified-client";

interface ProsConsRequest {
  query: string;
  question?: string;
  context?: string;
  includeWeights?: boolean;
  includeCategories?: boolean;
}

interface ProsConsItem {
  point: string;
  weight?: number;
  category?: string;
}

interface ProsConsResponse {
  success: boolean;
  pros?: ProsConsItem[];
  cons?: ProsConsItem[];
  summary?: string;
  recommendation?: string;
  error?: string;
  processingTime?: number;
  timestamp?: string;
  totalPros?: number;
  totalCons?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("Proscons API - POST request received");

  try {
    // Check authentication
    let user = null;
    let authError = null;
    console.log("Proscons API - Starting authentication process");

    try {
      // Try to get user from cookies first (server-side auth)
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.getUser();
        user = data.user;
        authError = error;
        console.log("Proscons API - Cookie auth result:", {
          user: !!user,
          error: !!error,
        });
      } catch (cookieError) {
        console.log(
          "Proscons API - Cookie auth failed, trying Bearer token:",
          cookieError
        );
        // If cookie auth fails, try Bearer token
        const authHeader = request.headers.get("authorization");
        console.log(
          "Proscons API - Auth header:",
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
          console.log("Proscons API - Bearer auth result:", {
            user: !!user,
            error: !!error,
          });
        }
      }

      if (authError || !user) {
        console.error("Proscons API - Authentication failed:", {
          authError,
          hasUser: !!user,
        });
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }

      console.log(
        "Proscons API - Authentication successful for user:",
        user.id
      );
    } catch (authProcessError) {
      console.error(
        "Proscons API - Authentication process error:",
        authProcessError
      );
      return NextResponse.json(
        { success: false, error: "Authentication process failed" },
        { status: 401 }
      );
    }

    const body: ProsConsRequest = await request.json();
    const {
      query,
      question,
      context,
      includeWeights = true,
      includeCategories = true,
    } = body;

    if (!query && !question) {
      return NextResponse.json(
        { success: false, error: "Query or question is required" },
        { status: 400 }
      );
    }

    const analysisSubject = query || question || "";

    // Get AI client
    const aiClient = unifiedAIClient;

    // Create a comprehensive prompt for pros and cons analysis
    const prompt = `
You are an expert analyst specializing in balanced decision-making and critical thinking. Analyze the following topic and provide a comprehensive pros and cons analysis.

Topic: "${analysisSubject}"
${context ? `Context: ${context}` : ""}

Please provide:
1. A list of pros (advantages, benefits, positive aspects)
2. A list of cons (disadvantages, risks, negative aspects)
3. A balanced summary of the analysis
4. A recommendation based on the analysis

${
  includeWeights ? "5. Weight each point from 1-5 (5 being most important)" : ""
}
${
  includeCategories
    ? '6. Categorize each point (e.g., "Financial", "Technical", "Social", "Environmental", etc.)'
    : ""
}

Format your response as a JSON object with the following structure:
{
  "pros": [
    {
      "point": "Detailed description of the advantage",
      ${includeWeights ? '"weight": 4,' : ""}
      ${includeCategories ? '"category": "Category Name"' : ""}
    }
  ],
  "cons": [
    {
      "point": "Detailed description of the disadvantage",
      ${includeWeights ? '"weight": 3,' : ""}
      ${includeCategories ? '"category": "Category Name"' : ""}
    }
  ],
  "summary": "A balanced summary of the key points from both sides",
  "recommendation": "Your recommendation based on the analysis"
}

Provide at least 3-7 points for both pros and cons. Be thorough, objective, and consider multiple perspectives.`;

    // Generate pros and cons analysis using AI with Groq provider
    const response = await aiClient.generateText({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      maxTokens: 2000,
    }, "groq");

    let analysisData;
    try {
      // Try to parse the AI response as JSON
      const aiResponse = response.text.trim();

      // Extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;

      analysisData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);

      // Fallback: Generate sample data
      analysisData = generateFallbackAnalysis(analysisSubject);
    }

    // Validate and clean the data
    const validatedPros = validateProsConsItems(analysisData.pros || []);
    const validatedCons = validateProsConsItems(analysisData.cons || []);

    if (validatedPros.length === 0 && validatedCons.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid analysis data generated" },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    const result: ProsConsResponse = {
      success: true,
      pros: validatedPros,
      cons: validatedCons,
      summary: analysisData.summary || "Analysis completed successfully.",
      recommendation:
        analysisData.recommendation ||
        "Consider all factors carefully before making a decision.",
      totalPros: validatedPros.length,
      totalCons: validatedCons.length,
      processingTime,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Pros/Cons API error:", error);

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

function generateFallbackAnalysis(topic: string): any {
  return {
    pros: [
      {
        point: `Potential benefits and advantages related to ${topic}`,
        weight: 4,
        category: "General",
      },
      {
        point: `Positive outcomes that could result from ${topic}`,
        weight: 3,
        category: "Impact",
      },
      {
        point: `Opportunities for improvement through ${topic}`,
        weight: 3,
        category: "Opportunity",
      },
    ],
    cons: [
      {
        point: `Potential risks and challenges with ${topic}`,
        weight: 4,
        category: "Risk",
      },
      {
        point: `Possible negative consequences of ${topic}`,
        weight: 3,
        category: "Impact",
      },
      {
        point: `Resource requirements and costs for ${topic}`,
        weight: 3,
        category: "Cost",
      },
    ],
    summary: `This analysis examines the key advantages and disadvantages of ${topic}. Both positive and negative aspects should be carefully considered.`,
    recommendation: `Evaluate the specific context and requirements before proceeding with ${topic}.`,
  };
}

function validateProsConsItems(items: any[]): ProsConsItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.point === "string" &&
        item.point.trim().length > 0
    )
    .map((item) => {
      const validatedItem: ProsConsItem = {
        point: item.point.toString().trim(),
      };

      // Add weight if provided and valid
      if (
        typeof item.weight === "number" &&
        item.weight >= 1 &&
        item.weight <= 5
      ) {
        validatedItem.weight = Math.round(item.weight);
      }

      // Add category if provided and valid
      if (
        typeof item.category === "string" &&
        item.category.trim().length > 0
      ) {
        validatedItem.category = item.category.toString().trim();
      }

      return validatedItem;
    });
}

// Export the core pros/cons generation logic for internal use
export async function generateProsConsAnalysis(
  query: string,
  question?: string,
  context?: string,
  includeWeights: boolean = true,
  includeCategories: boolean = true
): Promise<ProsConsResponse> {
  const startTime = Date.now();

  if (!query && !question) {
    return {
      success: false,
      error: "Query or question is required",
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  const analysisSubject = query || question || "";

  try {
    // Get AI client
    const aiClient = unifiedAIClient;

    // Create a comprehensive prompt for pros and cons analysis
    const prompt = `
You are an expert analyst specializing in balanced decision-making and critical thinking. Analyze the following topic and provide a comprehensive pros and cons analysis.

Topic: "${analysisSubject}"
${context ? `Context: ${context}` : ""}

Please provide:
1. A list of pros (advantages, benefits, positive aspects)
2. A list of cons (disadvantages, risks, negative aspects)
3. A balanced summary of the analysis
4. A recommendation based on the analysis

${
  includeWeights ? "5. Weight each point from 1-5 (5 being most important)" : ""
}
${
  includeCategories
    ? '6. Categorize each point (e.g., "Financial", "Technical", "Social", "Environmental", etc.)'
    : ""
}

Format your response as a JSON object with the following structure:
{
  "pros": [
    {
      "point": "Detailed description of the advantage",
      ${includeWeights ? '"weight": 4,' : ""}
      ${includeCategories ? '"category": "Category Name"' : ""}
    }
  ],
  "cons": [
    {
      "point": "Detailed description of the disadvantage",
      ${includeWeights ? '"weight": 3,' : ""}
      ${includeCategories ? '"category": "Category Name"' : ""}
    }
  ],
  "summary": "A balanced summary of the key points from both sides",
  "recommendation": "Your recommendation based on the analysis"
}

Provide at least 3-7 points for both pros and cons. Be thorough, objective, and consider multiple perspectives.`;

    // Generate pros and cons analysis using AI
    const response = await aiClient.generateText({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      maxTokens: 2000,
    });

    let analysisData;
    try {
      // Try to parse the AI response as JSON
      const aiResponse = response.text.trim();

      // Extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;

      analysisData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);

      // Fallback: Generate sample data
      analysisData = generateFallbackAnalysis(analysisSubject);
    }

    // Validate and clean the data
    const validatedPros = validateProsConsItems(analysisData.pros || []);
    const validatedCons = validateProsConsItems(analysisData.cons || []);

    if (validatedPros.length === 0 && validatedCons.length === 0) {
      return {
        success: false,
        error: "No valid analysis data generated",
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const processingTime = Date.now() - startTime;

    const result: ProsConsResponse = {
      success: true,
      pros: validatedPros,
      cons: validatedCons,
      summary: analysisData.summary || "Analysis completed successfully.",
      recommendation:
        analysisData.recommendation ||
        "Consider all factors carefully before making a decision.",
      totalPros: validatedPros.length,
      totalCons: validatedCons.length,
      processingTime,
      timestamp: new Date().toISOString(),
    };

    return result;
  } catch (error) {
    console.error("Pros/Cons generation error:", error);

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
      message: "Pros/Cons API endpoint",
      methods: ["POST"],
      description: "Generate pros and cons analysis based on queries using AI",
    },
    { status: 200 }
  );
}
