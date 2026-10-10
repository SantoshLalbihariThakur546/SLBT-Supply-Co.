import { Link, useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalAmount } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Your cart is empty</h2>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Browse the catalog →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Your Cart</h1>

      <div className="card divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.variantId} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <p className="font-medium text-slate-900">{item.productName}</p>
              <p className="text-sm text-slate-500">{item.name} · {item.sku}</p>
            </div>

            <div className="flex items-center rounded-lg border border-slate-300">
              <button
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
              <button
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
              >
                +
              </button>
            </div>

            <span className="w-20 text-right font-semibold text-slate-900">
              ${(item.price * item.quantity).toFixed(2)}
            </span>

            <button
              className="text-sm text-rose-600 hover:underline"
              onClick={() => removeItem(item.variantId)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500 hover:text-brand-600">
          ← Continue shopping
        </Link>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <button className="btn-primary mt-6 w-full" onClick={() => navigate("/checkout")}>
        Proceed to checkout
      </button>
    </div>
  );
}
