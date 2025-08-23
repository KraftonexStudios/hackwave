import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/server';
import { getSessionReports } from '@/actions/reports';
import type { Agent } from '@/database.types';

type AgentWithRole = Agent & { role: string; };
import { ReportContent } from '@/components/reports/report-content';
import { ReportActions } from '@/components/reports/report-actions';
import { ReportSkeleton } from '@/components/reports/report-skeleton';

interface ReportPageProps {
  params: {
    id: string;
  };
}

async function getSessionData(sessionId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) return null;

  // Get agents
  const { data: sessionAgents } = await supabase
    .from('session_agents')
    .select(`
      agent_id,
      role,
      agents (
        id,
        name,
        description
      )
    `)
    .eq('session_id', sessionId);

  // Type the query result properly
  type SessionAgentWithAgent = {
    agent_id: string;
    role: string;
    agents: {
      id: string;
      name: string;
      description: string | null;
    } | null;
  };

  const typedSessionAgents = sessionAgents as SessionAgentWithAgent[] | null;
  const agents = typedSessionAgents?.filter(sa => sa.agents).map(sa => ({
    id: sa.agents!.id,
    name: sa.agents!.name,
    description: sa.agents!.description,
    role: sa.role
  })) || [];

  // Get rounds count
  const { count: roundsCount } = await supabase
    .from('rounds')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  return {
    session,
    agents,
    roundsCount: roundsCount || 0,
  };
}

async function ReportPageContent({ sessionId }: { sessionId: string }) {
  const sessionData = await getSessionData(sessionId);

  if (!sessionData) {
    notFound();
  }

  const { session, agents, roundsCount } = sessionData;
  const reportsResult = await getSessionReports(sessionId);
  const reports = reportsResult.success ? reportsResult.data || [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/sessions/${sessionId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Session
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Session Report</h1>
            <p className="text-muted-foreground">
              Analysis and insights from the multi-agent debate
            </p>
          </div>
        </div>
        <ReportActions sessionId={sessionId} session={session} />
      </div>

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Session Overview
              </CardTitle>
              <CardDescription>
                {session.initial_query || 'No query provided'}
              </CardDescription>
            </div>
            <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {agents.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Agents
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {roundsCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Rounds
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {session.current_round || 0}/{session.max_rounds}
              </div>
              <div className="text-sm text-muted-foreground">
                Progress
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {reports.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Reports
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <h4 className="font-medium mb-2">Participating Agents</h4>
            <div className="flex flex-wrap gap-2">
              {agents.map((agent) => (
                <Badge key={agent.id} variant="outline">
                  {agent.name} {agent.role && `(${agent.role})`}
                </Badge>
              ))}
            </div>
          </div>

          {session.description && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {session.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      <ReportContent sessionId={sessionId} reports={reports} />
    </div>
  );
}

export default function ReportPage({ params }: ReportPageProps) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportPageContent sessionId={params.id} />
    </Suspense>
  );
}