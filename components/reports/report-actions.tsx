'use client';

import { useState } from 'react';
import { Download, FileText, RefreshCw, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { generateSessionReport, generateSessionPDF } from '@/actions/reports';
import { PDFReportGenerator } from '@/lib/pdf/report-generator';
import type { Session } from '@/database.types';

interface ReportActionsProps {
  sessionId: string;
  session: Session;
}

export function ReportActions({ sessionId, session }: ReportActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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

  const isSessionCompleted = session.status === 'completed';
  const hasContent = session.current_round && session.current_round > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Quick Generate Final Report */}
      {isSessionCompleted && (
        <Button
          onClick={() => handleGenerateReport('final')}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Generate Final Report
        </Button>
      )}

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Report Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Generate Reports */}
          <DropdownMenuItem
            onClick={() => handleGenerateReport('final')}
            disabled={isGenerating || !hasContent}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Final Report
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleGenerateReport('interim')}
            disabled={isGenerating || !hasContent}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Interim Report
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleGenerateReport('summary')}
            disabled={isGenerating || !hasContent}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Summary Report
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Download PDFs */}
          <DropdownMenuItem
            onClick={() => handleDownloadPDF('final')}
            disabled={isGeneratingPDF || !hasContent}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Final PDF
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleDownloadPDF('interim')}
            disabled={isGeneratingPDF || !hasContent}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Interim PDF
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleDownloadPDF('summary')}
            disabled={isGeneratingPDF || !hasContent}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Summary PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}