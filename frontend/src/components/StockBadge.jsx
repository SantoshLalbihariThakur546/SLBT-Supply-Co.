export default function StockBadge({ variant }) {
  if (variant.stock <= 0) {
    return (
      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
        Out of stock
      </span>
    );
  }
  if (variant.is_low_stock) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Only {variant.stock} left — low stock
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      In stock ({variant.stock})
    </span>
  );
}
