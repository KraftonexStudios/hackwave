import { Suspense } from 'react';
import { getAgentsWithStats } from '@/actions/agents';
import { AgentsTable } from '@/components/agents/agents-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { CreateAgentDialog } from '@/components/agents/create-agent-dialog';

function AgentsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function AgentsContent() {
  const user = await getCurrentUser();

  if (!user) {
    return <div>Please log in to view your agents</div>;
  }

  const [agentsResult, subscription] = await Promise.all([
    getAgentsWithStats(),
    user ? getUserSubscription(user.id) : null
  ]);
  console.log('Subscription:', subscription);

  const result = agentsResult;

  if (!result.success) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Error loading agents</h3>
            <p className="text-muted-foreground">{result.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const agents = result.data || [];
  const agentCount = agents.length;
  console.log('Agent count:', agentCount);

  const agentLimit = subscription?.isPremium ? Infinity : 4;
  const isNearLimit = agentCount >= agentLimit - 1;
  const isAtLimit = agentCount >= agentLimit;
  console.log('Agent limit:', agentLimit);
  console.log('Is at limit:', isAtLimit);

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No agents yet</h3>
            <p className="text-muted-foreground mb-4">Create your first AI agent to start building debates</p>
            <CreateAgentDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>

            </CreateAgentDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI agents for multi-agent debates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CreateAgentDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </CreateAgentDialog>
        </div>
      </div>

      {/* Agents List */}
      <Suspense fallback={<AgentsTableSkeleton />}>
        <AgentsContent />
      </Suspense>
    </div>
  );
}
