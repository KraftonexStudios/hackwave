"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TablesInsert } from "@/database.types";

// Types for form data
export interface CreateFlowData {
  name: string;
  description?: string;
}

// Response types
export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get or create user in our users table
  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    // User doesn't exist, create them
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        supabase_id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return null;
    }

    return newUser.id;
  }

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return dbUser.id;
}

// Create a new flow
export async function createFlow(
  data: CreateFlowData
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

    // Create a new debate session entry to represent the flow
    const { data: session, error: sessionError } = await supabase
      .from("debate_sessions")
      .insert({
        title: data.name.trim(),
        initial_query: (data.description || data.name).trim(),
        status: "ACTIVE",
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return { success: false, error: "Failed to create flow session" };
    }

    // Revalidate the sessions page to show the new flow
    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      data: session,
      message: "Flow created successfully",
    };
  } catch (error) {
    console.error("Error creating flow:", error);
    return {
      success: false,
      error: "Failed to create flow",
    };
  }
}

// Get all flow sessions for the current user
export async function getFlows(): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    // First try to get sessions without the join to see if the table exists
    const { data: sessions, error } = await supabase
      .from("debate_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching flows:", error);
      // If tables don't exist yet, return empty array instead of error
      if (
        error.code === "PGRST116" ||
        error.message?.includes("does not exist")
      ) {
        return {
          success: true,
          data: [],
        };
      }
      return {
        success: false,
        error: "Failed to fetch flows",
      };
    }

    return {
      success: true,
      data: sessions || [],
    };
  } catch (error) {
    console.error("Error in getFlows:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Get a specific flow session
export async function getFlow(sessionId: string): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    const { data: session, error } = await supabase
      .from("debate_sessions")
      .select(
        `
        *,
        debate_rounds(
          *
        ),
        user_feedbacks(
          *
        ),
        reports(
          *
        )
      `
      )
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching flow:", error);
      return {
        success: false,
        error: "Flow not found",
      };
    }

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error("Error in getFlow:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Get rounds for a specific flow session
export async function getFlowRounds(
  sessionId: string
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

    // First verify the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from("debate_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: "Flow not found or access denied",
      };
    }

    const { data: rounds, error } = await supabase
      .from("debate_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true });

    if (error) {
      console.error("Error fetching flow rounds:", error);
      return {
        success: false,
        error: "Failed to fetch flow rounds",
      };
    }

    return {
      success: true,
      data: rounds || [],
    };
  } catch (error) {
    console.error("Error in getFlowRounds:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Update flow session status
export async function updateFlowStatus(
  sessionId: string,
  status: "ACTIVE" | "COMPLETED" | "CANCELLED"
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

    const { data: session, error } = await supabase
      .from("debate_sessions")
      .update({
        status,
        completed_at: status === "COMPLETED" ? new Date().toISOString() : null,
      })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating flow status:", error);
      return {
        success: false,
        error: "Failed to update flow status",
      };
    }

    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      data: session,
      message: `Flow status updated to ${status}`,
    };
  } catch (error) {
    console.error("Error in updateFlowStatus:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

// Delete a flow session
export async function deleteFlow(sessionId: string): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("debate_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting flow:", error);
      return {
        success: false,
        error: "Failed to delete flow",
      };
    }

    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      message: "Flow deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteFlow:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
