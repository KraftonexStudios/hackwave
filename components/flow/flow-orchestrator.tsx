'use client';

import React, { useState, useCallback } from 'react';
import { UserInteractionForm, UserInteractionFormData } from './user-interaction-form';
import { ValidatorTableNode } from './nodes/validator-table-node';
import { contextManager, FlowContext, FlowRestartConfig } from '@/lib/context-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  FileText,
  ArrowRight,
  History
} from 'lucide-react';

interface FlowOrchestratorProps {
  initialData?: UserInteractionFormData;
  onFlowRestart?: (config: FlowRestartConfig) => void;
  onCancel?: () => void;
  availableAgents: Array<{ id: string; name: string; role: string }>;
}

type FlowStage = 'validation' | 'interaction' | 'processing' | 'completed';

export function FlowOrchestrator({
  initialData,
  onFlowRestart,
  onCancel,
  availableAgents
}: FlowOrchestratorProps) {
  const [currentStage, setCurrentStage] = useState<FlowStage>('validation');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentContext, setCurrentContext] = useState<FlowContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartConfig, setRestartConfig] = useState<FlowRestartConfig | null>(null);

  // Default form data structure
  const defaultFormData: UserInteractionFormData = {
    validatorResponses: initialData?.validatorResponses || [],
    originalQuestion: initialData?.originalQuestion || '',
    contextUpdates: '',
    additionalInstructions: '',
    selectedAgents: [],
    availableAgents: availableAgents,
    enabledSystemAgents: initialData?.enabledSystemAgents || []
  };

  const [formData, setFormData] = useState<UserInteractionFormData>(
    initialData || defaultFormData
  );

  // Handle transition from validation to interaction stage
  const handleValidationComplete = useCallback((validatedData: UserInteractionFormData) => {
    setFormData(validatedData);
    setCurrentStage('interaction');
  }, []);

  // Handle form submission and context processing
  const handleFormSubmit = useCallback(async (submittedData: UserInteractionFormData) => {
    setIsProcessing(true);
    setError(null);
    setCurrentStage('processing');

    try {
      // Process the user interaction data through context manager
      const processedContext = contextManager.processUserInteraction(submittedData);
      setCurrentContext(processedContext);

      // Prepare flow restart configuration
      const config = contextManager.prepareFlowRestart(processedContext, {
        preserveAgentSelection: true,
        includeRemovedPoints: false,
        resetIterationCount: false
      });

      setRestartConfig(config);
      setCurrentStage('completed');

      // Notify parent component about the restart configuration
      if (onFlowRestart) {
        onFlowRestart(config);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the context');
      setCurrentStage('interaction');
    } finally {
      setIsProcessing(false);
    }
  }, [onFlowRestart]);

  // Handle cancellation
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Handle manual flow restart
  const handleManualRestart = useCallback(() => {
    if (restartConfig && onFlowRestart) {
      onFlowRestart(restartConfig);
    }
  }, [restartConfig, onFlowRestart]);

  // Get context statistics
  const contextStats = contextManager.getContextStats();

  // Render stage indicator
  const renderStageIndicator = () => {
    const stages = [
      { id: 'validation', label: 'Validation', icon: CheckCircle },
      { id: 'interaction', label: 'User Input', icon: Users },
      { id: 'processing', label: 'Processing', icon: RefreshCw },
      { id: 'completed', label: 'Ready', icon: ArrowRight }
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-6">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.id === currentStage;
          const isCompleted = stages.findIndex(s => s.id === currentStage) > index;
          const isProcessingStage = stage.id === 'processing' && isActive;

          return (
            <React.Fragment key={stage.id}>
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : isCompleted
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                <Icon className={`h-4 w-4 ${isProcessingStage ? 'animate-spin' : ''
                  }`} />
                <span className="text-sm font-medium">{stage.label}</span>
              </div>
              {index < stages.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Render context summary
  const renderContextSummary = () => {
    if (!currentContext) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Context Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentContext.keptPoints.length}</div>
              <div className="text-sm text-muted-foreground">Points Kept</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{currentContext.removedPoints.length}</div>
              <div className="text-sm text-muted-foreground">Points Removed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentContext.selectedAgents.length}</div>
              <div className="text-sm text-muted-foreground">Selected Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{currentContext.iterationCount}</div>
              <div className="text-sm text-muted-foreground">Iteration</div>
            </div>
          </div>

          {currentContext.contextUpdates && (
            <div className="mt-4 p-3 bg-primary/10 rounded border-l-2 border-primary">
              <h4 className="font-medium text-sm text-primary mb-1">
                Context Updates:
              </h4>
              <p className="text-sm text-foreground">{currentContext.contextUpdates}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render completion status
  const renderCompletionStatus = () => {
    if (currentStage !== 'completed' || !restartConfig) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Flow Restart Ready
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The context has been successfully processed and the flow is ready to restart with updated parameters.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Enhanced Prompt Generated
                </h4>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Context ID: {restartConfig.contextId}
                </p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-300">
                <Clock className="h-3 w-3 mr-1" />
                {new Date().toLocaleTimeString()}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleManualRestart}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Start New Iteration
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const exported = contextManager.exportContext();
                  navigator.clipboard.writeText(exported);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Context
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Stage Indicator */}
      {renderStageIndicator()}

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Context Summary */}
      {renderContextSummary()}

      {/* Completion Status */}
      {renderCompletionStatus()}

      {/* Main Content Based on Stage */}
      {currentStage === 'validation' && (
        <Card>
          <CardHeader>
            <CardTitle>Validator Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Review the validator responses and proceed to the interaction form.
              </p>
              <Button
                onClick={() => handleValidationComplete(formData)}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Proceed to User Input
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStage === 'interaction' && (
        <UserInteractionForm
          data={formData}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          isProcessing={isProcessing}
        />
      )}

      {currentStage === 'processing' && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-medium">Processing Context Updates</h3>
              <p className="text-muted-foreground">
                Analyzing feedback and preparing enhanced prompt for the next iteration...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context Statistics Footer */}
      {contextStats.totalIterations > 0 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Session Statistics:</span>
            <div className="flex items-center gap-4">
              <span>Iterations: {contextStats.totalIterations}</span>
              <span>Total Points: {contextStats.totalKeptPoints + contextStats.totalRemovedPoints}</span>
              <span>Active Agents: {contextStats.activeAgents}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { FlowOrchestratorProps };