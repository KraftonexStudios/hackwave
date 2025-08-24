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

interface DebatePageProps {
  params: Promise<{
    id: string;
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

async function DebateContent({ sessionId }: { sessionId: string }) {
  const [sessionResult, roundsResult, agentsResult] = await Promise.all([
    getFlow(sessionId),
    getFlowRounds(sessionId),
    getSessionAgents(sessionId),
  ]);

  if (!sessionResult.success || !sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data;
  const rounds = roundsResult.success ? roundsResult.data || [] : [];

  // Type the session agents result properly
  type SessionAgentWithAgent = {
    id: string;
    agent_id: string;
    role: "PARTICIPANT" | "VALIDATOR" | "MODERATOR" | "TASK_DISTRIBUTOR" | "REPORT_GENERATOR";
    is_active: boolean;
    joined_at: string;
    session_id: string;
    agents: {
      id: string;
      name: string;
      description: string | null;
    } | null;
  };

  const sessionAgents = agentsResult.success ? (agentsResult.data as SessionAgentWithAgent[] || []) : [];

  // Extract agent data from sessionAgents
  const agents = sessionAgents.filter(sa => sa.agents).map(sa => ({
    id: sa.agents!.id,
    name: sa.agents!.name,
    description: sa.agents!.description,
    created_at: new Date().toISOString(),
    is_active: sa.is_active,
    prompt: '',
    updated_at: new Date().toISOString(),
    user_id: ''
  }));

  // Check if session is active
  if (session.status !== 'ACTIVE') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/sessions/${session.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Flow Session</h1>
            <p className="text-muted-foreground">
              {session.title || session.rounds?.[0]?.query}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">
                This flow session is {session.status}
              </div>
              <p className="text-sm mb-4">
                {session.status === 'COMPLETED'
                  ? 'This flow has been completed. You can view the final report.'
                  : session.status === 'CANCELLED'
                    ? 'This flow has been cancelled. Contact an administrator to resume.'
                    : 'This flow session is not available for processing.'}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/sessions/${session.id}`}>
                    View Details
                  </Link>
                </Button>
                {session.status === 'COMPLETED' && (
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

  return (
    <div className="h-screen flex flex-col">


      <div className="flex-1">
        <FlowVisualization agents={agents} sessionId={sessionId} />
      </div>
    </div>
  );
}

export default async function DebatePage({ params }: DebatePageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<FlowVisualizationSkeleton />}>
      <DebateContent sessionId={id} />
    </Suspense>
  );
}