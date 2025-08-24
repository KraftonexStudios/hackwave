import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { TablesUpdate } from "@/database.types";
// pages/api/verify-payment.js (or app/api/razorpay/verify-payment/route.ts)
import { createClient } from "@supabase/supabase-js";
const { NEXT_SUPABASE_SERVICE_ROLE_KEY } = process.env;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, NEXT_SUPABASE_SERVICE_ROLE_KEY!);
export type paymentType = TablesUpdate<"payments">;

export async function POST(request: NextRequest) {
  try {
    // const supabase = await createClient();

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    console.log(razorpay_payment_id, "this is the payment Id");

    const orderData: paymentType = {
      razorpay_payment_id: razorpay_payment_id,
      created_at: new Date().toISOString(),
    };
    console.log(order_id, "at verify");

    const { error, data } = await supabase.from("payments").update(orderData).eq("order_id", order_id).select();

    console.log(error, data, "after updating payment");

    if (error) {
      console.error("Error updating order:", error);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      {
        error: "Payment verification failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
