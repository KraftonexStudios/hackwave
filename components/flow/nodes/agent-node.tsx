'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Shield } from 'lucide-react';

interface AgentNodeData {
  name: string;
  role: 'advocate' | 'opponent' | 'moderator';
  color: string;
  status: 'active' | 'idle' | 'thinking';
  topic?: string;
}

const roleIcons = {
  advocate: Bot,
  opponent: User,
  moderator: Shield,
};

const roleLabels = {
  advocate: 'Pro',
  opponent: 'Con',
  moderator: 'Mod',
};

export function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const Icon = roleIcons[data.role];
  
  return (
    <div className="min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <Card className="border-2 shadow-lg" style={{ borderColor: data.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8" style={{ backgroundColor: data.color }}>
              <AvatarFallback className="text-white text-xs">
                <Icon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{data.name}</h3>
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: data.color, color: data.color }}
              >
                {roleLabels[data.role]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Badge 
                variant={data.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {data.status}
              </Badge>
            </div>
            
            {data.topic && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Topic:</span>
                <p className="mt-1 line-clamp-2">{data.topic}</p>
              </div>
            )}
            
            {data.status === 'thinking' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="animate-pulse w-2 h-2 bg-current rounded-full"></div>
                <span>Processing...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}