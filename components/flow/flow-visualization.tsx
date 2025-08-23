'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
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
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, Users, MessageSquare, Zap } from 'lucide-react';
import { AgentNode } from './nodes/agent-node';
import { DebateNode } from './nodes/debate-node';
import { QuestionNode } from './nodes/question-node';
import { ResponseNode } from './nodes/response-node';
import { ValidationTable } from './validation-table';

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

export function FlowVisualization() {
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
  const inputRef = useRef<HTMLInputElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    const agents = [
      { name: 'Pro Agent', role: 'advocate', color: '#10b981' },
      { name: 'Con Agent', role: 'opponent', color: '#ef4444' },
      { name: 'Moderator', role: 'moderator', color: '#6366f1' },
    ];

    return agents.map((agent, index) => ({
      id: `${nodeId}_agent_${index}`,
      type: 'agent',
      position: { x: 200 + index * 300, y: 200 },
      data: {
        name: agent.name,
        role: agent.role,
        color: agent.color,
        status: 'active',
        topic: topic,
      },
    }));
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
      // Call the API to process the query
      const response = await fetch('/api/flow/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: topic
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process query');
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
  }, [inputValue, isProcessing, setNodes, setEdges]);

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
  }, [inputValue, setNodes]);

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
      const response = await fetch('/api/flow/iterate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          className="bg-background"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>

        {/* Clear Button */}
        {debateHistory.length > 0 && (
          <Button
            onClick={clearFlow}
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 z-10"
          >
            Clear Flow
          </Button>
        )}
      </div>

      {/* Chat Input Area */}
      <Card className="m-4 mt-0">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter debate topic, question, or argument..."
                disabled={isProcessing}
                className="pr-12"
              />
              {isProcessing && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
            <Button type="submit" disabled={!inputValue.trim() || isProcessing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mb-3">
            <Button type="button" variant="outline" size="sm" onClick={autoLayout}>
              <Zap className="h-3 w-3 mr-1" />
              Auto Layout
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearFlow}>
              Clear Flow
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Pro</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Con</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Question</span>
              </div>
            </div>
          </div>
          
          {/* Debate History */}
          {debateHistory.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Recent topics:</p>
              <div className="flex flex-wrap gap-1">
                {debateHistory.slice(-3).map((topic, index) => (
                  <span
                    key={index}
                    className="text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => setInputValue(topic)}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Quick Examples */}
          {debateHistory.length === 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Try these examples:</p>
              <div className="flex flex-wrap gap-1">
                {[
                  'Should AI replace human teachers?',
                  'Climate change vs Economic growth',
                  'What are the benefits of remote work?'
                ].map((example, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    onClick={() => setInputValue(example)}
                  >
                    {example}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Validation Table Modal/Overlay */}
      {showValidationTable && validationResults.length > 0 && currentSessionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Validation Results</h2>
              <button
                onClick={() => setShowValidationTable(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <ValidationTable
                validationResults={validationResults}
                onSelectionChange={handleValidationSelectionChange}
                onSubmitFeedback={handleValidationFeedback}
                sessionId={currentSessionId}
                currentRound={currentRound}
                maxRounds={maxRounds}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}