"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TablesInsert, TablesUpdate, Responce } from "@/database.types";

// AI Agent Response interface (different from database Responce)
export interface AgentResponse {
  agentId: string;
  agentName: string;
  response: string;
  confidence: number;
  sentiment: "positive" | "negative" | "neutral";
  processingTime: number;
  reasoning?: string[];
  evidence?: string[];
}

// Response types
export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Create a new agent response
 */
export async function createAgentResponse(
  roundId: string,
  agentId: string,
  content: string,
  responseType:
    | "ARGUMENT"
    | "COUNTER_ARGUMENT"
    | "QUESTION"
    | "SUMMARY"
    | "VALIDATION" = "ARGUMENT",
  metadata?: Record<string, any>
): Promise<ActionResponse<Responce>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // Verify round exists and belongs to user's session
    const { data: round, error: roundError } = await supabase
      .from("debate_rounds")
      .select(
        `
        id,
        debate_sessions!inner (
          id,
          user_id
        )
      `
      )
      .eq("id", roundId)
      .single();

    if (
      roundError ||
      !round ||
      (round as any).debate_sessions.user_id !== userId
    ) {
      return {
        success: false,
        error: "Round not found or access denied",
      };
    }

    // Verify agent exists and belongs to user
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      return {
        success: false,
        error: "Agent not found or inactive",
      };
    }

    const responseData: TablesInsert<"agent_responses"> = {
      round_id: roundId,
      agent_id: agentId,
      response: content,
      status: "SUBMITTED",
    };

    const { data, error } = await supabase
      .from("agent_responses")
      .insert(responseData)
      .select(
        `
        *,
        agents (
          id,
          name,
          description
        ),
        debate_rounds (
          id,
          round_number,
          topic
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating agent response:", error);
      return {
        success: false,
        error: "Failed to create agent response",
      };
    }

    revalidatePath(`/dashboard/sessions`);
    revalidatePath(`/dashboard/rounds/${roundId}`);

    return {
      success: true,
      data,
      message: "Agent response created successfully",
    };
  } catch (error) {
    console.error("Error in createAgentResponse:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get all responses for a specific round
 */
export async function getRoundResponses(
  roundId: string
): Promise<ActionResponse<Responce[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // Verify round exists and belongs to user's session
    const { data: round, error: roundError } = await supabase
      .from("debate_rounds")
      .select(
        `
        id,
        debate_sessions!inner (
          id,
          user_id
        )
      `
      )
      .eq("id", roundId)
      .single();

    if (
      roundError ||
      !round ||
      (round as any).debate_sessions.user_id !== userId
    ) {
      return {
        success: false,
        error: "Round not found or access denied",
      };
    }

    const { data: responses, error } = await supabase
      .from("agent_responses")
      .select(
        `
        *,
        agents (
          id,
          name,
          description
        ),
        user_feedback (
          id,
          feedback_type,
          rating,
          comments
        )
      `
      )
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching round responses:", error);
      return {
        success: false,
        error: "Failed to fetch round responses",
      };
    }

    return {
      success: true,
      data: responses || [],
    };
  } catch (error) {
    console.error("Error in getRoundResponses:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update agent response status
 */
export async function updateResponseStatus(
  responseId: string,
  status: "SUBMITTED" | "VALIDATED" | "ACCEPTED" | "REJECTED"
): Promise<ActionResponse<Responce>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // Verify response exists and belongs to user's session
    const { data: response, error: responseError } = await supabase
      .from("agent_responses")
      .select(
        `
        id,
        debate_rounds!inner (
          id,
          debate_sessions!inner (
            id,
            user_id
          )
        )
      `
      )
      .eq("id", responseId)
      .single();

    if (
      responseError ||
      !response ||
      (response as any).debate_rounds.debate_sessions.user_id !== userId
    ) {
      return {
        success: false,
        error: "Response not found or access denied",
      };
    }

    const { data, error } = await supabase
      .from("agent_responses")
      .update({
        status,
      })
      .eq("id", responseId)
      .select(
        `
        *,
        agents (
          id,
          name,
          description
        ),
        debate_rounds (
          id,
          round_number,
          topic
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating response status:", error);
      return {
        success: false,
        error: "Failed to update response status",
      };
    }

    revalidatePath(`/dashboard/sessions`);
    revalidatePath(`/dashboard/rounds/${(response as any).debate_rounds.id}`);

    return {
      success: true,
      data,
      message: `Response status updated to ${status}`,
    };
  } catch (error) {
    console.error("Error in updateResponseStatus:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete an agent response
 */
export async function deleteAgentResponse(
  responseId: string
): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // Verify response exists and belongs to user's session
    const { data: response, error: responseError } = await supabase
      .from("agent_responses")
      .select(
        `
        id,
        debate_rounds!inner (
          id,
          debate_sessions!inner (
            id,
            user_id
          )
        )
      `
      )
      .eq("id", responseId)
      .single();

    if (
      responseError ||
      !response ||
      (response as any).debate_rounds.debate_sessions.user_id !== userId
    ) {
      return {
        success: false,
        error: "Response not found or access denied",
      };
    }

    const { error } = await supabase
      .from("agent_responses")
      .delete()
      .eq("id", responseId);

    if (error) {
      console.error("Error deleting agent response:", error);
      return {
        success: false,
        error: "Failed to delete agent response",
      };
    }

    revalidatePath(`/dashboard/sessions`);
    revalidatePath(`/dashboard/rounds/${(response as any).debate_rounds.id}`);

    return {
      success: true,
      message: "Agent response deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteAgentResponse:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get responses by agent for a specific session
 */
export async function getAgentResponsesInSession(
  sessionId: string,
  agentId: string
): Promise<ActionResponse<Responce[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from("debate_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: "Session not found or access denied",
      };
    }

    const { data: responses, error } = await supabase
      .from("agent_responses")
      .select(
        `
        *,
        agents (
          id,
          name,
          description
        ),
        debate_rounds (
          id,
          round_number,
          topic,
          session_id
        ),
        user_feedback (
          id,
          feedback_type,
          rating,
          comments
        )
      `
      )
      .eq("agent_id", agentId)
      .eq("debate_rounds.session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching agent responses in session:", error);
      return {
        success: false,
        error: "Failed to fetch agent responses",
      };
    }

    return {
      success: true,
      data: responses || [],
    };
  } catch (error) {
    console.error("Error in getAgentResponsesInSession:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update agent response content and metadata
 */
export async function updateAgentResponse(
  responseId: string,
  updates: {
    response?: string;
    reasoning?: string;
    confidence?: number;
  }
): Promise<ActionResponse<Responce>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // Verify response exists and belongs to user's session
    const { data: response, error: responseError } = await supabase
      .from("agent_responses")
      .select(
        `
        id,
        debate_rounds!inner (
          id,
          debate_sessions!inner (
            id,
            user_id
          )
        )
      `
      )
      .eq("id", responseId)
      .single();

    if (
      responseError ||
      !response ||
      (response as any).debate_rounds.debate_sessions.user_id !== userId
    ) {
      return {
        success: false,
        error: "Response not found or access denied",
      };
    }

    const { data, error } = await supabase
      .from("agent_responses")
      .update(updates)
      .eq("id", responseId)
      .select(
        `
        *,
        agents (
          id,
          name,
          role,
          description
        ),
        debate_rounds (
          id,
          round_number,
          topic
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating agent response:", error);
      return {
        success: false,
        error: "Failed to update agent response",
      };
    }

    revalidatePath(`/dashboard/sessions`);
    revalidatePath(`/dashboard/rounds/${(response as any).debate_rounds.id}`);

    return {
      success: true,
      data,
      message: "Agent response updated successfully",
    };
  } catch (error) {
    console.error("Error in updateAgentResponse:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
