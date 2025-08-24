import { Suspense } from 'react';
import { getAgentsWithStats } from '@/actions/agents';
import { AgentsTable } from '@/components/agents/agents-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Users, Crown, Zap } from 'lucide-react';
import Link from 'next/link';
import { CreateAgentDialog } from '@/components/agents/create-agent-dialog';
import { getUserSubscription } from '@/lib/subscription';
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

// Helper function to get current user
async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function AgentsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
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
            <p className="text-muted-foreground mb-4">
              Create your first AI agent to start building debates
            </p>
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
      {/* Subscription Status Card */}
      <Card className={`border-2 ${subscription?.isPremium ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50' : isNearLimit ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {subscription?.isPremium ? (
                <>
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-lg text-yellow-800">Pro Plan Active</CardTitle>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Free Plan</CardTitle>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={subscription?.isPremium ? 'default' : isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}>
                {agentCount}/{subscription?.isPremium ? '∞' : agentLimit} agents
              </Badge>
              {!subscription?.isPremium && (
                <Link href="/checkout">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Crown className="mr-1 h-3 w-3" />
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {subscription?.isPremium ? (
            <div className="flex items-center space-x-2 text-sm text-yellow-700">
              <Crown className="h-4 w-4" />
              <span>Unlimited agents, advanced features, and priority support</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agent usage</span>
                <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-green-600'}`}>
                  {agentCount} of {agentLimit} used
                </span>
              </div>
              <Progress value={(agentCount / agentLimit) * 100} className="h-2" />
              {isNearLimit && (
                <div className="flex items-center space-x-2 text-sm text-orange-600">
                  <Zap className="h-4 w-4" />
                  <span>
                    {isAtLimit ? 'Agent limit reached! Upgrade to create more agents.' : 'Almost at your agent limit. Consider upgrading for unlimited agents.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AgentsTable agents={agents} />
    </div>
  );
}

async function AgentsHeader() {
  const user = await getCurrentUser();

  if (!user) {
    return <div>Please log in to view your agents</div>;
  }

  const [agentsResult, subscription] = await Promise.all([
    getAgentsWithStats(),
    user ? getUserSubscription(user.id) : null
  ]);

  const agentCount = agentsResult.success ? (agentsResult.data?.length || 0) : 0;
  const agentLimit = subscription?.isPremium ? Infinity : 4;

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          {subscription?.isPremium && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
              <Crown className="mr-1 h-3 w-3" />
              Pro
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Manage your AI agents for multi-agent debates
          {!subscription?.isPremium && (
            <span className="ml-2 text-sm">
              ({agentCount}/{agentLimit} agents used)
            </span>
          )}
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
  );
}

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      }>
        <AgentsHeader />
      </Suspense>

      <Suspense fallback={<AgentsTableSkeleton />}>
        <AgentsContent />
      </Suspense>
    </div>
  );
}