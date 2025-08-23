'use client';

import { useState } from 'react';
import type { Agent } from '@/database.types';
import { deleteAgent, toggleAgentStatus, duplicateAgent } from '@/actions/agents';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  MessageSquare,
  Calendar,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EditAgentDialog } from './edit-agent-dialog';
import { ViewAgentDialog } from './view-agent-dialog';

interface AgentWithStats extends Agent {
  sessionCount: number;
  responseCount: number;
  lastUsed: string | null;
}

interface AgentsTableProps {
  agents: AgentWithStats[];
}

export function AgentsTable({ agents }: AgentsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AgentWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteAgent(agentToDelete.id);
      if (result.success) {
        toast({
          title: 'Agent deleted',
          description: result.message,
        });
        setDeleteDialogOpen(false);
        setAgentToDelete(null);
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
        description: 'Failed to delete agent',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (agent: AgentWithStats) => {
    try {
      const result = await toggleAgentStatus(agent.id, !agent.is_active);
      if (result.success) {
        toast({
          title: 'Agent updated',
          description: `Agent ${agent.is_active ? 'deactivated' : 'activated'}`,
        });
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
        description: 'Failed to update agent status',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateAgent = async (agent: AgentWithStats) => {
    setIsDuplicating(agent.id);
    try {
      const result = await duplicateAgent(agent.id);
      if (result.success) {
        toast({
          title: 'Agent duplicated',
          description: result.message,
        });
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
        description: 'Failed to duplicate agent',
        variant: 'destructive',
      });
    } finally {
      setIsDuplicating(null);
    }
  };

  const openDeleteDialog = (agent: AgentWithStats) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your AI Agents</CardTitle>
          <CardDescription>
            Manage your AI agents and their configurations for debates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">
                  <MessageSquare className="h-4 w-4 mx-auto" />
                  <span className="sr-only">Responses</span>
                </TableHead>
                <TableHead className="text-center">
                  <Activity className="h-4 w-4 mx-auto" />
                  <span className="sr-only">Sessions</span>
                </TableHead>
                <TableHead>
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Last Used
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{agent.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-muted-foreground">
                      {agent.description || 'No description'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={agent.is_active}
                        onCheckedChange={() => handleToggleStatus(agent)}
                      />
                      <Badge
                        variant={agent.is_active ? 'default' : 'secondary'}
                      >
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{agent.responseCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{agent.sessionCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {agent.lastUsed
                        ? formatDistanceToNow(new Date(agent.lastUsed), {
                          addSuffix: true,
                        })
                        : 'Never'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <ViewAgentDialog agent={agent}>
                          <DropdownMenuItem asChild>
                            <div className="flex items-center cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" />
                              View Details
                            </div>
                          </DropdownMenuItem>
                        </ViewAgentDialog>
                        <EditAgentDialog agent={agent}>
                          <DropdownMenuItem asChild>
                            <div className="flex items-center cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </div>
                          </DropdownMenuItem>
                        </EditAgentDialog>
                        <DropdownMenuItem
                          onClick={() => handleDuplicateAgent(agent)}
                          disabled={isDuplicating === agent.id}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {isDuplicating === agent.id ? 'Duplicating...' : 'Duplicate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(agent)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the agent "{agentToDelete?.name}". This
              action cannot be undone.
              {agentToDelete && agentToDelete.sessionCount > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ This agent has been used in {agentToDelete.sessionCount} debate session(s).
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}