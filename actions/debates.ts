'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { 
  DebateSession, 
  DebateRound, 
  AgentResponse, 
  SessionAgent,
  UserFeedback,
  ValidationResult,
  TablesInsert, 
  TablesUpdate 
} from '@/database.types';
import { 
  createAgentSystem, 
  TaskDistributorAgent, 
  AgentResponseGenerator, 
  ValidatorAgent 
} from '@/lib/ai/agents';

// Types for form data
export interface CreateSessionData {
  initial_query: string;
  max_rounds?: number;
  selected_agent_ids: string[];
}

export interface ProcessRoundData {
  session_id: string;
  user_feedback?: UserFeedback[];
  continue_debate: boolean;
}

export interface SubmitFeedbackData {
  round_id: string;
  feedbacks: Array<{
    response_id: string;
    feedback_type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    comments?: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
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
  
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.id)
    .single();
  
  return dbUser?.id || null;
}

// Create a new debate session
export async function createDebateSession(
  data: CreateSessionData
): Promise<ActionResponse<DebateSession>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // Validate selected agents belong to user
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('user_id', userId)
      .in('id', data.selected_agent_ids)
      .eq('is_active', true);

    if (agentsError || !agents || agents.length !== data.selected_agent_ids.length) {
      return {
        success: false,
        error: 'Invalid or inactive agents selected',
      };
    }

    // Create debate session
    const sessionData: TablesInsert<'debate_sessions'> = {
      initial_query: data.initial_query.trim(),
      max_rounds: data.max_rounds || 5,
      status: 'ACTIVE',
      user_id: userId,
    };

    const { data: session, error: sessionError } = await supabase
      .from('debate_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return {
        success: false,
        error: 'Failed to create debate session',
      };
    }

    // Add agents to session
    const sessionAgents: TablesInsert<'session_agents'>[] = data.selected_agent_ids.map(agentId => ({
      session_id: session.id,
      agent_id: agentId,
      role: 'PARTICIPANT',
      is_active: true,
    }));

    const { error: sessionAgentsError } = await supabase
      .from('session_agents')
      .insert(sessionAgents);

    if (sessionAgentsError) {
      console.error('Error adding agents to session:', sessionAgentsError);
      // Cleanup: delete the session
      await supabase.from('debate_sessions').delete().eq('id', session.id);
      return {
        success: false,
        error: 'Failed to add agents to session',
      };
    }

    revalidatePath('/dashboard/sessions');
    
    return {
      success: true,
      data: session,
      message: 'Debate session created successfully',
    };
  } catch (error) {
    console.error('Unexpected error creating session:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Start the first round of debate
export async function startDebateRound(
  sessionId: string
): Promise<ActionResponse<DebateRound>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // Get session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('debate_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Session not found or access denied',
      };
    }

    if (session.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Session is not active',
      };
    }

    // Check if we've reached max rounds
    const { count: roundCount } = await supabase
      .from('debate_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (roundCount && roundCount >= session.max_rounds) {
      return {
        success: false,
        error: 'Maximum rounds reached',
      };
    }

    // Create new round
    const roundData: TablesInsert<'debate_rounds'> = {
      session_id: sessionId,
      round_number: (roundCount || 0) + 1,
      status: 'ACTIVE',
      distributor_query: session.initial_query,
    };

    const { data: round, error: roundError } = await supabase
      .from('debate_rounds')
      .insert(roundData)
      .select()
      .single();

    if (roundError) {
      console.error('Error creating round:', roundError);
      return {
        success: false,
        error: 'Failed to create debate round',
      };
    }

    // Process task distribution in background
    processTaskDistribution(round.id, session.initial_query, sessionId);

    revalidatePath(`/dashboard/sessions/${sessionId}`);
    
    return {
      success: true,
      data: round,
      message: 'Debate round started successfully',
    };
  } catch (error) {
    console.error('Unexpected error starting round:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Process task distribution (background task)
async function processTaskDistribution(
  roundId: string,
  query: string,
  sessionId: string
) {
  try {
    const supabase = await createClient();
    const agentSystem = createAgentSystem();
    const distributor = new TaskDistributorAgent(agentSystem);

    // Get session agents
    const { data: sessionAgents } = await supabase
      .from('session_agents')
      .select(`
        agent_id,
        agents!inner(id, name, prompt)
      `)
      .eq('session_id', sessionId)
      .eq('is_active', true);

    if (!sessionAgents || sessionAgents.length === 0) {
      throw new Error('No active agents found for session');
    }

    // Process task distribution
    const distributionResult = await distributor.distributeTask(
      query,
      sessionAgents.map((sa: any) => ({
        id: sa.agents.id,
        name: sa.agents.name,
        prompt: sa.agents.prompt,
      }))
    );

    // Update round with distribution result
    await supabase
      .from('debate_rounds')
      .update({
        distributor_response: distributionResult,
        status: 'PROCESSING',
      })
      .eq('id', roundId);

    // Generate agent responses
    await generateAgentResponses(roundId, distributionResult, sessionAgents);

  } catch (error) {
    console.error('Error in task distribution:', error);
    
    // Update round status to error
    const supabase = await createClient();
    await supabase
      .from('debate_rounds')
      .update({ status: 'ERROR' })
      .eq('id', roundId);
  }
}

// Generate responses from all agents
async function generateAgentResponses(
  roundId: string,
  distributionResult: any,
  sessionAgents: any[]
) {
  try {
    const supabase = await createClient();
    const agentSystem = createAgentSystem();
    const responseGenerator = new AgentResponseGenerator(agentSystem);

    const responses: TablesInsert<'agent_responses'>[] = [];

    // Generate responses for each agent
    for (const sessionAgent of sessionAgents) {
      const agent = sessionAgent.agents;
      const startTime = Date.now();

      try {
        const response = await responseGenerator.generateResponse(
          distributionResult.tasks.find((t: any) => t.agentId === agent.id)?.task || distributionResult.query,
          agent.prompt,
          agent.name
        );

        const processingTime = Date.now() - startTime;

        responses.push({
          round_id: roundId,
          agent_id: agent.id,
          response: response.content,
          confidence: response.confidence,
          reasoning: response.reasoning,
          status: 'COMPLETED',
          processing_time: processingTime,
        });
      } catch (error) {
        console.error(`Error generating response for agent ${agent.id}:`, error);
        responses.push({
          round_id: roundId,
          agent_id: agent.id,
          response: 'Error generating response',
          confidence: 0,
          reasoning: 'Failed to generate response due to technical error',
          status: 'ERROR',
          processing_time: Date.now() - startTime,
        });
      }
    }

    // Insert all responses
    const { error: responsesError } = await supabase
      .from('agent_responses')
      .insert(responses);

    if (responsesError) {
      throw responsesError;
    }

    // Update round status to awaiting feedback
    await supabase
      .from('debate_rounds')
      .update({ status: 'AWAITING_FEEDBACK' })
      .eq('id', roundId);

    revalidatePath('/dashboard/sessions');

  } catch (error) {
    console.error('Error generating agent responses:', error);
    
    const supabase = await createClient();
    await supabase
      .from('debate_rounds')
      .update({ status: 'ERROR' })
      .eq('id', roundId);
  }
}

// Submit user feedback for a round
export async function submitUserFeedback(
  data: SubmitFeedbackData
): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // Verify round belongs to user
    const { data: round, error: roundError } = await supabase
      .from('debate_rounds')
      .select(`
        id,
        session_id,
        debate_sessions!inner(user_id)
      `)
      .eq('id', data.round_id)
      .single();

    if (roundError || !round || (round as any).debate_sessions.user_id !== userId) {
      return {
        success: false,
        error: 'Round not found or access denied',
      };
    }

    // Insert feedback records
    const feedbacks: TablesInsert<'user_feedbacks'>[] = data.feedbacks.map(feedback => ({
      response_id: feedback.response_id,
      feedback_type: feedback.feedback_type,
      comments: feedback.comments || null,
      priority: feedback.priority,
      user_id: userId,
    }));

    const { error: feedbackError } = await supabase
      .from('user_feedbacks')
      .insert(feedbacks);

    if (feedbackError) {
      console.error('Error submitting feedback:', feedbackError);
      return {
        success: false,
        error: 'Failed to submit feedback',
      };
    }

    // Update round status
    await supabase
      .from('debate_rounds')
      .update({ status: 'FEEDBACK_RECEIVED' })
      .eq('id', data.round_id);

    revalidatePath(`/dashboard/sessions/${round.session_id}`);
    
    return {
      success: true,
      message: 'Feedback submitted successfully',
    };
  } catch (error) {
    console.error('Unexpected error submitting feedback:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Process validation and determine next steps
export async function processValidation(
  roundId: string,
  continueDebate: boolean
): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // Get round with responses and feedback
    const { data: round, error: roundError } = await supabase
      .from('debate_rounds')
      .select(`
        *,
        debate_sessions!inner(user_id, max_rounds),
        agent_responses(
          *,
          user_feedbacks(*)
        )
      `)
      .eq('id', roundId)
      .single();

    if (roundError || !round || (round as any).debate_sessions.user_id !== userId) {
      return {
        success: false,
        error: 'Round not found or access denied',
      };
    }

    // Run validation
    const agentSystem = createAgentSystem();
    const validator = new ValidatorAgent(agentSystem);
    
    const validationResult = await validator.validateResponses(
      (round as any).agent_responses,
      (round as any).agent_responses.flatMap((r: any) => r.user_feedbacks)
    );

    // Store validation result
    const validationData: TablesInsert<'validation_results'> = {
      round_id: roundId,
      validation_summary: validationResult.summary,
      consensus_score: validationResult.consensusScore,
      recommendations: validationResult.recommendations,
      should_continue: validationResult.shouldContinue && continueDebate,
    };

    const { error: validationError } = await supabase
      .from('validation_results')
      .insert(validationData);

    if (validationError) {
      console.error('Error storing validation:', validationError);
      return {
        success: false,
        error: 'Failed to process validation',
      };
    }

    // Update round status
    await supabase
      .from('debate_rounds')
      .update({ status: 'COMPLETED' })
      .eq('id', roundId);

    // Check if we should continue or end session
    if (validationResult.shouldContinue && continueDebate) {
      const currentRoundNumber = (round as any).round_number;
      const maxRounds = (round as any).debate_sessions.max_rounds;
      
      if (currentRoundNumber < maxRounds) {
        // Start next round
        return startDebateRound((round as any).session_id);
      }
    }

    // End session
    await supabase
      .from('debate_sessions')
      .update({ status: 'COMPLETED' })
      .eq('id', (round as any).session_id);

    revalidatePath(`/dashboard/sessions/${(round as any).session_id}`);
    
    return {
      success: true,
      message: continueDebate ? 'Next round started' : 'Debate session completed',
    };
  } catch (error) {
    console.error('Unexpected error processing validation:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Get session with all related data
export async function getDebateSession(
  sessionId: string
): Promise<ActionResponse<DebateSession & {
  rounds: Array<DebateRound & {
    responses: Array<AgentResponse & {
      agent: { name: string };
      feedbacks: UserFeedback[];
    }>;
    validation: ValidationResult | null;
  }>;
  agents: Array<SessionAgent & {
    agent: { id: string; name: string; description: string | null };
  }>;
}>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    const { data: session, error } = await supabase
      .from('debate_sessions')
      .select(`
        *,
        debate_rounds(
          *,
          agent_responses(
            *,
            agents!inner(name),
            user_feedbacks(*)
          ),
          validation_results(*)
        ),
        session_agents(
          *,
          agents!inner(id, name, description)
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      return {
        success: false,
        error: 'Session not found',
      };
    }

    return {
      success: true,
      data: session as any,
    };
  } catch (error) {
    console.error('Unexpected error fetching session:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Get all sessions for current user
export async function getDebateSessions(): Promise<ActionResponse<Array<DebateSession & {
  roundCount: number;
  agentCount: number;
  lastActivity: string;
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
    
    const { data: sessions, error } = await supabase
      .from('debate_sessions')
      .select(`
        *,
        debate_rounds(count),
        session_agents(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return {
        success: false,
        error: 'Failed to fetch sessions',
      };
    }

    const sessionsWithStats = sessions?.map((session: any) => ({
      ...session,
      roundCount: session.debate_rounds?.length || 0,
      agentCount: session.session_agents?.length || 0,
      lastActivity: session.updated_at || session.created_at,
    })) || [];

    return {
      success: true,
      data: sessionsWithStats,
    };
  } catch (error) {
    console.error('Unexpected error fetching sessions:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Delete a debate session
export async function deleteDebateSession(
  sessionId: string
): Promise<ActionResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();
    
    // Verify ownership
    const { data: session, error: fetchError } = await supabase
      .from('debate_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !session) {
      return {
        success: false,
        error: 'Session not found or access denied',
      };
    }

    // Delete session (cascading deletes will handle related records)
    const { error } = await supabase
      .from('debate_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting session:', error);
      return {
        success: false,
        error: 'Failed to delete session',
      };
    }

    revalidatePath('/dashboard/sessions');
    
    return {
      success: true,
      message: 'Session deleted successfully',
    };
  } catch (error) {
    console.error('Unexpected error deleting session:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Form action wrappers
export async function createSessionAction(formData: FormData) {
  const agentIds = formData.getAll('agent_ids') as string[];
  const data: CreateSessionData = {
    initial_query: formData.get('initial_query') as string,
    max_rounds: parseInt(formData.get('max_rounds') as string) || 5,
    selected_agent_ids: agentIds,
  };

  const result = await createDebateSession(data);
  
  if (result.success) {
    redirect(`/dashboard/sessions/${result.data?.id}`);
  }
  
  return result;
}

export async function startRoundAction(formData: FormData) {
  const sessionId = formData.get('session_id') as string;
  return startDebateRound(sessionId);
}

export async function submitFeedbackAction(formData: FormData) {
  const roundId = formData.get('round_id') as string;
  const responseIds = formData.getAll('response_ids') as string[];
  const feedbackTypes = formData.getAll('feedback_types') as Array<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'>;
  const comments = formData.getAll('comments') as string[];
  const priorities = formData.getAll('priorities') as Array<'HIGH' | 'MEDIUM' | 'LOW'>;

  const feedbacks = responseIds.map((responseId, index) => ({
    response_id: responseId,
    feedback_type: feedbackTypes[index],
    comments: comments[index] || undefined,
    priority: priorities[index] || 'MEDIUM' as const,
  }));

  return submitUserFeedback({ round_id: roundId, feedbacks });
}

export async function processValidationAction(formData: FormData) {
  const roundId = formData.get('round_id') as string;
  const continueDebate = formData.get('continue_debate') === 'true';
  
  return processValidation(roundId, continueDebate);
}