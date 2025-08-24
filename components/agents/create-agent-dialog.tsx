'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createAgent } from '@/actions/agents';
import { canCreateAgent, getUserSubscription } from '@/lib/subscription';
import { getAgentsWithStats } from '@/actions/agents';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UpgradePromptModal } from '@/components/subscription/upgrade-prompt-modal';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const createAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .min(10, 'Prompt must be at least 10 characters')
    .max(2000, 'Prompt must be less than 2000 characters'),
});

type CreateAgentFormData = z.infer<typeof createAgentSchema>;

interface CreateAgentDialogProps {
  children: React.ReactNode;
}

export function CreateAgentDialog({ children }: CreateAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [agentCount, setAgentCount] = useState(0);
  const [agentLimit, setAgentLimit] = useState(4);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('FREE');
  const [isPremium, setIsPremium] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreateAgentFormData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: '',
      description: '',
      prompt: '',
    },
  });

  // Check subscription limits when dialog opens
  const checkSubscriptionLimits = async () => {
    setIsCheckingLimits(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to create agents',
          variant: 'destructive',
        });
        return false;
      }

      const subscription = await getUserSubscription(user.id);
      const agentsResult = await getAgentsWithStats();

      if (!agentsResult.success) {
        toast({
          title: 'Error loading agents',
          description: 'Could not check agent limits',
          variant: 'destructive',
        });
        return false;
      }

      const currentAgentCount = agentsResult.data?.length || 0;
      const canCreate = await canCreateAgent(user.id);

      setAgentCount(currentAgentCount);
      setAgentLimit(subscription?.plan === 'PREMIUM' ? Infinity : 4);
      setSubscriptionPlan(subscription?.plan || 'FREE');
      setIsPremium(subscription?.isPremium || false);

      if (!canCreate) {
        // If user is on free plan and has reached limit, redirect directly to checkout
        if (!subscription?.isPremium && currentAgentCount >= 4) {
          router.push('/checkout');
          return false;
        }
        setShowUpgradeModal(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      toast({
        title: 'Error',
        description: 'Could not verify subscription limits',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsCheckingLimits(false);
    }
  };

  const onSubmit = async (data: CreateAgentFormData) => {
    setIsSubmitting(true);
    try {
      // Double-check limits before creating
      const canCreate = await checkSubscriptionLimits();
      if (!canCreate) {
        setIsSubmitting(false);
        return;
      }

      const result = await createAgent(data);

      if (result.success) {
        toast({
          title: 'Agent created successfully',
          description: `${data.name} has been created and is ready to use.`,
        });
        handleOpenChange(false);
        router.refresh();
      } else {
        // Check if this is a limit reached error that should redirect
        if (result.data?.shouldRedirect && result.data?.redirectUrl) {
          toast({
            title: 'Agent limit reached',
            description: result.error || 'Upgrade to Pro for unlimited agents.',
            variant: 'destructive',
          });
          // Redirect to checkout after showing toast
          setTimeout(() => {
            router.push(result.data.redirectUrl);
          }, 1500);
        } else {
          toast({
            title: 'Failed to create agent',
            description: result.error || 'An unexpected error occurred',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while creating the agent',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fixed handleOpenChange to prevent loops - use setTimeout to avoid rapid state changes
  const handleOpenChange = useCallback(async (newOpen: boolean) => {
    if (!isSubmitting && !isCheckingLimits) {
      if (newOpen) {
        // Check subscription limits when opening
        const canCreate = await checkSubscriptionLimits();
        if (canCreate) {
          setOpen(newOpen);
        }
      } else {
        setOpen(newOpen);
        // Only reset when closing the dialog - delay to prevent animation conflicts
        setTimeout(() => {
          form.reset({
            name: '',
            description: '',
            prompt: '',
          });
        }, 100);
      }
    }
  }, [isSubmitting, isCheckingLimits, form]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange} modal>
        <DialogTrigger asChild>
          <div onClick={(e) => {
            if (isCheckingLimits) {
              e.preventDefault();
            }
          }}>
            {children}
          </div>
        </DialogTrigger>
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
            <div className="flex items-center justify-between">
              <DialogTitle>Create New Agent</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant={isPremium ? "default" : "secondary"} className="flex items-center gap-1">
                  {isPremium && <Crown className="h-3 w-3" />}
                  {subscriptionPlan}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {agentCount}/{isPremium ? '∞' : agentLimit}
                </Badge>
              </div>
            </div>
            <DialogDescription>
              Create a new AI agent with a specific role and prompt for multi-agent debates.
            </DialogDescription>
            {!isPremium && agentCount >= 3 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <Crown className="h-4 w-4" />
                    <span>
                      You're using {agentCount} of {agentLimit} free agents.
                      <button
                        onClick={() => router.push('/checkout')}
                        className="underline font-medium hover:text-amber-900"
                      >
                        Upgrade to Pro
                      </button> for unlimited agents.
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Legal Expert, Data Analyst"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for your AI agent
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
                            placeholder="Brief description of the agent's role and expertise"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional description of the agent's purpose and expertise
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Prompt</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="You are an expert in... Your role is to... When responding, you should..."
                            className="resize-none"
                            rows={6}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The system prompt that defines the agent's behavior, expertise, and response style
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>
              <DialogFooter className="flex-col gap-3">
                {isPremium && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>Pro Plan: Unlimited agents, priority support, and advanced features</span>
                  </div>
                )}
                <div className="flex gap-2">
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
                    disabled={isSubmitting}
                    className={isPremium ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600" : ""}
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isPremium && <Crown className="mr-2 h-4 w-4" />}
                    Create Agent
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentAgentCount={agentCount}
        agentLimit={agentLimit === Infinity ? 4 : agentLimit}
      />
    </>
  );
}