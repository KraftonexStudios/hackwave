interface Window {
  Razorpay: any;
}

interface RazorpayOptions {
  key: string;
  subscription_id?: string;
  order_id?: string;
  name: string;
  description?: string;
  amount?: number;
  currency?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}
