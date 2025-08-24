'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Shield } from 'lucide-react';

interface AgentNodeData {
    id: string;
    name: string;
    role: string;
    color?: string;
    status?: string;
    progress?: number;
    topic?: string;
    message?: string;
}

const roleIcons = {
    advocate: Bot,
    opponent: User,
    moderator: Shield,
    PARTICIPANT: Bot,
    VALIDATOR: Shield,
    MODERATOR: Shield,
    TASK_DISTRIBUTOR: User,
    REPORT_GENERATOR: Bot,
};

const roleLabels = {
    advocate: 'Pro',
    opponent: 'Con',
    moderator: 'Mod',
    PARTICIPANT: 'Part',
    VALIDATOR: 'Val',
    MODERATOR: 'Mod',
    TASK_DISTRIBUTOR: 'Dist',
    REPORT_GENERATOR: 'Rep',
};

export function AgentNode({ data }: { data: AgentNodeData }) {
    const RoleIcon = roleIcons[data.role as keyof typeof roleIcons] || User;

    return (
        <div className="w-[120px]">
            <Handle type="target" position={Position.Top} className="w-3 h-3" />

            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-transparent">
                <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20">
                    <RoleIcon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground dark:text-white text-center leading-tight">
                    {data.name}
                </span>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
}