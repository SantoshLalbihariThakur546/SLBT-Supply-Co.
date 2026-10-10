import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import Spinner from "../components/Spinner";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/orders/")
      .then(({ data }) => setOrders(data.results ?? data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h2 className="text-xl font-semibold text-slate-900">No orders yet</h2>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Browse the catalog →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Order #{order.id}</p>
                <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {order.status}
                </span>
                <p className="mt-1 font-bold text-slate-900">${Number(order.total_amount).toFixed(2)}</p>
              </div>
            </div>
            <ul className="divide-y divide-slate-100 border-t border-slate-100 pt-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between py-1.5">
                  <span className="text-slate-600">
                    {item.quantity} × {item.product_name_snapshot} ({item.variant_name_snapshot})
                  </span>
                  <span className="text-slate-900">${Number(item.line_total).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
