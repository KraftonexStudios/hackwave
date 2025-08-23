'use client';

import { useState } from 'react';
import { Agent } from '@/database.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Calendar, User, FileText, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ViewAgentDialogProps {
  agent: Agent & {
    session_count?: number;
    response_count?: number;
    last_used?: string | null;
  };
  children: React.ReactNode;
}

export function ViewAgentDialog({ agent, children }: ViewAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard',
        description: `${label} has been copied to your clipboard.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-muted-foreground" />
              <div>
                <DialogTitle className="text-xl">{agent.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ID: {agent.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {agent.description && (
            <DialogDescription className="text-base mt-2">
              {agent.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {agent.session_count || 0}
              </div>
              <div className="text-sm text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {agent.response_count || 0}
              </div>
              <div className="text-sm text-muted-foreground">Responses</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">
                {agent.last_used ? 'Last Used' : 'Never Used'}
              </div>
              <div className="text-xs text-muted-foreground">
                {agent.last_used
                  ? formatDate(agent.last_used).split(',')[0]
                  : 'N/A'}
              </div>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Metadata
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div className="font-mono">
                  {formatDate(agent.created_at)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <div className="font-mono">
                  {formatDate(agent.updated_at)}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* System Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                System Prompt
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(agent.prompt, 'System prompt')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {agent.prompt}
              </pre>
            </ScrollArea>
          </div>

          {/* Activity Status */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Status
            </h4>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    agent.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span>
                  {agent.is_active
                    ? 'Available for new debates'
                    : 'Not available for selection'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}