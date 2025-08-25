"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Mic,
  MicOff,
  Loader2,
  HelpCircle,
  Navigation as NavIcon,
  Database,
  Settings,
  Command,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import "@/app/style.css";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

// Type declarations for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface CommandPattern {
  patterns: RegExp[];
  action: string;
  parameters?: Record<string, any>;
  contextRequired?: boolean;
  confidence: number;
  category: "navigation" | "data" | "action" | "system";
  description: string;
}

// Define available routes and their metadata for Multi-Agent Project
const AVAILABLE_ROUTES = {
  "/": {
    path: "/",
    name: "Home",
    aliases: ["home", "main", "start", "homepage", "landing", "welcome"],
    description: "Main landing page with project overview",
  },
  "/dashboard": {
    path: "/dashboard",
    name: "Dashboard",
    aliases: [
      "dashboard",
      "main dashboard",
      "control panel",
      "overview",
      "main page",
      "control center",
      "main dashboard",
      "dashboard overview",
    ],
    description: "Main dashboard with session overview and analytics",
  },
  "/dashboard/agents": {
    path: "/dashboard/agents",
    name: "AI Agents",
    aliases: [
      "agents",
      "ai agents",
      "agents page",
      "manage agents",
      "create agents",
      "agent management",
      "ai agent management",
      "bot management",
      "bots",
      "my agents",
      "agent list",
      "agent dashboard",
    ],
    description: "Create, manage, and configure AI agents for debates",
  },
  "/dashboard/sessions": {
    path: "/dashboard/sessions",
    name: "Flow Sessions",
    aliases: [
      "sessions",
      "flow sessions",
      "debate sessions",
      "flows",
      "debates",
      "multi agent sessions",
      "agent sessions",
      "debate flows",
      "flow management",
      "session management",
      "active sessions",
      "my sessions",
      "debate management",
    ],
    description: "Manage and monitor multi-agent debate sessions and flows",
  },
  "/dashboard/analytics": {
    path: "/dashboard/analytics",
    name: "Analytics",
    aliases: [
      "analytics",
      "statistics",
      "reports",
      "insights",
      "data analysis",
      "performance metrics",
      "session analytics",
      "agent performance",
      "debate analytics",
      "flow analytics",
      "metrics",
      "charts",
      "graphs",
      "data visualization",
    ],
    description: "Analytics and insights from multi-agent sessions",
  },
} as const;

type AvailableRoute = keyof typeof AVAILABLE_ROUTES;

// Helper function to validate routes
const isValidRoute = (path: string): path is AvailableRoute => {
  return path in AVAILABLE_ROUTES;
};

const VoiceNavigation: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  const [lastCommand, setLastCommand] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { userType } = useAuth();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Add new state for visualization
  const [visualizerData, setVisualizerData] = useState<number[]>(
    Array(10).fill(0.2)
  );
  const visualizerInterval = useRef<NodeJS.Timeout | null>(null);

  const conversationHistory = useRef<string[]>([]);

  // Enhanced natural language processing patterns for Multi-Agent Project
  const nlpPatterns = useCallback(
    (): CommandPattern[] => [
      // Navigation patterns
      {
        patterns: [
          /(?:go|navigate|take me|show|open)?\s*(?:to|the)?\s*(?:main|home|front)?\s*dashboard/i,
          /(?:back|return)\s*(?:to)?\s*(?:the)?\s*(?:main|home|front)?\s*page/i,
          /(?:go|take me|navigate)\s*(?:to|the)?\s*(?:main)?\s*dashboard/i,
          /(?:show|open|display)\s*(?:the|my)?\s*dashboard/i,
        ],
        action: "navigate",
        parameters: { path: "/dashboard" },
        confidence: 0.95,
        category: "navigation",
        description: "navigate to the main dashboard",
      },
      {
        patterns: [
          /(?:go|navigate|take me|show|open)?\s*(?:to|the)?\s*(?:my)?\s*agents?/i,
          /(?:show|open|display|manage)\s*(?:my)?\s*(?:ai\s*)?agents?/i,
          /(?:go|take me|navigate)\s*(?:to|the)?\s*(?:agent|bot)\s*management/i,
          /(?:show|open)\s*(?:the|my)?\s*agent\s*dashboard/i,
          /(?:manage|create|view)\s*agents?/i,
        ],
        action: "navigate",
        parameters: { path: "/dashboard/agents" },
        confidence: 0.95,
        category: "navigation",
        description: "navigate to AI agents management",
      },
      {
        patterns: [
          /(?:go|navigate|take me|show|open)?\s*(?:to|the)?\s*(?:my)?\s*sessions?/i,
          /(?:show|open|display|manage)\s*(?:my)?\s*(?:flow\s*)?sessions?/i,
          /(?:go|take me|navigate)\s*(?:to|the)?\s*(?:debate|flow)\s*sessions?/i,
          /(?:show|open)\s*(?:the|my)?\s*flow\s*dashboard/i,
          /(?:manage|view|monitor)\s*(?:debate\s*)?sessions?/i,
          /(?:show|open)\s*(?:the|my)?\s*debates?/i,
        ],
        action: "navigate",
        parameters: { path: "/dashboard/sessions" },
        confidence: 0.95,
        category: "navigation",
        description: "navigate to flow sessions management",
      },
      {
        patterns: [
          /(?:go|navigate|take me|show|open)?\s*(?:to|the)?\s*(?:my)?\s*analytics/i,
          /(?:show|open|display|view)\s*(?:my)?\s*(?:analytics|statistics|reports)/i,
          /(?:go|take me|navigate)\s*(?:to|the)?\s*(?:performance|metrics|insights)/i,
          /(?:show|open)\s*(?:the|my)?\s*analytics\s*dashboard/i,
          /(?:view|see)\s*(?:performance|metrics|data)/i,
        ],
        action: "navigate",
        parameters: { path: "/dashboard/analytics" },
        confidence: 0.95,
        category: "navigation",
        description: "navigate to analytics and insights",
      },
      {
        patterns: [
          /(?:go|navigate|take me|show|open)?\s*(?:to|the)?\s*(?:main|home|landing)/i,
          /(?:back|return)\s*(?:to)?\s*(?:the)?\s*(?:home|landing)\s*page/i,
          /(?:go|take me|navigate)\s*(?:to|the)?\s*(?:home|landing)/i,
          /(?:show|open|display)\s*(?:the|my)?\s*home\s*page/i,
        ],
        action: "navigate",
        parameters: { path: "/" },
        confidence: 0.95,
        category: "navigation",
        description: "navigate to the home page",
      },
      // Multi-Agent specific patterns
      {
        patterns: [
          /(?:create|make|build|add)\s*(?:a\s*)?(?:new\s*)?(?:ai\s*)?agent/i,
          /(?:start|begin|initiate)\s*(?:creating|building)\s*(?:an\s*)?(?:ai\s*)?agent/i,
          /(?:new|fresh)\s*(?:ai\s*)?agent/i,
        ],
        action: "navigate",
        parameters: { path: "/dashboard/agents", action: "create" },
        confidence: 0.9,
        category: "action",
        description: "create a new AI agent",
      },
      {
        patterns: [
          /(?:start|begin|create|initiate)\s*(?:a\s*)?(?:new\s*)?(?:debate|flow|session)/i,
          /(?:new|fresh)\s*(?:debate|flow|session)/i,
          /(?:start|begin)\s*(?:multi\s*)?(?:agent\s*)?(?:debate|flow)/i,
        ],
        action: "navigate",
        parameters: { path: "/dashboard/sessions", action: "create" },
        confidence: 0.9,
        category: "action",
        description: "start a new debate session",
      },
      {
        patterns: [
          /(?:show|display|view|see)\s*(?:my)?\s*(?:active|running|current)\s*(?:sessions?|debates?|flows?)/i,
          /(?:what|which)\s*(?:sessions?|debates?|flows?)\s*(?:are|is)\s*(?:active|running|current)/i,
          /(?:list|show)\s*(?:active|running)\s*(?:sessions?|debates?)/i,
        ],
        action: "navigate",
        parameters: { path: "/dashboard/sessions", filter: "active" },
        confidence: 0.9,
        category: "action",
        description: "show active sessions",
      },
      // System commands
      {
        patterns: [
          /(?:show|tell me|what are|list)\s*(?:the|available)?\s*commands?/i,
          /(?:what|how)\s*(?:can I|should I)\s*(?:say|do|ask)/i,
          /help(?:\s*me)?/i,
          /(?:what|how)\s*(?:do I|can I)\s*(?:use|control)\s*(?:this|voice|navigation)/i,
        ],
        action: "system",
        parameters: { command: "help" },
        confidence: 0.95,
        category: "system",
        description: "show available commands",
      },
      {
        patterns: [
          /(?:go|take me|navigate)\s*back/i,
          /(?:return|back)\s*(?:to)?\s*(?:the)?\s*(?:previous|last)\s*page/i,
          /(?:go|navigate)\s*(?:to\s*the\s*)?previous\s*page/i,
        ],
        action: "system",
        parameters: { command: "back" },
        confidence: 0.95,
        category: "system",
        description: "go back to the previous page",
      },
      {
        patterns: [
          /(?:go|take me|navigate)\s*(?:to\s*the\s*)?home/i,
          /(?:return|back)\s*(?:to)?\s*(?:the)?\s*home\s*page/i,
          /(?:take\s*me\s*)?home/i,
        ],
        action: "system",
        parameters: { command: "home" },
        confidence: 0.95,
        category: "system",
        description: "go to the home page",
      },
    ],
    []
  );

  const getPageDescription = (path: string): string => {
    if (isValidRoute(path)) {
      return AVAILABLE_ROUTES[path].name;
    }
    return "the requested page";
  };

  // Helper function to close voice navigation
  const closeVoiceNavigation = () => {
    setTimeout(() => {
      setIsOpen(false);
      setTranscript("");
      setFeedback("");
      setIsListening(false);
      if (visualizerInterval.current) {
        clearInterval(visualizerInterval.current);
        setVisualizerData(Array(10).fill(0.2));
      }
    }, 1500);
  };

  // Helper function to safely reset recognition state
  const resetRecognitionState = () => {
    setIsListening(false);
    setIsOpen(false);
    setTranscript("");
    setFeedback("");
    if (visualizerInterval.current) {
      clearInterval(visualizerInterval.current);
      setVisualizerData(Array(10).fill(0.2));
    }
  };

  const processCommand = async (command: string) => {
    setIsProcessing(true);
    setFeedback("Processing your command...");

    try {
      const userContext = {
        userType,
        timeOfDay: new Date().getHours(),
        previousCommands: conversationHistory.current.slice(-3),
        currentPath: pathname,
        availableRoutes: Object.keys(AVAILABLE_ROUTES),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/voice/process-command`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command, userContext }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process command");
      }

      const result = await response.json();

      if (result.confidence > 0.3) {
        setFeedback(result.response);

        // Handle navigation with route validation and success toast
        if (result.intent === "navigation" && result.targetPath) {
          if (!isValidRoute(result.targetPath)) {
            const availableRoutes = Object.values(AVAILABLE_ROUTES)
              .map((route) => route.name.toLowerCase())
              .join(", ");

            setFeedback(
              `I'm sorry, that page is not available. Available pages are: ${availableRoutes}`
            );
            toast({
              title: "Navigation Error",
              description:
                "The requested page is not available in this application.",
              variant: "destructive",
            });
            return;
          }

          if (result.targetPath !== pathname) {
            router.push(result.targetPath);
            const pageName = getPageDescription(result.targetPath);
            setFeedback(`Navigating to ${pageName}`);
            toast({
              title: "Navigation Successful",
              description: `Navigated to ${pageName}`,
              variant: "default",
            });
            // Close the voice navigation after successful navigation
            closeVoiceNavigation();
          } else {
            setFeedback(
              `You are already on the ${getPageDescription(
                result.targetPath
              )} page`
            );
          }
        }

        // Handle view/tab switching
        if (result.intent === "action") {
          switch (result.action) {
            case "switchTab":
              window.dispatchEvent(
                new CustomEvent("switchGoogleFitTab", {
                  detail: result.parameters.tab,
                })
              );
              break;
            case "refresh":
              window.location.reload();
              break;
            case "toggleView":
              if (result.parameters.view) {
                window.dispatchEvent(
                  new CustomEvent("switchGoogleFitTab", {
                    detail: result.parameters.view,
                  })
                );
              }
              break;
            case "navigate":
              // If action is navigate, close after navigation
              if (result.targetPath && result.targetPath !== pathname) {
                closeVoiceNavigation();
              }
              break;
          }
        }

        // Handle system commands
        if (result.intent === "system") {
          switch (result.action) {
            case "help":
              setShowHelp(true);
              break;
            case "back":
              router.back();
              // Close after navigation
              closeVoiceNavigation();
              break;
            case "home":
              router.push("/");
              // Close after navigation
              closeVoiceNavigation();
              break;
          }
        }

        // Update conversation history
        conversationHistory.current = [
          ...conversationHistory.current.slice(-5),
          command,
        ];
      } else {
        setFeedback(
          "I'm not quite sure what you want to do. Could you be more specific?"
        );
        toast({
          title: "Need More Information",
          description:
            "Please try being more specific about what you'd like to do",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error processing command:", error);

      let errorMessage = "An error occurred while processing your request.";
      if (error.message) {
        errorMessage = error.message;
      }

      setFeedback(`Sorry, I couldn't process that command. ${errorMessage}`);

      toast({
        title: "Error Processing Command",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecognitionError = (error: string) => {
    console.log("Recognition error:", error);

    // Don't show error for intentional stops
    if (error === "aborted" || error === "no-speech") {
      setIsListening(false);
      setFeedback("");
      return;
    }

    setIsListening(false);
    let errorMessage = "An error occurred. Please try again.";

    switch (error) {
      case "network":
        errorMessage = "Network error. Please check your connection.";
        break;
      case "audio-capture":
        errorMessage = "No microphone detected.";
        break;
      case "not-allowed":
        errorMessage = "Microphone access denied.";
        break;
      case "service-not-allowed":
        errorMessage = "Speech recognition service is not available.";
        break;
      case "bad-grammar":
      case "language-not-supported":
        errorMessage = "Language not supported.";
        break;
    }

    setFeedback(errorMessage);
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  // Modify button handlers for click instead of hold
  const handleButtonClick = () => {
    // Safety check: ensure recognition is available
    if (!recognitionRef.current) {
      console.error("Speech recognition not initialized");
      toast({
        title: "Error",
        description: "Voice navigation is not available",
        variant: "destructive",
      });
      return;
    }

    if (!isListening) {
      // Check if recognition is actually not running
      try {
        // Reset any previous state
        setTranscript("");
        setFeedback("");
        setIsProcessing(false);
        setIsOpen(true);

        // Start recognition with error handling
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start recognition:", error);
        if (error.name === "InvalidStateError") {
          // Recognition is already running, reset state
          setIsListening(true);
          setIsOpen(true);
        } else {
          handleRecognitionError("service-not-allowed");
        }
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      } finally {
        setIsOpen(false);
        setTranscript("");
        setFeedback("");
        setIsListening(false);
        if (visualizerInterval.current) {
          clearInterval(visualizerInterval.current);
          setVisualizerData(Array(10).fill(0.2));
        }
      }
    }
  };

  // Initialize speech recognition with visualization
  const initializeSpeechRecognition = useCallback(() => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        throw new Error("Speech recognition is not supported");
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Changed to false to prevent conflicts
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setFeedback("Listening... Hold the mic button and speak");
        // Start voice visualizer
        if (visualizerInterval.current)
          clearInterval(visualizerInterval.current);
        visualizerInterval.current = setInterval(() => {
          setVisualizerData((prev) =>
            prev.map(() => Math.random() * 0.8 + 0.2)
          );
        }, 100);
      };

      recognition.onend = () => {
        // Always reset the listening state when recognition ends
        setIsListening(false);
        // Stop voice visualizer
        if (visualizerInterval.current) {
          clearInterval(visualizerInterval.current);
          setVisualizerData(Array(10).fill(0.2));
        }
      };

      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        setTranscript(command);
        if (event.results[last].isFinal) {
          setLastCommand(command);
          processCommand(command);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        handleRecognitionError(event.error);
      };

      recognitionRef.current = recognition;
      setIsSupported(true);
    } catch (error) {
      console.error("Speech recognition initialization error:", error);
      setIsSupported(false);
      toast({
        title: "Not Supported",
        description: "Voice navigation is not supported in your browser.",
        variant: "destructive",
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visualizerInterval.current) {
        clearInterval(visualizerInterval.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [initializeSpeechRecognition]);

  if (isSupported === false) return null;

  const groupedCommands = nlpPatterns().reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandPattern[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "navigation":
        return <NavIcon className="h-4 w-4" />;
      case "data":
        return <Database className="h-4 w-4" />;
      case "action":
        return <Command className="h-4 w-4" />;
      case "system":
        return <Settings className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-28 md:bottom-6 right-6 z-50">
      {isOpen && (
        <Card className="mb-4 p-4 w-[400px] bg-background/95 backdrop-blur-lg border border-border shadow-lg relative animate-in slide-in-from-bottom-2 duration-300">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-lg pointer-events-none"></div>

          <div className="space-y-4">
            {/* Voice Visualizer */}
            {isListening && (
              <div className="flex items-center justify-center gap-1 h-8">
                {visualizerData.map((height, index) => (
                  <div
                    key={index}
                    className="w-1 bg-primary rounded-full animate-wave"
                    style={{
                      height: `${height * 32}px`,
                      animationDelay: `${index * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {showHelp ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-primary font-medium flex items-center gap-2">
                  <Command className="h-5 w-5" />
                  Available Commands
                </h3>
                {Object.entries(groupedCommands).map(([category, cmds]) => (
                  <div
                    key={category}
                    className="space-y-2 bg-muted/50 rounded-lg p-3"
                  >
                    <h4 className="text-sm font-medium text-primary capitalize flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category}
                    </h4>
                    <ul className="space-y-1 text-gray-400 text-sm">
                      {cmds.map((cmd, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          • {cmd.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="text-primary text-sm mt-2 w-full hover:bg-primary/10"
                  onClick={() => setShowHelp(false)}
                >
                  Close Help
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div className="text-primary text-sm font-medium">
                    {transcript && (
                      <div className="animate-in fade-in duration-200 flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        You said: "{transcript}"
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-primary"
                    onClick={() => setShowHelp(true)}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-gray-400 text-sm min-h-[20px] flex items-center gap-2">
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {feedback}
                </div>

                {lastCommand && (
                  <div className="text-xs text-gray-500 flex items-center gap-2 animate-in fade-in duration-200">
                    <Command className="h-3 w-3" />
                    Last command: "{lastCommand}"
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      <div className="relative">
        <Button
          onClick={handleButtonClick}
          className={`
            relative rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300
            ${
              isListening
                ? "bg-primary text-primary-foreground animate-pulse shadow-lg"
                : "bg-background text-primary hover:bg-accent hover:scale-105 border border-border transition-all"
            }
          `}
        >
          {isListening ? (
            <MicOff className="h-6 w-6 animate-pulse" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default VoiceNavigation;
