"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Check,
  Crown,
  Star,
  Zap,
  Shield,
  CreditCard,
} from "lucide-react";

// Uncomment these imports - replace with your actual paths
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
// import Payment from "@/hooks/payment";

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

interface SubscriptionCheckoutProps {
  plan: SubscriptionPlan;
  onCancel: () => void;
}

export function SubscriptionCheckout({
  plan,
  onCancel,
}: SubscriptionCheckoutProps) {
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

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case "PREMIUM":
        return {
          gradient: "from-purple-500 to-pink-500",
          bg: "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
          border: "border-purple-500",
          text: "text-purple-700 dark:text-purple-300",
        };
      case "ENTERPRISE":
        return {
          gradient: "from-orange-500 to-red-500",
          bg: "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20",
          border: "border-orange-500",
          text: "text-orange-700 dark:text-orange-300",
        };
      default:
        return {
          gradient: "from-blue-500 to-cyan-500",
          bg: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
          border: "border-blue-500",
          text: "text-blue-700 dark:text-blue-300",
        };
    }
  };

  const handleSubscribe = async () => {
    console.log("🔥 handleSubscribe called");
    setIsProcessing(true);

    let userId = null; // Track user ID for cleanup

    try {
      // Get authenticated user from Supabase
      console.log("📡 Getting user from Supabase...");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("👤 User:", user);

      if (!user) {
        console.log("❌ No user found");
        toast.error("You must be logged in to subscribe");
        setIsProcessing(false);
        return;
      }

      // Store user ID for potential cleanup
      userId = user.id;

      // Create subscription order
      const subscriptionData = {
        planId: plan.id,
        interval: plan.interval,
        amount: plan.price,
        userId: user.id,
      };

      console.log("📋 Creating subscription with:", subscriptionData);

      const response = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionData),
      });

      console.log("📡 API Response status:", response.status);
      const data = await response.json();
      console.log("📋 Subscription API response:", data);

      if (!response.ok) {
        console.log("❌ API Error:", data.error);
        throw new Error(data.error || "Subscription creation failed");
      }

      // Handle Razorpay checkout
      if (data.razorpaySubscription) {
        console.log(
          "💳 Initializing Razorpay with subscription:",
          data.razorpaySubscription
        );

        const options = {
          key: razorpayKeyId,
          subscription_id: data.razorpaySubscription.id,
          name: "HackWave AI",
          description: `${plan.name} Subscription`,
          amount: data.razorpaySubscription.amount,
          currency: data.razorpaySubscription.currency,
          handler: async function (response: any) {
            console.log("🎉 Razorpay payment response:", response);

            // Call your verify-subscription API
            const verifyRes = await fetch("/api/razorpay/verify-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                subscription_id: data.razorpaySubscription.userId, // Use database userId from create-subscription response
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok) {
              toast.success("Subscription Activated Successfully!");
              window.location.href = "/dashboard";
            } else {
              console.log(
                "❌ Verification failed, cleaning up subscription..."
              );
              // Clean up failed subscription
              await cleanupFailedSubscription(userId);
              toast.error(
                verifyData.error || "Subscription verification failed"
              );
            }

            setIsProcessing(false);
          },
          prefill: {
            name: user.user_metadata?.name || "",
            email: user.email,
          },
          modal: {
            ondismiss: async () => {
              console.log(
                "❌ Payment cancelled by user, cleaning up subscription..."
              );
              // Clean up cancelled subscription
              await cleanupFailedSubscription(userId);
              setIsProcessing(false);
              toast.error("Subscription Process Cancelled");
            },
          },
        };

        // Check if Razorpay is loaded
        if (typeof window.Razorpay === "undefined") {
          console.error("❌ Razorpay script not loaded");
          await cleanupFailedSubscription(userId);
          toast.error("Payment gateway not loaded. Please refresh the page.");
          setIsProcessing(false);
          return;
        }

        // Initialize Razorpay checkout
        try {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch (error) {
          console.error("❌ Error initializing Razorpay:", error);
          await cleanupFailedSubscription(userId);
          toast.error("Failed to initialize payment gateway");
          setIsProcessing(false);
        }
        return;
      } else {
        console.log("❌ No razorpaySubscription in response");
        await cleanupFailedSubscription(userId);
        throw new Error("No subscription data received");
      }
    } catch (error: any) {
      console.error("❌ Subscription error:", error);
      // Clean up failed subscription
      await cleanupFailedSubscription(userId);
      toast.error(error.message || "Subscription Failed");
      setIsProcessing(false);
    }
  };

  // Helper function to cleanup failed/cancelled subscriptions by user ID
  const cleanupFailedSubscription = async (userId: string | null) => {
    if (!userId) {
      console.log("⚠️ No user ID to cleanup");
      return;
    }

    try {
      console.log(userId);

      const supabase = createClient();
      const { error } = await supabase
        .from("user_subscriptions")
        .delete()
        .eq("user_id", userId);
      console.log(error);

      if (error) throw error;
    } catch (error) {
      console.error("❌ Error during subscription cleanup:", error);
    }
  };

  const planColors = getPlanColor(plan.name);
  const isPremium = plan.name === "PREMIUM";
  const isEnterprise = plan.name === "ENTERPRISE";

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Add Payment component back */}
      {/* <Payment /> */}

      {/* Header Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Complete Your Subscription</h2>
        <p className="text-muted-foreground">
          You're just one step away from unlocking premium features
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan Summary Card */}
        <Card
          className={`${planColors.border} border-2 bg-gradient-to-br ${planColors.bg} shadow-xl`}
        >
          <CardHeader className="text-center">
            <div
              className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${planColors.gradient} text-white shadow-lg`}
            >
              {getPlanIcon(plan.name)}
            </div>
            <CardTitle className={`text-2xl ${planColors.text}`}>
              {plan.display_name}
            </CardTitle>
            <CardDescription className="text-3xl font-bold mt-2">
              <span className={planColors.text}>
                ₹{plan.price.toLocaleString()}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                /{plan.interval}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                What's Included:
              </h4>
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Check
                    className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      isPremium
                        ? "text-purple-500"
                        : isEnterprise
                        ? "text-orange-500"
                        : "text-blue-500"
                    }`}
                  />
                  <span className="text-sm leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Checkout Form */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Details</span>
            </CardTitle>
            <CardDescription>
              Secure payment powered by Razorpay
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm uppercase tracking-wide">
                Order Summary
              </h4>

              <div className="flex justify-between items-center">
                <span className="text-sm">Plan:</span>
                <span className="font-medium">{plan.display_name}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Billing Cycle:</span>
                <span className="font-medium capitalize">{plan.interval}</span>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-xl font-bold">
                    ₹{plan.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Your payment information is secure and encrypted</span>
            </div>

            {/* Terms */}
            <div className="text-xs text-muted-foreground">
              By confirming your subscription, you agree to our Terms of Service
              and Privacy Policy. Your subscription will automatically renew
              each {plan.interval} unless cancelled.
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className={`w-full h-12 font-semibold bg-gradient-to-r ${planColors.gradient} hover:opacity-90 text-white shadow-lg`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay ₹{plan.price.toLocaleString()} Securely
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full"
            >
              Back to Plans
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default SubscriptionCheckout;
