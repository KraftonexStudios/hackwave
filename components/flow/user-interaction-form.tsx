'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
    RefreshCw,
    Save,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    Users,
    MessageSquare,
    Search,
    Settings,
    BarChart3,
    Scale
} from 'lucide-react';
import { ValidatorResponse, ValidatorPoint } from './nodes/validator-table-node';

interface UserInteractionFormData {
    validatorResponses: ValidatorResponse[];
    originalQuestion: string;
    contextUpdates: string;
    additionalInstructions: string;
    selectedAgents: string[];
    availableAgents: Array<{ id: string; name: string; role: string }>;
    enabledSystemAgents: string[];
}

interface UserInteractionFormProps {
    data: UserInteractionFormData;
    onSubmit: (updatedData: UserInteractionFormData) => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

export function UserInteractionForm({
    data,
    onSubmit,
    onCancel,
    isProcessing = false
}: UserInteractionFormProps) {
    const [formData, setFormData] = useState<UserInteractionFormData>(data);
    const [activeTab, setActiveTab] = useState<'review' | 'context' | 'agents' | 'system'>('review');

    // Calculate statistics
    const totalPoints = formData.validatorResponses.reduce(
        (sum, response) => sum + response.points.length, 0
    );
    const keptPoints = formData.validatorResponses.reduce(
        (sum, response) => sum + response.points.filter(point => point.isKept).length, 0
    );
    const feedbackCount = formData.validatorResponses.reduce(
        (sum, response) => {
            const pointFeedbacks = response.points.filter(point => point.feedback.trim().length > 0).length;
            const overallFeedback = response.overallFeedback.trim().length > 0 ? 1 : 0;
            return sum + pointFeedbacks + overallFeedback;
        }, 0
    );

    const handleValidatorResponseUpdate = (responses: ValidatorResponse[]) => {
        setFormData(prev => ({ ...prev, validatorResponses: responses }));
    };

    const handleContextUpdate = (field: keyof UserInteractionFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAgentToggle = (agentId: string, isSelected: boolean) => {
        setFormData(prev => ({
            ...prev,
            selectedAgents: isSelected
                ? [...prev.selectedAgents, agentId]
                : prev.selectedAgents.filter(id => id !== agentId)
        }));
    };

    const handleSystemAgentToggle = (agentId: string, isEnabled: boolean) => {
        setFormData(prev => ({
            ...prev,
            enabledSystemAgents: isEnabled
                ? [...prev.enabledSystemAgents, agentId]
                : prev.enabledSystemAgents.filter(id => id !== agentId)
        }));
    };

    const handleSubmit = () => {
        onSubmit(formData);
    };

    const isReadyToSubmit = () => {
        return (
            keptPoints > 0 &&
            formData.contextUpdates.trim().length > 0 &&
            formData.selectedAgents.length > 0
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold text-foreground">
                            Review & Update Context
                        </CardTitle>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-green-600 border-green-300">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {keptPoints}/{totalPoints} points kept
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                {feedbackCount} feedbacks
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                {[
                    { id: 'review', label: 'Review Responses', icon: FileText },
                    { id: 'context', label: 'Update Context', icon: AlertCircle },
                    { id: 'agents', label: 'Select Agents', icon: Users },
                    { id: 'system', label: 'System Agents', icon: Settings }
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'review' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Validator Responses Review</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-6">
                                    {formData.validatorResponses.map((response) => {
                                        const keptPointsCount = response.points.filter(p => p.isKept).length;
                                        const totalPointsCount = response.points.length;

                                        return (
                                            <div key={response.id} className="border rounded-lg p-4 bg-card">
                                                {/* Agent Header */}
                                                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-semibold text-lg text-foreground">{response.agentName}</h3>
                                                        <Badge variant="outline" className="text-xs">
                                                            {keptPointsCount}/{totalPointsCount} points kept
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Points Summary */}
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <h4 className="font-medium text-sm text-green-700 dark:text-green-400 mb-2">
                                                            Kept Points ({keptPointsCount})
                                                        </h4>
                                                        <div className="space-y-1">
                                                            {response.points
                                                                .filter(point => point.isKept)
                                                                .map((point, index) => (
                                                                    <div key={point.id} className="text-xs p-2 bg-green-50 dark:bg-green-950 rounded border-l-2 border-green-500">
                                                                        {point.content}
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-sm text-red-700 dark:text-red-400 mb-2">
                                                            Removed Points ({totalPointsCount - keptPointsCount})
                                                        </h4>
                                                        <div className="space-y-1">
                                                            {response.points
                                                                .filter(point => !point.isKept)
                                                                .map((point, index) => (
                                                                    <div key={point.id} className="text-xs p-2 bg-red-50 dark:bg-red-950 rounded border-l-2 border-red-500">
                                                                        {point.content}
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Overall Feedback */}
                                                {response.overallFeedback && (
                                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded border-l-2 border-blue-500">
                                                        <h4 className="font-medium text-sm text-blue-700 dark:text-blue-400 mb-1">
                                                            Overall Feedback:
                                                        </h4>
                                                        <p className="text-sm text-foreground">{response.overallFeedback}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'context' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Original Question</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-foreground">{formData.originalQuestion}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Context Updates</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="context-updates" className="text-sm font-medium">
                                        Updated Context (Required)
                                    </Label>
                                    <Textarea
                                        id="context-updates"
                                        placeholder="Based on the validator responses, provide updated context, clarifications, or additional information that should be considered in the next iteration..."
                                        value={formData.contextUpdates}
                                        onChange={(e) => handleContextUpdate('contextUpdates', e.target.value)}
                                        className="min-h-[120px] mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="additional-instructions" className="text-sm font-medium">
                                        Additional Instructions (Optional)
                                    </Label>
                                    <Textarea
                                        id="additional-instructions"
                                        placeholder="Any specific instructions or focus areas for the next iteration..."
                                        value={formData.additionalInstructions}
                                        onChange={(e) => handleContextUpdate('additionalInstructions', e.target.value)}
                                        className="min-h-[80px] mt-2"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'agents' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Select Agents for Next Iteration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {formData.availableAgents.map((agent) => {
                                    const isSelected = formData.selectedAgents.includes(agent.id);
                                    return (
                                        <div
                                            key={agent.id}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                                                }`}
                                            onClick={() => handleAgentToggle(agent.id, !isSelected)}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => { }} // Handled by parent click
                                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <div>
                                                    <h3 className="font-medium text-sm">{agent.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{agent.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded border-l-2 border-yellow-500">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    Selected agents will participate in the next iteration with the updated context.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'system' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">System Agents</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Enable specialized system agents to enhance the flow processing capabilities.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Search Engine Agent */}
                                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Search className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <h3 className="font-medium text-sm">Search Engine Agent</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Uses ScraperAPI to scrape web data and format results for analysis
                                                </p>
                                            </div>
                                        </div>
                                        <Checkbox
                                            checked={formData.enabledSystemAgents.includes('search-engine')}
                                            onCheckedChange={(checked) =>
                                                handleSystemAgentToggle('search-engine', checked as boolean)
                                            }
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                    </div>
                                    {formData.enabledSystemAgents.includes('search-engine') && (
                                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border-l-2 border-blue-500">
                                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                                This agent will automatically search the web for relevant information based on the question distributor's queries and provide formatted results as search engine nodes in the flow.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Chart Agent */}
                                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <BarChart3 className="h-5 w-5 text-green-500" />
                                            <div>
                                                <h3 className="font-medium text-sm">Chart Agent</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Generates interactive charts and graphs from data analysis
                                                </p>
                                            </div>
                                        </div>
                                        <Checkbox
                                            checked={formData.enabledSystemAgents.includes('chart-agent')}
                                            onCheckedChange={(checked) =>
                                                handleSystemAgentToggle('chart-agent', checked as boolean)
                                            }
                                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                        />
                                    </div>
                                    {formData.enabledSystemAgents.includes('chart-agent') && (
                                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded border-l-2 border-green-500">
                                            <p className="text-sm text-green-800 dark:text-green-200">
                                                This agent will automatically create visual charts and graphs based on data analysis, supporting bar charts, line charts, and pie charts for better data visualization.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Pros & Cons Agent */}
                                <div className="p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Scale className="h-5 w-5 text-purple-500" />
                                            <div>
                                                <h3 className="font-medium text-sm">Pros & Cons Agent</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Provides structured analysis of advantages and disadvantages
                                                </p>
                                            </div>
                                        </div>
                                        <Checkbox
                                            checked={formData.enabledSystemAgents.includes('proscons-agent')}
                                            onCheckedChange={(checked) =>
                                                handleSystemAgentToggle('proscons-agent', checked as boolean)
                                            }
                                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                        />
                                    </div>
                                    {formData.enabledSystemAgents.includes('proscons-agent') && (
                                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950 rounded border-l-2 border-purple-500">
                                            <p className="text-sm text-purple-800 dark:text-purple-200">
                                                This agent will automatically analyze questions and provide structured pros and cons comparisons with weighted analysis and recommendations.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded border-l-2 border-green-500">
                                <p className="text-sm text-green-800 dark:text-green-200">
                                    System agents work automatically in the background and don't require manual selection for each iteration.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {!isReadyToSubmit() && (
                        <>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <span>Please complete all required fields to proceed</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isReadyToSubmit() || isProcessing}
                        className="flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Starting New Iteration...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                Start New Iteration
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export type { UserInteractionFormData, UserInteractionFormProps };