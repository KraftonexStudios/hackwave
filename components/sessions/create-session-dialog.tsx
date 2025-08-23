'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createDebateSession } from '@/actions/debates';
import { getActiveAgents } from '@/actions/agents';
import { Agent } from '@/database.types';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const createSessionSchema = z.object({
  initial_query: z
    .string()
    .min(1, 'Query is required')
    .min(10, 'Query must be at least 10 characters')
    .max(1000, 'Query must be less than 1000 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  max_rounds: z
    .number()
    .min(1, 'Must have at least 1 round')
    .max(10, 'Maximum 10 rounds allowed'),
  selected_agents: z
    .array(z.string())
    .min(2, 'Select at least 2 agents for a debate')
    .max(8, 'Maximum 8 agents allowed'),
});

type CreateSessionFormData = z.infer<typeof createSessionSchema>;

interface CreateSessionDialogProps {
  children: React.ReactNode;
}

export function CreateSessionDialog({ children }: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      initial_query: '',
      description: '',
      max_rounds: 3,
      selected_agents: [],
    },
  });

  const selectedAgents = form.watch('selected_agents');

  useEffect(() => {
    if (open) {
      loadAgents();
    }
  }, [open]);

  const loadAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const result = await getActiveAgents();
      if (result.success) {
        setAgents(result.data || []);
      } else {
        toast({
          title: 'Error loading agents',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load agents',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const onSubmit = async (data: CreateSessionFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createDebateSession({
        initial_query: data.initial_query,
        description: data.description || undefined,
        max_rounds: data.max_rounds,
        selected_agents: data.selected_agents,
      });

      if (result.success) {
        toast({
          title: 'Session created',
          description: result.message,
        });
        setOpen(false);
        form.reset();
        // Navigate to the new session
        if (result.data?.id) {
          router.push(`/dashboard/sessions/${result.data.id}/debate`);
        }
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      form.reset();
    }
    setOpen(newOpen);
  };

  const toggleAgent = (agentId: string) => {
    const current = selectedAgents;
    const updated = current.includes(agentId)
      ? current.filter((id) => id !== agentId)
      : [...current, agentId];
    form.setValue('selected_agents', updated);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Debate Session</DialogTitle>
          <DialogDescription>
            Set up a new multi-agent debate session with your selected agents.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="initial_query"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Query</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What topic or question should the agents debate? e.g., 'Should AI development be regulated by government agencies?'"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The main question or topic that will initiate the debate
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional context or background information for the debate"
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional context to help agents understand the debate scope
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_rounds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Rounds</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of debate rounds (1-10). Each round allows all agents to respond.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="selected_agents"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Select Agents ({selectedAgents.length})
                      </FormLabel>
                      <FormDescription>
                        Choose 2-8 agents to participate in this debate
                      </FormDescription>
                      {isLoadingAgents ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2">Loading agents...</span>
                        </div>
                      ) : agents.length === 0 ? (
                        <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">No active agents found</p>
                            <p className="text-sm text-muted-foreground">
                              Create and activate agents first to start debates
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto border rounded-lg p-4">
                          {agents.map((agent) => (
                            <div
                              key={agent.id}
                              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleAgent(agent.id)}
                            >
                              <Checkbox
                                checked={selectedAgents.includes(agent.id)}
                                onChange={() => toggleAgent(agent.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{agent.name}</p>
                                  <Badge variant="outline" className="text-xs">
                                    Active
                                  </Badge>
                                </div>
                                {agent.description && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {agent.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
                Create Session
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}