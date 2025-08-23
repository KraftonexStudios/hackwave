import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getDebateSession, getSessionRounds } from '@/actions/debates';
import { getAgentsByIds } from '@/actions/agents';
import { AgentFlowVisualization } from '@/components/debate/agent-flow-visualization';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface VisualizationPageProps {
  params: {
    id: string;
  };
}

function VisualizationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

async function VisualizationContent({ sessionId }: { sessionId: string }) {
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
            <Link href={`/dashboard/sessions/${session.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Agent Interaction Visualization
            </h1>
            <p className="text-muted-foreground">
              Visual representation of agent interactions and debate flow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/sessions/${session.id}`}>Back to Session</Link>
          </Button>
          {session.status === 'active' && (
            <Button asChild>
              <Link href={`/dashboard/sessions/${session.id}/debate`}>
                Continue Debate
              </Link>
            </Button>
          )}
        </div>
      </div>

      <AgentFlowVisualization
        session={session}
        agents={agents}
        rounds={rounds}
      />

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Session Overview
          </h3>
          <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <div>Status: <span className="font-medium">{session.status}</span></div>
            <div>Round: <span className="font-medium">{session.current_round || 0}/{session.max_rounds}</span></div>
            <div>Agents: <span className="font-medium">{agents.length}</span></div>
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
            Agent Activity
          </h3>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            <div>Active: <span className="font-medium">{agents.filter(a => session.session_agents?.find(sa => sa.agent_id === a.id)?.is_active).length}</span></div>
            <div>Total Responses: <span className="font-medium">{rounds.reduce((sum, round) => sum + (round.agent_responses?.length || 0), 0)}</span></div>
            <div>Completed: <span className="font-medium">{rounds.reduce((sum, round) => sum + (round.agent_responses?.filter(r => r.status === 'completed').length || 0), 0)}</span></div>
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Round Progress
          </h3>
          <div className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            <div>Completed: <span className="font-medium">{rounds.filter(r => r.status === 'completed').length}</span></div>
            <div>In Progress: <span className="font-medium">{rounds.filter(r => r.status === 'in_progress').length}</span></div>
            <div>Pending: <span className="font-medium">{rounds.filter(r => r.status === 'pending').length}</span></div>
          </div>
        </div>
      </div>

      {/* Visualization Guide */}
      <div className="bg-muted/50 p-6 rounded-lg">
        <h3 className="font-medium mb-4">How to Read the Visualization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium mb-2">Node Types</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <span className="text-blue-600">Blue nodes</span> represent the debate session</li>
              <li>• <span className="text-green-600">Green nodes</span> represent AI agents</li>
              <li>• <span className="text-yellow-600">Yellow nodes</span> represent debate rounds</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Edge Meanings</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <span className="text-green-600">Solid green lines</span> show active connections</li>
              <li>• <span className="text-blue-600">Animated lines</span> indicate ongoing processes</li>
              <li>• <span className="text-gray-600">Dashed lines</span> represent pending actions</li>
              <li>• <span className="text-red-600">Red lines</span> indicate failed operations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VisualizationPage({ params }: VisualizationPageProps) {
  return (
    <Suspense fallback={<VisualizationSkeleton />}>
      <VisualizationContent sessionId={params.id} />
    </Suspense>
  );
}