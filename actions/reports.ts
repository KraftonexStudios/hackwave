"use server";

import { createClient } from "@/lib/supabase/server";
import { ReportGeneratorAgent } from "@/lib/ai/agents";
import {
  PDFReportGenerator,
  type ReportData,
} from "@/lib/pdf/report-generator";
import type {
  Session,
  Agent,
  Round,
  Responce as AgentResponse,
} from "@/database.types";
import { Database } from "@/database.types";

type ReportType = Database["public"]["Enums"]["report_type"];

export interface GenerateReportResult {
  success: boolean;
  data?: {
    reportId: string;
    content: string;
    pdfBlob?: Blob;
  };
  error?: string;
}

export interface GeneratePDFResult {
  success: boolean;
  data?: {
    blob: Blob;
    filename: string;
  };
  error?: string;
}

export interface SaveRegenerationReportResult {
  success: boolean;
  data?: {
    reportId: string;
    content: string;
  };
  error?: string;
}

/**
 * Save current flow state before regeneration
 */
export async function saveFlowStateSnapshot(
  sessionId: string,
  nodes: any[],
  edges: any[],
  validationResults: any[],
  iterationCount: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    const timestamp = new Date().toISOString();
    
    const snapshotContent = {
      sessionId,
      iterationCount,
      timestamp,
      flowState: {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: edge.animated,
          type: edge.type
        })),
        validationResults,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        validationCount: validationResults.length
      }
    };

    // Save flow state snapshot as a report
    const { data: savedSnapshot, error: saveError } = await supabase
      .from("reports")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        title: `Flow State Snapshot - Pre-Regeneration ${iterationCount}`,
        content: JSON.stringify(snapshotContent, null, 2),
        summary: `Flow state preserved before regeneration. ${nodes.length} nodes, ${edges.length} edges, ${validationResults.length} validation results.`,
        report_type: "SNAPSHOT",
        status: "COMPLETED",
        completed_at: timestamp,
        recommendations: {
          purpose: "Pre-regeneration flow state preservation",
          iteration: iterationCount,
          preservedElements: {
            nodes: nodes.length,
            edges: edges.length,
            validations: validationResults.length
          }
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving flow state snapshot:', saveError);
      return { success: false, error: "Failed to save flow state snapshot" };
    }

    return {
      success: true,
      data: {
        snapshotId: savedSnapshot.id,
        content: JSON.stringify(snapshotContent, null, 2)
      }
    };
  } catch (error) {
    console.error("Error saving flow state snapshot:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Save a regeneration report to track automated flow regenerations
 */
export async function saveRegenerationReport(
  sessionId: string,
  originalQuestion: string,
  validationData: any[],
  contextData: any,
  iterationCount: number
): Promise<SaveRegenerationReportResult> {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Generate report content
    const validCount = validationData.filter(r => r.isValid).length;
    const avgConfidence = validationData.reduce((sum, r) => sum + r.confidence, 0) / validationData.length;
    const timestamp = new Date().toISOString();
    
    const reportContent = {
      type: 'regeneration_report',
      timestamp,
      iteration: iterationCount,
      originalQuestion,
      validationSummary: {
        totalClaims: validationData.length,
        validClaims: validCount,
        averageConfidence: avgConfidence,
        validationRate: (validCount / validationData.length) * 100
      },
      contextUpdates: contextData.contextUpdates,
      additionalInstructions: contextData.additionalInstructions,
      keptPoints: contextData.keptPoints?.length || 0,
      removedPoints: contextData.removedPoints?.length || 0,
      validationDetails: validationData.map(v => ({
        claim: v.claim,
        evidence: v.evidence,
        isValid: v.isValid,
        confidence: v.confidence,
        logicalFallacies: v.logicalFallacies || []
      }))
    };

    // Save to reports table
    const { data: savedReport, error: saveError } = await supabase
      .from("reports")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        title: `Automated Regeneration Report - Iteration ${iterationCount}`,
        content: JSON.stringify(reportContent, null, 2),
        summary: `Automated flow regeneration completed. ${validCount}/${validationData.length} claims validated with ${avgConfidence.toFixed(1)}% average confidence.`,
        report_type: "INTERIM",
        status: "COMPLETED",
        completed_at: timestamp,
        recommendations: {
          improvements: contextData.additionalInstructions,
          nextSteps: `Continue with iteration ${iterationCount + 1} based on validation feedback.`,
          confidence_threshold: 70,
          validation_rate: (validCount / validationData.length) * 100
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving regeneration report:', saveError);
      return { success: false, error: "Failed to save regeneration report" };
    }

    return {
      success: true,
      data: {
        reportId: savedReport.id,
        content: JSON.stringify(reportContent, null, 2)
      }
    };
  } catch (error) {
    console.error("Error saving regeneration report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate a text report for a debate session
 */
export async function generateSessionReport(
  sessionId: string,
  reportType: ReportType = "FINAL"
): Promise<GenerateReportResult> {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from("debate_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Session not found" };
    }

    // Get agents
    const { data: sessionAgents, error: sessionAgentsError } = await supabase
      .from("session_agents")
      .select(
        `
        agent_id,
        agents (
          id,
          name,
          role,
          description,
          system_prompt
        )
      `
      )
      .eq("session_id", sessionId);

    if (sessionAgentsError) {
      return { success: false, error: "Failed to fetch session agents" };
    }

    const agents = (
      sessionAgents?.map((sa) => sa.agents).filter(Boolean) || []
    ).flat() as unknown as Agent[];

    // Get rounds and responses
    const { data: rounds, error: roundsError } = await supabase
      .from("debate_rounds")
      .select(
        `
        *,
        agent_responses (
          id,
          agent_id,
          response_text,
          reasoning,
          created_at,
          agents (
            name,
            role
          )
        )
      `
      )
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true });

    if (roundsError) {
      return { success: false, error: "Failed to fetch rounds" };
    }

    // Prepare data for report generation
    const sessionData = {
      query: session.initial_query || "",
      rounds: (rounds || []).map((round) => ({
        roundNumber: round.round_number,
        responses: (round.agent_responses || []).map((response: any) => ({
          agentName: response.agents?.name || "Unknown Agent",
          response: response.response_text || "",
          reasoning: response.reasoning,
        })),
        validation: null, // TODO: Add validation data if available
        userFeedback: undefined, // TODO: Add user feedback if available
      })),
    };

    // Generate report using AI
    const reportGenerator = new ReportGeneratorAgent();
    const reportResult = await reportGenerator.generateReport(
      sessionData,
      reportType.toLowerCase() as "interim" | "final" | "summary"
    );

    if (!reportResult.success) {
      return {
        success: false,
        error: reportResult.error || "Failed to generate report",
      };
    }

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from("reports")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        report_type: reportType,
        content: await reportResult.report,
        metadata: {
          generated_at: new Date().toISOString(),
          agent_count: agents.length,
          round_count: rounds?.length || 0,
          usage: reportResult.usage,
        },
      })
      .select()
      .single();

    if (saveError) {
      return { success: false, error: "Failed to save report" };
    }

    return {
      success: true,
      data: {
        reportId: savedReport.id,
        content: await reportResult.report,
      },
    };
  } catch (error) {
    console.error("Error generating report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate a PDF report for a debate session
 */
export async function generateSessionPDF(
  sessionId: string,
  reportType: ReportType = "FINAL"
): Promise<GeneratePDFResult> {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from("debate_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Session not found" };
    }

    // Get agents
    const { data: sessionAgents, error: sessionAgentsError } = await supabase
      .from("session_agents")
      .select(
        `
        agent_id,
        agents (
          id,
          name,
          role,
          description,
          system_prompt
        )
      `
      )
      .eq("session_id", sessionId);

    if (sessionAgentsError) {
      return { success: false, error: "Failed to fetch session agents" };
    }

    const agents = (
      sessionAgents?.map((sa) => sa.agents).filter(Boolean) || []
    ).flat() as unknown as Agent[];

    // Get rounds
    const { data: rounds, error: roundsError } = await supabase
      .from("debate_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true });

    if (roundsError) {
      return { success: false, error: "Failed to fetch rounds" };
    }

    // Get responses
    const { data: responses, error: responsesError } = await supabase
      .from("agent_responses")
      .select("*")
      .in(
        "round_id",
        (rounds || []).map((r) => r.id)
      );

    if (responsesError) {
      return { success: false, error: "Failed to fetch responses" };
    }

    // Check if we have an existing report
    let reportContent = "";
    const { data: existingReport } = await supabase
      .from("reports")
      .select("content")
      .eq("session_id", sessionId)
      .eq("report_type", reportType)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingReport?.content) {
      reportContent = existingReport.content;
    } else {
      // Generate new report
      const reportResult = await generateSessionReport(sessionId, reportType);
      if (!reportResult.success) {
        return { success: false, error: reportResult.error };
      }
      reportContent = reportResult.data?.content || "";
    }

    // Prepare report data
    const reportData: ReportData = {
      session,
      agents,
      rounds: rounds || [],
      responses: responses || [],
      reportContent,
    };

    // Generate PDF
    const pdfGenerator = new PDFReportGenerator({
      format: "a4",
      orientation: "portrait",
      includeHeader: true,
      includeFooter: true,
    });

    const pdfBlob = await pdfGenerator.generatePDF(reportData);
    const filename = PDFReportGenerator.generateFilename(session, reportType);

    return {
      success: true,
      data: {
        blob: pdfBlob,
        filename,
      },
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get existing reports for a session
 */
export async function getSessionReports(sessionId: string) {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch reports" };
    }

    return { success: true, data: reports || [] };
  } catch (error) {
    console.error("Error fetching reports:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string) {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to delete report" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
