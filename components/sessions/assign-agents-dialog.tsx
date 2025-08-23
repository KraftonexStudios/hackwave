'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAgents } from '@/actions/agents';
import { assignAgentsToSession, getSessionAgents } from '@/actions/session-agents';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Bot, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Agent, SessionAgents } from '@/database.types';

const assignAgentsSchema = z.object({
  agentIds: z.array(z.string()).min(1, 'Please select at least one agent'),
});

type AssignAgentsFormData = z.infer<typeof assignAgentsSchema>;

interface AssignAgentsDialogProps {
  sessionId: string;
  children: React.ReactNode;
  currentAgents?: SessionAgents[];
}

export function AssignAgentsDialog({ sessionId, children, currentAgents }: AssignAgentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<string[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AssignAgentsFormData>({
    resolver: zodResolver(assignAgentsSchema),
    defaultValues: {
      agentIds: [],
    },
  });

  // Load agents and current assignments when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentsResult, sessionAgentsResult] = await Promise.all([
        getAgents(),
        getSessionAgents(sessionId),
      ]);

      if (agentsResult.success && agentsResult.data) {
        // Only show active agents
        const activeAgents = agentsResult.data.filter(agent => agent.is_active);
        setAgents(activeAgents);
      }

      if (sessionAgentsResult.success && sessionAgentsResult.data) {
        const currentAssignments = sessionAgentsResult.data
          .filter(sa => sa.is_active)
          .map(sa => sa.agent_id);
        setAssignedAgents(currentAssignments);
        form.setValue('agentIds', currentAssignments);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agents data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AssignAgentsFormData) => {
    setIsSubmitting(true);
    try {
      const result = await assignAgentsToSession(sessionId, data.agentIds);

      if (result.success) {
        toast({
          title: 'Agents assigned successfully',
          description: `${data.agentIds.length} agent(s) have been assigned to this flow.`,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          title: 'Failed to assign agents',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error assigning agents:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while assigning agents',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        form.reset({ agentIds: [] });
        setAgents([]);
        setAssignedAgents([]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh]"
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Agents to Flow
          </DialogTitle>
          <DialogDescription>
            Select AI agents to participate in this flow. Agents will process rounds and provide responses based on their expertise.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading agents...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="agentIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Available Agents</FormLabel>
                    <FormDescription>
                      Select one or more agents to assign to this flow. Only active agents are shown.
                    </FormDescription>
                    <ScrollArea className="max-h-[400px] pr-4">
                      <div className="space-y-3">
                        {agents.length === 0 ? (
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center text-muted-foreground">
                                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No active agents available</p>
                                <p className="text-sm">Create some agents first to assign them to flows.</p>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          agents.map((agent) => {
                            const isCurrentlyAssigned = assignedAgents.includes(agent.id);
                            return (
                              <FormField
                                key={agent.id}
                                control={form.control}
                                name="agentIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem key={agent.id}>
                                      <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${field.value?.includes(agent.id) ? 'ring-2 ring-primary' : ''
                                        }`}>
                                        <CardHeader className="pb-3">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3">
                                              <FormControl>
                                                <Checkbox
                                                  checked={field.value?.includes(agent.id)}
                                                  onCheckedChange={(checked) => {
                                                    return checked
                                                      ? field.onChange([...field.value, agent.id])
                                                      : field.onChange(
                                                        field.value?.filter(
                                                          (value) => value !== agent.id
                                                        )
                                                      );
                                                  }}
                                                />
                                              </FormControl>
                                              <div className="flex-1">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                  {agent.name}
                                                  {isCurrentlyAssigned && (
                                                    <Badge variant="secondary" className="text-xs">
                                                      <CheckCircle className="h-3 w-3 mr-1" />
                                                      Currently Assigned
                                                    </Badge>
                                                  )}
                                                </CardTitle>
                                                {agent.description && (
                                                  <CardDescription className="mt-1">
                                                    {agent.description}
                                                  </CardDescription>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </CardHeader>
                                        {agent.prompt && (
                                          <CardContent className="pt-0">
                                            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                                              <div className="font-medium mb-1">System Prompt:</div>
                                              <div className="line-clamp-3">
                                                {agent.prompt.length > 150
                                                  ? `${agent.prompt.substring(0, 150)}...`
                                                  : agent.prompt}
                                              </div>
                                            </div>
                                          </CardContent>
                                        )}
                                      </Card>
                                    </FormItem>
                                  );
                                }}
                              />
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || agents.length === 0}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Assign Agents
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}