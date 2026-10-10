# E-Commerce Inventory & Catalog Management System

A full-stack storefront demonstrating concurrency-safe inventory management:
Django + DRF backend, React + Tailwind frontend.

```
ecommerce/
├── backend/    Django REST API — catalog, inventory, checkout, JWT auth
└── frontend/   React (Vite) storefront — browse, cart, checkout, order history
```

## Run it (two terminals)

**Terminal 1 — backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations catalog orders accounts
python manage.py migrate
python manage.py seed_data --with-admin
python manage.py runserver
```

**Terminal 2 — frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. Register an account, browse the seeded catalog,
add items to your cart, and check out — stock updates live, backed by the
locking/audit-log pattern described in `backend/README.md`.

Admin panel: http://localhost:8000/admin/ (`admin` / `admin123`, created by
`--with-admin`). Use it (or `POST /api/restock/`) to log restocks — never
edit the `stock` field directly; it's intentionally read-only in the admin
so every change goes through the audited `InventoryTransaction` log.

## What's implemented

**Backend**
- Category → Product → ProductVariant catalog, with an append-only
  `InventoryTransaction` audit log as the source of truth for stock
- A `post_save` signal applies each transaction to `ProductVariant.stock`
  via a single atomic `F()`-expression `UPDATE`
- A `CheckConstraint` stops stock from ever going negative at the DB level
- `/api/checkout/` locks every variant row in a cart with
  `select_for_update(nowait=True)` (deterministic lock order to avoid
  deadlocks on multi-item carts), re-validates stock under the lock, and
  only then writes the Order/OrderItem/InventoryTransaction rows —
  all inside one transaction
- JWT auth (register/login/refresh), search/filter/pagination on the
  catalog, an admin-only restock endpoint, Django admin wiring, a demo
  data seed command
- Friendly JSON errors: a lock conflict → `429`, a stock shortage → `400`
  with per-item detail, instead of a raw server stack trace

**Frontend**
- Catalog grid with category sidebar, search, in-stock filter, pagination
- Product detail page with per-variant stock/low-stock badges
- Cart (persisted to `localStorage`) and a checkout flow that gracefully
  handles both the `429` (retry) and `400` (clamps quantities to what's
  actually left) responses from the API
- JWT auth with automatic access-token refresh on expiry
- Order history page

## A known limitation, on purpose

This was built and syntax-checked in a sandboxed environment with no
internet access, so I could not `pip install`/`npm install` the real
dependencies here to run a live end-to-end test. Every Python file passed
an AST syntax check and every JS/JSX file was parsed clean with the
TypeScript compiler's JSX parser, and I traced the logic by hand (request
→ view → serializer → model, and component → context → API) — but that's
not a substitute for actually running it. Please run the steps above and
tell me about any error you hit; given the scope of this project, don't be
surprised if something small needs a tweak on first boot (a typo, an
import path), and I'm glad to fix it immediately once I can see the actual
error message.
