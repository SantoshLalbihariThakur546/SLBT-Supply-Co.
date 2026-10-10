from django.db.models import Count
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ProductFilter
from .models import Category, InventoryTransaction, Product, ProductVariant
from .serializers import (
    CategorySerializer,
    InventoryTransactionSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    RestockRequestSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(product_count=Count("products")).order_by("name")


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    filterset_class = ProductFilter
    search_fields = ["name", "description", "variants__sku"]
    ordering_fields = ["created_at", "name"]
    lookup_field = "slug"

    def get_queryset(self):
        qs = Product.objects.filter(status=Product.Status.ACTIVE).select_related("category").prefetch_related("variants")
        return qs.distinct()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer


class RestockView(APIView):
    """Admin-only: log a restock transaction. The signal handler then
    atomically adds the quantity to ProductVariant.stock."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = RestockRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            variant = ProductVariant.objects.get(pk=data["variant_id"])
        except ProductVariant.DoesNotExist as exc:
            raise NotFound("Product variant not found.") from exc

        txn = InventoryTransaction.objects.create(
            variant=variant,
            transaction_type=InventoryTransaction.TransactionType.RESTOCK,
            quantity=data["quantity"],
            reference_document=data.get("reference_document") or f"MANUAL-RESTOCK-{variant.sku}",
            created_by=request.user,
        )
        variant.refresh_from_db(fields=["stock"])
        return Response(
            {
                "transaction": InventoryTransactionSerializer(txn).data,
                "new_stock": variant.stock,
            },
            status=status.HTTP_201_CREATED,
        )
