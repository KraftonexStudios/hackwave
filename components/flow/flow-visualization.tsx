'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Send, Users, Settings } from 'lucide-react';
import { getActiveAgents } from '@/actions/agents';
import type { Agent } from '@/database.types';
import { useToast } from '@/hooks/use-toast';
import { AgentNode } from './nodes/agent-node';
import { DebateNode } from './nodes/debate-node';
import { QuestionNode } from './nodes/question-node';
import { ResponseNode } from './nodes/response-node';
import { createClient } from '@/lib/supabase/client';

interface FlowVisualizationProps {
  agents?: Agent[];
  sessionId?: string;
}

const nodeTypes = {
  agent: AgentNode,
  debate: DebateNode,
  question: QuestionNode,
  response: ResponseNode,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'question',
    position: { x: 400, y: 50 },
    data: {
      label: 'Start Debate',
      question: 'Enter your topic to begin the debate visualization',
      status: 'waiting'
    },
  },
];

const initialEdges: Edge[] = [];

export function FlowVisualization({ agents = [], sessionId }: FlowVisualizationProps = {}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debateHistory, setDebateHistory] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [processingData, setProcessingData] = useState<any>(null);
  const [showValidationTable, setShowValidationTable] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds] = useState(5);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(agents.map(agent => agent.id));
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Load agents function
  const loadAgents = useCallback(async () => {
    setIsLoadingAgents(true);
    try {
      const result = await getActiveAgents();
      if (result.success) {
        setAvailableAgents(result.data || []);
      } else {
        toast({
          title: 'Error loading agents',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load agents',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAgents(false);
    }
  }, [toast]);

  // Load agents on component mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Toggle agent selection
  const toggleAgent = useCallback((agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  }, []);

  const generateAgentNode = (id: string, position: { x: number; y: number }, name: string, role: 'advocate' | 'opponent' | 'moderator', topic?: string) => ({
    id,
    type: 'agent',
    position,
    data: { name, role, status: 'active', topic: topic || 'Current Debate' },
  });

  const generateDebateNode = (id: string, position: { x: number; y: number }, topic: string, status: 'pending' | 'active' | 'completed' = 'active') => ({
    id,
    type: 'debate',
    position,
    data: { topic, status, rounds: Math.floor(Math.random() * 5) + 1, participants: ['Advocate', 'Opponent'] },
  });

  const generateQuestionNode = (id: string, position: { x: number; y: number }, question: string, assignedTo?: string) => ({
    id,
    type: 'question',
    position,
    data: {
      question,
      status: assignedTo ? 'assigned' : 'pending',
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      assignedTo
    },
  });

  const generateResponseNode = (id: string, position: { x: number; y: number }, agent: string, response: string, sentiment: 'positive' | 'negative' | 'neutral' = 'neutral') => ({
    id,
    type: 'response',
    position,
    data: {
      agent,
      response,
      sentiment,
      timestamp: new Date().toLocaleTimeString(),
      confidence: Math.floor(Math.random() * 30) + 70,
      wordCount: response.split(' ').length
    },
  });

  const createAgentNodes = (topic: string, nodeId: string) => {
    if (selectedAgents.length === 0) {
      toast({
        title: 'No agents selected',
        description: 'Please select at least one agent to start the flow.',
        variant: 'destructive',
      });
      return [];
    }

    const selectedAgentData = agents.filter(agent => selectedAgents.includes(agent.id));
    const roles: ('advocate' | 'opponent' | 'moderator')[] = ['advocate', 'opponent', 'moderator'];

    return selectedAgentData.map((agent, index) => {
      const role = roles[index % roles.length];
      const colors = ['#10b981', '#ef4444', '#6366f1'];
      const color = colors[index % colors.length];

      return {
        id: `${nodeId}_agent_${index}`,
        type: 'agent',
        position: { x: 200 + index * 300, y: 200 },
        data: {
          name: agent.name,
          role: role,
          color: color,
          status: 'active',
          topic: topic,
        },
      };
    });
  };

  const createDebateNode = (topic: string, nodeId: string) => ({
    id: `${nodeId}_debate`,
    type: 'debate',
    position: { x: 400, y: 350 },
    data: {
      topic: topic,
      status: 'active',
      rounds: 0,
      participants: 3,
    },
  });

  const createQuestionNodes = (topic: string, nodeId: string) => {
    const questions = [
      `What are the main arguments for ${topic}?`,
      `What are the potential drawbacks of ${topic}?`,
      `How does ${topic} impact society?`,
    ];

    return questions.map((question, index) => ({
      id: `${nodeId}_question_${index}`,
      type: 'question',
      position: { x: 100 + index * 250, y: 500 },
      data: {
        question: question,
        status: 'pending',
        assignedTo: ['Pro Agent', 'Con Agent', 'Moderator'][index],
      },
    }));
  };

  const createResponseNodes = (topic: string, nodeId: string) => {
    const responses = [
      { agent: 'Pro Agent', response: `Strong support for ${topic} based on evidence...`, sentiment: 'positive' },
      { agent: 'Con Agent', response: `Significant concerns about ${topic} include...`, sentiment: 'negative' },
      { agent: 'Moderator', response: `Balanced analysis of ${topic} reveals...`, sentiment: 'neutral' },
    ];

    return responses.map((resp, index) => ({
      id: `${nodeId}_response_${index}`,
      type: 'response',
      position: { x: 100 + index * 250, y: 650 },
      data: {
        agent: resp.agent,
        response: resp.response,
        sentiment: resp.sentiment,
        timestamp: new Date().toLocaleTimeString(),
      },
    }));
  };

  const createEdges = (nodeId: string, agentCount: number, questionCount: number) => {
    const newEdges: Edge[] = [];

    // Connect start to agents
    for (let i = 0; i < agentCount; i++) {
      newEdges.push({
        id: `start_to_agent_${i}`,
        source: 'start',
        target: `${nodeId}_agent_${i}`,
        animated: true,
        style: { stroke: '#6366f1' },
      });
    }

    // Connect agents to debate
    for (let i = 0; i < agentCount; i++) {
      newEdges.push({
        id: `agent_${i}_to_debate`,
        source: `${nodeId}_agent_${i}`,
        target: `${nodeId}_debate`,
        animated: true,
        style: { stroke: '#8b5cf6' },
      });
    }

    // Connect debate to questions
    for (let i = 0; i < questionCount; i++) {
      newEdges.push({
        id: `debate_to_question_${i}`,
        source: `${nodeId}_debate`,
        target: `${nodeId}_question_${i}`,
        animated: true,
        style: { stroke: '#f59e0b' },
      });
    }

    // Connect questions to responses
    for (let i = 0; i < questionCount; i++) {
      newEdges.push({
        id: `question_${i}_to_response_${i}`,
        source: `${nodeId}_question_${i}`,
        target: `${nodeId}_response_${i}`,
        animated: true,
        style: { stroke: '#10b981' },
      });
    }

    return newEdges;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    setIsProcessing(true);
    const topic = inputValue.trim();

    // Add to history
    setDebateHistory(prev => [...prev, topic]);

    try {
      // Get authenticated Supabase client
      const supabase = createClient();
      
      // Get the session to include auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      // Call the API to process the query with authentication
      const response = await fetch('/api/flow/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: topic,
          selectedAgents,
          sessionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process query');
      }

      const data = await response.json();

      // Create flow visualization based on API response
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Start node
      const startNode = {
        id: 'start',
        type: 'question',
        position: { x: 400, y: 50 },
        data: {
          label: 'Query Processed',
          question: data.query,
          status: 'answered'
        }
      };
      newNodes.push(startNode);

      // Task distributor node
      const distributorNode = {
        id: 'distributor',
        type: 'debate',
        position: { x: 400, y: 150 },
        data: {
          topic: 'Task Distribution',
          status: 'completed',
          rounds: 1,
          participants: data.agents?.map((a: any) => a.name) || ['Agent 1', 'Agent 2']
        }
      };
      newNodes.push(distributorNode);

      // Connect start to distributor
      newEdges.push({
        id: 'start-distributor',
        source: 'start',
        target: 'distributor',
        animated: true
      });

      // Agent nodes for parallel processing
      if (data.agents) {
        data.agents.forEach((agent: any, index: number) => {
          const agentNode = {
            id: `agent-${agent.id}`,
            type: 'agent',
            position: { x: 200 + (index * 200), y: 300 },
            data: {
              name: agent.name,
              role: agent.role,
              status: 'active',
              topic: data.query
            }
          };
          newNodes.push(agentNode);

          // Connect distributor to agents
          newEdges.push({
            id: `distributor-agent-${agent.id}`,
            source: 'distributor',
            target: `agent-${agent.id}`,
            animated: true
          });
        });
      }

      // Agent response nodes
      if (data.agentResponses) {
        data.agentResponses.forEach((response: any, index: number) => {
          const responseNode = {
            id: `response-${response.agentId}`,
            type: 'response',
            position: { x: 200 + (index * 200), y: 450 },
            data: {
              agent: response.agentName,
              response: response.response.substring(0, 100) + '...',
              sentiment: response.sentiment,
              confidence: response.confidence,
              wordCount: response.response.split(' ').length,
              timestamp: new Date().toLocaleTimeString()
            }
          };
          newNodes.push(responseNode);

          // Connect agent to response
          newEdges.push({
            id: `agent-response-${response.agentId}`,
            source: `agent-${response.agentId}`,
            target: `response-${response.agentId}`,
            animated: true
          });
        });
      }

      // Validator node
      const validatorNode = {
        id: 'validator',
        type: 'agent',
        position: { x: 400, y: 600 },
        data: {
          name: 'Validator Agent',
          role: 'moderator',
          status: 'active',
          topic: 'Validation'
        }
      };
      newNodes.push(validatorNode);

      // Connect all responses to validator
      if (data.agentResponses) {
        data.agentResponses.forEach((response: any) => {
          newEdges.push({
            id: `response-validator-${response.agentId}`,
            source: `response-${response.agentId}`,
            target: 'validator',
            animated: true
          });
        });
      }

      // Store validation results and show validation table
      setValidationResults(data.validationResults || []);
      setProcessingData(data);
      setShowValidationTable(true);

      setNodes(newNodes);
      setEdges(newEdges);

    } catch (error) {
      console.error('Error processing query:', error);
      // Fallback to original behavior on API error
      const nodeId = generateNodeId();
      const isQuestion = topic.includes('?') || topic.toLowerCase().startsWith('what') || topic.toLowerCase().startsWith('how') || topic.toLowerCase().startsWith('why');
      const isDebateTopic = topic.toLowerCase().includes('vs') || topic.toLowerCase().includes('versus') || topic.toLowerCase().includes('debate');

      let newNodes: Node[] = [];
      let newEdges: Edge[] = [];

      if (isQuestion) {
        const questionNode = generateQuestionNode(
          `question_${nodeId}`,
          { x: Math.random() * 400 + 200, y: Math.random() * 200 + 100 },
          topic
        );

        const advocateAgent = generateAgentNode(
          `agent_adv_${nodeId}`,
          { x: questionNode.position.x - 200, y: questionNode.position.y + 150 },
          'Advocate Agent',
          'advocate',
          topic
        );

        const opponentAgent = generateAgentNode(
          `agent_opp_${nodeId}`,
          { x: questionNode.position.x + 200, y: questionNode.position.y + 150 },
          'Opponent Agent',
          'opponent',
          topic
        );

        newNodes = [questionNode, advocateAgent, opponentAgent];
        newEdges = [
          {
            id: `edge_q_adv_${nodeId}`,
            source: questionNode.id,
            target: advocateAgent.id,
            animated: true,
            style: { stroke: '#10b981' }
          },
          {
            id: `edge_q_opp_${nodeId}`,
            source: questionNode.id,
            target: opponentAgent.id,
            animated: true,
            style: { stroke: '#ef4444' }
          }
        ];
      } else {
        const agentNodes = createAgentNodes(topic, nodeId);
        const debateNode = createDebateNode(topic, nodeId);
        const questionNodes = createQuestionNodes(topic, nodeId);
        const responseNodes = createResponseNodes(topic, nodeId);

        newNodes = [...agentNodes, debateNode, ...questionNodes, ...responseNodes];
        newEdges = createEdges(nodeId, agentNodes.length, questionNodes.length);
      }

      setNodes(prevNodes => [
        ...prevNodes.filter(node => node.id === 'start'),
        ...newNodes,
      ]);
      setEdges(prevEdges => [...prevEdges, ...newEdges]);
    }

    // Clear input
    setInputValue('');
    setIsProcessing(false);
  }, [inputValue, isProcessing, selectedAgents, agents, availableAgents, toast]);

  const clearFlow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setDebateHistory([]);
  };

  // Auto-layout function to organize nodes
  const autoLayout = useCallback(() => {
    setNodes((nds) => {
      const layoutedNodes = nds.map((node, index) => {
        if (node.id === 'start') return node;

        const row = Math.floor(index / 3);
        const col = index % 3;

        return {
          ...node,
          position: {
            x: col * 300 + 100,
            y: row * 200 + 150,
          },
        };
      });
      return layoutedNodes;
    });
  }, [setNodes]);

  // Add real-time typing effect
  useEffect(() => {
    if (inputValue.length > 0 && inputValue.length % 10 === 0) {
      // Update start node to show typing progress
      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'start'
            ? {
              ...node,
              data: {
                ...node.data,
                question: `Processing: "${inputValue}"...`,
                status: 'assigned'
              }
            }
            : node
        )
      );
    } else if (inputValue.length === 0) {
      // Reset start node
      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'start'
            ? {
              ...node,
              data: {
                ...node.data,
                question: 'Enter your topic to begin the debate visualization',
                status: 'waiting'
              }
            }
            : node
        )
      );
    }
  }, [inputValue]); // Removed setNodes dependency to prevent infinite loop

  const handleValidationSelectionChange = (selectedIds: string[]) => {
    // Update validation results with selection
    setValidationResults(prev =>
      prev.map(result => ({
        ...result,
        selected: selectedIds.includes(result.id)
      }))
    );
  };

  const handleValidationFeedback = async (
    feedback: string,
    selectedIds: string[],
    action: 'next_round' | 'generate_report'
  ) => {
    if (!currentSessionId) return;

    try {
      // Get authenticated Supabase client
      const supabase = createClient();
      
      // Get the session to include auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch('/api/flow/iterate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          selectedValidations: selectedIds,
          userFeedback: feedback,
          action
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process feedback');
      }

      const data = await response.json();

      if (data.action === 'report_generated') {
        // Handle report generation
        alert('Report generated successfully! Download will start shortly.');
        setShowValidationTable(false);
        // Reset for new session
        setCurrentRound(1);
        setCurrentSessionId(null);
      } else if (data.action === 'next_round_ready') {
        // Prepare for next round
        setCurrentRound(data.nextRoundNumber);
        setShowValidationTable(false);
        // Clear current flow to prepare for next round
        setNodes([initialNodes[0]]); // Keep only start node
        setEdges([]);
        alert(`Round ${data.nextRoundNumber} is ready. Enter your next query.`);
      }
    } catch (error) {
      console.error('Error processing feedback:', error);
      throw error;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Flow Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {/* No Agents Connected Indicator */}
        {selectedAgents.length === 0 && (
          <div className="absolute top-4 right-4 z-10">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">No agents connected to this flow</span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Click the agents button below to select agents for your flow
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Sheet open={showAgentPanel} onOpenChange={setShowAgentPanel}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Users className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Select Agents</SheetTitle>
                <SheetDescription>
                  Choose agents to participate in the debate flow.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Selected: {selectedAgents.length}</span>
                    {selectedAgents.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAgents([])}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAgents.map(agentId => {
                      const agent = agents.find(a => a.id === agentId) || availableAgents.find(a => a.id === agentId);
                      return agent ? (
                        <Badge key={agentId} variant="secondary" className="text-xs">
                          {agent.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {isLoadingAgents ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Loading agents...
                      </div>
                    ) : availableAgents.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No agents available
                      </div>
                    ) : (
                      availableAgents.map(agent => (
                        <Card key={agent.id} className="p-3">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={agent.id}
                              checked={selectedAgents.includes(agent.id)}
                              onCheckedChange={() => toggleAgent(agent.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={agent.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {agent.name}
                              </label>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {agent.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${agent.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {agent.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter debate topic, question, or argument..."
              disabled={isProcessing}
              className="pr-12 bg-white/90 backdrop-blur-sm border-2"
            />
            {isProcessing && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
          <Button type="submit" disabled={!inputValue.trim() || isProcessing || selectedAgents.length === 0}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>


    </div>
  );
}