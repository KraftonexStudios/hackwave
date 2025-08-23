import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Session, Agent, Round, Responce as AgentResponse } from '@/database.types';

export interface ReportData {
  session: Session;
  agents: Agent[];
  rounds: Round[];
  responses: AgentResponse[];
  reportContent: string;
}

export interface PDFOptions {
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  lineHeight?: number;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

const defaultOptions: PDFOptions = {
  format: 'a4',
  orientation: 'portrait',
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
  fontSize: 12,
  lineHeight: 1.5,
  includeHeader: true,
  includeFooter: true,
};

export class PDFReportGenerator {
  private options: PDFOptions;

  constructor(options: Partial<PDFOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Generate PDF from report data
   */
  async generatePDF(reportData: ReportData): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: this.options.orientation,
      unit: 'mm',
      format: this.options.format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margins = this.options.margins!;
    const contentWidth = pageWidth - margins.left - margins.right;
    const contentHeight = pageHeight - margins.top - margins.bottom;

    let currentY = margins.top;

    // Add header
    if (this.options.includeHeader) {
      currentY = this.addHeader(pdf, reportData, currentY, contentWidth);
    }

    // Add session overview
    currentY = this.addSessionOverview(pdf, reportData, currentY, contentWidth, pageHeight, margins);

    // Add agents summary
    currentY = this.addAgentsSummary(pdf, reportData, currentY, contentWidth, pageHeight, margins);

    // Add report content
    currentY = this.addReportContent(pdf, reportData, currentY, contentWidth, pageHeight, margins);

    // Add rounds summary
    currentY = this.addRoundsSummary(pdf, reportData, currentY, contentWidth, pageHeight, margins);

    // Add footer to all pages
    if (this.options.includeFooter) {
      this.addFooter(pdf, reportData);
    }

    return pdf.output('blob');
  }

  /**
   * Generate PDF from HTML element
   */
  async generatePDFFromHTML(element: HTMLElement, filename?: string): Promise<Blob> {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10; // 10mm top margin

    // Add first page
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20; // Account for margins

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
    }

    return pdf.output('blob');
  }

  private addHeader(pdf: jsPDF, reportData: ReportData, currentY: number, contentWidth: number): number {
    const { session } = reportData;
    
    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Multi-Agent Debate Report', 20, currentY);
    currentY += 15;

    // Session title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    const sessionTitle = session.initial_query || 'Debate Session Report';
    const titleLines = pdf.splitTextToSize(sessionTitle, contentWidth);
    pdf.text(titleLines, 20, currentY);
    currentY += titleLines.length * 6 + 10;

    // Metadata
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const createdDate = new Date(session.created_at).toLocaleDateString();
    const status = session.status.toUpperCase();
    pdf.text(`Generated: ${new Date().toLocaleDateString()} | Session: ${createdDate} | Status: ${status}`, 20, currentY);
    currentY += 15;

    // Add separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, currentY, 20 + contentWidth, currentY);
    currentY += 10;

    return currentY;
  }

  private addSessionOverview(pdf: jsPDF, reportData: ReportData, currentY: number, contentWidth: number, pageHeight: number, margins: any): number {
    const { session, agents, rounds } = reportData;

    // Check if we need a new page
    if (currentY > pageHeight - margins.bottom - 60) {
      pdf.addPage();
      currentY = margins.top;
    }

    // Section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Session Overview', 20, currentY);
    currentY += 10;

    // Session details
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const details = [
      `Query: ${session.initial_query || 'N/A'}`,
      `Description: ${session.description || 'No description provided'}`,
      `Status: ${session.status}`,
      `Current Round: ${session.current_round || 0}/${session.max_rounds}`,
      `Total Agents: ${agents.length}`,
      `Total Rounds: ${rounds.length}`,
      `Created: ${new Date(session.created_at).toLocaleString()}`,
    ];

    details.forEach(detail => {
      const lines = pdf.splitTextToSize(detail, contentWidth);
      pdf.text(lines, 20, currentY);
      currentY += lines.length * 4 + 2;
    });

    currentY += 10;
    return currentY;
  }

  private addAgentsSummary(pdf: jsPDF, reportData: ReportData, currentY: number, contentWidth: number, pageHeight: number, margins: any): number {
    const { agents } = reportData;

    // Check if we need a new page
    if (currentY > pageHeight - margins.bottom - 60) {
      pdf.addPage();
      currentY = margins.top;
    }

    // Section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Participating Agents', 20, currentY);
    currentY += 10;

    // Agents list
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    agents.forEach((agent, index) => {
      const agentInfo = `${index + 1}. ${agent.name} (${agent.role || 'General Agent'})`;
      const description = agent.description ? ` - ${agent.description}` : '';
      
      pdf.text(agentInfo, 25, currentY);
      currentY += 5;
      
      if (description) {
        const descLines = pdf.splitTextToSize(description, contentWidth - 10);
        pdf.text(descLines, 30, currentY);
        currentY += descLines.length * 4;
      }
      
      currentY += 3;
    });

    currentY += 10;
    return currentY;
  }

  private addReportContent(pdf: jsPDF, reportData: ReportData, currentY: number, contentWidth: number, pageHeight: number, margins: any): number {
    const { reportContent } = reportData;

    // Check if we need a new page
    if (currentY > pageHeight - margins.bottom - 60) {
      pdf.addPage();
      currentY = margins.top;
    }

    // Section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Analysis Report', 20, currentY);
    currentY += 10;

    // Convert markdown to plain text (basic conversion)
    const plainText = this.markdownToPlainText(reportContent);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const lines = pdf.splitTextToSize(plainText, contentWidth);
    
    lines.forEach(line => {
      // Check if we need a new page
      if (currentY > pageHeight - margins.bottom - 10) {
        pdf.addPage();
        currentY = margins.top;
      }
      
      pdf.text(line, 20, currentY);
      currentY += 5;
    });

    currentY += 10;
    return currentY;
  }

  private addRoundsSummary(pdf: jsPDF, reportData: ReportData, currentY: number, contentWidth: number, pageHeight: number, margins: any): number {
    const { rounds, responses, agents } = reportData;

    // Check if we need a new page
    if (currentY > pageHeight - margins.bottom - 60) {
      pdf.addPage();
      currentY = margins.top;
    }

    // Section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rounds Summary', 20, currentY);
    currentY += 10;

    rounds.forEach(round => {
      // Check if we need a new page
      if (currentY > pageHeight - margins.bottom - 40) {
        pdf.addPage();
        currentY = margins.top;
      }

      // Round header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Round ${round.round_number}`, 20, currentY);
      currentY += 8;

      // Round responses
      const roundResponses = responses.filter(r => r.round_id === round.id);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      roundResponses.forEach(response => {
        const agent = agents.find(a => a.id === response.agent_id);
        const agentName = agent?.name || 'Unknown Agent';
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${agentName}:`, 25, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        const responseText = response.response_text || 'No response';
        const responseLines = pdf.splitTextToSize(responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''), contentWidth - 10);
        
        responseLines.forEach(line => {
          if (currentY > pageHeight - margins.bottom - 10) {
            pdf.addPage();
            currentY = margins.top;
          }
          pdf.text(line, 30, currentY);
          currentY += 4;
        });
        
        currentY += 5;
      });
      
      currentY += 5;
    });

    return currentY;
  }

  private addFooter(pdf: jsPDF, reportData: ReportData): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      // Page number
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
      
      // Generated timestamp
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, pageHeight - 10);
    }
  }

  private markdownToPlainText(markdown: string): string {
    return markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^[-*+]\s+/gm, '• ') // Convert lists
      .replace(/^\d+\.\s+/gm, '• ') // Convert numbered lists
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Download PDF file
   */
  static async downloadPDF(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for report
   */
  static generateFilename(session: Session, reportType: string = 'report'): string {
    const date = new Date().toISOString().split('T')[0];
    const sessionId = session.id.substring(0, 8);
    const query = session.initial_query?.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-') || 'session';
    return `${reportType}-${query}-${sessionId}-${date}.pdf`;
  }
}