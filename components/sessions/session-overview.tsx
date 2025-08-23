'use client';

import { DebateSession, Agent } from '@/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Users,
  MessageSquare,
  Calendar,
  CheckCircle,
  Play,
  Pause,
  XCircle,
} from 'lucide-react';

interface SessionOverviewProps {
  session: DebateSession;
  agents: Agent[];
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return <Play className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'paused':
      return <Pause className="h-4 w-4" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'paused':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'text-green-600';
    case 'completed':
      return 'text-blue-600';
    case 'paused':
      return 'text-yellow-600';
    case 'cancelled':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function SessionOverview({ session, agents }: SessionOverviewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAgentInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const progressPercentage = session.max_rounds > 0 
    ? ((session.current_round || 0) / session.max_rounds) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Session Overview
            </CardTitle>
            <Badge
              variant={getStatusVariant(session.status)}
              className="flex items-center gap-1"
            >
              {getStatusIcon(session.status)}
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Initial Query */}
          <div>
            <h3 className="font-medium mb-2">Initial Query</h3>
            <p className="text-sm bg-muted/50 p-3 rounded-lg">
              {session.initial_query}
            </p>
          </div>

          {/* Description */}
          {session.description && (
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">
                {session.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Progress</h3>
              <span className="text-sm text-muted-foreground">
                Round {session.current_round || 0} of {session.max_rounds}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Created</div>
                <div className="text-muted-foreground">
                  {formatDate(session.created_at)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Last Updated</div>
                <div className="text-muted-foreground">
                  {formatDate(session.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participating Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participating Agents ({agents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Users className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No agents found for this session</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => {
                const sessionAgent = session.session_agents?.find(
                  (sa) => sa.agent_id === agent.id
                );
                return (
                  <div
                    key={agent.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs font-medium">
                        {getAgentInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{agent.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {sessionAgent?.role || 'participant'}
                        </Badge>
                      </div>
                      {agent.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {agent.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            sessionAgent?.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {sessionAgent?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}