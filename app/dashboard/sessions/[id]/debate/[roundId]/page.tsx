import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getFlow, getFlowRounds } from '@/actions/flows';
import { getSessionAgents } from '@/actions/session-agents';
import { FlowVisualization } from '@/components/flow/flow-visualization';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface DebateRoundPageProps {
  params: Promise<{
    id: string;
    roundId: string;
  }>;
}

function FlowVisualizationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

async function DebateRoundContent({ sessionId, roundId }: { sessionId: string; roundId: string }) {
  const supabase = await createClient();
  
  // Get the specific round data
  const { data: roundData, error: roundError } = await supabase
    .from('debate_rounds')
    .select('*')
    .eq('session_id', sessionId)
    .eq('id', roundId)
    .single();

  if (roundError || !roundData) {
    console.error('Round not found:', roundError);
    notFound();
  }

  // Get session and agents data
  const [sessionResult, agentsResult] = await Promise.all([
    getFlow(sessionId),
    getSessionAgents(sessionId),
  ]);

  if (!sessionResult.success || !sessionResult.data) {
    console.error('Session not found:', sessionResult.error);
    notFound();
  }

  const session = sessionResult.data;
  const agents = agentsResult.success ? agentsResult.data : [];

  // Check if session is completed
  if (session.status === 'completed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/dashboard/sessions">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sessions
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{session.title}</h1>
                <p className="text-muted-foreground">
                  Session completed • Round {roundData.round_number}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Completed</Badge>
                <span className="text-sm text-muted-foreground">
                  Completed on {new Date(session.completed_at!).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex gap-4">
                <Link href={`/dashboard/sessions/${sessionId}`}>
                  <Button variant="outline">
                    View Session Details
                  </Button>
                </Link>
                {session.status === 'completed' && (
                  <Button asChild>
                    <Link href={`/dashboard/sessions/${sessionId}/report`}>
                      View Report
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <FlowVisualization 
          agents={agents} 
          sessionId={sessionId} 
          initialRoundData={roundData}
        />
      </div>
    </div>
  );
}

export default async function DebateRoundPage({ params }: DebateRoundPageProps) {
  const { id, roundId } = await params;
  return (
    <Suspense fallback={<FlowVisualizationSkeleton />}>
      <DebateRoundContent sessionId={id} roundId={roundId} />
    </Suspense>
  );
}