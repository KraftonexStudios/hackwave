import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { geminiClient } from '@/lib/ai/gemini-client';
import { groqClient } from '@/lib/ai/groq-client';
import type { AgentResponse, ValidationResult } from '@/lib/ai/gemini-client';

// Choose AI provider based on environment variable
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const aiClient = AI_PROVIDER === 'groq' ? groqClient : geminiClient;

interface IterateRequest {
  sessionId: string;
  selectedValidations: string[];
  userFeedback: string;
  action: 'next_round' | 'generate_report';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { sessionId, selectedValidations, userFeedback, action }: IterateRequest = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get current session and round count
    const { data: session } = await supabase
      .from('sessions')
      .select('*, rounds(*)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const currentRoundCount = session.rounds?.length || 0;
    const maxRounds = 5;

    // Save user feedback and selected validations
    await supabase.from('user_feedback').insert({
      session_id: sessionId,
      round_number: currentRoundCount,
      selected_validations: selectedValidations,
      feedback: userFeedback,
      created_at: new Date().toISOString()
    });

    if (action === 'generate_report' || currentRoundCount >= maxRounds) {
      // Generate final report
      const reportData = await generateReport(sessionId, supabase);
      
      // Update session status
      await supabase
        .from('sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      return NextResponse.json({
        success: true,
        action: 'report_generated',
        sessionId,
        roundCount: currentRoundCount,
        reportData
      });
    }

    if (action === 'next_round' && currentRoundCount < maxRounds) {
      // Prepare for next round
      const nextRoundNumber = currentRoundCount + 1;
      
      return NextResponse.json({
        success: true,
        action: 'next_round_ready',
        sessionId,
        nextRoundNumber,
        maxRounds,
        canContinue: nextRoundNumber < maxRounds,
        message: `Ready for round ${nextRoundNumber} of ${maxRounds}`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or maximum rounds reached' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Iteration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateReport(sessionId: string, supabase: any) {
  // Get all session data
  const { data: sessionData } = await supabase
    .from('sessions')
    .select(`
      *,
      rounds(*),
      user_feedback(*)
    `)
    .eq('id', sessionId)
    .single();

  if (!sessionData) {
    throw new Error('Session data not found');
  }

  const rounds = sessionData.rounds || [];
  const feedback = sessionData.user_feedback || [];

  // Calculate summary statistics
  const totalAgentResponses = rounds.reduce((sum: number, round: any) => 
    sum + (round.agent_responses?.length || 0), 0
  );
  
  const totalValidations = rounds.reduce((sum: number, round: any) => 
    sum + (round.validation_results?.length || 0), 0
  );

  const validValidations = rounds.reduce((sum: number, round: any) => 
    sum + (round.validation_results?.filter((v: any) => v.isValid).length || 0), 0
  );

  const averageConfidence = rounds.reduce((sum: number, round: any) => {
    const roundAvg = round.agent_responses?.reduce((rSum: number, resp: any) => 
      rSum + (resp.confidence || 0), 0
    ) / (round.agent_responses?.length || 1);
    return sum + roundAvg;
  }, 0) / (rounds.length || 1);

  // Generate insights
  const insights = generateInsights(rounds, feedback);

  const reportData = {
    sessionId,
    title: sessionData.title,
    createdAt: sessionData.created_at,
    completedAt: new Date().toISOString(),
    summary: {
      totalRounds: rounds.length,
      totalAgentResponses,
      totalValidations,
      validValidations,
      validationRate: Math.round((validValidations / totalValidations) * 100),
      averageConfidence: Math.round(averageConfidence)
    },
    rounds: rounds.map((round: any, index: number) => ({
      roundNumber: index + 1,
      query: round.query,
      agentCount: round.agent_responses?.length || 0,
      validationCount: round.validation_results?.length || 0,
      processingTime: round.agent_responses?.reduce((max: number, resp: any) => 
        Math.max(max, resp.processingTime || 0), 0
      ) || 0
    })),
    insights,
    generatedAt: new Date().toISOString()
  };

  // Save report to database
  await supabase.from('reports').insert({
    session_id: sessionId,
    report_data: reportData,
    created_at: new Date().toISOString()
  });

  return reportData;
}

async function generateInsights(rounds: any[], feedback: any[]) {
  try {
    // Extract all agent responses and validation results
    const allResponses = rounds.flatMap(round => round.agent_responses || []);
    const allValidations = rounds.flatMap(round => round.validation_results || []);
    const userFeedback = feedback.map(f => f.feedback).join(' ');
    
    // Use AI to generate insights
    const aiInsights = await aiClient.generateInsights(allResponses, allValidations, userFeedback);
    
    return aiInsights.map((insight: string, index: number) => ({
      type: index === 0 ? 'performance' : index === 1 ? 'validation' : 'analysis',
      title: `AI Insight ${index + 1}`,
      description: insight,
      impact: 'high'
    }));
  } catch (error) {
    console.error('Error generating AI insights:', error);
    
    // Fallback to original logic
    const insights = [];

    // Agent performance insights
    const agentPerformance = new Map();
    rounds.forEach(round => {
      round.agent_responses?.forEach((resp: any) => {
        if (!agentPerformance.has(resp.agentName)) {
          agentPerformance.set(resp.agentName, {
            responses: 0,
            totalConfidence: 0,
            sentiments: { positive: 0, negative: 0, neutral: 0 }
          });
        }
        const perf = agentPerformance.get(resp.agentName);
        perf.responses++;
        perf.totalConfidence += resp.confidence;
        perf.sentiments[resp.sentiment]++;
      });
    });

    // Generate performance insights
    const topPerformer = Array.from(agentPerformance.entries())
      .sort(([,a], [,b]) => (b.totalConfidence / b.responses) - (a.totalConfidence / a.responses))[0];
    
    if (topPerformer) {
      insights.push({
        type: 'performance',
        title: 'Top Performing Agent',
        description: `${topPerformer[0]} achieved the highest average confidence score of ${Math.round(topPerformer[1].totalConfidence / topPerformer[1].responses)}%`,
        impact: 'high'
      });
    }

    // Validation insights
    const totalValidations = rounds.reduce((sum, round) => 
      sum + (round.validation_results?.length || 0), 0
    );
    const validCount = rounds.reduce((sum, round) => 
      sum + (round.validation_results?.filter((v: any) => v.isValid).length || 0), 0
    );
    
    if (totalValidations > 0) {
      const validationRate = (validCount / totalValidations) * 100;
      insights.push({
        type: 'validation',
        title: 'Validation Success Rate',
        description: `${Math.round(validationRate)}% of validations passed, indicating ${validationRate > 70 ? 'strong' : validationRate > 50 ? 'moderate' : 'weak'} consensus`,
        impact: validationRate > 70 ? 'high' : 'medium'
      });
    }

    // Feedback insights
    if (feedback.length > 0) {
      insights.push({
        type: 'feedback',
        title: 'User Engagement',
        description: `User provided feedback across ${feedback.length} rounds, showing active participation in the validation process`,
        impact: 'medium'
      });
    }

    return insights;
  }
}