'use server';

import { createClient } from '@/lib/supabase/server';

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

interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AnalyticsData {
  totalSessions: number;
  totalRounds: number;
  totalResponses: number;
  activeAgents: number;
  averageRoundsPerSession: number;
  sessionsByStatus: { status: string; count: number }[];
  responsesByAgent: { agentName: string; count: number }[];
  sessionsOverTime: { date: string; count: number }[];
  agentPerformance: { agentName: string; avgConfidence: number; responseCount: number }[];
  roundsDistribution: { roundNumber: number; count: number }[];
}

/**
 * Get comprehensive analytics data for the dashboard
 */
export async function getAnalyticsData(): Promise<ActionResponse<AnalyticsData>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();

    // Get total sessions
    const { count: totalSessions } = await supabase
      .from('debate_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get total rounds
    const { count: totalRounds } = await supabase
      .from('debate_rounds')
      .select('*, debate_sessions!inner(user_id)', { count: 'exact', head: true })
      .eq('debate_sessions.user_id', userId);

    // Get total responses
    const { count: totalResponses } = await supabase
      .from('agent_responses')
      .select('*, debate_rounds!inner(*, debate_sessions!inner(user_id))', { count: 'exact', head: true })
      .eq('debate_rounds.debate_sessions.user_id', userId);

    // Get active agents count
    const { count: activeAgents } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get sessions by status
    const { data: sessionsByStatusData } = await supabase
      .from('debate_sessions')
      .select('status')
      .eq('user_id', userId);

    const sessionsByStatus = sessionsByStatusData?.reduce((acc: { status: string; count: number }[], session) => {
      const existing = acc.find(item => item.status === session.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: session.status, count: 1 });
      }
      return acc;
    }, []) || [];

    // Get responses by agent
    const { data: responsesByAgentData } = await supabase
      .from('agent_responses')
      .select(`
        agents(name),
        debate_rounds!inner(
          debate_sessions!inner(user_id)
        )
      `)
      .eq('debate_rounds.debate_sessions.user_id', userId);

    const responsesByAgent = responsesByAgentData?.reduce((acc: { agentName: string; count: number }[], response) => {
      const agentName = (response.agents as any)?.name || 'Unknown';
      const existing = acc.find(item => item.agentName === agentName);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ agentName, count: 1 });
      }
      return acc;
    }, []) || [];

    // Get sessions over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessionsOverTimeData } = await supabase
      .from('debate_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const sessionsOverTime = sessionsOverTimeData?.reduce((acc: { date: string; count: number }[], session) => {
      const date = new Date(session.created_at).toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, []) || [];

    // Get agent performance (average confidence and response count)
    const { data: agentPerformanceData } = await supabase
      .from('agent_responses')
      .select(`
        confidence,
        agents(name),
        debate_rounds!inner(
          debate_sessions!inner(user_id)
        )
      `)
      .eq('debate_rounds.debate_sessions.user_id', userId)
      .not('confidence', 'is', null);

    const agentPerformanceMap = new Map<string, { totalConfidence: number; count: number }>();
    
    agentPerformanceData?.forEach(response => {
      const agentName = (response.agents as any)?.name || 'Unknown';
      const confidence = response.confidence || 0;
      
      if (agentPerformanceMap.has(agentName)) {
        const existing = agentPerformanceMap.get(agentName)!;
        existing.totalConfidence += confidence;
        existing.count++;
      } else {
        agentPerformanceMap.set(agentName, { totalConfidence: confidence, count: 1 });
      }
    });

    const agentPerformance = Array.from(agentPerformanceMap.entries()).map(([agentName, data]) => ({
      agentName,
      avgConfidence: Math.round((data.totalConfidence / data.count) * 100) / 100,
      responseCount: data.count,
    }));

    // Get rounds distribution
    const { data: roundsDistributionData } = await supabase
      .from('debate_rounds')
      .select(`
        round_number,
        debate_sessions!inner(user_id)
      `)
      .eq('debate_sessions.user_id', userId);

    const roundsDistribution = roundsDistributionData?.reduce((acc: { roundNumber: number; count: number }[], round) => {
      const existing = acc.find(item => item.roundNumber === round.round_number);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ roundNumber: round.round_number, count: 1 });
      }
      return acc;
    }, []) || [];

    // Calculate average rounds per session
    const averageRoundsPerSession = totalSessions && totalRounds 
      ? Math.round((totalRounds / totalSessions) * 100) / 100 
      : 0;

    const analyticsData: AnalyticsData = {
      totalSessions: totalSessions || 0,
      totalRounds: totalRounds || 0,
      totalResponses: totalResponses || 0,
      activeAgents: activeAgents || 0,
      averageRoundsPerSession,
      sessionsByStatus,
      responsesByAgent,
      sessionsOverTime,
      agentPerformance,
      roundsDistribution,
    };

    return {
      success: true,
      data: analyticsData,
    };
  } catch (error) {
    console.error('Error in getAnalyticsData:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching analytics data',
    };
  }
}

/**
 * Get recent activity data
 */
export async function getRecentActivity(): Promise<ActionResponse<any[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const supabase = await createClient();

    // Get recent sessions, rounds, and responses
    const { data: recentSessions } = await supabase
      .from('debate_sessions')
      .select('id, title, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentRounds } = await supabase
      .from('debate_rounds')
      .select(`
        id, round_number, status, started_at,
        debate_sessions!inner(id, title, user_id)
      `)
      .eq('debate_sessions.user_id', userId)
      .order('started_at', { ascending: false })
      .limit(5);

    const activities = [
      ...(recentSessions?.map(session => ({
        type: 'session',
        id: session.id,
        title: `Session: ${session.title}`,
        status: session.status,
        timestamp: session.created_at,
      })) || []),
      ...(recentRounds?.map(round => ({
        type: 'round',
        id: round.id,
        title: `Round ${round.round_number} - ${(round.debate_sessions as any).title}`,
        status: round.status,
        timestamp: round.started_at,
      })) || []),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    return {
      success: true,
      data: activities,
    };
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching recent activity',
    };
  }
}