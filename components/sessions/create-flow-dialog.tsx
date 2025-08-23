'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createFlow } from '@/actions/flows';
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
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const createFlowSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
});

type CreateFlowFormData = z.infer<typeof createFlowSchema>;

interface CreateFlowDialogProps {
  children: React.ReactNode;
}

export function CreateFlowDialog({ children }: CreateFlowDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreateFlowFormData>({
    resolver: zodResolver(createFlowSchema),
    defaultValues: {
      name: '',
    },
  });



  const onSubmit = async (data: CreateFlowFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createFlow({
        name: data.name,
        description: data.name, // Use name as description for now
      });

      if (result.success) {
        toast({
          title: 'Flow created',
          description: result.message,
        });

        // Close dialog first, then reset form to avoid animation conflicts
        setOpen(false);
        setTimeout(() => {
          form.reset({
            name: '',
          });
        }, 100);

        // Navigate to the specific flow session page
        router.push(`/dashboard/sessions/${result.data.id}`);
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
        description: 'Failed to create flow',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fixed handleOpenChange to prevent loops - use setTimeout to avoid rapid state changes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      // Only reset when closing the dialog - delay to prevent animation conflicts
      if (!newOpen) {
        setTimeout(() => {
          form.reset({
            name: '',
          });
        }, 100);
      }
    }
  }, [isSubmitting, form]);



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
          <DialogTitle>Create New Flow</DialogTitle>
          <DialogDescription>
            Create a new flow with just a name. You can select agents and configure settings later on the flow page.
          </DialogDescription>
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
                      <FormLabel>Flow Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a name for your flow"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A short, descriptive name for this flow
                      </FormDescription>
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
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Flow
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}