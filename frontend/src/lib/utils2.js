import api from "@/lib/api";

export function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export function track(payload) {
  api.post("/track", { data: payload }).catch(() => {});
}

export async function payWithRazorpay({ amount, user, onSuccess, onFail }) {
  try {
    const { data } = await api.post("/payments/create-order", { amount });
    const options = {
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      name: "FixitZ",
      description: "FixitZ Payment",
      order_id: data.order_id,
      prefill: { name: user?.name || "", email: user?.email || "", contact: user?.phone || "" },
      theme: { color: "#EE4D2D" },
      handler: async (resp) => {
        try {
          await api.post("/payments/verify", {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          onSuccess(resp);
        } catch (e) { onFail?.(e); }
      },
      modal: { ondismiss: () => onFail?.(new Error("Payment cancelled")) },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (e) { onFail?.(e); }
}
