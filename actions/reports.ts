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
