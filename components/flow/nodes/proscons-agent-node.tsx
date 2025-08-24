'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Scale, Loader2 } from 'lucide-react';

interface ProsConsItem {
  point: string;
  weight?: number;
  category?: string;
}

interface ProsConsAgentNodeData {
  id: string;
  query?: string;
  question?: string;
  pros: ProsConsItem[];
  cons: ProsConsItem[];
  summary?: string;
  recommendation?: string;
  isLoading?: boolean;
  error?: string;
  timestamp?: string;
  processingTime?: number;
  totalPros?: number;
  totalCons?: number;
}

export function ProsConsAgentNode({ data }: { data: ProsConsAgentNodeData }) {
  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Analyzing pros and cons...</span>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-sm text-red-500 mb-2">Error analyzing pros and cons</p>
        <p className="text-xs text-muted-foreground">{data.error}</p>
      </div>
    </div>
  );

  const renderProsConsTable = () => {
    const maxRows = Math.max(data.pros?.length || 0, data.cons?.length || 0);

    if (maxRows === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No analysis data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Pros ({data.pros?.length || 0})</span>
                </div>
              </TableHead>
              <TableHead className="w-1/2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Cons ({data.cons?.length || 0})</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: maxRows }, (_, index) => {
              const pro = data.pros?.[index];
              const con = data.cons?.[index];

              return (
                <TableRow key={index}>
                  <TableCell className="align-top">
                    {pro && (
                      <div className="space-y-1">
                        <p className="text-sm">{pro.point}</p>
                        {pro.category && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            {pro.category}
                          </Badge>
                        )}
                        {pro.weight && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Weight:</span>
                            <div className="flex">
                              {Array.from({ length: 5 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full mr-1 ${i < pro.weight! ? 'bg-green-500' : 'bg-gray-200'
                                    }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {con && (
                      <div className="space-y-1">
                        <p className="text-sm">{con.point}</p>
                        {con.category && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                            {con.category}
                          </Badge>
                        )}
                        {con.weight && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Weight:</span>
                            <div className="flex">
                              {Array.from({ length: 5 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full mr-1 ${i < con.weight! ? 'bg-red-500' : 'bg-gray-200'
                                    }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderSummary = () => {
    if (!data.summary && !data.recommendation) return null;

    return (
      <div className="mt-4 space-y-3">
        {data.summary && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Summary</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">{data.summary}</p>
          </div>
        )}

        {data.recommendation && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">Recommendation</h4>
            <p className="text-sm text-purple-800 dark:text-purple-200">{data.recommendation}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[500px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <Card className="border-2 shadow-lg bg-white dark:bg-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <Scale className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">
                Pros & Cons Analysis
              </CardTitle>
              {(data.query || data.question) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {data.query || data.question}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              ANALYSIS
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {data.isLoading ? renderLoadingState() :
            data.error ? renderErrorState() :
              renderProsConsTable()}

          {renderSummary()}

          {data.timestamp && data.processingTime && (
            <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
              <span>Analyzed: {new Date(data.timestamp).toLocaleTimeString()}</span>
              <span>Processing: {data.processingTime}ms</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export type { ProsConsAgentNodeData, ProsConsItem };