'use client';

import { useState, useEffect, useCallback } from 'react';
import { DebateSession, Agent, DebateRound, AgentResponse } from '@/database.types';
import { startDebateRound, submitUserFeedback } from '@/actions/debates';
import { useDebateStore } from '@/lib/stores/debate-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  MessageSquare,
  Send,
  Users,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface DebateInterfaceProps {
  session: DebateSession;
  agents: Agent[];
  initialRounds: (DebateRound & {
    agent_responses?: AgentResponse[];
  })[];
}

export function DebateInterface({
  session,
  agents,
  initialRounds,
}: DebateInterfaceProps) {
  const [rounds, setRounds] = useState(initialRounds);
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const { toast } = useToast();

  // Zustand store actions
  const {
    setCurrentSession,
    setAgents,
    setRounds: setStoreRounds,
    addRound,
    updateRound,
    setLoading,
    setError,
  } = useDebateStore();

  useEffect(() => {
    // Initialize store with current data
    setCurrentSession(session);
    setAgents(agents);
    setStoreRounds(rounds);
  }, [session, agents, rounds, setCurrentSession, setAgents, setStoreRounds]);

  const getAgentById = useCallback(
    (agentId: string) => agents.find((agent) => agent.id === agentId),
    [agents]
  );

  const getAgentInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStartRound = async () => {
    if (session.current_round && session.current_round >= session.max_rounds) {
      toast({
        title: 'Maximum rounds reached',
        description: 'This debate has reached the maximum number of rounds.',
        variant: 'destructive',
      });
      return;
    }

    setIsStartingRound(true);
    setLoading(true);
    try {
      const result = await startDebateRound(session.id);
      if (result.success && result.data) {
        const newRound = result.data;
        setRounds((prev) => [...prev, newRound]);
        addRound(newRound);
        toast({
          title: 'Round started',
          description: `Round ${newRound.round_number} has begun.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to start round',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start debate round',
        variant: 'destructive',
      });
    } finally {
      setIsStartingRound(false);
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !selectedResponseId) {
      toast({
        title: 'Invalid feedback',
        description: 'Please select a response and provide feedback.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const result = await submitUserFeedback({
        session_id: session.id,
        response_id: selectedResponseId,
        feedback_text: feedback,
        rating: 5, // Default rating, could be made configurable
        priority: 'medium',
      });

      if (result.success) {
        toast({
          title: 'Feedback submitted',
          description: result.message,
        });
        setFeedback('');
        setSelectedResponseId(null);
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
        description: 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const currentRound = session.current_round || 0;
  const progressPercentage = (currentRound / session.max_rounds) * 100;
  const latestRound = rounds[rounds.length - 1];
  const canStartNewRound = 
    currentRound < session.max_rounds && 
    (!latestRound || latestRound.status === 'completed');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Debate Area */}
      <div className="lg:col-span-3 space-y-6">
        {/* Session Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Debate Progress
              </CardTitle>
              <Badge variant="outline">
                Round {currentRound} of {session.max_rounds}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progressPercentage} className="w-full" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Progress: {Math.round(progressPercentage)}%</span>
                <span>
                  {session.max_rounds - currentRound} rounds remaining
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debate Rounds */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Debate Rounds</CardTitle>
              {canStartNewRound && (
                <Button
                  onClick={handleStartRound}
                  disabled={isStartingRound}
                  className="flex items-center gap-2"
                >
                  {isStartingRound ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isStartingRound ? 'Starting...' : 'Start New Round'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {rounds.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <MessageSquare className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <p className="text-lg font-medium mb-2">No rounds started yet</p>
                  <p className="text-sm">
                    Click "Start New Round" to begin the debate
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {rounds.map((round) => {
                    const responses = round.agent_responses || [];
                    const completedResponses = responses.filter(
                      (r) => r.status === 'completed'
                    );

                    return (
                      <div key={round.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              Round {round.round_number}
                            </h3>
                            <Badge
                              variant={
                                round.status === 'completed'
                                  ? 'secondary'
                                  : round.status === 'in_progress'
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {round.status === 'completed' && (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              {round.status === 'in_progress' && (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              )}
                              {round.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {completedResponses.length}/{responses.length} responses
                          </div>
                        </div>

                        {/* Task Distribution */}
                        {round.distributor_response && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg mb-4">
                            <h4 className="font-medium text-sm mb-2">
                              Task Distribution
                            </h4>
                            <p className="text-sm">{round.distributor_response}</p>
                          </div>
                        )}

                        {/* Agent Responses */}
                        <div className="space-y-3">
                          {responses.map((response) => {
                            const agent = getAgentById(response.agent_id);
                            const isSelected = selectedResponseId === response.id;

                            return (
                              <div
                                key={response.id}
                                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted/50'
                                }`}
                                onClick={() =>
                                  response.status === 'completed' &&
                                  setSelectedResponseId(
                                    isSelected ? null : response.id
                                  )
                                }
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
                                        {response.status === 'completed' && (
                                          <CheckCircle className="h-3 w-3 text-green-600" />
                                        )}
                                        {response.status === 'processing' && (
                                          <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                                        )}
                                        {response.status === 'failed' && (
                                          <AlertCircle className="h-3 w-3 text-red-600" />
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          {response.status}
                                        </span>
                                      </div>
                                    </div>
                                    {response.status === 'completed' &&
                                    response.content ? (
                                      <p className="text-sm whitespace-pre-wrap">
                                        {response.content}
                                      </p>
                                    ) : response.status === 'failed' &&
                                      response.error_message ? (
                                      <p className="text-sm text-red-600">
                                        Error: {response.error_message}
                                      </p>
                                    ) : response.status === 'processing' ? (
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
                                        {formatDate(response.created_at)}
                                      </span>
                                      {response.processing_time_ms && (
                                        <span>
                                          {response.processing_time_ms}ms
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
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Participating Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agents ({agents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents.map((agent) => {
                const sessionAgent = session.session_agents?.find(
                  (sa) => sa.agent_id === agent.id
                );
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-2 rounded-lg border"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getAgentInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {agent.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            sessionAgent?.is_active
                              ? 'bg-green-500'
                              : 'bg-gray-400'
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
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Provide Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedResponseId ? (
              <div className="text-sm text-muted-foreground mb-2">
                Selected response for feedback
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mb-2">
                Click on a completed response to provide feedback
              </div>
            )}
            <Textarea
              placeholder="Share your thoughts on the selected response..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              disabled={!selectedResponseId}
            />
            <Button
              onClick={handleSubmitFeedback}
              disabled={
                !selectedResponseId ||
                !feedback.trim() ||
                isSubmittingFeedback
              }
              className="w-full"
            >
              {isSubmittingFeedback ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Feedback
            </Button>
          </CardContent>
        </Card>

        {/* Session Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Session Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline">{session.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Round:</span>
                <span>{currentRound}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Rounds:</span>
                <span>{session.max_rounds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agents:</span>
                <span>{agents.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}