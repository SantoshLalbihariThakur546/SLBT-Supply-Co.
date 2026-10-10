import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, extractErrorMessage } from "../api/client";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function CheckoutPage() {
  const { items, totalAmount, clearCart, updateQuantity, removeItem } = useCart();
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const payload = {
        items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      };
      const { data } = await api.post("/checkout/", payload);
      setPlacedOrder(data);
      clearCart();
      toast.success("Order placed successfully!");
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 429) {
        // High contention on one of these items — let them retry as-is.
        toast.error(extractErrorMessage(error));
      } else if (status === 400 && Array.isArray(data?.shortages)) {
        // Stock changed since it was added to the cart — clamp quantities
        // down to what's actually available (or drop the line entirely)
        // so the next attempt has a real chance of succeeding.
        data.shortages.forEach((s) => {
          if (s.available > 0) {
            updateQuantity(s.variant_id, s.available);
          } else {
            removeItem(s.variant_id);
          }
        });
        toast.error(extractErrorMessage(error));
      } else {
        toast.error(extractErrorMessage(error));
      }
    } finally {
      setPlacing(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Order #{placedOrder.id} confirmed</h2>
        <p className="mt-2 text-slate-500">Total charged: ${Number(placedOrder.total_amount).toFixed(2)}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/orders" className="btn-primary">View order history</Link>
          <Link to="/" className="btn-secondary">Keep shopping</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Nothing to check out</h2>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Browse the catalog →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Review &amp; Place Order</h1>

      <div className="card divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.variantId} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-slate-900">{item.productName}</p>
              <p className="text-sm text-slate-500">
                {item.name} · qty {item.quantity}
              </p>
            </div>
            <span className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-4">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="text-xl font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        This is a demo — no real payment is processed. Placing the order locks and decrements
        stock through the backend's concurrency-safe checkout endpoint.
      </p>

      <button className="btn-primary mt-6 w-full" disabled={placing} onClick={handlePlaceOrder}>
        {placing ? "Placing order…" : `Place order — $${totalAmount.toFixed(2)}`}
      </button>
    </div>
  );
}
