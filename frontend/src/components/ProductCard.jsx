import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  const outOfStock = product.total_stock <= 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{product.category}</span>
        <h3 className="font-semibold text-slate-900">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-slate-900">
            {product.starting_price != null ? `$${Number(product.starting_price).toFixed(2)}` : "—"}
          </span>
          {outOfStock ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
              Out of stock
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              In stock
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
