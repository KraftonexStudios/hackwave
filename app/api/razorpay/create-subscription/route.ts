import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    });

    // Validate credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured" },
        { status: 500 }
      );
    }

    // Get request body
    const { planId, interval, amount, userId } = await request.json();

    console.log("Creating subscription with request data:", {
      planId,
      interval,
      amount,
      userId,
    });

    // Validate request
    if (!planId || !interval || !amount || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a Razorpay subscription plan
    const plan = await razorpay.plans.create({
      period: interval, // Valid values: daily, weekly, monthly, quarterly, yearly
      interval: 1,
      item: {
        name: `${planId} Plan`,
        amount: amount * 100, // Convert to paise
        currency: "INR",
        description: `${planId} Subscription Plan`,
      },
    });

    // Create a Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.id,
      customer_notify: 1,
      total_count: 12, // Number of billing cycles (12 for yearly, can be adjusted)
      notes: {
        userId: userId,
        planId: planId,
      },
    });

    console.log("Subscription amount:", amount);

    // Calculate expiration date based on interval
    const getExpirationDate = (interval: string): Date => {
      const now = new Date();
      switch (interval.toLowerCase()) {
        case "monthly":
          return new Date(now.setMonth(now.getMonth() + 1));
        case "quarterly":
          return new Date(now.setMonth(now.getMonth() + 3));
        case "yearly":
          return new Date(now.setFullYear(now.getFullYear() + 1));
        default:
          return new Date(now.setFullYear(now.getFullYear() + 1)); // Default to 1 year
      }
    };

    // Store subscription in database with proper field mapping
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userEmail = authData.user.email;

    // Check if user exists in public.users by email
    let { data: userRecord, error: fetchUserError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (fetchUserError && fetchUserError.code === "PGRST116") {
      // No user found, create a new one
      const { data: insertedUser, error: insertUserError } = await supabase
        .from("users")
        .insert({
          email: userEmail,
          supabase_id: authData.user.id,
          name: authData.user.user_metadata?.full_name || null,
        })
        .select("*")
        .single();

      if (insertUserError) {
        console.error("Failed to insert user:", insertUserError);
        return NextResponse.json(
          { error: "Failed to create user record" },
          { status: 500 }
        );
      }

      userRecord = insertedUser;
    }

    if (!userRecord) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 500 }
      );
    }

    // ✅ Use userRecord.id for foreign key

    // Don't create subscription record yet - wait for payment verification
    // Just store the Razorpay subscription ID for later verification

    console.log("💳 Subscription creation - storing for verification:", {
      userId: userRecord.id,
      razorpaySubscriptionId: subscription.id,
      planType: "PREMIUM",
      interval: interval,
    });

    console.log("✅ Subscription prepared for verification:", {
      razorpaySubscriptionId: subscription.id,
      userId: userRecord.id,
      plan: "FREE (pending payment verification)",
    });

    // Return the subscription details
    return NextResponse.json({
      success: true,
      razorpaySubscription: {
        id: subscription.id,
        planId: "PREMIUM",
        amount: amount * 100, // in paise
        currency: "INR",
        status: subscription.status,
        userId: userRecord.id, // Send userId for verification
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Razorpay subscription error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create subscription",
        details: error.description || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
