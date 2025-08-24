'use client';

import React, { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ValidatorPoint {
  id: string;
  content: string;
  isKept: boolean;
  feedback: string;
}

interface ValidatorResponse {
  id: string;
  agentName: string;
  points: ValidatorPoint[];
  overallFeedback: string;
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
  const tableRef = useRef<HTMLDivElement>(null);

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
  const keptPoints = responses.reduce((sum, response) => 
    sum + response.points.filter(point => point.isKept).length, 0
  );

  return (
    <div className="w-[800px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-purple-700 dark:text-purple-300">
              Validator Responses
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                {keptPoints}/{totalPoints} points kept
              </Badge>
              <div className="flex gap-2">
                <Button
                  onClick={handleSavePDF}
                  disabled={isSavingPDF || responses.length === 0}
                  size="sm"
                  variant="default"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSavingPDF ? (
                    <>
                      <FileText className="h-4 w-4 animate-pulse" />
                      Saving PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Save PDF
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No validator responses available</p>
            </div>
          ) : (
            <div ref={tableRef} className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-sm">
                      Agent Name
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-sm">
                      Content Points
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold text-sm w-20">
                      Keep
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-sm">
                      Suggestions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => {
                    const keptPointsCount = response.points.filter(p => p.isKept).length;
                    const totalPointsCount = response.points.length;
                    
                    return response.points.map((point, pointIndex) => (
                      <tr key={`${response.id}-${point.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {/* Agent Name - only show for first point of each agent */}
                        {pointIndex === 0 ? (
                          <td 
                            className="border border-gray-300 dark:border-gray-600 px-4 py-3 align-top font-medium" 
                            rowSpan={response.points.length}
                          >
                            <div className="flex flex-col gap-2">
                              <span className="text-sm font-semibold">{response.agentName}</span>
                              <Badge variant="outline" className="text-xs w-fit">
                                {keptPointsCount}/{totalPointsCount} kept
                              </Badge>
                            </div>
                          </td>
                        ) : null}
                        
                        {/* Content Points */}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-muted-foreground mt-1 min-w-[20px]">
                              {pointIndex + 1}.
                            </span>
                            <p className="text-sm text-foreground leading-relaxed">
                              {point.content}
                            </p>
                          </div>
                        </td>
                        
                        {/* Keep Checkbox */}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center align-top">
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              id={`keep-${response.id}-${point.id}`}
                              checked={point.isKept}
                              onCheckedChange={(checked) => 
                                handlePointKeepToggle(response.id, point.id, checked as boolean)
                              }
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            {point.isKept ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </td>
                        
                        {/* Suggestions */}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 align-top">
                          <Textarea
                            placeholder="Feedback for this point..."
                            value={point.feedback}
                            onChange={(e) => handlePointFeedbackChange(response.id, point.id, e.target.value)}
                            className="min-h-[60px] text-xs resize-none w-full"
                          />
                        </td>
                      </tr>
                    ));
                  })}
                  
                  {/* Overall Feedback Row for each agent */}
                  {responses.map((response) => (
                    <tr key={`${response.id}-overall`} className="bg-blue-50 dark:bg-blue-950/30">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
                        <span className="text-sm text-blue-700 dark:text-blue-300">Overall Feedback</span>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" colSpan={3}>
                        <Textarea
                          placeholder={`Overall feedback and suggestions for ${response.agentName}...`}
                          value={response.overallFeedback}
                          onChange={(e) => handleOverallFeedbackChange(response.id, e.target.value)}
                          className="min-h-[80px] text-sm resize-none w-full"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export type { ValidatorTableNodeData, ValidatorResponse };