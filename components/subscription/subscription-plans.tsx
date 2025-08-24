"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Crown, Zap } from "lucide-react";

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
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptionPlans();
  }, []);

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case "PREMIUM":
        return <Crown className="h-6 w-6" />;
      case "ENTERPRISE":
        return <Zap className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  const getPlanBadge = (planName: string) => {
    switch (planName) {
      case "PREMIUM":
        return (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
              Most Popular
            </div>
          </div>
        );
      case "ENTERPRISE":
        return (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
              Best Value
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center gap-8 h-1/3 px-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse w-80 relative">
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
    <div className="flex justify-center items-center gap-8 px-4 py-8">
      {plans.map((plan) => {
        const isPremium = plan.name === "PREMIUM";
        const isEnterprise = plan.name === "ENTERPRISE";
        const isFree = plan.price === 0;

        return (
          <Card
            key={plan.id}
            className={`
              flex flex-col w-80 relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2
              ${
                isPremium
                  ? "border-2 border-purple-500 shadow-xl shadow-purple-500/20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20"
                  : isEnterprise
                  ? "border-2 border-orange-500 shadow-xl shadow-orange-500/20 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20"
                  : "border border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-900"
              }
            `}
          >
            {getPlanBadge(plan.name)}

            <CardHeader className="text-center pb-4">
              <div
                className={`
                flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full
                ${
                  isPremium
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : isEnterprise
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }
              `}
              >
                {getPlanIcon(plan.name)}
              </div>

              <CardTitle
                className={`text-2xl font-bold ${
                  isPremium
                    ? "text-purple-700 dark:text-purple-300"
                    : isEnterprise
                    ? "text-orange-700 dark:text-orange-300"
                    : ""
                }`}
              >
                {plan.display_name}
              </CardTitle>

              <CardDescription className="text-3xl font-bold mt-2">
                {isFree ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  <>
                    <span
                      className={
                        isPremium
                          ? "text-purple-600"
                          : isEnterprise
                          ? "text-orange-600"
                          : "text-gray-900 dark:text-white"
                      }
                    >
                      ₹{plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-grow px-6">
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check
                      className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                        isPremium ? "text-purple-500" : isEnterprise ? "text-orange-500" : "text-green-500"
                      }`}
                    />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="p-6 pt-0">
              <Button
                className={`
                  w-full h-12 font-semibold transition-all duration-300 transform hover:scale-105
                  ${
                    isPremium
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25"
                      : isEnterprise
                      ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25"
                      : "border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }
                `}
                variant={isPremium || isEnterprise ? "default" : "outline"}
                onClick={() => onSelectPlan(plan)}
                disabled={isFree}
              >
                {isFree ? "Current Plan" : `Choose ${plan.display_name}`}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
