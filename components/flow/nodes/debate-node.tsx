'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Users, Clock, Zap } from 'lucide-react';

interface DebateNodeData {
  topic: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  rounds: number;
  participants: number;
  progress?: number;
}

const statusColors = {
  PENDING: '#f59e0b',
  ACTIVE: '#10b981',
  COMPLETED: '#6366f1',
  pending: '#f59e0b',
  active: '#10b981',
  completed: '#6366f1',
};

const statusIcons = {
  PENDING: Clock,
  ACTIVE: Zap,
  COMPLETED: MessageSquare,
  pending: Clock,
  active: Zap,
  completed: MessageSquare,
};

export function DebateNode({ data }: { data: DebateNodeData }) {
  const StatusIcon = statusIcons[data.status as keyof typeof statusIcons] || Clock;
  const progress = data.progress || (data.status === 'ACTIVE' ? 65 : data.status === 'COMPLETED' ? 100 : 0);

  return (
    <div className="min-w-[280px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <Card className="border-2 shadow-lg" style={{ borderColor: statusColors[data.status as keyof typeof statusColors] || '#6b7280' }}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${statusColors[data.status as keyof typeof statusColors] || '#6b7280'}20` }}
            >
              <StatusIcon
                className="h-5 w-5"
                style={{ color: statusColors[data.status as keyof typeof statusColors] || '#6b7280' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Debate Session</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {data.topic}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              style={{ borderColor: statusColors[data.status], color: statusColors[data.status] }}
            >
              {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{data.participants} agents</span>
            </div>
          </div>

          {/* Progress */}
          {data.status !== 'PENDING' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Rounds:</span>
              <span className="font-medium">{data.rounds}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Active</span>
            </div>
          </div>

          {/* Live indicator for active debates */}
          {data.status === 'ACTIVE' && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                Live Debate in Progress
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}