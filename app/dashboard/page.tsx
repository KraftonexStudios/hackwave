import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAgentsWithStats } from '@/actions/agents';
import { getDebateSessions } from '@/actions/debates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MessageSquare, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const [agentsResult, sessionsResult] = await Promise.all([
    getAgentsWithStats(),
    getDebateSessions(),
  ]);

  const agents = agentsResult.success ? agentsResult.data || [] : [];
  const sessions = sessionsResult.success ? sessionsResult.data || [] : [];

  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter(agent => agent.is_active).length,
    totalSessions: sessions.length,
    activeSessions: sessions.filter(session => session.status === 'active').length,
  };

  const recentSessions = sessions.slice(0, 5);
  const topAgents = agents
    .sort((a, b) => (b.responseCount || 0) - (a.responseCount || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}!
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/agents">
              <Plus className="mr-2 h-4 w-4" />
              New Agent
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/sessions">
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAgents} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSessions} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Debates</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.reduce((sum, agent) => sum + (agent.responseCount || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all agents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Your latest debate sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-muted-foreground">No sessions yet</p>
                <Button asChild className="mt-2" size="sm">
                  <Link href="/dashboard/sessions">
                    Create your first session
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.initial_query}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/sessions/${session.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Agents</CardTitle>
            <CardDescription>
              Most active AI agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <div className="text-center py-6">
                <Users className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-muted-foreground">No agents yet</p>
                <Button asChild className="mt-2" size="sm">
                  <Link href="/dashboard/agents">
                    Create your first agent
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {agent.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agent.responseCount || 0} responses
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/agents`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}