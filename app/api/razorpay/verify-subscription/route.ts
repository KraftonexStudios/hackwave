import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    // Validate credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Razorpay credentials not configured' },
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
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !subscription_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Get subscription details from Razorpay
    let subscription;
    try {
      subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // If we can't fetch the subscription, assume it's active based on the payment
      subscription = { status: 'active' };
    }

    // Update subscription in database
    const supabase = await createClient();
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status === 'active' ? 'ACTIVE' : 'EXPIRED',
        razorpay_payment_id: razorpay_payment_id,
      })
      .eq('id', subscription_id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Update user's subscription status
    const { data: subscriptionData } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan')
      .eq('id', subscription_id)
      .single();

    if (subscriptionData) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          subscription_plan: subscriptionData.plan,
          subscription_status: subscription.status === 'active' ? 'ACTIVE' : 'EXPIRED',
          subscription_id: subscription_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionData.user_id);

      if (userUpdateError) {
        console.error('User update error:', userUpdateError);
      }
    }

    // Return success
    return NextResponse.json({
      success: true,
      status: subscription.status,
      message: 'Subscription verified successfully',
    });
  } catch (error: any) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify subscription' },
      { status: 500 }
    );
  }
}