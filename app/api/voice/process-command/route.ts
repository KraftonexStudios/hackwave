import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { command, userContext } = await request.json();

    if (!command) {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a voice command processor for a Multi-Agent AI Debate System. 
          Available routes: ${JSON.stringify({
            "/": "Home - Landing page with project overview",
            "/dashboard":
              "Dashboard - Main control panel with session overview",
            "/dashboard/agents":
              "AI Agents - Create and manage AI agents for debates",
            "/dashboard/sessions":
              "Flow Sessions - Manage multi-agent debate sessions",
            "/dashboard/analytics":
              "Analytics - Performance metrics and insights",
          })}.
          Current path: ${userContext?.currentPath || "/"}.
          User context: ${JSON.stringify(userContext)}.
          
          This system is designed for:
          - Managing AI agents for debates
          - Creating and monitoring multi-agent sessions
          - Analyzing debate performance and insights
          - Flow-based AI processing
          
          IMPORTANT: You must respond with ONLY a valid JSON object, no other text or explanation.
          The JSON must follow this exact structure:
          {
            "intent": "navigation" | "query" | "action" | "system",
            "action": string,
            "targetPath": string | null,
            "parameters": object | null,
            "confidence": number,
            "response": string
          }
          
          Example valid response:
          {"intent":"navigation","action":"navigate","targetPath":"/dashboard/agents","parameters":null,"confidence":0.95,"response":"Navigating to AI Agents Management"}`,
        },
        {
          role: "user",
          content: command,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI model");
    }

    const result = JSON.parse(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing voice command:", error);
    return NextResponse.json(
      { error: "Failed to process command" },
      { status: 500 }
    );
  }
}
