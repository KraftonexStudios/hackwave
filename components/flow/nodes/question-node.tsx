'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node } from '@xyflow/react';
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

export function QuestionNode({ data }: { data: QuestionNodeData }) {
    const config = statusConfig[data.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
        <div className="w-[400px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3" />

            <div className="flex items-center gap-3 p-3 rounded-lg border-2 bg-card shadow-sm" style={{ borderColor: config.color }}>
                <div
                    className="p-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${config.color}20` }}
                >
                    <StatusIcon
                        className="h-5 w-5"
                        style={{ color: config.color }}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{data.question}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {data.priority && (
                        <Badge
                            variant="outline"
                            className="text-xs px-2 py-1"
                            style={{
                                borderColor: priorityColors[data.priority],
                                color: priorityColors[data.priority]
                            }}
                        >
                            {data.priority}
                        </Badge>
                    )}
                    <Badge
                        variant="outline"
                        className="text-xs px-2 py-1"
                        style={{ borderColor: config.color, color: config.color }}
                    >
                        {config.label}
                    </Badge>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
}