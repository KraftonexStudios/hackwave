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
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Send, Users, Settings, Layout, X, ChevronRight } from 'lucide-react';
import { getActiveAgents } from '@/actions/agents';
import type { Agent } from '@/database.types';
import { useToast } from '@/hooks/use-toast';
import { AgentNode } from './nodes/agent-node';
import { DebateNode } from './nodes/debate-node';
import { QuestionNode } from './nodes/question-node';
import { ResponseNode } from './nodes/response-node';
import { ValidatorTableNode } from './nodes/validator-table-node';

import { FlowOrchestrator } from './flow-orchestrator';
import { contextManager, FlowRestartConfig } from '@/lib/context-manager';
import { UserInteractionFormData } from './user-interaction-form';
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
  validatorTable: ValidatorTableNode,
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [validationData, setValidationData] = useState<any[]>([]);
  const [processingData, setProcessingData] = useState<any>(null);

  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds] = useState(5);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(agents.map(agent => agent.id));
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'BT' | 'LR' | 'RL'>('TB');
  const [showFlowOrchestrator, setShowFlowOrchestrator] = useState(false);
  const [orchestratorData, setOrchestratorData] = useState<UserInteractionFormData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeSidebar, setShowNodeSidebar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeSidebar(true);
  }, []);

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

  // Handle flow restart from orchestrator
  const handleFlowRestart = useCallback((config: FlowRestartConfig) => {
    toast({
      title: 'Flow Restarted',
      description: `Starting iteration ${config.iterationCount} with updated context`,
    });

    // Reset current flow state
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentRound(1);
    setDebateHistory([]);
    setValidationResults([]);
    setShowFlowOrchestrator(false);

    // Update selected agents from config
    setSelectedAgents(config.selectedAgents);

    // Set the enhanced prompt as input value
    const enhancedQuestion = `${config.metadata.originalQuestion}\n\nUpdated Context: ${config.metadata.contextUpdates}`;
    setInputValue(enhancedQuestion);

    // Auto-submit the enhanced prompt
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  }, [toast, setNodes, setEdges]);

  // Handle validation completion and show orchestrator
  const handleValidationComplete = useCallback((validationData: any[]) => {
    // Prepare data for the orchestrator
    const formData: UserInteractionFormData = {
      validatorResponses: validationData.map((validation, index) => ({
        id: `validator_${index}`,
        agentName: validation.agentName || `Agent ${index + 1}`,
        points: validation.points || [
          {
            id: `point_${index}_1`,
            content: validation.summary || 'No summary available',
            isKept: true,
            feedback: ''
          }
        ],
        overallFeedback: ''
      })),
      originalQuestion: inputValue,
      contextUpdates: '',
      additionalInstructions: '',
      selectedAgents: selectedAgents,
      availableAgents: availableAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        role: agent.description || 'Agent'
      }))
    };

    setOrchestratorData(formData);
    setShowFlowOrchestrator(true);
  }, [inputValue, selectedAgents, availableAgents]);

  // Handle adding validator table node to flow
  const addValidatorTableNode = useCallback((validationData: any[]) => {
    const validatorTableNode = {
      id: 'validator-table',
      type: 'validatorTable',
      position: { x: 400, y: 750 },
      data: {
        responses: [{
          id: 'validator_summary',
          agentName: 'Validator Agent Analysis',
          points: validationData.map((result, index) => ({
            id: `validation_${index}`,
            content: `${result.claim}: ${result.evidence} (Confidence: ${result.confidence}%)`,
            isKept: result.isValid,
            feedback: result.logicalFallacies?.length > 0 ? `Logical issues: ${result.logicalFallacies.join(', ')}` : ''
          })),
          overallFeedback: `Validation completed for ${validationData.length} claims. ${validationData.filter(r => r.isValid).length} validated as correct.`
        }],
        onResponseUpdate: (responses: any[]) => {
          console.log('Validator responses updated:', responses);
        },
        onRegenerate: async () => {
          console.log('Starting automated regeneration...');

          if (!validationData || validationData.length === 0) {
            toast({
              title: "No validation data",
              description: "No validation results available for regeneration.",
              variant: "destructive"
            });
            return;
          }

          try {
            toast({
              title: "Automated Regeneration Started",
              description: "Saving current flow state and generating new context...",
            });

            // Import the context manager and report functions
            const { ContextManager } = await import('@/lib/context-manager');
            const { saveRegenerationReport, saveFlowStateSnapshot } = await import('@/actions/reports');

            const contextManager = ContextManager.getInstance();

            // Save current flow state before regeneration
            if (currentSessionId) {
              const snapshotResult = await saveFlowStateSnapshot(
                currentSessionId,
                nodes,
                edges,
                validationResults,
                currentRound
              );

              if (snapshotResult.success) {
                toast({
                  title: "Flow State Saved",
                  description: `Current flow preserved with snapshot ID: ${snapshotResult.data?.snapshotId}`,
                });
              }
            }

            // Automatically process validation data and generate context
            const newContext = contextManager.processValidationDataAutomatically(
              validationData,
              inputValue || '',
              selectedAgents || []
            );

            // Save regeneration report if we have a session
            if (currentSessionId) {
              const reportResult = await saveRegenerationReport(
                currentSessionId,
                inputValue || '',
                validationData,
                newContext,
                newContext.iterationCount
              );

              if (reportResult.success) {
                toast({
                  title: "Report Saved",
                  description: `Regeneration report saved with ID: ${reportResult.data?.reportId}`,
                });
              }
            }

            // Prepare flow restart configuration
            const restartConfig = contextManager.prepareFlowRestart(newContext);

            // Clear all existing nodes and edges for fresh flow experience
            setNodes([{
              id: 'start',
              type: 'question',
              position: { x: 400, y: 50 },
              data: {
                label: 'Regenerated Flow',
                question: restartConfig.enhancedPrompt,
                status: 'processing'
              },
            }]);
            setEdges([]);

            // Clear validation data for fresh start
            setValidationResults([]);
            setValidationData([]);

            // Increment round for new iteration
            setCurrentRound(prev => prev + 1);

            // Get authenticated Supabase client
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
              throw new Error('Authentication required. Please log in.');
            }

            // Start new flow with enhanced context
            const response = await fetch('/api/flow/stream', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                query: restartConfig.enhancedPrompt,
                selectedAgents: restartConfig.selectedAgents,
                sessionId: currentSessionId,
                regenerateValidation: true,
                contextId: restartConfig.contextId,
                iterationCount: restartConfig.iterationCount
              })
            });

            if (!response.ok) {
              throw new Error('Failed to start regenerated flow');
            }

            // Handle streaming response for regenerated flow
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
              throw new Error('Failed to get response reader');
            }

            let buffer = '';
            const streamingNodes = new Map();
            const streamingEdges = new Map();

            while (true) {
              const { done, value } = await reader.read();

              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const eventData = JSON.parse(line.slice(6));

                    switch (eventData.type) {
                      case 'node_added':
                        const newNode = eventData.data;
                        streamingNodes.set(newNode.id, newNode);
                        setNodes(prevNodes => {
                          const existingNode = prevNodes.find(n => n.id === newNode.id);
                          if (existingNode) {
                            return prevNodes.map(n => n.id === newNode.id ? newNode : n);
                          }
                          return [...prevNodes, newNode];
                        });

                        // Apply layout and focus for regenerated nodes
                        setTimeout(() => {
                          autoLayout();
                          focusOnNode(newNode.id);
                        }, 300);

                        // Add connecting edges based on node type for regenerated flow
                        if (newNode.id === 'distributor') {
                          const edge = {
                            id: 'start-distributor',
                            source: 'start',
                            target: 'distributor',
                            animated: true
                          };
                          streamingEdges.set(edge.id, edge);
                          setEdges(prevEdges => [...prevEdges, edge]);
                        } else if (newNode.id.startsWith('agent-')) {
                          const edge = {
                            id: `distributor-${newNode.id}`,
                            source: 'distributor',
                            target: newNode.id,
                            animated: true
                          };
                          streamingEdges.set(edge.id, edge);
                          setEdges(prevEdges => [...prevEdges, edge]);
                        } else if (newNode.id.startsWith('response-')) {
                          const agentId = newNode.id.replace('response-', 'agent-');
                          const edge = {
                            id: `${agentId}-${newNode.id}`,
                            source: agentId,
                            target: newNode.id,
                            animated: true
                          };
                          streamingEdges.set(edge.id, edge);
                          setEdges(prevEdges => [...prevEdges, edge]);

                          // Connect response to validator if validator exists
                          if (streamingNodes.has('validator')) {
                            const validatorEdge = {
                              id: `${newNode.id}-validator`,
                              source: newNode.id,
                              target: 'validator',
                              animated: true
                            };
                            streamingEdges.set(validatorEdge.id, validatorEdge);
                            setEdges(prevEdges => [...prevEdges, validatorEdge]);
                          }
                        } else if (newNode.id === 'validator') {
                          // Connect all existing response nodes to validator
                          const responseNodes = Array.from(streamingNodes.values()).filter(node => node.id.startsWith('response-'));
                          responseNodes.forEach(responseNode => {
                            const validatorEdge = {
                              id: `${responseNode.id}-validator`,
                              source: responseNode.id,
                              target: 'validator',
                              animated: true
                            };
                            streamingEdges.set(validatorEdge.id, validatorEdge);
                            setEdges(prevEdges => {
                              const edgeExists = prevEdges.some(e => e.id === validatorEdge.id);
                              return edgeExists ? prevEdges : [...prevEdges, validatorEdge];
                            });
                          });
                        }
                        break;

                      case 'node_updated':
                        const { id, updates } = eventData.data;
                        setNodes(prevNodes =>
                          prevNodes.map(node =>
                            node.id === id ? { ...node, ...updates } : node
                          )
                        );
                        break;

                      case 'edge_added':
                        const newEdge = eventData.data;
                        streamingEdges.set(newEdge.id, newEdge);
                        setEdges(prevEdges => {
                          const existingEdge = prevEdges.find(e => e.id === newEdge.id);
                          if (existingEdge) {
                            return prevEdges.map(e => e.id === newEdge.id ? newEdge : e);
                          }
                          return [...prevEdges, newEdge];
                        });
                        break;

                      case 'agent_processing':
                        toast({
                          title: "Agent Processing",
                          description: `${eventData.data.agentName} is analyzing the regenerated query...`,
                          duration: 2000,
                        });
                        break;

                      case 'agent_response':
                        if (!eventData.data.error) {
                          toast({
                            title: "Response Generated",
                            description: `${eventData.data.agentName} completed regenerated analysis`,
                            duration: 2000,
                          });
                        }
                        break;

                      case 'validation_start':
                        toast({
                          title: "Validation Started",
                          description: `Validating ${eventData.data.responseCount} regenerated responses...`,
                          duration: 3000,
                        });
                        break;

                      case 'validation_result':
                        setValidationResults(prev => [...prev, eventData.data]);
                        break;

                      case 'complete':
                        // Update start node to completed status
                        setNodes(prevNodes =>
                          prevNodes.map(node =>
                            node.id === 'start'
                              ? { ...node, data: { ...node.data, status: 'answered' } }
                              : node
                          )
                        );

                        // Ensure all edges are properly connected
                        if (streamingEdges.size > 0) {
                          setEdges(prevEdges => {
                            const edgeIds = new Set(prevEdges.map(e => e.id));
                            const allStreamingEdges = Array.from(streamingEdges.values());
                            const missingEdges = allStreamingEdges.filter(e => !edgeIds.has(e.id));

                            if (missingEdges.length > 0) {
                              console.log('Restoring missing edges in regenerated flow:', missingEdges.map(e => e.id));
                              return [...prevEdges, ...missingEdges];
                            }
                            return prevEdges;
                          });
                        }

                        // Add new validator table node with regenerated results
                        if (eventData.data.validationResults) {
                          addValidatorTableNode(eventData.data.validationResults);
                        }

                        toast({
                          title: "Regeneration Complete",
                          description: `Flow regenerated successfully with ${eventData.data.validationResults?.length || 0} new validation results. Previous flow state preserved.`,
                        });
                        return;

                      case 'error':
                        throw new Error(eventData.data.error || 'Regeneration error occurred');
                    }
                  } catch (parseError) {
                    console.error('Error parsing regeneration stream event:', parseError);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error during automated regeneration:', error);
            toast({
              title: "Regeneration Failed",
              description: "Failed to complete automated regeneration. Please try again.",
              variant: "destructive"
            });
          }
        }
      }
    };

    setNodes(prevNodes => [...prevNodes, validatorTableNode]);

    // Connect validator to validator table
    const validatorTableEdge = {
      id: 'validator-validator-table',
      source: 'validator',
      target: 'validator-table',
      animated: true
    };

    setEdges(prevEdges => [...prevEdges, validatorTableEdge]);
  }, [setNodes, setEdges]);

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

    // Clear existing flow for new streaming session
    setNodes(initialNodes);
    setEdges(initialEdges);
    setValidationResults([]);

    try {
      // Get authenticated Supabase client
      const supabase = createClient();

      // Get the session to include auth headers
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      // Use streaming API with Server-Sent Events
      const response = await fetch('/api/flow/stream', {
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

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';
      const streamingNodes = new Map();
      const streamingEdges = new Map();
      let completedAgents = 0;
      let totalAgents = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));

              switch (eventData.type) {
                case 'node_added':
                  const newNode = eventData.data;
                  streamingNodes.set(newNode.id, newNode);

                  // Add node with animation
                  setNodes(prevNodes => {
                    const existingNode = prevNodes.find(n => n.id === newNode.id);
                    if (existingNode) {
                      return prevNodes.map(n => n.id === newNode.id ? newNode : n);
                    }
                    return [...prevNodes, newNode];
                  });

                  // Apply hierarchical layout and auto-focus on the newly added node
                  setTimeout(() => {
                    autoLayout();
                    focusOnNode(newNode.id);
                  }, 300);

                  // Add connecting edges based on node type
                  if (newNode.id === 'distributor') {
                    const edge = {
                      id: 'start-distributor',
                      source: 'start',
                      target: 'distributor',
                      animated: true
                    };
                    streamingEdges.set(edge.id, edge);
                    setEdges(prevEdges => [...prevEdges, edge]);
                  } else if (newNode.id.startsWith('agent-')) {
                    totalAgents++;
                    const edge = {
                      id: `distributor-${newNode.id}`,
                      source: 'distributor',
                      target: newNode.id,
                      animated: true
                    };
                    streamingEdges.set(edge.id, edge);
                    setEdges(prevEdges => [...prevEdges, edge]);
                  } else if (newNode.id.startsWith('response-')) {
                    const agentId = newNode.id.replace('response-', 'agent-');
                    const edge = {
                      id: `${agentId}-${newNode.id}`,
                      source: agentId,
                      target: newNode.id,
                      animated: true
                    };
                    streamingEdges.set(edge.id, edge);
                    setEdges(prevEdges => [...prevEdges, edge]);

                    // Connect response to validator if validator exists
                    if (streamingNodes.has('validator')) {
                      const validatorEdge = {
                        id: `${newNode.id}-validator`,
                        source: newNode.id,
                        target: 'validator',
                        animated: true
                      };
                      streamingEdges.set(validatorEdge.id, validatorEdge);
                      setEdges(prevEdges => [...prevEdges, validatorEdge]);
                    }
                  } else if (newNode.id === 'validator') {
                    // Connect all existing response nodes to validator
                    const responseNodes = Array.from(streamingNodes.values()).filter(node => node.id.startsWith('response-'));
                    responseNodes.forEach(responseNode => {
                      const validatorEdge = {
                        id: `${responseNode.id}-validator`,
                        source: responseNode.id,
                        target: 'validator',
                        animated: true
                      };
                      streamingEdges.set(validatorEdge.id, validatorEdge);
                      setEdges(prevEdges => {
                        const edgeExists = prevEdges.some(e => e.id === validatorEdge.id);
                        return edgeExists ? prevEdges : [...prevEdges, validatorEdge];
                      });
                    });
                  }
                  break;

                case 'node_updated':
                  const { id, updates } = eventData.data;
                  setNodes(prevNodes =>
                    prevNodes.map(node =>
                      node.id === id ? { ...node, ...updates } : node
                    )
                  );

                  if (id.startsWith('agent-') && updates.data?.status === 'completed') {
                    completedAgents++;
                  }
                  break;

                case 'agent_processing':
                  toast({
                    title: "Agent Processing",
                    description: `${eventData.data.agentName} is analyzing the query...`,
                    duration: 2000,
                  });
                  break;

                case 'agent_response':
                  if (!eventData.data.error) {
                    toast({
                      title: "Response Generated",
                      description: `${eventData.data.agentName} completed analysis`,
                      duration: 2000,
                    });
                  }
                  break;

                case 'validation_start':
                  toast({
                    title: "Validation Started",
                    description: `Validating ${eventData.data.responseCount} responses...`,
                    duration: 3000,
                  });
                  break;

                case 'validation_result':
                  setValidationResults(prev => [...prev, eventData.data]);
                  break;

                case 'complete':
                  setProcessingData(eventData.data);

                  // Add validator table node instead of showing modal
                  if (eventData.data.validationResults) {
                    addValidatorTableNode(eventData.data.validationResults);
                  }

                  // Ensure all edges are preserved after completion
                  setEdges(prevEdges => {
                    const edgeIds = new Set(prevEdges.map(e => e.id));
                    const missingEdges = Array.from(streamingEdges.values()).filter(e => !edgeIds.has(e.id));
                    return [...prevEdges, ...missingEdges];
                  });

                  toast({
                    title: "Flow Complete",
                    description: `Successfully processed query with ${eventData.data.agentResponses.length} agent responses`,
                    duration: 5000,
                  });
                  break;

                case 'error':
                  throw new Error(eventData.data.error || 'Streaming error occurred');
              }
            } catch (parseError) {
              console.error('Error parsing stream event:', parseError);
            }
          }
        }
      }

      // Update start node to completed status and ensure all edges are preserved
      setNodes(prevNodes =>
        prevNodes.map(node =>
          node.id === 'start'
            ? { ...node, data: { ...node.data, status: 'answered' } }
            : node
        )
      );

      // Final edge preservation - ensure all streaming edges are maintained
      if (streamingEdges.size > 0) {
        setEdges(prevEdges => {
          const edgeIds = new Set(prevEdges.map(e => e.id));
          const allStreamingEdges = Array.from(streamingEdges.values());
          const missingEdges = allStreamingEdges.filter(e => !edgeIds.has(e.id));

          if (missingEdges.length > 0) {
            console.log('Restoring missing edges:', missingEdges.map(e => e.id));
            return [...prevEdges, ...missingEdges];
          }
          return prevEdges;
        });
      }

    } catch (error) {
      console.error('Error processing streaming query:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to process query',
        variant: "destructive",
        duration: 5000,
      });

      // Fallback: Create basic flow visualization on error
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Start node
      const startNode = {
        id: 'start',
        type: 'question',
        position: { x: 400, y: 50 },
        data: {
          label: 'Query Processed',
          question: topic,
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
          participants: availableAgents?.map((a: Agent) => a.name) || ['Agent 1', 'Agent 2']
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
      if (availableAgents && availableAgents.length > 0) {
        availableAgents.forEach((agent: Agent, index: number) => {
          const agentNode = {
            id: `agent-${agent.id}`,
            type: 'agent',
            position: { x: 200 + (index * 200), y: 300 },
            data: {
              name: agent.name,
              role: 'analyst' as const,
              status: 'active',
              topic: topic
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
      if (processingData?.agentResponses) {
        processingData.agentResponses.forEach((response: any, index: number) => {
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
      if (processingData?.agentResponses) {
        processingData.agentResponses.forEach((response: any) => {
          newEdges.push({
            id: `response-validator-${response.agentId}`,
            source: `response-${response.agentId}`,
            target: 'validator',
            animated: true
          });
        });
      }

      // Store validation results and add validator table node
      setValidationResults(processingData?.validationResults || []);
      // Add validator table node to flow instead of showing modal
      if (processingData?.validationResults) {
        addValidatorTableNode(processingData.validationResults);
      }

      setNodes(newNodes);
      setEdges(newEdges);
    } finally {
      // Clear input and reset processing state
      setInputValue('');
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, selectedAgents, agents, availableAgents, toast]);

  // Fallback function for creating nodes when API fails
  const createFallbackNodes = (topic: string, data: any) => {
    try {
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
    } catch (fallbackError) {
      console.error('Error in fallback node creation:', fallbackError);
    }
  };

  const clearFlow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setDebateHistory([]);
  };

  // Auto-focus function for newly added nodes
  const focusOnNode = useCallback((nodeId: string) => {
    if (reactFlowInstance) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        // Center the view on the new node with smooth transition
        reactFlowInstance.setCenter(node.position.x, node.position.y, {
          zoom: 1.2,
          duration: 800,
        });
      }
    }
  }, [nodes, reactFlowInstance]);

  // Enhanced hierarchical layout function with multiple directions
  const autoLayout = useCallback(() => {
    setNodes((nds) => {
      if (nds.length === 0) return nds;

      // Create a new directed graph
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));

      // Configure the layout with maximum spacing based on node dimensions
      const layoutConfig = {
        rankdir: layoutDirection,
        // Increased node separation for maximum distance
        nodesep: layoutDirection === 'LR' || layoutDirection === 'RL' ? 250 : 400,
        // Increased rank separation for maximum distance between levels
        ranksep: layoutDirection === 'LR' || layoutDirection === 'RL' ? 250 : 300,
        // Additional spacing configuration
        marginx: 50,
        marginy: 50,
      };

      dagreGraph.setGraph(layoutConfig);

      // Define node dimensions based on type with proper spacing considerations
      const getNodeDimensions = (nodeType: string) => {
        const dimensions = {
          agent: { width: 160, height: 120 },
          response: { width: 320, height: 220 },
          question: { width: 280, height: 150 },
          debate: { width: 300, height: 180 },
          validatorTable: { width: 400, height: 250 },
          default: { width: 200, height: 120 }
        };
        return dimensions[nodeType as keyof typeof dimensions] || dimensions.default;
      };

      // Add nodes to the graph
      nds.forEach((node) => {
        const dimensions = getNodeDimensions(node.type || 'default');
        dagreGraph.setNode(node.id, {
          width: dimensions.width,
          height: dimensions.height,
        });
      });

      // Add edges to the graph
      edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      // Calculate the layout
      dagre.layout(dagreGraph);

      // Apply the calculated positions to nodes
      const layoutedNodes = nds.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - nodeWithPosition.width / 2,
            y: nodeWithPosition.y - nodeWithPosition.height / 2,
          },
          style: {
            ...node.style,
            transition: 'all 0.5s ease-in-out'
          }
        };
      });

      return layoutedNodes;
    });
  }, [edges, layoutDirection]);

  // Auto-layout when layout direction changes
  useEffect(() => {
    if (nodes.length > 0) {
      autoLayout();
    }
  }, [layoutDirection, autoLayout]);

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
        // Reset for new session
        setCurrentRound(1);
        setCurrentSessionId(null);
      } else if (data.action === 'next_round_ready') {
        // Prepare for next round
        setCurrentRound(data.nextRoundNumber);
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
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Flow Area - Takes remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          className="w-full h-full bg-gray-50"
          defaultEdgeOptions={{
            animated: true,
            type: 'step',
            style: { strokeWidth: 2 },
          }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {/* No Agents Connected Indicator */}
        {selectedAgents.length === 0 && (
          <div className="absolute top-4 right-4 z-20">
            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">No agents connected to this flow</span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Click the agents button below to select agents for your flow
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Node Content Sidebar */}
      {showNodeSidebar && selectedNode && (
        <div className="fixed top-0 right-0 h-full w-96 bg-background shadow-xl border-l border-border z-[100000] overflow-hidden flex">
          {/* Close Button - Centered on Left Edge */}
          <div className="flex items-center justify-center w-8 bg-muted/30 border-r border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNodeSidebar(false)}
              className="h-10 w-6 rounded-md hover:bg-muted/50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Sidebar Content Container */}
          <div className="flex-1 flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center gap-2 p-4 border-b border-border bg-muted/50">
              <div className={`w-3 h-3 rounded-full ${selectedNode.type === 'agent' ? 'bg-blue-500' :
                selectedNode.type === 'debate' ? 'bg-green-500' :
                  selectedNode.type === 'question' ? 'bg-yellow-500' :
                    selectedNode.type === 'response' ? 'bg-purple-500' :
                      selectedNode.type === 'validatorTable' ? 'bg-red-500' :
                        'bg-gray-500'
                }`} />
              <h3 className="font-semibold text-foreground capitalize">
                {selectedNode.type} Node
              </h3>
            </div>

            {/* Sidebar Content */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Node ID */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Node ID</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-mono text-foreground">
                    {selectedNode.id}
                  </div>
                </div>

                {/* Node Type */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm text-foreground capitalize">
                    {selectedNode.type}
                  </div>
                </div>

                {/* Node Position */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Position</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm text-foreground">
                    X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
                  </div>
                </div>

                {/* Node Content */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Content</label>
                  <div className="mt-1 p-3 bg-muted/50 rounded text-sm text-foreground max-h-96 overflow-auto">
                    {selectedNode.type === 'response' && selectedNode.data?.response ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap">{selectedNode.data.response}</div>
                      </div>
                    ) : selectedNode.type === 'question' && selectedNode.data?.question ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="font-medium text-blue-600 dark:text-blue-400">{selectedNode.data.question}</div>
                        {selectedNode.data.status && (
                          <div className="mt-2 text-xs text-muted-foreground">Status: {selectedNode.data.status}</div>
                        )}
                      </div>
                    ) : selectedNode.type === 'agent' && selectedNode.data?.name ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="font-medium text-green-600 dark:text-green-400">{selectedNode.data.name}</div>
                        {selectedNode.data.role && (
                          <div className="text-sm text-muted-foreground mt-1">Role: {selectedNode.data.role}</div>
                        )}
                        {selectedNode.data.topic && (
                          <div className="text-sm text-muted-foreground mt-1">Topic: {selectedNode.data.topic}</div>
                        )}
                        {selectedNode.data.status && (
                          <div className="text-xs text-muted-foreground mt-2">Status: {selectedNode.data.status}</div>
                        )}
                      </div>
                    ) : selectedNode.type === 'debate' && selectedNode.data?.topic ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="font-medium text-purple-600 dark:text-purple-400">{selectedNode.data.topic}</div>
                        {selectedNode.data.participants && (
                          <div className="text-sm text-muted-foreground mt-1">Participants: {selectedNode.data.participants}</div>
                        )}
                        {selectedNode.data.rounds !== undefined && (
                          <div className="text-sm text-muted-foreground mt-1">Rounds: {selectedNode.data.rounds}</div>
                        )}
                        {selectedNode.data.status && (
                          <div className="text-xs text-muted-foreground mt-2">Status: {selectedNode.data.status}</div>
                        )}
                      </div>
                    ) : selectedNode.type === 'validatorTable' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="font-medium text-red-600 dark:text-red-400">Validator Analysis</div>
                        {selectedNode.data?.validationResults && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-muted-foreground">Validation Results:</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {Array.isArray(selectedNode.data.validationResults)
                                ? `${selectedNode.data.validationResults.length} results`
                                : 'Processing...'}
                            </div>
                          </div>
                        )}
                        {selectedNode.data?.totalPoints !== undefined && (
                          <div className="text-sm text-muted-foreground mt-1">Total Points: {selectedNode.data.totalPoints}</div>
                        )}
                        {selectedNode.data?.keptPoints !== undefined && (
                          <div className="text-sm text-muted-foreground mt-1">Kept Points: {selectedNode.data.keptPoints}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic">No readable content available</div>
                    )}
                  </div>
                </div>

                {/* Raw Data (Collapsible) */}
                <div>
                  <details className="group">
                    <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                      Raw Data (Click to expand)
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded text-sm text-foreground max-h-64 overflow-auto">
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(selectedNode.data, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>

                {/* Node Style (if exists) */}
                {selectedNode.style && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Style</label>
                    <div className="mt-1 p-3 bg-gray-100 rounded text-sm text-gray-800">
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(selectedNode.style, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Additional Properties */}
                {Object.keys(selectedNode).filter(key => !['id', 'type', 'position', 'data', 'style'].includes(key)).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Additional Properties</label>
                    <div className="mt-1 p-3 bg-gray-100 rounded text-sm text-gray-800">
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(selectedNode).filter(([key]) =>
                              !['id', 'type', 'position', 'data', 'style'].includes(key)
                            )
                          ),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 p-4 bg-background/95 ">
        <div className="mx-auto max-w-7xl h-20">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-center bg-black/90 backdrop-blur-sm border-2 border-border rounded-full shadow-sm hover:shadow-md transition-shadow duration-200">
              {/* Left side buttons */}
              <div className="flex items-center pl-3 pr-2 border-r border-border/50">
                {/* Layout Selector Dropdown */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                      <Layout className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto">
                    <SheetHeader>
                      <SheetTitle>Layout Direction</SheetTitle>
                      <SheetDescription>
                        Choose how the flow nodes are arranged
                      </SheetDescription>
                    </SheetHeader>
                    <div className="flex gap-2 mt-4 pb-4">
                      {[
                        { key: 'TB', label: '↓', tooltip: 'Top to Bottom' },
                        { key: 'BT', label: '↑', tooltip: 'Bottom to Top' },
                        { key: 'LR', label: '→', tooltip: 'Left to Right' },
                        { key: 'RL', label: '←', tooltip: 'Right to Left' }
                      ].map(({ key, label, tooltip }) => (
                        <Button
                          key={key}
                          variant={layoutDirection === key ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setLayoutDirection(key as 'TB' | 'BT' | 'LR' | 'RL')}
                          title={tooltip}
                          type="button"
                        >
                          <span className="mr-2">{label}</span>
                          {tooltip}
                        </Button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Agents Selector */}
                <Sheet open={showAgentPanel} onOpenChange={setShowAgentPanel}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground relative">
                      <Users className="h-4 w-4" />
                      {selectedAgents.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                          {selectedAgents.length}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 z-[99998]">
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
                      <ScrollArea className="h-[calc(100vh-300px)]">
                        <div className="space-y-2 pr-4">
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
              </div>

              {/* Input field */}
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter debate topic, question, or argument..."
                  disabled={isProcessing}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-base placeholder:text-muted-foreground/60"
                />
                {isProcessing && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>

              {/* Right side buttons */}
              <div className="flex items-center pr-3 pl-2 border-l border-border/50">
                {/* Context Management Button */}
                {validationResults.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleValidationComplete(validationResults)}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isProcessing || selectedAgents.length === 0}
                  size="sm"
                  className="h-8   rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected agents indicator */}
            {selectedAgents.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedAgents.slice(0, 3).map(agentId => {
                  const agent = agents.find(a => a.id === agentId) || availableAgents.find(a => a.id === agentId);
                  return agent ? (
                    <Badge key={agentId} variant="secondary" className="text-xs px-2 py-1">
                      {agent.name}
                    </Badge>
                  ) : null;
                })}
                {selectedAgents.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    +{selectedAgents.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Flow Orchestrator Modal */}
      {showFlowOrchestrator && orchestratorData && (
        <div className="fixed inset-0 z-[99997] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <FlowOrchestrator
              initialData={orchestratorData}
              onFlowRestart={handleFlowRestart}
              onCancel={() => setShowFlowOrchestrator(false)}
              availableAgents={availableAgents.map(agent => ({
                id: agent.id,
                name: agent.name,
                role: agent.description || 'Agent'
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default FlowVisualization;