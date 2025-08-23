import { Suspense } from 'react';
import { getFlows } from '@/actions/flows';
import { SessionsTable } from '@/components/sessions/sessions-table';
import { CreateFlowDialog as CreateSessionDialog } from '@/components/sessions/create-flow-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MessageSquare } from 'lucide-react';

function SessionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

async function SessionsContent() {
  const result = await getFlows();

  if (!result.success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Failed to load flows</p>
            <p className="text-sm">{result.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sessions = result.data || [];

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No flows yet</p>
            <p className="text-sm mb-4">
              Create your first flow to start AI agent processing
            </p>
            <CreateSessionDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Flow
              </Button>
            </CreateSessionDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <SessionsTable sessions={sessions} />;
}

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Flows</h1>
          <p className="text-muted-foreground">
            Manage and monitor your AI agent flows
          </p>
        </div>
        <CreateSessionDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Flow
          </Button>
        </CreateSessionDialog>
      </div>

      <Suspense fallback={<SessionsTableSkeleton />}>
        <SessionsContent />
      </Suspense>
    </div>
  );
}