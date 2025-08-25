'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Clock, CheckCircle, AlertCircle, FileText, Download, Eye, Play, RotateCcw, Move, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DebateRound } from '@/database.types';
import { getFlowRounds } from '@/actions/flows';
import { getSessionReports } from '@/actions/reports';
import { useToast } from '@/hooks/use-toast';

interface DebateRoundsSidebarProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onRoundSelect?: (round: DebateRound) => void;
  onLoadRound?: (round: DebateRound) => void;
  currentRound?: number;
}

interface Report {
  id: string;
  title: string | null;
  content: string | null;
  summary: string | null;
  report_type: 'INTERIM' | 'FINAL' | 'SUMMARY';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  completed_at: string | null;
  pdf_url: string | null;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED: CheckCircle,
  FAILED: AlertCircle,
};

const reportTypeColors = {
  INTERIM: 'bg-blue-50 text-blue-700 border-blue-200',
  FINAL: 'bg-green-50 text-green-700 border-green-200',
  SUMMARY: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function DebateRoundsSidebar({
  sessionId,
  isOpen,
  onClose,
  onRoundSelect,
  onLoadRound,
  currentRound = 1
}: DebateRoundsSidebarProps) {
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load rounds and reports
  useEffect(() => {
    if (sessionId && isOpen) {
      loadData();
    }
  }, [sessionId, isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roundsResult, reportsResult] = await Promise.all([
        getFlowRounds(sessionId),
        getSessionReports(sessionId)
      ]);

      if (roundsResult.success) {
        setRounds(roundsResult.data || []);
      } else {
        toast({
          title: 'Error loading rounds',
          description: roundsResult.error,
          variant: 'destructive',
        });
      }

      if (reportsResult.success) {
        setReports(reportsResult.data || []);
      } else {
        console.warn('Error loading reports:', reportsResult.error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load debate data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoundClick = (round: DebateRound) => {
    setSelectedRoundId(round.id);
    onRoundSelect?.(round);
  };

  const getFlowDataFromRound = (round: DebateRound) => {
    try {
      if (round.distributor_response && typeof round.distributor_response === 'object') {
        return round.distributor_response as any;
      }
      return null;
    } catch {
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-background shadow-xl border-l border-border z-[100000] overflow-hidden flex">
      {/* Close Button */}
      <div className="flex items-center justify-center w-8 bg-muted/30 border-r border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-6 rounded-md hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Question History
            </h3>
            <Badge variant="outline" className="ml-auto">
              {rounds.length} rounds
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Browse your previous questions and debate rounds
          </p>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Round Indicator */}
              <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-primary">
                    Current Round: {currentRound}
                  </span>
                </div>
              </div>

              {/* Rounds List */}
              {rounds.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No history yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Start a debate to see your question history here
                  </p>
                </div>
              ) : (
                rounds.map((round, index) => {
                  const StatusIcon = statusIcons[round.status as keyof typeof statusIcons] || Clock;
                  const flowData = getFlowDataFromRound(round);
                  const isSelected = selectedRoundId === round.id;

                  return (
                    <Card
                      key={round.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                      onClick={() => handleRoundClick(round)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm">
                              Round {round.round_number}
                            </CardTitle>
                          </div>
                          <Badge
                            className={statusColors[round.status as keyof typeof statusColors] || statusColors.PENDING}
                            variant="outline"
                          >
                            {round.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-3">
                        {/* Question as prominent label */}
                        {round.distributor_query && (
                          <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <label className="text-xs font-semibold text-primary uppercase tracking-wide">Question</label>
                                <p className="text-sm text-foreground font-medium mt-1 leading-relaxed">
                                  {round.distributor_query}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Summary Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Round Summary</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => onLoadRound?.(round)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                          
                          {/* Basic flow info */}
                          {flowData && (
                            <div className="bg-muted/30 p-2 rounded text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Flow completed with</span>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                    {flowData.nodes?.length || flowData.nodeCount || 0} nodes
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                                    {flowData.edges?.length || flowData.edgeCount || 0} connections
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Started {formatDistanceToNow(new Date(round.started_at), { addSuffix: true })}
                          </span>
                          {round.completed_at && (
                            <span>
                              Completed {formatDistanceToNow(new Date(round.completed_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              {/* Reports Section */}
              {reports.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Session Reports
                    </h4>
                    <div className="space-y-2">
                      {reports.map((report) => (
                        <Card key={report.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  className={reportTypeColors[report.report_type]}
                                  variant="outline"
                                >
                                  {report.report_type}
                                </Badge>
                                <Badge
                                  className={statusColors[report.status as keyof typeof statusColors] || statusColors.PENDING}
                                  variant="outline"
                                >
                                  {report.status}
                                </Badge>
                              </div>
                              {report.title && (
                                <h5 className="font-medium text-sm">{report.title}</h5>
                              )}
                              {report.summary && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {report.summary}
                                </p>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Eye className="h-3 w-3" />
                              </Button>
                              {report.pdf_url && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}