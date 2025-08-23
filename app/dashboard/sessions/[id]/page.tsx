import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getDebateSession, getSessionRounds } from '@/actions/debates';
import { getAgentsByIds } from '@/actions/agents';
import { SessionOverview } from '@/components/sessions/session-overview';
import { RoundsList } from '@/components/sessions/rounds-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Play, FileText } from 'lucide-react';
import Link from 'next/link';

interface SessionPageProps {
  params: {
    id: string;
  };
}

function SessionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

async function SessionContent({ sessionId }: { sessionId: string }) {
  const [sessionResult, roundsResult] = await Promise.all([
    getDebateSession(sessionId),
    getSessionRounds(sessionId),
  ]);

  if (!sessionResult.success || !sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data;
  const rounds = roundsResult.success ? roundsResult.data || [] : [];

  // Get session agents
  const agentIds = session.session_agents?.map((sa) => sa.agent_id) || [];
  const agentsResult = await getAgentsByIds(agentIds);
  const agents = agentsResult.success ? agentsResult.data || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/sessions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Session Details</h1>
            <p className="text-muted-foreground">
              {session.initial_query}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === 'active' && (
            <Button asChild>
              <Link href={`/dashboard/sessions/${session.id}/debate`}>
                <Play className="mr-2 h-4 w-4" />
                Continue Debate
              </Link>
            </Button>
          )}
          {session.status === 'completed' && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/sessions/${session.id}/report`}>
                <FileText className="mr-2 h-4 w-4" />
                View Report
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SessionOverview session={session} agents={agents} />
          <RoundsList rounds={rounds} agents={agents} />
        </div>
        <div className="space-y-6">
          {/* Session Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {session.current_round || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current Round
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">
                      {session.max_rounds}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Max Rounds
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {agents.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Agents
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Quick Actions</h3>
                <div className="space-y-2">
                  {session.status === 'active' && (
                    <Button className="w-full" asChild>
                      <Link href={`/dashboard/sessions/${session.id}/debate`}>
                        <Play className="mr-2 h-4 w-4" />
                        Continue Debate
                      </Link>
                    </Button>
                  )}
                  {session.status === 'completed' && (
                    <Button className="w-full" variant="outline" asChild>
                      <Link href={`/dashboard/sessions/${session.id}/report`}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Report
                      </Link>
                    </Button>
                  )}
                  <Button className="w-full" variant="outline" asChild>
                    <Link href={`/dashboard/sessions/${session.id}/visualization`}>
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      Visualization
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage({ params }: SessionPageProps) {
  return (
    <Suspense fallback={<SessionDetailSkeleton />}>
      <SessionContent sessionId={params.id} />
    </Suspense>
  );
}