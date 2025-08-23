'use client';

import { useState } from 'react';
import type { Session } from '@/database.types';
import { deleteFlow } from '@/actions/flows';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  MoreHorizontal,
  Play,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
} from 'lucide-react';
import Link from 'next/link';

interface SessionsTableProps {
  sessions: Session[];
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'ACTIVE':
      return <Play className="h-4 w-4" />;
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4" />;
    case 'PAUSED':
      return <Pause className="h-4 w-4" />;
    case 'CANCELLED':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    case 'PAUSED':
      return 'outline';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteSessionId) return;

    setIsDeleting(true);
    try {
      const result = await deleteFlow(deleteSessionId);
      if (result.success) {
        toast({
          title: 'Flow deleted',
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
        description: 'Failed to delete flow',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteSessionId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Flows ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rounds</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate font-medium">
                      {session.title || 'Untitled Flow'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {session.initial_query || 'No initial query'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(session.status)}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getStatusIcon(session.status)}
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {session.current_round || 0} rounds
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(session.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(session.updated_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/sessions/${session.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Flow
                          </Link>
                        </DropdownMenuItem>
                        {session.status === 'ACTIVE' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/sessions/${session.id}/debate`}>
                              <Play className="mr-2 h-4 w-4" />
                              Process Flow
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteSessionId(session.id)}
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

      <AlertDialog
        open={!!deleteSessionId}
        onOpenChange={() => setDeleteSessionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              flow and all associated rounds, responses, and feedback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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