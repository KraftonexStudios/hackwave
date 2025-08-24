import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAgentsWithStats } from "@/actions/agents";
import { getFlows } from "@/actions/flows";
import type { Session } from "@/database.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  MessageSquare,
  TrendingUp,
  Plus,
  Activity,
  Clock,
  Zap,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  PlayCircle,
  PauseCircle,
  Star,
  Eye,
} from "lucide-react";
import Link from "next/link";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Activity Skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [agentsResult, sessionsResult] = await Promise.all([getAgentsWithStats(), getFlows()]);

  const agents = agentsResult.success ? agentsResult.data || [] : [];
  const sessions = sessionsResult.success ? sessionsResult.data || [] : [];

  // Enhanced statistics calculations
  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter((agent) => agent.is_active).length,
    totalSessions: sessions.length,
    activeSessions: sessions.filter((session: Session) => session.status === "ACTIVE").length,
    totalResponses: agents.reduce((sum, agent) => sum + (agent.responseCount || 0), 0),
    avgResponsesPerAgent:
      agents.length > 0
        ? Math.round(agents.reduce((sum, agent) => sum + (agent.responseCount || 0), 0) / agents.length)
        : 0,
  };

  // Calculate growth percentages (mock data for demo)
  const growthStats = {
    agentsGrowth: 12.5,
    sessionsGrowth: 8.2,
    responsesGrowth: 15.7,
    activeGrowth: 5.3,
  };

  const recentSessions = sessions.slice(0, 5);
  const topAgents = agents.sort((a, b) => (b.responseCount || 0) - (a.responseCount || 0)).slice(0, 5);

  // Recent activity feed (enhanced)
  const recentActivity = [
    ...recentSessions.slice(0, 3).map((session: Session) => ({
      type: "session",
      title: `New flow: ${session.title || "Untitled Flow"}`,
      time: new Date(session.created_at),
      icon: PlayCircle,
      status: session.status,
    })),
    ...agents.slice(0, 2).map((agent) => ({
      type: "agent",
      title: `Agent "${agent.name}" updated`,
      time: new Date(agent.updated_at || agent.created_at),
      icon: Bot,
      status: agent.is_active ? "active" : "inactive",
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      {/* Enhanced Welcome Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span>Welcome back, {user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}!</span>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {new Date().toLocaleDateString()}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
            <Link href="/dashboard/agents">
              <Plus className="mr-2 h-4 w-4" />
              New Agent
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-2">
            <Link href="/dashboard/sessions">
              <Plus className="mr-2 h-4 w-4" />
              New Flow
            </Link>
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {growthStats.agentsGrowth}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeAgents} active • {stats.totalAgents - stats.activeAgents} inactive
            </p>
            <Progress value={(stats.activeAgents / Math.max(stats.totalAgents, 1)) * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flows</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {growthStats.sessionsGrowth}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeSessions} active • {stats.totalSessions - stats.activeSessions} completed
            </p>
            <Progress value={(stats.activeSessions / Math.max(stats.totalSessions, 1)) * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Flows</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{stats.activeSessions}</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {growthStats.activeGrowth}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently processing</p>
            <div className="mt-2 flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600">Live</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold">{stats.totalResponses.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {growthStats.responsesGrowth}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">~{stats.avgResponsesPerAgent} avg per agent</p>
            <Progress value={75} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Performance Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
                <CardDescription>Agent activity and flow performance metrics</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Quick metrics */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.activeAgents}</div>
                  <div className="text-xs text-muted-foreground">Active Agents</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{stats.activeSessions}</div>
                  <div className="text-xs text-muted-foreground">Running Flows</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.avgResponsesPerAgent}</div>
                  <div className="text-xs text-muted-foreground">Avg Responses</div>
                </div>
              </div>

              {/* Chart placeholder */}
              <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">Performance chart will appear here</p>
                  <p className="text-xs text-muted-foreground">Connect your analytics for detailed insights</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-6">
                  <Activity className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 group hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
                  >
                    <div
                      className={`p-2 rounded-full ${
                        activity.type === "session"
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50"
                          : "bg-purple-100 text-purple-600 dark:bg-purple-900/50"
                      }`}
                    >
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                        {activity.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-muted-foreground">{activity.time.toLocaleDateString()}</p>
                        <Badge
                          variant={
                            activity.status === "ACTIVE" || activity.status === "active" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Recent Items */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Flows
                </CardTitle>
                <CardDescription>Your latest AI agent flows</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/sessions">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-full w-16 h-16 mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mt-2" />
                </div>
                <p className="text-muted-foreground mb-4">No flows yet</p>
                <Button asChild size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600">
                  <Link href="/dashboard/sessions">Create your first flow</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session: Session, index) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          session.status === "ACTIVE"
                            ? "bg-green-100 text-green-600 dark:bg-green-900/50"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800"
                        }`}
                      >
                        {session.status === "ACTIVE" ? (
                          <PlayCircle className="h-4 w-4" />
                        ) : (
                          <PauseCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                          {session.title || "Untitled Flow"}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                          <Badge variant={session.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Link href={`/dashboard/sessions/${session.id}/debate`}>
                        <Eye className="h-4 w-4" />
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Top Agents
                </CardTitle>
                <CardDescription>Most active AI agents</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/agents">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 rounded-full w-16 h-16 mx-auto mb-4">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mt-2" />
                </div>
                <p className="text-muted-foreground mb-4">No agents yet</p>
                <Button asChild size="sm" className="bg-gradient-to-r from-purple-500 to-purple-600">
                  <Link href="/dashboard/agents">Create your first agent</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topAgents.map((agent, index) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="relative">
                        <div
                          className={`p-2 rounded-lg ${
                            agent.is_active
                              ? "bg-green-100 text-green-600 dark:bg-green-900/50"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800"
                          }`}
                        >
                          <Bot className="h-4 w-4" />
                        </div>
                        {index < 3 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                          {agent.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-muted-foreground">{agent.responseCount || 0} responses</p>
                          <Badge variant={agent.is_active ? "default" : "secondary"} className="text-xs">
                            {agent.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Link href={`/dashboard/agents`}>
                        <Eye className="h-4 w-4" />
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
