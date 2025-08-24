import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type {
  Agent,
  Session,
  Round,
  Feedback,
  Report,
  SessionAgents,
  Responce as AgentResponse,
  ValidationResult as ValidationResult,
} from "@/database.types";

export interface FlowNode {
  id: string;
  type:
    | "agent"
    | "distributor"
    | "validator"
    | "user"
    | "chart-agent"
    | "proscons-agent"
    | "global-visualizer";
  position: { x: number; y: number };
  data: {
    label: string;
    status: "idle" | "processing" | "completed" | "error";
    agentId?: string;
    responseId?: string;
    // Chart agent specific data
    chartData?: {
      query?: string;
      chartType?:
        | "bar"
        | "line"
        | "pie"
        | "mermaid"
        | "d3-network"
        | "plotly"
        | "flowchart"
        | "mindmap";
      data?: Array<{ name: string; value: number; [key: string]: any }>;
      mermaidCode?: string;
      plotlyConfig?: any;
      networkData?: {
        nodes: Array<{ id: string; name: string; group: number }>;
        links: Array<{ source: string; target: string; value: number }>;
      };
      title?: string;
      description?: string;
      timestamp?: string;
      processingTime?: number;
    };
    // Pros/Cons agent specific data
    prosConsData?: {
      query?: string;
      question?: string;
      pros?: Array<{ point: string; weight?: number; category?: string }>;
      cons?: Array<{ point: string; weight?: number; category?: string }>;
      summary?: string;
      recommendation?: string;
      timestamp?: string;
      processingTime?: number;
      totalPros?: number;
      totalCons?: number;
    };
    // Global visualizer specific data
    visualizerData?: {
      query?: string;
      visualizationType?:
        | "auto"
        | "chart"
        | "diagram"
        | "network"
        | "flow"
        | "mindmap";
      chartType?:
        | "bar"
        | "line"
        | "pie"
        | "mermaid"
        | "d3-network"
        | "plotly"
        | "flowchart"
        | "mindmap";
      data?: any[];
      mermaidCode?: string;
      plotlyConfig?: any;
      networkData?: {
        nodes: Array<{ id: string; name: string; group: number }>;
        links: Array<{ source: string; target: string; value: number }>;
      };
      title?: string;
      description?: string;
      isLoading?: boolean;
      error?: string;
      timestamp?: string;
      processingTime?: number;
    };
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: "default" | "smoothstep";
  animated?: boolean;
  data?: {
    label?: string;
  };
}

export interface FlowState {
  // Core entities
  agents: Agent[];
  sessions: Session[];
  currentSession: Session | null;
  rounds: Round[];
  responses: AgentResponse[];
  feedbacks: Feedback[];
  reports: Report[];
  validationResults: ValidationResult[];
  sessionAgents: SessionAgents[];

  // UI state
  isLoading: boolean;
  error: string | null;
  selectedAgents: string[];
  currentRound: number;

  // Flow visualization
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];

  // Real-time updates
  streamingResponse: string;
  processingAgents: string[];
}

export interface FlowActions {
  // Agent management
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;

  // Session management
  setSessions: (sessions: Session[]) => void;
  setCurrentSession: (session: Session | null) => void;
  createSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;

  // Round management
  setRounds: (rounds: Round[]) => void;
  addRound: (round: Round) => void;
  updateRound: (id: string, updates: Partial<Round>) => void;
  setCurrentRound: (round: number) => void;

  // Response management
  setResponses: (responses: AgentResponse[]) => void;
  addResponse: (response: AgentResponse) => void;
  updateResponse: (id: string, updates: Partial<AgentResponse>) => void;

  // Feedback management
  setFeedbacks: (feedbacks: Feedback[]) => void;
  addFeedback: (feedback: Feedback) => void;

  // Report management
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;

  // Validation management
  setValidationResults: (results: ValidationResult[]) => void;
  addValidationResult: (result: ValidationResult) => void;

  // Session agents management
  setSessionAgents: (sessionAgents: SessionAgents[]) => void;
  addSessionAgent: (sessionAgent: SessionAgents) => void;
  removeSessionAgent: (id: string) => void;

  // Agent selection
  setSelectedAgents: (agentIds: string[]) => void;
  toggleAgentSelection: (agentId: string) => void;
  clearAgentSelection: () => void;

  // Flow visualization
  setFlowNodes: (nodes: FlowNode[]) => void;
  setFlowEdges: (edges: FlowEdge[]) => void;
  updateFlowNode: (id: string, updates: Partial<FlowNode>) => void;
  addFlowNode: (node: FlowNode) => void;
  addFlowEdge: (edge: FlowEdge) => void;

  // Chart agent specific actions
  updateChartAgentData: (
    nodeId: string,
    chartData: Partial<FlowNode["data"]["chartData"]>
  ) => void;
  setChartAgentLoading: (nodeId: string, isLoading: boolean) => void;
  setChartAgentError: (nodeId: string, error: string) => void;

  // Pros/Cons agent specific actions
  updateProsConsAgentData: (
    nodeId: string,
    prosConsData: Partial<FlowNode["data"]["prosConsData"]>
  ) => void;
  setProsConsAgentLoading: (nodeId: string, isLoading: boolean) => void;
  setProsConsAgentError: (nodeId: string, error: string) => void;

  // Real-time updates
  setStreamingResponse: (response: string) => void;
  appendStreamingResponse: (chunk: string) => void;
  clearStreamingResponse: () => void;
  setProcessingAgents: (agentIds: string[]) => void;
  addProcessingAgent: (agentId: string) => void;
  removeProcessingAgent: (agentId: string) => void;

  // UI state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Utility actions
  reset: () => void;
  resetSession: () => void;
}

type FlowStore = FlowState & FlowActions;

const initialState: FlowState = {
  agents: [],
  sessions: [],
  currentSession: null,
  rounds: [],
  responses: [],
  feedbacks: [],
  reports: [],
  validationResults: [],
  sessionAgents: [],
  isLoading: false,
  error: null,
  selectedAgents: [],
  currentRound: 0,
  flowNodes: [],
  flowEdges: [],
  streamingResponse: "",
  processingAgents: [],
};

export const useFlowStore = create<FlowStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Agent management
      setAgents: (agents) => set({ agents }),
      addAgent: (agent) =>
        set((state) => ({ agents: [...state.agents, agent] })),
      updateAgent: (id, updates) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === id ? { ...agent, ...updates } : agent
          ),
        })),
      removeAgent: (id) =>
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== id),
          selectedAgents: state.selectedAgents.filter(
            (agentId) => agentId !== id
          ),
        })),

      // Session management
      setSessions: (sessions) => set({ sessions }),
      setCurrentSession: (session) => set({ currentSession: session }),
      createSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSession: session,
        })),
      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, ...updates } : session
          ),
          currentSession:
            state.currentSession?.id === id
              ? { ...state.currentSession, ...updates }
              : state.currentSession,
        })),

      // Round management
      setRounds: (rounds) => set({ rounds }),
      addRound: (round) =>
        set((state) => ({ rounds: [...state.rounds, round] })),
      updateRound: (id, updates) =>
        set((state) => ({
          rounds: state.rounds.map((round) =>
            round.id === id ? { ...round, ...updates } : round
          ),
        })),
      setCurrentRound: (round) => set({ currentRound: round }),

      // Response management
      setResponses: (responses) => set({ responses }),
      addResponse: (response) =>
        set((state) => ({ responses: [...state.responses, response] })),
      updateResponse: (id, updates) =>
        set((state) => ({
          responses: state.responses.map((response) =>
            response.id === id ? { ...response, ...updates } : response
          ),
        })),

      // Feedback management
      setFeedbacks: (feedbacks) => set({ feedbacks }),
      addFeedback: (feedback) =>
        set((state) => ({ feedbacks: [...state.feedbacks, feedback] })),

      // Report management
      setReports: (reports) => set({ reports }),
      addReport: (report) =>
        set((state) => ({ reports: [...state.reports, report] })),

      // Validation management
      setValidationResults: (results) => set({ validationResults: results }),
      addValidationResult: (result) =>
        set((state) => ({
          validationResults: [...state.validationResults, result],
        })),

      // Session agents management
      setSessionAgents: (sessionAgents) => set({ sessionAgents }),
      addSessionAgent: (sessionAgent) =>
        set((state) => ({
          sessionAgents: [...state.sessionAgents, sessionAgent],
        })),
      removeSessionAgent: (id) =>
        set((state) => ({
          sessionAgents: state.sessionAgents.filter((sa) => sa.id !== id),
        })),

      // Agent selection
      setSelectedAgents: (agentIds) => set({ selectedAgents: agentIds }),
      toggleAgentSelection: (agentId) =>
        set((state) => ({
          selectedAgents: state.selectedAgents.includes(agentId)
            ? state.selectedAgents.filter((id) => id !== agentId)
            : [...state.selectedAgents, agentId],
        })),
      clearAgentSelection: () => set({ selectedAgents: [] }),

      // Flow visualization
      setFlowNodes: (nodes) => set({ flowNodes: nodes }),
      setFlowEdges: (edges) => set({ flowEdges: edges }),
      updateFlowNode: (id, updates) =>
        set((state) => ({
          flowNodes: state.flowNodes.map((node) =>
            node.id === id ? { ...node, ...updates } : node
          ),
        })),
      addFlowNode: (node) =>
        set((state) => ({ flowNodes: [...state.flowNodes, node] })),
      addFlowEdge: (edge) =>
        set((state) => ({ flowEdges: [...state.flowEdges, edge] })),

      // Chart agent specific actions
      updateChartAgentData: (nodeId, chartData) =>
        set((state) => ({
          flowNodes: state.flowNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    chartData: { ...node.data.chartData, ...chartData },
                    status: "completed",
                  },
                }
              : node
          ),
        })),
      setChartAgentLoading: (nodeId, isLoading) =>
        set((state) => ({
          flowNodes: state.flowNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: isLoading ? "processing" : "idle",
                    chartData: {
                      ...node.data.chartData,
                      isLoading,
                    },
                  },
                }
              : node
          ),
        })),
      setChartAgentError: (nodeId, error) =>
        set((state) => ({
          flowNodes: state.flowNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: "error",
                    chartData: {
                      ...node.data.chartData,
                      error,
                      isLoading: false,
                    },
                  },
                }
              : node
          ),
        })),

      // Pros/Cons agent specific actions
      updateProsConsAgentData: (nodeId, prosConsData) =>
        set((state) => ({
          flowNodes: state.flowNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    prosConsData: {
                      ...node.data.prosConsData,
                      ...prosConsData,
                    },
                    status: "completed",
                  },
                }
              : node
          ),
        })),
      setProsConsAgentLoading: (nodeId, isLoading) =>
        set((state) => ({
          flowNodes: state.flowNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: isLoading ? "processing" : "idle",
                    prosConsData: {
                      ...node.data.prosConsData,
                      isLoading,
                    },
                  },
                }
              : node
          ),
        })),
      setProsConsAgentError: (nodeId, error) =>
        set((state) => ({
          flowNodes: state.flowNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: "error",
                    prosConsData: {
                      ...node.data.prosConsData,
                      error,
                      isLoading: false,
                    },
                  },
                }
              : node
          ),
        })),

      // Real-time updates
      setStreamingResponse: (response) => set({ streamingResponse: response }),
      appendStreamingResponse: (chunk) =>
        set((state) => ({
          streamingResponse: state.streamingResponse + chunk,
        })),
      clearStreamingResponse: () => set({ streamingResponse: "" }),
      setProcessingAgents: (agentIds) => set({ processingAgents: agentIds }),
      addProcessingAgent: (agentId) =>
        set((state) => ({
          processingAgents: state.processingAgents.includes(agentId)
            ? state.processingAgents
            : [...state.processingAgents, agentId],
        })),
      removeProcessingAgent: (agentId) =>
        set((state) => ({
          processingAgents: state.processingAgents.filter(
            (id) => id !== agentId
          ),
        })),

      // UI state
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Utility actions
      reset: () => set(initialState),
      resetSession: () =>
        set({
          currentSession: null,
          rounds: [],
          responses: [],
          feedbacks: [],
          sessionAgents: [],
          currentRound: 0,
          flowNodes: [],
          flowEdges: [],
          streamingResponse: "",
          processingAgents: [],
          selectedAgents: [],
        }),
    })),
    {
      name: "flow-store",
    }
  )
);

// Selectors for computed values
export const useCurrentSessionRounds = () =>
  useFlowStore((state) =>
    state.rounds.filter(
      (round) => round.session_id === state.currentSession?.id
    )
  );

export const useCurrentSessionResponses = () =>
  useFlowStore((state) => {
    const currentRounds = state.rounds.filter(
      (round) => round.session_id === state.currentSession?.id
    );
    const roundIds = currentRounds.map((round) => round.id);
    return state.responses.filter((response) =>
      roundIds.includes(response.round_id)
    );
  });

export const useAgentsByIds = (agentIds: string[]) =>
  useFlowStore((state) =>
    state.agents.filter((agent) => agentIds.includes(agent.id))
  );

export const useCurrentSessionAgents = () =>
  useFlowStore((state) => {
    if (!state.currentSession) return [];
    const sessionAgentIds = state.sessionAgents
      .filter((sa) => sa.session_id === state.currentSession!.id)
      .map((sa) => sa.agent_id);
    return state.agents.filter((agent) => sessionAgentIds.includes(agent.id));
  });
