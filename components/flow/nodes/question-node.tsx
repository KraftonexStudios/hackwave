'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, CheckCircle, Clock, User } from 'lucide-react';

interface QuestionNodeData {
  question: string;
  status: 'pending' | 'assigned' | 'answered' | 'waiting';
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  label?: string;
}

const statusConfig = {
  pending: {
    color: '#f59e0b',
    icon: Clock,
    label: 'Pending'
  },
  assigned: {
    color: '#3b82f6',
    icon: User,
    label: 'Assigned'
  },
  answered: {
    color: '#10b981',
    icon: CheckCircle,
    label: 'Answered'
  },
  waiting: {
    color: '#6b7280',
    icon: HelpCircle,
    label: 'Waiting'
  }
};

const priorityColors = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

export function QuestionNode({ data }: NodeProps<QuestionNodeData>) {
  const config = statusConfig[data.status];
  const StatusIcon = config.icon;
  
  return (
    <div className="min-w-[250px] max-w-[300px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <Card className="border-2 shadow-lg" style={{ borderColor: config.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-2">
            <div 
              className="p-1.5 rounded-md flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <StatusIcon 
                className="h-4 w-4" 
                style={{ color: config.color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">Question</h3>
                {data.priority && (
                  <Badge 
                    variant="outline" 
                    className="text-xs px-1.5 py-0.5"
                    style={{ 
                      borderColor: priorityColors[data.priority], 
                      color: priorityColors[data.priority] 
                    }}
                  >
                    {data.priority}
                  </Badge>
                )}
              </div>
              <Badge 
                variant="outline"
                className="text-xs"
                style={{ borderColor: config.color, color: config.color }}
              >
                {config.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {/* Question Text */}
          <div className="text-sm leading-relaxed">
            <p className="text-foreground">{data.question}</p>
          </div>
          
          {/* Assignment Info */}
          {data.assignedTo && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
              <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300">
                Assigned to: <span className="font-medium">{data.assignedTo}</span>
              </span>
            </div>
          )}
          
          {/* Status Indicator */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1">
              {data.status === 'pending' && (
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              )}
              {data.status === 'assigned' && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
              {data.status === 'answered' && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
              <span className="font-medium" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>
          </div>
          
          {/* Waiting state */}
          {data.status === 'waiting' && (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                <span>Waiting for input...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}