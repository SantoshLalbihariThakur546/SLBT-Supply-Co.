import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import Spinner from "../components/Spinner";
import StockBadge from "../components/StockBadge";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { addItem } = useCart();
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .get(`/products/${slug}/`)
      .then(({ data }) => {
        setProduct(data);
        const firstInStock = data.variants.find((v) => v.stock > 0) || data.variants[0];
        setSelectedVariantId(firstInStock?.id ?? null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Product not found</h2>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          ← Back to catalog
        </Link>
      </div>
    );
  }

  const variant = product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const handleAddToCart = () => {
    if (!variant || variant.stock <= 0) return;
    addItem(variant, product, quantity);
    toast.success(`Added ${quantity} × ${product.name} (${variant.name}) to cart.`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="mb-6 inline-block text-sm text-slate-500 hover:text-brand-600">
        ← Back to catalog
      </Link>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">No image</div>
          )}
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {product.category?.name}
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-3 text-slate-600">{product.description}</p>

          {variant && (
            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-slate-900">${Number(variant.price).toFixed(2)}</span>
              <StockBadge variant={variant} />
            </div>
          )}

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Choose a variant</h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  disabled={v.stock <= 0}
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    setQuantity(1);
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    v.id === selectedVariantId
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-300 text-slate-700 hover:border-slate-400"
                  } ${v.stock <= 0 ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {v.name}
                  {v.stock <= 0 && " (out of stock)"}
                </button>
              ))}
            </div>
          </div>

          {variant && variant.stock > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-slate-300">
                <button
                  className="px-3 py-2 text-slate-600 hover:bg-slate-50"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <button
                  className="px-3 py-2 text-slate-600 hover:bg-slate-50"
                  onClick={() => setQuantity((q) => Math.min(variant.stock, q + 1))}
                >
                  +
                </button>
              </div>
              <button className="btn-primary flex-1" onClick={handleAddToCart}>
                Add to cart
              </button>
            </div>
          )}

          {variant && variant.stock <= 0 && (
            <button className="btn-secondary mt-6 w-full" disabled>
              Out of stock
            </button>
          )}

          <p className="mt-4 text-xs text-slate-400">SKU: {variant?.sku}</p>
        </div>
      </div>
    </div>
  );
}
