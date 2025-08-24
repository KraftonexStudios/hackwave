'use client';

import { useEffect, useState } from 'react';
import Script from "next/script";
import { toast } from 'sonner';

function Payment() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Razorpay is already loaded
    if (typeof window !== 'undefined' && window.Razorpay) {
      setScriptLoaded(true);
      console.log('Razorpay script already loaded');
    }
  }, []);

  const handleScriptLoad = () => {
    setScriptLoaded(true);
    console.log('Razorpay script loaded successfully');
  };

  const handleScriptError = () => {
    console.error('Failed to load Razorpay script');
    toast.error('Payment gateway failed to load');
  };

  return (
    <>
      <Script 
        id="razorpay-checkout-js" 
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
        strategy="lazyOnload"
      />
    </>
  );
}

export default Payment;
