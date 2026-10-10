import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalCount } = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight text-slate-900">
          SLBT <span className="text-brand-600">Supply Co.</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
          <Link to="/" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Catalog
          </Link>
          {isAuthenticated && (
            <Link to="/orders" className="rounded-lg px-3 py-2 hover:bg-slate-100">
              My Orders
            </Link>
          )}
          <Link to="/cart" className="relative rounded-lg px-3 py-2 hover:bg-slate-100">
            Cart
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
                {totalCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
              <span className="text-slate-500">Hi, {user?.username}</span>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="btn-secondary !px-3 !py-1.5"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
              <Link to="/login" className="btn-secondary !px-3 !py-1.5">
                Log in
              </Link>
              <Link to="/register" className="btn-primary !px-3 !py-1.5">
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
