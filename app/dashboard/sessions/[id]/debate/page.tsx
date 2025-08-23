import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getDebateSession, getSessionRounds } from '@/actions/debates';
import { getAgentsByIds } from '@/actions/agents';
import { DebateInterface } from '@/components/debate/debate-interface';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DebatePageProps {
  params: {
    id: string;
  };
}

function DebateInterfaceSkeleton() {
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

async function DebateContent({ sessionId }: { sessionId: string }) {
  const [sessionResult, roundsResult] = await Promise.all([
    getDebateSession(sessionId),
    getSessionRounds(sessionId),
  ]);

  if (!sessionResult.success || !sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data;
  const rounds = roundsResult.success ? roundsResult.data || [] : [];

  // Check if session is active
  if (session.status !== 'active') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/sessions/${session.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Debate Session</h1>
            <p className="text-muted-foreground">
              {session.initial_query}
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">
                This debate session is {session.status}
              </div>
              <p className="text-sm mb-4">
                {session.status === 'completed'
                  ? 'This debate has been completed. You can view the final report.'
                  : session.status === 'paused'
                  ? 'This debate has been paused. Contact an administrator to resume.'
                  : 'This debate session is not available for participation.'}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/sessions/${session.id}`}>
                    View Details
                  </Link>
                </Button>
                {session.status === 'completed' && (
                  <Button asChild>
                    <Link href={`/dashboard/sessions/${session.id}/report`}>
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

  // Get session agents
  const agentIds = session.session_agents?.map((sa) => sa.agent_id) || [];
  const agentsResult = await getAgentsByIds(agentIds);
  const agents = agentsResult.success ? agentsResult.data || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/sessions/${session.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Debate</h1>
          <p className="text-muted-foreground">
            {session.initial_query}
          </p>
        </div>
      </div>

      <DebateInterface 
        session={session} 
        agents={agents} 
        initialRounds={rounds} 
      />
    </div>
  );
}

export default function DebatePage({ params }: DebatePageProps) {
  return (
    <Suspense fallback={<DebateInterfaceSkeleton />}>
      <DebateContent sessionId={params.id} />
    </Suspense>
  );
}