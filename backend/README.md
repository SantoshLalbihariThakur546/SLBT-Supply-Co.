# PharmaSense-style E-Commerce Backend (Django + DRF)

Catalog, inventory, concurrency-safe checkout, JWT auth, and order history.

## Quick start (SQLite, zero external setup)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # defaults are fine for local dev

python manage.py makemigrations catalog orders accounts
python manage.py migrate
python manage.py seed_data --with-admin   # demo catalog + admin/admin123
python manage.py runserver                # http://localhost:8000
```

Visit http://localhost:8000/admin/ (admin / admin123) to see the catalog,
or http://localhost:8000/api/products/ for the raw API.

## Switching to Postgres (recommended — see note below)

SQLite silently ignores `SELECT ... FOR UPDATE`, so the pessimistic locking
in `apps/orders/views.py::CheckoutView` only does real work on Postgres.
For local dev:

```bash
docker compose up -d          # starts Postgres on localhost:5432
```

Then in `.env`:
```
DJANGO_USE_POSTGRES=true
```
and re-run `python manage.py migrate` (SQLite and Postgres have separate
databases, so you'll need to re-seed too).

## API overview

| Method | Path                              | Auth        | Purpose                                  |
|--------|------------------------------------|-------------|-------------------------------------------|
| POST   | `/api/auth/register/`             | —           | Create an account                        |
| POST   | `/api/auth/login/`                | —           | Get JWT access + refresh tokens          |
| POST   | `/api/auth/refresh/`              | —           | Refresh an access token                  |
| GET    | `/api/auth/me/`                   | JWT         | Current user profile                     |
| GET    | `/api/categories/`                | —           | Category tree                            |
| GET    | `/api/products/`                  | —           | Catalog (filter/search/paginate)         |
| GET    | `/api/products/{slug}/`           | —           | Product detail + variants                |
| POST   | `/api/checkout/`                  | JWT         | Place an order (locking, all-or-nothing) |
| GET    | `/api/orders/`                    | JWT         | Your order history                       |
| POST   | `/api/restock/`                   | JWT (admin) | Log a restock transaction                |

`GET /api/products/?category=laptops&search=pro&min_price=500&max_price=2000&in_stock=true&ordering=-created_at&page=2`

### Checkout request/response

```json
POST /api/checkout/
{ "items": [ { "variant_id": 3, "quantity": 2 } ] }

201 ->
{ "id": 14, "status": "PAID", "total_amount": "2998.00", "created_at": "...",
  "items": [ { "variant": 3, "product_name_snapshot": "Aperture Pro 14", ... } ] }

429 -> { "error": "This item is being purchased by someone else right now. Please try again in a moment." }
400 -> { "shortages": [ { "variant_id": 3, "sku": "APRO14-16-512", "requested": 2, "available": 1 } ], "detail": "..." }
```

## Why the inventory math is structured this way

- **Audit log, not a single integer** (`InventoryTransaction`): every stock
  change is a row (`RESTOCK` / `SALE` / `ADJUSTMENT`), so you can always
  answer "why is stock at 12?" by reading history, not just trusting a
  mutable field.
- **Signal + `F()` expression** (`apps/catalog/signals.py`): the transaction
  log is the source of truth; a `post_save` signal applies the delta to
  `ProductVariant.stock` as one atomic `UPDATE ... SET stock = stock ± N`
  query — no read-modify-write race window.
- **`CheckConstraint(stock__gte=0)`**: the last line of defense. Even if
  application logic has a bug, the database itself refuses to let stock go
  negative.
- **`select_for_update(nowait=True)` in checkout**: prevents two shoppers
  from both passing a "is there stock?" check for the last unit. Locks are
  acquired in a fixed order (sorted variant id) across every checkout so
  multi-item carts can never deadlock each other.
