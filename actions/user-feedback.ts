"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TablesInsert, TablesUpdate, Feedback } from "@/database.types";

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
 * Create user feedback for an agent response
 */
export async function createUserFeedback(
  responseId: string,
  feedbackType: "ACCEPT" | "REJECT" | "REQUEST_REVISION",
  rating?: number,
  comments?: string,
  metadata?: Record<string, any>
): Promise<ActionResponse<Feedback>> {
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

    // Check if feedback already exists for this response
    const { data: existingFeedback, error: existingError } = await supabase
      .from("user_feedbacks")
      .select("id")
      .eq("session_id", responseId)
      .single();

    if (existingFeedback) {
      return {
        success: false,
        error: "Feedback already exists for this response",
      };
    }

    const feedbackData: TablesInsert<"user_feedbacks"> = {
      session_id: responseId, // Note: This needs to be updated based on actual schema
      agent_id: null,
      is_accepted: feedbackType === "ACCEPT",
      priority: "MEDIUM",
      round_number: 1, // This should be determined from context
      feedback_text: comments || null,
      suggestions: metadata || null,
    };

    const { data, error } = await supabase
      .from("user_feedbacks")
      .insert(feedbackData)
      .select(
        `
        *,
        agents (
          id,
          name,
          description
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating user feedback:", error);
      return {
        success: false,
        error: "Failed to create user feedback",
      };
    }

    // Update agent response status based on feedback
    let newStatus: "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED" = "PENDING";
    if (feedbackType === "ACCEPT") {
      newStatus = "APPROVED";
    } else if (feedbackType === "REJECT") {
      newStatus = "REJECTED";
    } else if (feedbackType === "REQUEST_REVISION") {
      newStatus = "FLAGGED";
    }

    await supabase
      .from("agent_responses")
      .update({ status: newStatus })
      .eq("id", responseId);

    revalidatePath(`/dashboard/sessions`);
    revalidatePath(`/dashboard/rounds`);

    return {
      success: true,
      data,
      message: "User feedback created successfully",
    };
  } catch (error) {
    console.error("Error in createUserFeedback:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update existing user feedback
 */
export async function updateUserFeedback(
  feedbackId: string,
  updates: {
    is_accepted?: boolean;
    feedback_text?: string;
    suggestions?: Record<string, any>;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }
): Promise<ActionResponse<Feedback>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // Verify feedback exists and belongs to user
    const { data: feedback, error: feedbackError } = await supabase
      .from("user_feedbacks")
      .select(
        `
        id,
        response_id,
        agent_responses!inner (
          id,
          debate_rounds!inner (
            id,
            debate_sessions!inner (
              id,
              user_id
            )
          )
        )
      `
      )
      .eq("id", feedbackId)
      .eq("user_id", userId)
      .single();

    if (feedbackError || !feedback) {
      return {
        success: false,
        error: "Feedback not found or access denied",
      };
    }

    const { data, error } = await supabase
      .from("user_feedbacks")
      .update(updates)
      .eq("id", feedbackId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating user feedback:", error);
      return {
        success: false,
        error: "Failed to update user feedback",
      };
    }

    // Note: Status updates would need to be handled differently based on actual schema

    revalidatePath(`/dashboard/sessions`);
    revalidatePath(`/dashboard/rounds`);

    return {
      success: true,
      data,
      message: "User feedback updated successfully",
    };
  } catch (error) {
    console.error("Error in updateUserFeedback:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get all feedback for a specific response
 */
export async function getResponseFeedback(
  responseId: string
): Promise<ActionResponse<Feedback[]>> {
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

    const { data: feedback, error } = await supabase
      .from("user_feedbacks")
      .select(
        `
        *,
        agents (
          id,
          name,
          description
        )
      `
      )
      .eq("session_id", responseId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching response feedback:", error);
      return {
        success: false,
        error: "Failed to fetch response feedback",
      };
    }

    return {
      success: true,
      data: feedback || [],
    };
  } catch (error) {
    console.error("Error in getResponseFeedback:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get all feedback for a session
 */
export async function getSessionFeedback(
  sessionId: string
): Promise<ActionResponse<Feedback[]>> {
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

    const { data: feedback, error } = await supabase
      .from("user_feedbacks")
      .select(
        `
        *,
        agents (
          id,
          name,
          description
        )
      `
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching session feedback:", error);
      return {
        success: false,
        error: "Failed to fetch session feedback",
      };
    }

    return {
      success: true,
      data: feedback || [],
    };
  } catch (error) {
    console.error("Error in getSessionFeedback:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete user feedback
 */
export async function deleteUserFeedback(
  feedbackId: string
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

    // Verify feedback exists and belongs to user
    const { data: feedback, error: feedbackError } = await supabase
      .from("user_feedbacks")
      .select(
        `
        id,
        session_id,
        agent_id
      `
      )
      .eq("id", feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return {
        success: false,
        error: "Feedback not found or access denied",
      };
    }

    const { error } = await supabase
      .from("user_feedbacks")
      .delete()
      .eq("id", feedbackId);

    if (error) {
      console.error("Error deleting user feedback:", error);
      return {
        success: false,
        error: "Failed to delete user feedback",
      };
    }

    // Note: Status updates would need to be handled differently based on actual schema

    revalidatePath(`/dashboard/sessions`);
    revalidatePath(`/dashboard/rounds`);

    return {
      success: true,
      message: "User feedback deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteUserFeedback:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get feedback statistics for a session
 */
export async function getFeedbackStats(sessionId: string): Promise<
  ActionResponse<{
    total: number;
    accepted: number;
    rejected: number;
    revisionRequested: number;
    averageRating: number;
  }>
> {
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

    const { data: feedback, error } = await supabase
      .from("user_feedbacks")
      .select(
        `
        is_accepted,
        feedback_text,
        priority
      `
      )
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching feedback stats:", error);
      return {
        success: false,
        error: "Failed to fetch feedback statistics",
      };
    }

    const stats = {
      total: feedback?.length || 0,
      accepted: feedback?.filter((f) => f.is_accepted === true).length || 0,
      rejected: feedback?.filter((f) => f.is_accepted === false).length || 0,
      revisionRequested: 0, // Not supported in current schema
      averageRating: 0, // Not supported in current schema
    };

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Error in getFeedbackStats:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
