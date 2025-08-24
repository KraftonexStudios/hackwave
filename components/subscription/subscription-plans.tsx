"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price: number;
  interval: string;
  features: string[];
  max_agents: number;
  max_custom_agents: number;
}

interface SubscriptionPlansProps {
  onSelectPlan: (plan: SubscriptionPlan) => void;
}

export default function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscriptionPlans() {
      try {
        setLoading(true);

        const response = await fetch("/api/subscription-plans");

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch subscription plans");
        }

        const data = await response.json();

        // Transform the data to include features
        const transformedPlans = data.map((plan: any) => ({
          ...plan,
          interval: "monthly", // Valid Razorpay period value
          features: [
            `Up to ${plan.max_agents} AI agents`,
            `${plan.max_custom_agents} custom agents`,
            "Advanced analytics",
            "Priority support",
            plan.name === "PREMIUM" ? "Unlimited sessions" : "Limited sessions",
          ],
        }));

        setPlans(transformedPlans);
      } catch (err: any) {
        console.error("Error fetching subscription plans:", err);
        setError(err.message);
        toast.error("Failed to load subscription plans");
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptionPlans();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-32 bg-muted/20"></CardHeader>
            <CardContent className="h-48 bg-muted/10"></CardContent>
            <CardFooter className="h-16 bg-muted/20"></CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-semibold text-red-500">Failed to load subscription plans</h3>
        <p className="text-muted-foreground mt-2">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className={`flex flex-col ${plan.name === "PREMIUM" ? "border-primary" : ""}`}>
          <CardHeader>
            <CardTitle>{plan.display_name}</CardTitle>
            <CardDescription>
              ₹{plan.price}/{plan.interval}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant={plan.name === "PREMIUM" ? "default" : "outline"}
              onClick={() => onSelectPlan(plan)}
              disabled={plan.price === 0}
            >
              {plan.price === 0 ? "Free" : "Select Plan"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
