from decimal import Decimal

from django.db import transaction
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import InventoryTransaction, ProductVariant

from .models import Order, OrderItem
from .serializers import CheckoutRequestSerializer, OrderSerializer


class CheckoutView(APIView):
    """
    Concurrency-safe checkout.

    Accepts a whole cart (one or more {variant_id, quantity} lines) and
    settles it as a single all-or-nothing transaction:

      1. Every variant row involved is locked with
         `select_for_update(nowait=True)`, in a deterministic order (sorted
         by primary key) — locking in a consistent order across *every*
         checkout request is what prevents two multi-item carts from
         deadlocking each other.
      2. `nowait=True` means if another in-flight checkout already holds
         the lock on one of these rows, this request fails immediately
         with a 429 instead of queuing/hanging.
      3. Stock is re-checked *after* the lock is acquired (never trust a
         value read before locking) before any Order/OrderItem/
         InventoryTransaction rows are written.

    Note: on SQLite, `select_for_update` is a silent no-op (SQLite doesn't
    support row locks), so two truly simultaneous requests can both pass
    the stock check before either commits. The `stock_cannot_be_negative`
    CheckConstraint still stops the row from ever going negative — you'd
    just get an IntegrityError (400) instead of a clean 429 in that edge
    case. Point this at Postgres (DJANGO_USE_POSTGRES=true) to get the
    full, correct concurrency behavior described above.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items = serializer.validated_data["items"]

        with transaction.atomic():
            variant_ids = sorted({item["variant_id"] for item in items})
            locked_variants = {}
            for vid in variant_ids:
                try:
                    locked_variants[vid] = ProductVariant.objects.select_for_update(nowait=True).get(pk=vid)
                except ProductVariant.DoesNotExist as exc:
                    raise NotFound(f"Product variant {vid} does not exist.") from exc

            shortages = []
            for item in items:
                variant = locked_variants[item["variant_id"]]
                if variant.stock < item["quantity"]:
                    shortages.append(
                        {
                            "variant_id": variant.id,
                            "sku": variant.sku,
                            "requested": item["quantity"],
                            "available": variant.stock,
                        }
                    )
            if shortages:
                # Returned directly (not raised as a DRF ValidationError):
                # ValidationError recursively stringifies every leaf value via
                # ErrorDetail, which would turn variant_id: 3 into "3" in the
                # JSON body — and the frontend does a strict `===` match on
                # that id to clamp the cart. A plain Response keeps real
                # ints as ints. Returning here (instead of raising) is safe:
                # nothing has been written yet, so the surrounding
                # transaction.atomic() block just commits an empty no-op.
                return Response(
                    {"shortages": shortages, "detail": "Not enough stock for one or more items."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            order = Order.objects.create(user=request.user, total_amount=Decimal("0"))
            total = Decimal("0")
            for item in items:
                variant = locked_variants[item["variant_id"]]
                OrderItem.objects.create(
                    order=order,
                    variant=variant,
                    product_name_snapshot=variant.product.name,
                    variant_name_snapshot=variant.name,
                    unit_price=variant.price,
                    quantity=item["quantity"],
                )
                # Creating this fires the post_save signal that atomically
                # decrements ProductVariant.stock (see apps/catalog/signals.py).
                InventoryTransaction.objects.create(
                    variant=variant,
                    transaction_type=InventoryTransaction.TransactionType.SALE,
                    quantity=item["quantity"],
                    reference_document=f"ORDER-{order.id}",
                    created_by=request.user,
                )
                total += variant.price * item["quantity"]

            order.total_amount = total
            order.save(update_fields=["total_amount"])

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderHistoryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Read-only: a logged-in user's own order history."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")
