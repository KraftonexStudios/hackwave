'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface ValidationResult {
  id: string;
  claim: string;
  isValid: boolean;
  confidence: number;
  evidence: string;
  selected: boolean;
}

interface ValidationTableProps {
  validationResults: ValidationResult[];
  onSelectionChange: (selectedIds: string[]) => void;
  onSubmitFeedback: (feedback: string, selectedIds: string[], action: 'next_round' | 'generate_report') => void;
  sessionId: string;
  currentRound: number;
  maxRounds: number;
}

export function ValidationTable({
  validationResults,
  onSelectionChange,
  onSubmitFeedback,
  sessionId,
  currentRound,
  maxRounds
}: ValidationTableProps) {
  const [selectedValidations, setSelectedValidations] = useState<string[]>([]);
  const [userFeedback, setUserFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (validationId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedValidations, validationId]
      : selectedValidations.filter(id => id !== validationId);

    setSelectedValidations(newSelection);
    onSelectionChange(newSelection);
  };

  const handleSubmit = async (action: 'next_round' | 'generate_report') => {
    if (selectedValidations.length === 0) {
      alert('Please select at least one validation result.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitFeedback(userFeedback, selectedValidations, action);
      // Reset form after successful submission
      setUserFeedback('');
      setSelectedValidations([]);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationIcon = (isValid: boolean, confidence: number) => {
    if (isValid && confidence > 80) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (!isValid) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge variant="default" className="bg-green-100 text-green-800">High ({confidence}%)</Badge>;
    } else if (confidence >= 60) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium ({confidence}%)</Badge>;
    } else {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">Low ({confidence}%)</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Validation Results - Round {currentRound} of {maxRounds}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review the validation results below and select the ones you agree with.
          Provide feedback to improve the next round or generate a final report.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Results Table */}
        <div className="space-y-4">
          {validationResults.map((validation) => (
            <div
              key={validation.id}
              className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={validation.id}
                  checked={selectedValidations.includes(validation.id)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(validation.id, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getValidationIcon(validation.isValid, validation.confidence)}
                    <span className="font-medium">{validation.claim}</span>
                    {getConfidenceBadge(validation.confidence)}
                  </div>
                  <p className="text-sm text-muted-foreground pl-7">
                    {validation.evidence}
                  </p>
                  <div className="flex items-center gap-2 pl-7">
                    <Badge variant={validation.isValid ? "default" : "destructive"}>
                      {validation.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* User Feedback Section */}
        <div className="space-y-3">
          <label htmlFor="feedback" className="text-sm font-medium">
            Your Feedback (Optional)
          </label>
          <Textarea
            id="feedback"
            placeholder="Provide additional context, corrections, or suggestions for the next round..."
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">
              Selected: {selectedValidations.length} of {validationResults.length} validations
            </p>
          </div>
          <div className="flex gap-2">
            {currentRound < maxRounds && (
              <Button
                onClick={() => handleSubmit('next_round')}
                disabled={isSubmitting || selectedValidations.length === 0}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting ? 'Processing...' : `Next Round (${currentRound + 1}/${maxRounds})`}
              </Button>
            )}
            <Button
              onClick={() => handleSubmit('generate_report')}
              disabled={isSubmitting || selectedValidations.length === 0}
              variant={currentRound >= maxRounds ? "default" : "outline"}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{currentRound} / {maxRounds} rounds</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentRound / maxRounds) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}