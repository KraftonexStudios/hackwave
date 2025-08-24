'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, Clock } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface ResponseNodeData {
  agent: string;
  response: string;
  points?: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: string;
  confidence?: number;
  wordCount?: number;
  isStreaming?: boolean;
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

export function ResponseNode({ data }: { data: ResponseNodeData }) {
  const config = sentimentConfig[data.sentiment];
  const SentimentIcon = config.icon;
  const agentColor = getAgentColor(data.agent);
  const wordCount = data.wordCount || data.response.split(' ').length;
  const confidence = data.confidence || Math.floor(Math.random() * 30) + 70; // Mock confidence

  // Use streamed points if available, otherwise fallback to parsing response
  const responsePoints = data.points || (
    data.response
      .split(/[.!?]\s+/)
      .filter(point => point.trim().length > 10)
      .slice(0, 3)
  );

  return (
    <div className="w-[600px]">
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
                {data.isStreaming && (
                  <div className="flex items-center space-x-1">
                    <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full"></div>
                    <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                    <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
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

        <CardContent className="pt-0 space-y-2">
          {/* Markdown Response Content */}
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: config.bgColor }}
          >
            {data.response ? (
              <div className={`transition-opacity duration-500 ${data.isStreaming ? 'animate-fade-in' : ''
                }`}>
                <MarkdownRenderer
                  content={data.response}
                  className="text-foreground"
                />
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <div className="animate-spin w-3 h-3 border border-muted border-t-primary rounded-full"></div>
                <span className="text-xs">Generating response...</span>
              </div>
            )}

            {data.isStreaming && (
              <div className="flex items-center gap-2 text-gray-400 animate-pulse mt-2 pt-2 border-t border-gray-200">
                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="text-xs">Generating more content...</span>
              </div>
            )}
          </div>

          {/* Confidence and Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Words: {wordCount}</span>
            <span>Confidence: {confidence}%</span>
          </div>
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}