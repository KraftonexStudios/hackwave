'use client';

import React, { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Download, FileText, TrendingUp, Clock, Star, AlertTriangle, Target } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ValidatorPoint {
  id: string;
  content: string;
  isKept: boolean;
  feedback: string;
  confidence?: number;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
}

interface ValidatorResponse {
  id: string;
  agentName: string;
  points: ValidatorPoint[];
  overallFeedback: string;
  agentScore?: number;
  responseTime?: number;
  expertise?: string[];
}

interface ValidatorTableNodeData {
  responses: ValidatorResponse[];
  onResponseUpdate?: (responses: ValidatorResponse[]) => void;
  onRegenerate?: () => void;
}

export function ValidatorTableNode({ data }: { data: ValidatorTableNodeData }) {
  const [responses, setResponses] = useState<ValidatorResponse[]>(data.responses || []);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingPDF, setIsSavingPDF] = useState(false);
  const [globalFeedback, setGlobalFeedback] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  // Calculate statistics

  const keptPoints = responses.reduce((sum, response) => sum + response.points.filter(p => p.isKept).length, 0);
  const averageScore = responses.length > 0 ? responses.reduce((sum, response) => sum + (response.agentScore || 0), 0) / responses.length : 0;
  const highPriorityPoints = responses.reduce((sum, response) => sum + response.points.filter(p => p.priority === 'high').length, 0);

  const getAgentStats = (response: ValidatorResponse) => {
    const keptCount = response.points.filter(p => p.isKept).length;
    const totalCount = response.points.length;
    const keepRate = totalCount > 0 ? (keptCount / totalCount) * 100 : 0;
    const avgConfidence = response.points.length > 0 ? 
      response.points.reduce((sum, p) => sum + (p.confidence || 0), 0) / response.points.length : 0;
    return { keptCount, totalCount, keepRate, avgConfidence };
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handlePointKeepToggle = (responseId: string, pointId: string, isKept: boolean) => {
    const updatedResponses = responses.map(response => {
      if (response.id === responseId) {
        return {
          ...response,
          points: response.points.map(point =>
            point.id === pointId ? { ...point, isKept } : point
          )
        };
      }
      return response;
    });
    setResponses(updatedResponses);
    data.onResponseUpdate?.(updatedResponses);
  };

  const handlePointFeedbackChange = (responseId: string, pointId: string, feedback: string) => {
    const updatedResponses = responses.map(response => {
      if (response.id === responseId) {
        return {
          ...response,
          points: response.points.map(point =>
            point.id === pointId ? { ...point, feedback } : point
          )
        };
      }
      return response;
    });
    setResponses(updatedResponses);
    data.onResponseUpdate?.(updatedResponses);
  };

  const handleOverallFeedbackChange = (responseId: string, overallFeedback: string) => {
    const updatedResponses = responses.map(response =>
      response.id === responseId ? { ...response, overallFeedback } : response
    );
    setResponses(updatedResponses);
    data.onResponseUpdate?.(updatedResponses);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await data.onRegenerate?.();
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSavePDF = async () => {
    if (!tableRef.current) return;

    setIsSavingPDF(true);
    try {
      // Create a clone of the table for PDF generation
      const element = tableRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add title
      pdf.setFontSize(16);
      pdf.text('Validator Responses Report', 20, 20);
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      pdf.text(`Total Points: ${totalPoints} | Kept Points: ${keptPoints}`, 20, 35);

      // Add the table image
      pdf.addImage(imgData, 'PNG', 10, 45, imgWidth - 20, imgHeight);
      heightLeft -= pageHeight - 45;

      // Add new pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth - 20, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      pdf.save(`validator-responses-${timestamp}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsSavingPDF(false);
    }
  };

  const totalPoints = responses.reduce((sum, response) => sum + response.points.length, 0);

  return (
    <div className="w-[1000px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <Card className="border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Validator Analysis Dashboard
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{keptPoints}/{totalPoints} points accepted</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>Avg Score: {averageScore.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span>{highPriorityPoints} high priority</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSavePDF}
                disabled={isSavingPDF || responses.length === 0}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                {isSavingPDF ? (
                  <>
                    <FileText className="h-4 w-4 animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No validator responses available</p>
              <p className="text-sm">Agent responses will appear here once validation is complete</p>
            </div>
          ) : (
            <div ref={tableRef} className="space-y-4">
              {/* Minimal Table-like Structure */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                    <div className="col-span-2">Agent</div>
                    <div className="col-span-6">Key Points</div>
                    <div className="col-span-1 text-center">Keep</div>
                    <div className="col-span-3">Feedback</div>
                  </div>
                </div>
                
                {responses.map((response) => (
                  <div key={response.id} className="border-b last:border-b-0">
                    {response.points.map((point, pointIndex) => (
                      <div key={point.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors">
                        {/* Agent Name (only show for first point) */}
                        {pointIndex === 0 ? (
                          <div className="col-span-2 space-y-1" style={{ gridRow: `span ${response.points.length}` }}>
                            <div className="font-medium text-sm">{response.agentName}</div>
                            <div className="text-xs text-muted-foreground">
                              {response.expertise?.join(', ') || 'General'}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {response.points.filter(p => p.isKept).length}/{response.points.length}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="col-span-2"></div>
                        )}
                        
                        {/* Key Point */}
                        <div className="col-span-6 space-y-2">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs mt-0.5 shrink-0">
                              #{pointIndex + 1}
                            </Badge>
                            <p className="text-sm leading-relaxed">{point.content}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-8">
                            {point.confidence && (
                              <Badge variant="secondary" className="text-xs">
                                {point.confidence}%
                              </Badge>
                            )}
                            {point.priority && (
                              <Badge className={`text-xs ${getPriorityColor(point.priority)}`}>
                                {point.priority}
                              </Badge>
                            )}
                            {point.category && (
                              <Badge variant="outline" className="text-xs">
                                {point.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Checkbox */}
                        <div className="col-span-1 flex justify-center items-start pt-1">
                          <Checkbox
                            id={`keep-${response.id}-${point.id}`}
                            checked={point.isKept}
                            onCheckedChange={(checked) =>
                              handlePointKeepToggle(response.id, point.id, checked as boolean)
                            }
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                        </div>
                        
                        {/* Point Feedback */}
                        <div className="col-span-3">
                          <Textarea
                            placeholder="Feedback..."
                            value={point.feedback}
                            onChange={(e) => handlePointFeedbackChange(response.id, point.id, e.target.value)}
                            className="min-h-[60px] text-xs resize-none"
                          />
                        </div>
                      </div>
                    ))}
                    
                    {/* Agent Overall Feedback Row */}
                    <div className="grid grid-cols-12 gap-4 p-4 bg-muted/20 border-t">
                      <div className="col-span-2 flex items-center">
                        <span className="text-xs font-medium text-muted-foreground">Overall Feedback</span>
                      </div>
                      <div className="col-span-10">
                        <Textarea
                          placeholder={`Overall feedback for ${response.agentName}...`}
                          value={response.overallFeedback}
                          onChange={(e) => handleOverallFeedbackChange(response.id, e.target.value)}
                          className="min-h-[60px] text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Global Suggestion Box - Full Width */}
          {responses.length > 0 && (
            <div className="mt-6 border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <span className="font-medium">Global Suggestions & Next Steps</span>
              </div>
              <Textarea
                placeholder="Add global suggestions, next steps, or overall recommendations based on all agent responses..."
                value={globalFeedback}
                onChange={(e) => setGlobalFeedback(e.target.value)}
                className="min-h-[120px] text-sm resize-none border-primary/20 focus:border-primary/40 w-full"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Total Responses: {responses.length}</span>
                  <span>•</span>
                  <span>Acceptance Rate: {totalPoints > 0 ? ((keptPoints / totalPoints) * 100).toFixed(1) : 0}%</span>
                </div>
                <Button size="sm" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Finalize Review
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export type { ValidatorTableNodeData, ValidatorResponse };