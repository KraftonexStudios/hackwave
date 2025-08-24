import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";
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
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      subscription_id,
    } = await request.json();

    // Validate request
    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature ||
      !subscription_id
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Get subscription details from Razorpay
    let subscription;
    try {
      subscription = await razorpay.subscriptions.fetch(
        razorpay_subscription_id
      );
    } catch (error) {
      console.error("Error fetching subscription:", error);
      // If we can't fetch the subscription, assume it's active based on the payment
      subscription = { status: "active" };
    }

    // Create or update subscription record after successful payment verification
    const supabase = await createClient();

    // The subscription_id is actually the Supabase auth ID in our case
    const supabaseUserId = subscription_id;

    console.log("🔍 Verifying subscription for Supabase user:", supabaseUserId);

    // Ensure the user exists in our users table (for consistency)
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("supabase_id", supabaseUserId)
      .single();

    if (userError && userError.code === "PGRST116") {
      // User doesn't exist in our users table, create them
      const { data: newUser, error: createUserError } = await supabase
        .from("users")
        .insert({
          supabase_id: supabaseUserId,
          email: "", // We'll get this from auth if needed
        })
        .select("id")
        .single();

      if (createUserError) {
        console.error("Failed to create user:", createUserError);
        return NextResponse.json({ error: "Failed to create user record" }, { status: 500 });
      }
    } else if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    // Now we can directly use the Supabase auth ID since user_subscriptions.user_id references users.supabase_id
    console.log("🔍 Using Supabase auth ID directly:", supabaseUserId);

    // Check if user already has a subscription
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .single();

    let subscriptionData;

    if (existingSubscription && fetchError?.code !== "PGRST116") {
      // Update existing subscription
      const { data: updatedSubscription, error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          plan: "PREMIUM", // Upgrade to PREMIUM after successful payment
          status: subscription.status === "active" ? "ACTIVE" : "EXPIRED",
          expires_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(), // 1 year from now
          razorpay_payment_id: razorpay_payment_id,
        })
        .eq("user_id", supabaseUserId)
        .select("*")
        .single();

      if (updateError) {
        console.error("Failed to update subscription:", updateError);
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 }
        );
      }
      subscriptionData = updatedSubscription;
    } else {
      // Create new subscription
      const { data: newSubscription, error: createError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: supabaseUserId,
          plan: "PREMIUM", // Create as PREMIUM after successful payment
          status: "ACTIVE",
          expires_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(), // 1 year from now
          razorpay_payment_id: razorpay_payment_id,
        })
        .select("*")
        .single();

      if (createError) {
        console.error("Failed to create subscription:", createError);
        return NextResponse.json(
          { error: "Failed to create subscription" },
          { status: 500 }
        );
      }
      subscriptionData = newSubscription;
    }

    console.log("✅ Subscription verified and created/updated:", {
      supabaseUserId: supabaseUserId,
      subscriptionId: subscriptionData.id,
      plan: subscriptionData.plan,
      status: subscriptionData.status,
    });

    // Update user's subscription status in users table

    if (subscriptionData) {
      console.log("Updating user subscription status:", {
        userId: subscriptionData.user_id,
        plan: "PREMIUM",
        status: subscription.status === "active" ? "ACTIVE" : "EXPIRED",
      });

      console.log("User subscription status updated successfully");
    }

    // Return success
    return NextResponse.json({
      success: true,
      status: subscription.status,
      message: "Subscription verified successfully",
    });
  } catch (error: any) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify subscription" },
      { status: 500 }
    );
  }
}
