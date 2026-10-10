import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import Pagination from "../components/Pagination";
import ProductCard from "../components/ProductCard";
import Spinner from "../components/Spinner";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pageInfo, setPageInfo] = useState({ next: null, previous: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const page = Number(searchParams.get("page") || 1);
  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const inStockOnly = searchParams.get("in_stock") === "true";

  useEffect(() => {
    api.get("/categories/").then(({ data }) => setCategories(data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page };
    if (category) params.category = category;
    if (search) params.search = search;
    if (inStockOnly) params.in_stock = true;

    api
      .get("/products/", { params })
      .then(({ data }) => {
        setProducts(data.results ?? data);
        setPageInfo({ next: data.next, previous: data.previous, count: data.count ?? data.length });
      })
      .catch(() => {
        setProducts([]);
        setPageInfo({ next: null, previous: null, count: 0 });
      })
      .finally(() => setLoading(false));
  }, [page, category, search, inStockOnly]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value === false || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    if (!("page" in patch)) next.delete("page");
    setSearchParams(next);
  };

  const topLevelCategories = useMemo(() => categories.filter((c) => !c.parent), [categories]);
  const childCategories = useMemo(() => categories.filter((c) => c.parent), [categories]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="mb-8 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold">Stock you can trust, down to the last unit.</h1>
        <p className="mt-2 max-w-2xl text-brand-50">
          Every purchase here is backed by database-level locking and an append-only audit trail —
          so the counter you see is always the truth, even during a flash sale.
        </p>
      </section>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar filters */}
        <aside className="w-full shrink-0 space-y-6 md:w-56">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Search</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateParams({ search: searchInput });
              }}
            >
              <input
                className="input"
                placeholder="Search products…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </form>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Categories</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  className={`w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 ${!category ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600"}`}
                  onClick={() => updateParams({ category: "" })}
                >
                  All categories
                </button>
              </li>
              {topLevelCategories.map((parent) => (
                <li key={parent.id}>
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {parent.name}
                  </div>
                  {childCategories
                    .filter((c) => c.parent === parent.id)
                    .map((child) => (
                      <button
                        key={child.id}
                        className={`block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 ${category === child.slug ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600"}`}
                        onClick={() => updateParams({ category: child.slug })}
                      >
                        {child.name}
                        <span className="ml-1 text-xs text-slate-400">({child.product_count})</span>
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => updateParams({ in_stock: e.target.checked ? "true" : "" })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            In stock only
          </label>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-24">
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-24 text-center text-slate-500">
              No products match your filters.
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">{pageInfo.count} products found</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination
                page={page}
                hasNext={!!pageInfo.next}
                hasPrevious={!!pageInfo.previous}
                onChange={(nextPage) => updateParams({ page: nextPage })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
