"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { SubscriptionPlan } from "./subscription-plans";
import Payment from "@/hooks/payment";
import { createClient } from "@/lib/supabase/client";

interface SubscriptionCheckoutProps {
  plan: SubscriptionPlan;
  onCancel: () => void;
}

export function SubscriptionCheckout({ plan, onCancel }: SubscriptionCheckoutProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");

  useEffect(() => {
    // Use NEXT_PUBLIC_RAZORPAY_KEY_ID from env
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (keyId) {
      setRazorpayKeyId(keyId);
    } else {
      console.warn("RAZORPAY_KEY_ID not set in env");
      toast("Razorpay Not Configured");
    }
  }, []);

  const handleSubscribe = async () => {
    setIsProcessing(true);

    try {
      // Get authenticated user from Supabase
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast("You must be logged in to subscribe");
        setIsProcessing(false);
        return;
      }

      // Create subscription order
      console.log("Creating subscription with:", {
        planId: plan.id,
        interval: plan.interval,
        amount: plan.price,
        userId: user.id,
      });

      const response = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          interval: plan.interval,
          amount: plan.price,
          userId: user.id,
        }),
      });

      const data = await response.json();
      console.log("Subscription API response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Subscription creation failed");
      }

      // Handle Razorpay checkout
      if (data.razorpaySubscription) {
        console.log("Initializing Razorpay with subscription:", data.razorpaySubscription);

        const options = {
          key: razorpayKeyId,
          subscription_id: data.razorpaySubscription.id,
          name: "HackWave AI",
          description: `${plan.name} Subscription`,
          amount: data.razorpaySubscription.amount,
          currency: data.razorpaySubscription.currency,
          handler: async function (response: any) {
            console.log("Razorpay payment response:", response);

            // Call your verify-subscription API
            const verifyRes = await fetch("/api/razorpay/verify-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                subscription_id: data.razorpaySubscription.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok) {
              toast("Subscription Activated Successfully!");
              router.push("/dashboard");
            } else {
              toast(verifyData.error || "Subscription verification failed");
            }

            setIsProcessing(false);
          },
          prefill: {
            name: user.user_metadata?.name || "",
            email: user.email,
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              toast("Subscription Process Cancelled");
            },
          },
        };

        // Check if Razorpay is loaded
        if (typeof window.Razorpay === "undefined") {
          console.error("Razorpay script not loaded");
          toast.error("Payment gateway not loaded. Please refresh the page.");
          setIsProcessing(false);
          return;
        }

        // Initialize Razorpay checkout
        try {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch (error) {
          console.error("Error initializing Razorpay:", error);
          toast.error("Failed to initialize payment gateway");
          setIsProcessing(false);
        }
        return;
      }
    } catch (error: any) {
      toast(error.message || "Subscription Failed");
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Payment />
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Confirm Subscription</CardTitle>
          <CardDescription>You're subscribing to the {plan.name} plan</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{plan.name}</span>
            </div>

            <div className="flex justify-between">
              <span>Billing:</span>
              <span className="font-medium">{plan.interval}</span>
            </div>

            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">
                ₹{plan.price}/{plan.interval}
              </span>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Plan Includes:</h4>
              <ul className="space-y-1 text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>

          <Button onClick={handleSubscribe} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm & Pay"
            )}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}

export default SubscriptionCheckout;
