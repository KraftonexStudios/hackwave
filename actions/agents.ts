'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Agent, TablesInsert, TablesUpdate } from '@/database.types';

// Types for form data
export interface CreateAgentData {
  name: string;
  description?: string;
  prompt: string;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  prompt?: string;
  is_active?: boolean;
}

// Response types
export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get current user ID helper
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Get or create user in our users table
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.id)
    .single();
  
  if (error && error.code === 'PGRST116') {
    // User doesn't exist, create them
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        supabase_id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
      return null;
    }
    
    return newUser.id;
  }
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return dbUser.id;
}

// Create a new agent
export async function createAgent(
  data: CreateAgentData
): Promise<ActionResponse<Agent>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    const agentData: TablesInsert<'agents'> = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      prompt: data.prompt.trim(),
      user_id: userId,
      is_active: true,
    };

    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        error: 'Failed to create agent',
      };
    }

    revalidatePath('/dashboard/agents');
    
    return {
      success: true,
      data: agent,
      message: 'Agent created successfully',
    };
  } catch (error) {
    console.error('Unexpected error creating agent:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Get all agents for the current user
export async function getAgents(): Promise<ActionResponse<Agent[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return {
        success: false,
        error: 'Failed to fetch agents',
      };
    }

    return {
      success: true,
      data: agents || [],
    };
  } catch (error) {
    console.error('Unexpected error fetching agents:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Get a single agent by ID
export async function getAgent(id: string): Promise<ActionResponse<Agent>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching agent:', error);
      return {
        success: false,
        error: 'Agent not found',
      };
    }

    return {
      success: true,
      data: agent,
    };
  } catch (error) {
    console.error('Unexpected error fetching agent:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Update an existing agent
export async function updateAgent(
  id: string,
  data: UpdateAgentData
): Promise<ActionResponse<Agent>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // First verify the agent belongs to the user
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAgent) {
      return {
        success: false,
        error: 'Agent not found or access denied',
      };
    }

    const updateData: TablesUpdate<'agents'> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof TablesUpdate<'agents'>] === undefined) {
        delete updateData[key as keyof TablesUpdate<'agents'>];
      }
    });

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      return {
        success: false,
        error: 'Failed to update agent',
      };
    }

    revalidatePath('/dashboard/agents');
    revalidatePath(`/dashboard/agents/${id}`);
    
    return {
      success: true,
      data: agent,
      message: 'Agent updated successfully',
    };
  } catch (error) {
    console.error('Unexpected error updating agent:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Delete an agent
export async function deleteAgent(id: string): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // First verify the agent belongs to the user
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAgent) {
      return {
        success: false,
        error: 'Agent not found or access denied',
      };
    }

    // Check if agent is being used in any active sessions
    const { data: activeSessions, error: sessionError } = await supabase
      .from('session_agents')
      .select('session_id, debate_sessions!inner(status)')
      .eq('agent_id', id)
      .eq('is_active', true);

    if (sessionError) {
      console.error('Error checking active sessions:', sessionError);
      return {
        success: false,
        error: 'Failed to verify agent usage',
      };
    }

    const hasActiveSessions = activeSessions?.some(
      (sa: any) => sa.debate_sessions.status === 'ACTIVE'
    );

    if (hasActiveSessions) {
      return {
        success: false,
        error: 'Cannot delete agent that is being used in active sessions',
      };
    }

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting agent:', error);
      return {
        success: false,
        error: 'Failed to delete agent',
      };
    }

    revalidatePath('/dashboard/agents');
    
    return {
      success: true,
      message: 'Agent deleted successfully',
    };
  } catch (error) {
    console.error('Unexpected error deleting agent:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Toggle agent active status
export async function toggleAgentStatus(
  id: string,
  isActive: boolean
): Promise<ActionResponse<Agent>> {
  return updateAgent(id, { is_active: isActive });
}

// Duplicate an agent
export async function duplicateAgent(id: string): Promise<ActionResponse<Agent>> {
  try {
    const agentResponse = await getAgent(id);
    if (!agentResponse.success || !agentResponse.data) {
      return agentResponse;
    }

    const originalAgent = agentResponse.data;
    const duplicateData: CreateAgentData = {
      name: `${originalAgent.name} (Copy)`,
      description: originalAgent.description || undefined,
      prompt: originalAgent.prompt,
    };

    return createAgent(duplicateData);
  } catch (error) {
    console.error('Unexpected error duplicating agent:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Get only active agents
export async function getActiveAgents(): Promise<ActionResponse<Agent[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active agents:', error);
      return {
        success: false,
        error: 'Failed to fetch active agents',
      };
    }

    return {
      success: true,
      data: agents || [],
    };
  } catch (error) {
    console.error('Error in getActiveAgents:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Get agents with usage statistics
export async function getAgentsWithStats(): Promise<ActionResponse<Array<Agent & { 
  sessionCount: number;
  responseCount: number;
  lastUsed: string | null;
}>>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // Get agents first
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return {
        success: false,
        error: 'Failed to fetch agents',
      };
    }

    // For now, return agents with zero stats since the relationships don't exist yet
    // This can be enhanced later when session-agent relationships are implemented
    const agentsWithStats = agents?.map((agent: Agent) => ({
      ...agent,
      sessionCount: 0,
      responseCount: 0,
      lastUsed: null,
    })) || [];

    return {
      success: true,
      data: agentsWithStats,
    };
  } catch (error) {
    console.error('Unexpected error fetching agents with stats:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Form action wrappers for use with forms
export async function createAgentAction(formData: FormData) {
  const data: CreateAgentData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || undefined,
    prompt: formData.get('prompt') as string,
  };

  const result = await createAgent(data);
  
  if (result.success) {
    redirect('/dashboard/agents');
  }
  
  return result;
}

export async function updateAgentAction(formData: FormData) {
  const id = formData.get('id') as string;
  const data: UpdateAgentData = {
    name: formData.get('name') as string || undefined,
    description: formData.get('description') as string || undefined,
    prompt: formData.get('prompt') as string || undefined,
    is_active: formData.get('is_active') === 'true',
  };

  const result = await updateAgent(id, data);
  
  if (result.success) {
    redirect('/dashboard/agents');
  }
  
  return result;
}

export async function deleteAgentAction(formData: FormData) {
  const id = formData.get('id') as string;
  const result = await deleteAgent(id);
  
  if (result.success) {
    revalidatePath('/dashboard/agents');
  }
  
  return result;
}