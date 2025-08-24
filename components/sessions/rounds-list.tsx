'use client';

import { useState } from 'react';
import { Round, Agent, Responce, ValidationResult } from '@/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RoundsListProps {
  rounds: (Round & {
    agent_responses?: Responce[];
  })[];
  agents: Agent[];
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'IN_PROGRESS':
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'PENDING':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'FAILED':
      return 'destructive';
    case 'PENDING':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getResponseStatusIcon(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return <CheckCircle className="h-3 w-3 text-green-600" />;
    case 'VALIDATED':
      return <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />;
    case 'REJECTED':
      return <XCircle className="h-3 w-3 text-red-600" />;
    case 'SUBMITTED':
      return <Clock className="h-3 w-3 text-yellow-600" />;
    default:
      return <AlertCircle className="h-3 w-3 text-gray-600" />;
  }
}

export function RoundsList({ rounds, agents }: RoundsListProps) {
  const [openRounds, setOpenRounds] = useState<Set<string>>(new Set());

  const toggleRound = (roundId: string) => {
    const newOpenRounds = new Set(openRounds);
    if (newOpenRounds.has(roundId)) {
      newOpenRounds.delete(roundId);
    } else {
      newOpenRounds.add(roundId);
    }
    setOpenRounds(newOpenRounds);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAgentById = (agentId: string) => {
    return agents.find((agent) => agent.id === agentId);
  };

  const getAgentInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (rounds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Flow Rounds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>No rounds have been started yet</p>
            <p className="text-sm">Start the flow to see rounds appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Flow Rounds ({rounds.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rounds.map((round, index) => {
            const isOpen = openRounds.has(round.id);
            const responses = round.agent_responses || [];
            const completedResponses = responses.filter(
              (r) => r.status === 'ACCEPTED'
            ).length;

            return (
              <Collapsible key={round.id} open={isOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto"
                    onClick={() => toggleRound(round.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          Round {round.round_number}
                        </span>
                      </div>
                      <Badge variant={getStatusVariant(round.status)}>
                        {getStatusIcon(round.status)}
                        <span className="ml-1">{round.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {completedResponses}/{responses.length} responses
                      </span>
                      <span>•</span>
                      <span>{formatDate(round.started_at)}</span>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <Separator className="mb-4" />

                    {/* Round Details */}
                    <div className="space-y-4">
                      {round.distributor_response && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">
                            Task Distribution
                          </h4>
                          <p className="text-sm">{typeof round.distributor_response === 'string' ? round.distributor_response : JSON.stringify(round.distributor_response)}</p>
                        </div>
                      )}

                      {/* Agent Responses */}
                      {responses.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-3">
                            Agent Responses
                          </h4>
                          <div className="space-y-3">
                            {responses.map((response) => {
                              const agent = getAgentById(response.agent_id);
                              return (
                                <div
                                  key={response.id}
                                  className="border rounded-lg p-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs">
                                        {agent
                                          ? getAgentInitials(agent.name)
                                          : '??'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">
                                          {agent?.name || 'Unknown Agent'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {getResponseStatusIcon(response.status)}
                                          <span className="text-xs text-muted-foreground">
                                            {response.status}
                                          </span>
                                        </div>
                                      </div>
                                      {(response.status === 'ACCEPTED' || response.status === 'VALIDATED') && response.response ? (
                                        <ScrollArea className="max-h-32">
                                          <p className="text-sm whitespace-pre-wrap">
                                            {response.response}
                                          </p>
                                        </ScrollArea>
                                      ) : response.status === 'REJECTED' ? (
                                        <p className="text-sm text-red-600">
                                          Response was rejected
                                        </p>
                                      ) : response.status === 'SUBMITTED' ? (
                                        <p className="text-sm text-muted-foreground">
                                          Generating response...
                                        </p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          Waiting for response...
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span>
                                          Created: {formatDate(response.created_at)}
                                        </span>
                                        {response.processing_time && (
                                          <span>
                                            Processing: {response.processing_time}ms
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Validation Results */}
                      {round.distributor_query && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">
                            Distributor Query
                          </h4>
                          <p className="text-sm">{round.distributor_query}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}