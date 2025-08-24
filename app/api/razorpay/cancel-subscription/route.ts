import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
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
    const { subscriptionId } = await request.json();

    // Validate request
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      );
    }

    // Get subscription details from database
    const supabase = await createClient();
    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('razorpay_payment_id, user_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Cancel subscription in Razorpay
    await razorpay.subscriptions.cancel(subscription.razorpay_payment_id);

    // Update subscription in database
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'EXPIRED',
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Update user's subscription status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
        updated_at: now,
      })
      .eq('id', subscription.user_id);

    if (userUpdateError) {
      console.error('User update error:', userUpdateError);
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: any) {
    console.error('Razorpay cancellation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}