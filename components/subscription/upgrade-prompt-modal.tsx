"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Crown,
  Users,
  Zap,
  BarChart3,
  Headphones,
  Infinity,
  X,
} from "lucide-react";

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgentCount: number;
  agentLimit: number;
}

export function UpgradePromptModal({
  isOpen,
  onClose,
  currentAgentCount,
  agentLimit,
}: UpgradePromptModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/checkout");
    onClose();
  };

  const proFeatures = [
    {
      icon: <Infinity className="h-5 w-5 text-blue-500" />,
      title: "Unlimited AI Agents",
      description: "Create as many agents as you need for complex debates",
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      title: "Advanced AI Models",
      description: "Access to premium AI models with better reasoning",
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-green-500" />,
      title: "Advanced Analytics",
      description: "Detailed insights and performance metrics",
    },
    {
      icon: <Headphones className="h-5 w-5 text-purple-500" />,
      title: "Priority Support",
      description: "Get help faster with dedicated support",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <DialogTitle className="text-xl font-bold">
                Upgrade to Pro
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-base">
            You've reached your agent limit ({currentAgentCount}/{agentLimit}).
            Upgrade to Pro for unlimited agents and premium features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    Current Plan: Free
                  </span>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {currentAgentCount}/{agentLimit} Agents
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pro Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span>Pro Plan Benefits</span>
            </h3>
            <div className="grid gap-3">
              {proFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-shrink-0 mt-0.5">{feature.icon}</div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardContent className="p-4 text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ₹999
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Cancel anytime • 7-day free trial
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradePromptModal;