'use client';

import { useState } from 'react';
import { FileText, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { generateSessionReport, generateSessionPDF } from '@/actions/reports';
import { PDFReportGenerator } from '@/lib/pdf/report-generator';
import type { Report } from '@/database.types';

interface ReportContentProps {
  sessionId: string;
  reports: Report[];
}

export function ReportContent({ sessionId, reports }: ReportContentProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeReports, setActiveReports] = useState(reports);
  const { toast } = useToast();

  const handleGenerateReport = async (reportType: 'interim' | 'final' | 'summary') => {
    setIsGenerating(true);
    try {
      const result = await generateSessionReport(sessionId, reportType);
      
      if (result.success && result.data) {
        toast({
          title: 'Report Generated',
          description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report has been generated successfully.`,
        });
        
        // Refresh the page to show the new report
        window.location.reload();
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Failed to generate report',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while generating the report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async (reportType: 'interim' | 'final' | 'summary') => {
    setIsGeneratingPDF(true);
    try {
      const result = await generateSessionPDF(sessionId, reportType);
      
      if (result.success && result.data) {
        // Download the PDF
        await PDFReportGenerator.downloadPDF(result.data.blob, result.data.filename);
        
        toast({
          title: 'PDF Downloaded',
          description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report PDF has been downloaded.`,
        });
      } else {
        toast({
          title: 'Download Failed',
          description: result.error || 'Failed to generate PDF',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while generating the PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const reportsByType = {
    final: activeReports.filter(r => r.report_type === 'final'),
    interim: activeReports.filter(r => r.report_type === 'interim'),
    summary: activeReports.filter(r => r.report_type === 'summary'),
  };

  const renderReportSection = (reportType: 'final' | 'interim' | 'summary') => {
    const reports = reportsByType[reportType];
    const latestReport = reports[0]; // Reports are ordered by created_at desc

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold capitalize">{reportType} Report</h3>
            <p className="text-sm text-muted-foreground">
              {reportType === 'final' && 'Comprehensive analysis of the complete debate session'}
              {reportType === 'interim' && 'Progress report of the ongoing debate session'}
              {reportType === 'summary' && 'Concise overview of key findings and conclusions'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleGenerateReport(reportType)}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {latestReport ? 'Regenerate' : 'Generate'}
            </Button>
            {latestReport && (
              <Button
                onClick={() => handleDownloadPDF(reportType)}
                disabled={isGeneratingPDF}
                variant="outline"
                size="sm"
              >
                {isGeneratingPDF ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                PDF
              </Button>
            )}
          </div>
        </div>

        {latestReport ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                  </CardTitle>
                  <CardDescription>
                    Generated on {new Date(latestReport.created_at).toLocaleString()}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {latestReport.report_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">
                  {latestReport.content}
                </div>
              </div>
              
              {latestReport.metadata && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Report Metadata</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {latestReport.metadata.agent_count && (
                      <div>
                        <span className="text-muted-foreground">Agents:</span>
                        <span className="ml-1 font-medium">{latestReport.metadata.agent_count}</span>
                      </div>
                    )}
                    {latestReport.metadata.round_count && (
                      <div>
                        <span className="text-muted-foreground">Rounds:</span>
                        <span className="ml-1 font-medium">{latestReport.metadata.round_count}</span>
                      </div>
                    )}
                    {latestReport.metadata.usage?.totalTokens && (
                      <div>
                        <span className="text-muted-foreground">Tokens:</span>
                        <span className="ml-1 font-medium">{latestReport.metadata.usage.totalTokens}</span>
                      </div>
                    )}
                    {latestReport.metadata.generated_at && (
                      <div>
                        <span className="text-muted-foreground">Generated:</span>
                        <span className="ml-1 font-medium">
                          {new Date(latestReport.metadata.generated_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No {reportType} report generated yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Generate a {reportType} report to analyze the debate session.
                </p>
                <Button
                  onClick={() => handleGenerateReport(reportType)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {reports.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Previous Reports</CardTitle>
              <CardDescription>
                Historical {reportType} reports for this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reports.slice(1).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">
                        {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {report.report_type}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // TODO: Implement view historical report
                          toast({
                            title: 'Feature Coming Soon',
                            description: 'Historical report viewing will be available soon.',
                          });
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {activeReports.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No reports have been generated for this session yet. Generate reports to analyze the debate outcomes and insights.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="final" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="final">
            Final Report
            {reportsByType.final.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {reportsByType.final.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="interim">
            Interim Report
            {reportsByType.interim.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {reportsByType.interim.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary">
            Summary Report
            {reportsByType.summary.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {reportsByType.summary.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="final" className="mt-6">
          {renderReportSection('final')}
        </TabsContent>

        <TabsContent value="interim" className="mt-6">
          {renderReportSection('interim')}
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          {renderReportSection('summary')}
        </TabsContent>
      </Tabs>
    </div>
  );
}