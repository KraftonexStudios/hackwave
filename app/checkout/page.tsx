"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SubscriptionCheckout from "@/components/subscription/subscription-checkout";
import Payment from "@/hooks/payment";
// import { SubscriptionPlans } from "@/database.types";
import SubscriptionPlans from "@/components/subscription/subscription-plans";

const Checkout: React.FC = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const handleCancelCheckout = () => {
    setSelectedPlan(null);
  };

  return (
    <>
      <Payment />
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground mt-2">Choose a subscription plan to enhance your AI debate experience</p>
        </div>

        {selectedPlan ? (
          <SubscriptionCheckout plan={selectedPlan} onCancel={handleCancelCheckout} />
        ) : (
          <SubscriptionPlans onSelectPlan={handleSelectPlan} />
        )}
      </div>
    </>
  );
};

export default Checkout;
