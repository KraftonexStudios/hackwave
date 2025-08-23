"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  TablesInsert,
  TablesUpdate,
  SessionAgents,
  Agent,
} from "@/database.types";

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

/**
 * Add agents to a debate session
 */
export async function addAgentsToSession(
  sessionId: string,
  agentIds: string[],
  role: "PARTICIPANT" | "MODERATOR" | "VALIDATOR" = "PARTICIPANT"
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

    // Verify agents exist and belong to user
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .in("id", agentIds)
      .eq("is_active", true);

    if (agentsError || !agents || agents.length !== agentIds.length) {
      return {
        success: false,
        error: "Some agents not found or inactive",
      };
    }

    // Create session agent entries
    const sessionAgents: TablesInsert<"session_agents">[] = agentIds.map(
      (agentId) => ({
        session_id: sessionId,
        agent_id: agentId,
        role,
        is_active: true,
      })
    );

    const { data, error } = await supabase
      .from("session_agents")
      .insert(sessionAgents).select(`
        *,
        agents (
          id,
          name,
          role,
          description
        )
      `);

    if (error) {
      console.error("Error adding agents to session:", error);
      return {
        success: false,
        error: "Failed to add agents to session",
      };
    }

    revalidatePath(`/dashboard/sessions/${sessionId}`);
    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      data,
      message: `Successfully added ${agentIds.length} agent(s) to session`,
    };
  } catch (error) {
    console.error("Error in addAgentsToSession:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Remove an agent from a debate session
 */
export async function removeAgentFromSession(
  sessionId: string,
  agentId: string
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

    const { error } = await supabase
      .from("session_agents")
      .delete()
      .eq("session_id", sessionId)
      .eq("agent_id", agentId);

    if (error) {
      console.error("Error removing agent from session:", error);
      return {
        success: false,
        error: "Failed to remove agent from session",
      };
    }

    revalidatePath(`/dashboard/sessions/${sessionId}`);
    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      message: "Agent removed from session successfully",
    };
  } catch (error) {
    console.error("Error in removeAgentFromSession:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get all agents in a debate session
 */
export async function getSessionAgents(
  sessionId: string
): Promise<ActionResponse<SessionAgents[]>> {
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

    const { data: sessionAgents, error } = await supabase
      .from("session_agents")
      .select(
        `
        *,
        agents (
          id,
          name,
          description,
          prompt,
          is_active
        )
      `
      )
      .eq("session_id", sessionId)
      .eq("is_active", true)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching session agents:", error);
      return {
        success: false,
        error: "Failed to fetch session agents",
      };
    }

    return {
      success: true,
      data: sessionAgents || [],
    };
  } catch (error) {
    console.error("Error in getSessionAgents:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update agent role in a session
 */
export async function updateSessionAgentRole(
  sessionId: string,
  agentId: string,
  role: "PARTICIPANT" | "MODERATOR" | "VALIDATOR"
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

    const { data, error } = await supabase
      .from("session_agents")
      .update({ role })
      .eq("session_id", sessionId)
      .eq("agent_id", agentId)
      .select(
        `
        *,
        agents (
          id,
          name,
          role,
          description
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating session agent role:", error);
      return {
        success: false,
        error: "Failed to update agent role",
      };
    }

    revalidatePath(`/dashboard/sessions/${sessionId}`);
    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      data,
      message: `Agent role updated to ${role}`,
    };
  } catch (error) {
    console.error("Error in updateSessionAgentRole:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Toggle agent active status in a session
 */
export async function toggleSessionAgentStatus(
  sessionId: string,
  agentId: string
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

    // Get current session agent
    const { data: sessionAgent, error: fetchError } = await supabase
      .from("session_agents")
      .select("*")
      .eq("session_id", sessionId)
      .eq("agent_id", agentId)
      .single();

    if (fetchError || !sessionAgent) {
      return {
        success: false,
        error: "Session agent not found",
      };
    }

    // Toggle the status
    const { data: updatedSessionAgent, error: updateError } = await supabase
      .from("session_agents")
      .update({ is_active: !sessionAgent.is_active })
      .eq("session_id", sessionId)
      .eq("agent_id", agentId)
      .select()
      .single();

    if (updateError) {
      console.error("Error toggling session agent status:", updateError);
      return {
        success: false,
        error: "Failed to toggle agent status",
      };
    }

    revalidatePath(`/dashboard/sessions/${sessionId}`);
    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      data: updatedSessionAgent,
      message: `Agent ${sessionAgent.is_active ? 'deactivated' : 'activated'} successfully`,
    };
  } catch (error) {
    console.error("Unexpected error toggling session agent status:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Assign multiple agents to a session (replaces existing assignments)
 */
export async function assignAgentsToSession(
  sessionId: string,
  agentIds: string[]
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

    // Verify all agents belong to the user and are active
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("id")
      .in("id", agentIds)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (agentsError) {
      console.error("Error verifying agents:", agentsError);
      return {
        success: false,
        error: "Failed to verify agents",
      };
    }

    if (!agents || agents.length !== agentIds.length) {
      return {
        success: false,
        error: "Some agents not found or not accessible",
      };
    }

    // Remove existing active assignments
    const { error: removeError } = await supabase
      .from("session_agents")
      .update({ is_active: false })
      .eq("session_id", sessionId);

    if (removeError) {
      console.error("Error removing existing assignments:", removeError);
      return {
        success: false,
        error: "Failed to update existing assignments",
      };
    }

    // Add new assignments
    const sessionAgents = agentIds.map(agentId => ({
      session_id: sessionId,
      agent_id: agentId,
      role: "PARTICIPANT" as const,
      is_active: true,
    }));

    const { data: newAssignments, error: insertError } = await supabase
      .from("session_agents")
      .upsert(sessionAgents, {
        onConflict: "session_id,agent_id",
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error("Error creating session agents:", insertError);
      return {
        success: false,
        error: "Failed to assign agents to session",
      };
    }

    revalidatePath(`/dashboard/sessions/${sessionId}`);
    revalidatePath("/dashboard/sessions");

    return {
      success: true,
      data: newAssignments,
      message: `Successfully assigned ${agentIds.length} agent(s) to session`,
    };
  } catch (error) {
    console.error("Unexpected error assigning agents to session:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
