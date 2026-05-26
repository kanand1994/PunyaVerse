import { useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function useRazorpayLoader() {
  useEffect(() => { loadRazorpayScript(); }, []);
}

export async function payWithRazorpay({ bookingId, onSuccess, onCancel }) {
  const ok = await loadRazorpayScript();
  if (!ok) { toast.error("Could not load Razorpay"); return; }

  let order;
  try {
    const { data } = await api.post("/payments/razorpay/order", { booking_id: bookingId });
    order = data;
  } catch (e) {
    toast.error(e?.response?.data?.detail || "Could not create order");
    return;
  }

  const rzp = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: "PunyaVerse",
    description: "Sacred Yatra Booking",
    image: "https://static.prod-images.emergentagent.com/jobs/f355ee94-a200-4266-a0f3-acc9fe3f8abb/images/c15b3f8f3cb63fe252ad3bc7f8d87ba204c7be1da5b94277954829da10454e0e.png",
    prefill: { name: order.prefill_name, email: order.prefill_email },
    theme: { color: "#D4AF37" },
    handler: async (response) => {
      try {
        await api.post("/payments/razorpay/verify", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        toast.success("Yatra confirmed 🙏");
        onSuccess?.();
      } catch (e) {
        toast.error("Payment verification failed");
      }
    },
    modal: { ondismiss: () => onCancel?.() },
  });
  rzp.open();
}
