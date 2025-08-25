import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Users, MessageSquare, Activity, Clock, Target, Zap } from 'lucide-react';
import { getAnalyticsData, getRecentActivity } from '@/actions/analytics';
import { SessionOverTimeChart, SessionStatusChart, AgentPerformanceChart, ResponseDistributionChart } from '@/components/analytics/charts';

function AnalyticsSkeleton() {
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
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function AnalyticsContent() {
  const [analyticsResult, activityResult] = await Promise.all([
    getAnalyticsData(),
    getRecentActivity(),
  ]);

  const analytics = analyticsResult.success ? analyticsResult.data : null;
  const recentActivity = activityResult.success ? activityResult.data : [];

  // Chart configurations
  const chartConfig = {
    sessions: {
      label: "Sessions",
      color: "hsl(var(--chart-1))",
    },
    responses: {
      label: "Responses",
      color: "hsl(var(--chart-2))",
    },
    confidence: {
      label: "Confidence",
      color: "hsl(var(--chart-3))",
    },
    count: {
      label: "Count",
      color: "hsl(var(--chart-4))",
    },
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Performance metrics and insights for your AI debates
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Debate sessions created
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeAgents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Agents available for debates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalResponses || 0}</div>
            <p className="text-xs text-muted-foreground">
              Agent responses generated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rounds</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.averageRoundsPerSession || 0}</div>
            <p className="text-xs text-muted-foreground">
              Average rounds per session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sessions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Session Activity (Last 30 Days)</CardTitle>
            <CardDescription>
              Track session creation over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionOverTimeChart 
              data={analytics?.sessionsOverTime || []} 
              chartConfig={chartConfig} 
            />
          </CardContent>
        </Card>

        {/* Session Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Session Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of session statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionStatusChart 
              data={analytics?.sessionsByStatus || []} 
              chartConfig={chartConfig} 
            />
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance and Response Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>
              Average confidence scores by agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentPerformanceChart 
              data={analytics?.agentPerformance || []} 
              chartConfig={chartConfig} 
            />
          </CardContent>
        </Card>

        {/* Responses by Agent */}
        <Card>
          <CardHeader>
            <CardTitle>Response Distribution</CardTitle>
            <CardDescription>
              Number of responses by agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponseDistributionChart 
              data={analytics?.responsesByAgent || []} 
              chartConfig={chartConfig} 
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest sessions and rounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex-shrink-0">
                    {activity.type === 'session' ? (
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${activity.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        activity.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          activity.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                      }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 opacity-50 mb-2" />
                <p>No recent activity</p>
                <p className="text-sm mt-1">Start a debate session to see activity here</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}