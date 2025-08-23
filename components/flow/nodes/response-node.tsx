'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, Clock } from 'lucide-react';

interface ResponseNodeData {
  agent: string;
  response: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: string;
  confidence?: number;
  wordCount?: number;
}

const sentimentConfig = {
  positive: {
    color: '#10b981',
    icon: ThumbsUp,
    label: 'Pro',
    bgColor: '#10b98120'
  },
  negative: {
    color: '#ef4444',
    icon: ThumbsDown,
    label: 'Con',
    bgColor: '#ef444420'
  },
  neutral: {
    color: '#6b7280',
    icon: Minus,
    label: 'Neutral',
    bgColor: '#6b728020'
  }
};

const getAgentInitials = (name: string) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase();
};

const getAgentColor = (name: string) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export function ResponseNode({ data }: NodeProps<ResponseNodeData>) {
  const config = sentimentConfig[data.sentiment];
  const SentimentIcon = config.icon;
  const agentColor = getAgentColor(data.agent);
  const wordCount = data.wordCount || data.response.split(' ').length;
  const confidence = data.confidence || Math.floor(Math.random() * 30) + 70; // Mock confidence
  
  return (
    <div className="min-w-[280px] max-w-[320px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <Card className="border-2 shadow-lg" style={{ borderColor: config.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0" style={{ backgroundColor: agentColor }}>
              <AvatarFallback className="text-white text-xs font-semibold">
                {getAgentInitials(data.agent)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{data.agent}</h3>
                <Badge 
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 flex items-center gap-1"
                  style={{ borderColor: config.color, color: config.color }}
                >
                  <SentimentIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{data.timestamp}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {/* Response Text */}
          <div 
            className="p-3 rounded-lg text-sm leading-relaxed"
            style={{ backgroundColor: config.bgColor }}
          >
            <p className="text-foreground line-clamp-4">{data.response}</p>
          </div>
          
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Words:</span>
              <span className="font-medium">{wordCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-medium">{confidence}%</span>
            </div>
          </div>
          
          {/* Confidence Bar */}
          <div className="space-y-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${confidence}%`,
                  backgroundColor: config.color
                }}
              ></div>
            </div>
          </div>
          
          {/* Sentiment Indicator */}
          <div className="flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: config.bgColor }}>
            <MessageSquare className="h-3 w-3" style={{ color: config.color }} />
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {data.sentiment.charAt(0).toUpperCase() + data.sentiment.slice(1)} Response
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}