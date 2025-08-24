import { ValidatorResponse } from '@/components/flow/nodes/validator-table-node';
import { UserInteractionFormData } from '@/components/flow/user-interaction-form';

// Types for flow state management
export interface FlowContext {
  id: string;
  originalQuestion: string;
  contextUpdates: string;
  additionalInstructions: string;
  validatorResponses: ValidatorResponse[];
  selectedAgents: string[];
  enabledSystemAgents: string[];
  iterationCount: number;
  timestamp: Date;
  keptPoints: ValidatorPoint[];
  removedPoints: ValidatorPoint[];
  feedbackSummary: AgentFeedbackSummary[];
}

export interface ValidatorPoint {
  id: string;
  content: string;
  agentId: string;
  agentName: string;
  feedback?: string;
  confidence?: number;
}

export interface AgentFeedbackSummary {
  agentId: string;
  agentName: string;
  overallFeedback: string;
  pointsKept: number;
  pointsRemoved: number;
  totalPoints: number;
}

export interface FlowRestartOptions {
  preserveAgentSelection?: boolean;
  includeRemovedPoints?: boolean;
  resetIterationCount?: boolean;
  customPromptModifications?: string[];
}

export class ContextManager {
  private static instance: ContextManager;
  private currentContext: FlowContext | null = null;
  private contextHistory: FlowContext[] = [];
  private maxHistorySize = 10;

  private constructor() {}

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Automatically process validation data and generate context for regeneration
   */
  public processValidationDataAutomatically(validationData: any[], originalQuestion: string, selectedAgents: string[]): FlowContext {
    // Automatically determine which points to keep based on validation results
    const keptPoints: ValidatorPoint[] = [];
    const removedPoints: ValidatorPoint[] = [];
    const feedbackSummary: AgentFeedbackSummary[] = [];

    // Process validation results automatically
    validationData.forEach((result, index) => {
      const point: ValidatorPoint = {
        id: `validation_${index}`,
        content: `${result.claim}: ${result.evidence}`,
        agentId: 'validator_agent',
        agentName: 'Validator Agent',
        feedback: result.logicalFallacies?.length > 0 ? `Logical issues: ${result.logicalFallacies.join(', ')}` : '',
        confidence: result.confidence
      };

      // Automatically keep points with high confidence and validity
      if (result.isValid && result.confidence >= 70) {
        keptPoints.push(point);
      } else {
        removedPoints.push(point);
      }
    });

    // Generate automatic context updates based on validation results
    const validCount = validationData.filter(r => r.isValid).length;
    const avgConfidence = validationData.reduce((sum, r) => sum + r.confidence, 0) / validationData.length;
    
    const contextUpdates = `Automated regeneration based on validation results:\n` +
      `- ${validCount}/${validationData.length} claims validated as correct\n` +
      `- Average confidence: ${avgConfidence.toFixed(1)}%\n` +
      `- ${keptPoints.length} high-confidence points retained\n` +
      `- ${removedPoints.length} low-confidence points removed for refinement`;

    const additionalInstructions = `Focus on improving the quality and accuracy of responses. ` +
      `Address any logical fallacies identified in previous iteration. ` +
      `Maintain high confidence levels (>70%) in all claims.`;

    // Create feedback summary
    feedbackSummary.push({
      agentId: 'validator_agent',
      agentName: 'Validator Agent',
      overallFeedback: `Automated analysis completed. ${validCount} claims validated with average confidence of ${avgConfidence.toFixed(1)}%.`,
      pointsKept: keptPoints.length,
      pointsRemoved: removedPoints.length,
      totalPoints: validationData.length
    });

    const newContext: FlowContext = {
      id: this.generateContextId(),
      originalQuestion,
      contextUpdates,
      additionalInstructions,
      validatorResponses: [{
        id: 'validator_summary',
        agentName: 'Validator Agent Analysis',
        points: [...keptPoints, ...removedPoints].map(p => ({
          id: p.id,
          content: p.content,
          isKept: keptPoints.includes(p),
          feedback: p.feedback || ''
        })),
        overallFeedback: `Automated validation completed for ${validationData.length} claims.`
      }],
      selectedAgents,
      enabledSystemAgents: [],
      iterationCount: this.currentContext ? this.currentContext.iterationCount + 1 : 1,
      timestamp: new Date(),
      keptPoints,
      removedPoints,
      feedbackSummary
    };

    this.updateContext(newContext);
    return newContext;
  }

  /**
   * Process user interaction form data and prepare updated context
   */
  public processUserInteraction(formData: UserInteractionFormData): FlowContext {
    const keptPoints: ValidatorPoint[] = [];
    const removedPoints: ValidatorPoint[] = [];
    const feedbackSummary: AgentFeedbackSummary[] = [];

    // Process validator responses
    formData.validatorResponses.forEach(response => {
      const agentKeptPoints = response.points.filter(p => p.isKept);
      const agentRemovedPoints = response.points.filter(p => !p.isKept);

      // Add to kept points
      agentKeptPoints.forEach(point => {
        keptPoints.push({
          id: point.id,
          content: point.content,
          agentId: response.id,
          agentName: response.agentName,
          feedback: point.feedback
        });
      });

      // Add to removed points
      agentRemovedPoints.forEach(point => {
        removedPoints.push({
          id: point.id,
          content: point.content,
          agentId: response.id,
          agentName: response.agentName,
          feedback: point.feedback
        });
      });

      // Create feedback summary
      feedbackSummary.push({
        agentId: response.id,
        agentName: response.agentName,
        overallFeedback: response.overallFeedback,
        pointsKept: agentKeptPoints.length,
        pointsRemoved: agentRemovedPoints.length,
        totalPoints: response.points.length
      });
    });

    const newContext: FlowContext = {
      id: this.generateContextId(),
      originalQuestion: formData.originalQuestion,
      contextUpdates: formData.contextUpdates,
      additionalInstructions: formData.additionalInstructions,
      validatorResponses: formData.validatorResponses,
      selectedAgents: formData.selectedAgents,
      enabledSystemAgents: formData.enabledSystemAgents || [],
      iterationCount: this.currentContext ? this.currentContext.iterationCount + 1 : 1,
      timestamp: new Date(),
      keptPoints,
      removedPoints,
      feedbackSummary
    };

    this.updateContext(newContext);
    return newContext;
  }

  /**
   * Generate enhanced prompt with updated context
   */
  public generateEnhancedPrompt(context: FlowContext, options?: FlowRestartOptions): string {
    const sections: string[] = [];

    // Original question
    sections.push(`## Original Question\n${context.originalQuestion}`);

    // Iteration information
    sections.push(`## Iteration Information\nThis is iteration ${context.iterationCount} of the analysis.`);

    // Context updates
    if (context.contextUpdates.trim()) {
      sections.push(`## Updated Context\n${context.contextUpdates}`);
    }

    // Additional instructions
    if (context.additionalInstructions.trim()) {
      sections.push(`## Additional Instructions\n${context.additionalInstructions}`);
    }

    // Kept points from previous iteration
    if (context.keptPoints.length > 0) {
      sections.push(`## Validated Points from Previous Iteration`);
      sections.push(`The following points were validated and should be considered:`);
      
      const pointsByAgent = this.groupPointsByAgent(context.keptPoints);
      Object.entries(pointsByAgent).forEach(([agentName, points]) => {
        sections.push(`\n### ${agentName}:`);
        points.forEach((point, index) => {
          sections.push(`${index + 1}. ${point.content}`);
          if (point.feedback) {
            sections.push(`   *Feedback: ${point.feedback}*`);
          }
        });
      });
    }

    // Removed points (if requested)
    if (options?.includeRemovedPoints && context.removedPoints.length > 0) {
      sections.push(`## Points to Avoid`);
      sections.push(`The following points were rejected in previous iteration:`);
      
      const removedByAgent = this.groupPointsByAgent(context.removedPoints);
      Object.entries(removedByAgent).forEach(([agentName, points]) => {
        sections.push(`\n### ${agentName}:`);
        points.forEach((point, index) => {
          sections.push(`${index + 1}. ${point.content}`);
          if (point.feedback) {
            sections.push(`   *Reason for rejection: ${point.feedback}*`);
          }
        });
      });
    }

    // Agent feedback summary
    if (context.feedbackSummary.length > 0) {
      sections.push(`## Agent Performance Feedback`);
      context.feedbackSummary.forEach(summary => {
        if (summary.overallFeedback.trim()) {
          sections.push(`\n### ${summary.agentName}:`);
          sections.push(`${summary.overallFeedback}`);
          sections.push(`*Points kept: ${summary.pointsKept}/${summary.totalPoints}*`);
        }
      });
    }

    // Selected agents for this iteration
    const selectedAgentNames = context.selectedAgents.map(agentId => {
      // This would need to be populated from the available agents data
      return agentId; // Placeholder - should map to actual agent names
    });
    
    sections.push(`## Selected Agents for This Iteration`);
    sections.push(`The following agents will participate: ${selectedAgentNames.join(', ')}`);

    return sections.join('\n\n');
  }

  /**
   * Prepare flow restart configuration
   */
  public prepareFlowRestart(context: FlowContext, options?: FlowRestartOptions): FlowRestartConfig {
    return {
      contextId: context.id,
      enhancedPrompt: this.generateEnhancedPrompt(context, options),
      selectedAgents: context.selectedAgents,
      iterationCount: options?.resetIterationCount ? 1 : context.iterationCount,
      previousContext: {
        keptPoints: context.keptPoints,
        removedPoints: context.removedPoints,
        feedbackSummary: context.feedbackSummary
      },
      metadata: {
        originalQuestion: context.originalQuestion,
        timestamp: context.timestamp,
        contextUpdates: context.contextUpdates,
        additionalInstructions: context.additionalInstructions
      }
    };
  }

  /**
   * Update current context and manage history
   */
  private updateContext(context: FlowContext): void {
    // Add current context to history if it exists
    if (this.currentContext) {
      this.contextHistory.unshift(this.currentContext);
      
      // Maintain history size limit
      if (this.contextHistory.length > this.maxHistorySize) {
        this.contextHistory = this.contextHistory.slice(0, this.maxHistorySize);
      }
    }

    this.currentContext = context;
  }

  /**
   * Get current context
   */
  public getCurrentContext(): FlowContext | null {
    return this.currentContext;
  }

  /**
   * Get context history
   */
  public getContextHistory(): FlowContext[] {
    return [...this.contextHistory];
  }

  /**
   * Get context by ID
   */
  public getContextById(id: string): FlowContext | null {
    if (this.currentContext?.id === id) {
      return this.currentContext;
    }
    return this.contextHistory.find(ctx => ctx.id === id) || null;
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Group points by agent name
   */
  private groupPointsByAgent(points: ValidatorPoint[]): Record<string, ValidatorPoint[]> {
    return points.reduce((acc, point) => {
      if (!acc[point.agentName]) {
        acc[point.agentName] = [];
      }
      acc[point.agentName].push(point);
      return acc;
    }, {} as Record<string, ValidatorPoint[]>);
  }

  /**
   * Export context for persistence
   */
  public exportContext(contextId?: string): string {
    const context = contextId ? this.getContextById(contextId) : this.currentContext;
    if (!context) {
      throw new Error('No context found to export');
    }
    return JSON.stringify(context, null, 2);
  }

  /**
   * Import context from JSON
   */
  public importContext(contextJson: string): FlowContext {
    try {
      const context = JSON.parse(contextJson) as FlowContext;
      context.timestamp = new Date(context.timestamp); // Restore Date object
      this.updateContext(context);
      return context;
    } catch (error) {
      throw new Error('Invalid context JSON format');
    }
  }

  /**
   * Clear all context data
   */
  public clearContext(): void {
    this.currentContext = null;
    this.contextHistory = [];
  }

  /**
   * Get context statistics
   */
  public getContextStats(): ContextStats {
    if (!this.currentContext) {
      return {
        totalIterations: 0,
        totalKeptPoints: 0,
        totalRemovedPoints: 0,
        totalFeedbacks: 0,
        activeAgents: 0
      };
    }

    return {
      totalIterations: this.currentContext.iterationCount,
      totalKeptPoints: this.currentContext.keptPoints.length,
      totalRemovedPoints: this.currentContext.removedPoints.length,
      totalFeedbacks: this.currentContext.feedbackSummary.filter(f => f.overallFeedback.trim()).length,
      activeAgents: this.currentContext.selectedAgents.length
    };
  }
}

// Additional interfaces
export interface FlowRestartConfig {
  contextId: string;
  enhancedPrompt: string;
  selectedAgents: string[];
  iterationCount: number;
  previousContext: {
    keptPoints: ValidatorPoint[];
    removedPoints: ValidatorPoint[];
    feedbackSummary: AgentFeedbackSummary[];
  };
  metadata: {
    originalQuestion: string;
    timestamp: Date;
    contextUpdates: string;
    additionalInstructions: string;
  };
}

export interface ContextStats {
  totalIterations: number;
  totalKeptPoints: number;
  totalRemovedPoints: number;
  totalFeedbacks: number;
  activeAgents: number;
}

// Export singleton instance
export const contextManager = ContextManager.getInstance();