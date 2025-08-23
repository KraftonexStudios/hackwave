'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Session, Agent, Round, Responce as AgentResponse } from '@/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  MessageSquare,
  Zap,
  Target,
  RotateCcw,
  Download,
  Maximize2,
} from 'lucide-react';

// Custom node types
const nodeTypes = {
  agent: AgentNode,
  session: SessionNode,
  round: RoundNode,
};

interface AgentFlowVisualizationProps {
  session: Session;
  agents: Agent[];
  rounds: (Round & {
    agent_responses?: AgentResponse[];
  })[];
}

interface AgentNodeData {
  agent: Agent;
  responseCount: number;
  avgProcessingTime: number;
  status: 'active' | 'inactive';
}

interface SessionNodeData {
  session: Session;
  progress: number;
}

interface RoundNodeData {
  round: Round;
  responseCount: number;
}

// Custom Agent Node Component
function AgentNode({ data }: { data: AgentNodeData }) {
  const getAgentInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getAgentInitials(data.agent.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{data.agent.name}</h3>
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${data.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                }`}
            />
            <span className="text-xs text-muted-foreground">
              {data.status}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Responses:</span>
          <span className="font-medium">{data.responseCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Time:</span>
          <span className="font-medium">{data.avgProcessingTime}ms</span>
        </div>
      </div>
    </div>
  );
}

// Custom Session Node Component
function SessionNode({ data }: { data: SessionNodeData }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-sm">Debate Session</h3>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-medium truncate">
          {data.session.initial_query}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress:</span>
          <Badge variant="outline">{Math.round(data.progress)}%</Badge>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${data.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Custom Round Node Component
function RoundNode({ data }: { data: RoundNodeData }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'in_progress':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className={`${getStatusColor(data.round.status)} border-2 rounded-lg p-3 shadow-lg min-w-[150px]`}>
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4" />
        <h3 className="font-medium text-sm">
          Round {data.round.round_number}
        </h3>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant="outline" className="text-xs">
            {data.round.status}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Responses:</span>
          <span className="font-medium">{data.responseCount}</span>
        </div>
      </div>
    </div>
  );
}

export function AgentFlowVisualization({
  session,
  agents,
  rounds,
}: AgentFlowVisualizationProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [layoutType, setLayoutType] = useState<'hierarchical' | 'circular' | 'force'>('hierarchical');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate agent statistics
  const agentStats = useMemo(() => {
    const stats = new Map();

    agents.forEach((agent) => {
      const responses = rounds.flatMap(round =>
        (round.agent_responses || []).filter(response => response.agent_id === agent.id)
      );

      const completedResponses = responses.filter(r => r.status === 'ACCEPTED' || r.status === 'VALIDATED');
      const avgProcessingTime = completedResponses.length > 0
        ? Math.round(
          completedResponses.reduce((sum, r) => sum + (r.processing_time || 0), 0) /
          completedResponses.length
        )
        : 0;

      // Note: session_agents relationship is handled separately in the database
      // For now, we'll default to 'active' status since we don't have session_agents data
      stats.set(agent.id, {
        responseCount: responses.length,
        avgProcessingTime,
        status: 'active', // Default to active since we don't have session_agents data
      });
    });

    return stats;
  }, [agents, rounds, session]);

  // Generate nodes and edges based on layout type
  const generateLayout = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Session node (center)
    const sessionProgress = session.max_rounds > 0
      ? ((session.current_round || 0) / session.max_rounds) * 100
      : 0;

    newNodes.push({
      id: 'session',
      type: 'session',
      position: { x: 400, y: 200 },
      data: {
        session,
        progress: sessionProgress,
      },
    });

    // Agent nodes
    const agentRadius = 250;
    const agentAngleStep = (2 * Math.PI) / agents.length;

    agents.forEach((agent, index) => {
      const stats = agentStats.get(agent.id) || {
        responseCount: 0,
        avgProcessingTime: 0,
        status: 'inactive',
      };

      let position;
      if (layoutType === 'circular') {
        const angle = index * agentAngleStep;
        position = {
          x: 400 + Math.cos(angle) * agentRadius,
          y: 200 + Math.sin(angle) * agentRadius,
        };
      } else if (layoutType === 'hierarchical') {
        position = {
          x: 100 + (index % 3) * 300,
          y: 50 + Math.floor(index / 3) * 150,
        };
      } else {
        // Force layout - random positions that will be adjusted
        position = {
          x: 200 + Math.random() * 400,
          y: 100 + Math.random() * 200,
        };
      }

      newNodes.push({
        id: `agent-${agent.id}`,
        type: 'agent',
        position,
        data: {
          agent,
          ...stats,
        },
      });

      // Connect agents to session
      newEdges.push({
        id: `session-agent-${agent.id}`,
        source: 'session',
        target: `agent-${agent.id}`,
        type: 'smoothstep',
        animated: stats.status === 'active',
        style: {
          stroke: stats.status === 'active' ? '#10b981' : '#6b7280',
          strokeWidth: 2,
        },
      });
    });

    // Round nodes
    rounds.forEach((round, index) => {
      const responseCount = round.agent_responses?.length || 0;

      newNodes.push({
        id: `round-${round.id}`,
        type: 'round',
        position: {
          x: 600 + (index % 2) * 200,
          y: 100 + index * 100,
        },
        data: {
          round,
          responseCount,
        },
      });

      // Connect session to rounds
      newEdges.push({
        id: `session-round-${round.id}`,
        source: 'session',
        target: `round-${round.id}`,
        type: 'smoothstep',
        animated: round.status === 'IN_PROGRESS',
        style: {
          stroke: round.status === 'COMPLETED' ? '#10b981' :
            round.status === 'IN_PROGRESS' ? '#f59e0b' : '#6b7280',
          strokeWidth: 2,
        },
      });

      // Connect agents to rounds based on responses
      round.agent_responses?.forEach((response) => {
        newEdges.push({
          id: `agent-${response.agent_id}-round-${round.id}`,
          source: `agent-${response.agent_id}`,
          target: `round-${round.id}`,
          type: 'smoothstep',
          animated: response.status === 'SUBMITTED',
          style: {
            stroke: response.status === 'ACCEPTED' ? '#10b981' :
              response.status === 'VALIDATED' ? '#10b981' :
                response.status === 'SUBMITTED' ? '#3b82f6' :
                  response.status === 'REJECTED' ? '#ef4444' : '#6b7280',
            strokeWidth: 1,
            strokeDasharray: response.status === 'SUBMITTED' ? '5,5' : undefined,
          },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [agents, rounds, session, agentStats, layoutType]); // Removed setNodes and setEdges to prevent infinite loop

  // Generate layout on mount and when dependencies change
  useEffect(() => {
    generateLayout();
  }, [generateLayout]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleExportImage = useCallback(() => {
    // This would implement image export functionality
    console.log('Export image functionality would be implemented here');
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <Card className={isFullscreen ? 'fixed inset-4 z-50' : 'h-[600px]'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Agent Interaction Flow
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={layoutType} onValueChange={(value: any) => setLayoutType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hierarchical">Hierarchical</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="force">Force</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportImage}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-full">
        <div className={`w-full ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[500px]'}`}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap
              nodeStrokeColor={(n) => {
                if (n.type === 'session') return '#3b82f6';
                if (n.type === 'agent') return '#10b981';
                if (n.type === 'round') return '#f59e0b';
                return '#6b7280';
              }}
              nodeColor={(n) => {
                if (n.type === 'session') return '#dbeafe';
                if (n.type === 'agent') return '#d1fae5';
                if (n.type === 'round') return '#fef3c7';
                return '#f3f4f6';
              }}
              nodeBorderRadius={8}
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Panel position="top-left">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
                <h4 className="font-medium text-sm mb-2">Legend</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded" />
                    <span>Session</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" />
                    <span>Agent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded" />
                    <span>Round</span>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}