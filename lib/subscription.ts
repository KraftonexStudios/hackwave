"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/database.types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];
type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export interface UserSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expires_at: string;
  created_at: string;
}

export interface SubscriptionInfo {
  isActive: boolean;
  isPremium: boolean;
  plan: SubscriptionPlan;
  status: SubscriptionStatus | null;
  expiresAt: string | null;
  agentLimit: number;
}

/**
 * Get user's subscription information
 */
export async function getUserSubscription(
  userId?: string
): Promise<SubscriptionInfo> {
  try {
    const supabase = await createClient();

    let targetUserId = userId;

    // If no userId provided, get current user
    if (!targetUserId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          isActive: false,
          isPremium: false,
          plan: "FREE",
          status: null,
          expiresAt: null,
          agentLimit: 4, // Free plan limit
        };
      }
      targetUserId = user.id;
    }

    // Convert Supabase auth ID to database user ID if needed
    let dbUserId = targetUserId;

    // Check if targetUserId is a Supabase auth ID (UUID format) and convert to database user ID
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("id")
      .eq("supabase_id", targetUserId)
      .single();

    if (dbUser && !dbUserError) {
      dbUserId = dbUser.id;
    } else {
      // If not found by supabase_id, assume targetUserId is already a database user ID
      // This handles cases where the function is called with database user ID directly
    }

    // Get user's subscription using database user ID
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("status", "ACTIVE")
      .single();

    if (subError || !subscription) {
      // No active subscription found - user is on free plan
      return {
        isActive: true,
        isPremium: false,
        plan: "FREE",
        status: null,
        expiresAt: null,
        agentLimit: 4, // Free plan limit
      };
    }

    // Check if subscription is expired
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const isExpired = now > expiresAt;

    if (isExpired) {
      return {
        isActive: false,
        isPremium: false,
        plan: "FREE",
        status: "EXPIRED",
        expiresAt: subscription.expires_at,
        agentLimit: 4, // Free plan limit
      };
    }

    // Active premium subscription
    return {
      isActive: true,
      isPremium: subscription.plan === "PREMIUM",
      plan: subscription.plan,
      status: subscription.status,
      expiresAt: subscription.expires_at,
      agentLimit: subscription.plan === "PREMIUM" ? -1 : 4, // -1 means unlimited
    };
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return {
      isActive: false,
      isPremium: false,
      plan: "FREE",
      status: null,
      expiresAt: null,
      agentLimit: 4, // Free plan limit
    };
  }
}

/**
 * Check if user can create more agents
 */
export async function canCreateAgent(userId?: string): Promise<{
  canCreate: boolean;
  currentCount: number;
  limit: number;
  isPremium: boolean;
}> {
  try {
    const supabase = await createClient();

    let targetUserId = userId;

    // If no userId provided, get current user
    if (!targetUserId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          canCreate: false,
          currentCount: 0,
          limit: 4,
          isPremium: false,
        };
      }
      targetUserId = user.id;
    }

    const subscriptionInfo = await getUserSubscription(targetUserId);

    if (!targetUserId) {
      return {
        canCreate: false,
        currentCount: 0,
        limit: 4,
        isPremium: false,
      };
    }

    // Convert Supabase auth ID to database user ID for agent counting
    let dbUserId = targetUserId;

    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("id")
      .eq("supabase_id", targetUserId)
      .single();

    if (dbUser && !dbUserError) {
      dbUserId = dbUser.id;
    }

    // Count user's current agents using database user ID
    const { count, error: countError } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .eq("is_active", true);

    if (countError) {
      console.error("Error counting agents:", countError);
      return {
        canCreate: false,
        currentCount: 0,
        limit: subscriptionInfo.agentLimit,
        isPremium: subscriptionInfo.isPremium,
      };
    }

    const currentCount = count || 0;
    const limit = subscriptionInfo.agentLimit;

    // Premium users have unlimited agents (limit = -1)
    const canCreate = subscriptionInfo.isPremium || currentCount < limit;

    return {
      canCreate,
      currentCount,
      limit: limit === -1 ? Infinity : limit,
      isPremium: subscriptionInfo.isPremium,
    };
  } catch (error) {
    console.error("Error checking agent creation limit:", error);
    return {
      canCreate: false,
      currentCount: 0,
      limit: 4,
      isPremium: false,
    };
  }
}

/**
 * Format subscription status for display
 */
export async function formatSubscriptionStatus(
  subscriptionInfo: SubscriptionInfo
): Promise<string> {
  if (!subscriptionInfo.isActive) {
    return "Inactive";
  }

  if (subscriptionInfo.isPremium) {
    return "Premium";
  }

  return "Free";
}

/**
 * Get days until subscription expires
 */
export async function getDaysUntilExpiry(
  expiresAt: string | null
): Promise<number | null> {
  if (!expiresAt) return null;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
