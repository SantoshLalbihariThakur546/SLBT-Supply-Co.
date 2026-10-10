from rest_framework import serializers

from .models import Category, InventoryTransaction, Product, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "product_count"]


class ProductVariantSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "name", "price", "stock",
            "low_stock_threshold", "is_low_stock", "is_in_stock",
        ]


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for catalog grids."""

    category = serializers.SlugRelatedField(read_only=True, slug_field="slug")
    starting_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "image_url", "category",
            "starting_price", "total_stock", "status",
        ]

    def get_starting_price(self, obj):
        prices = [v.price for v in obj.variants.all()]
        return min(prices) if prices else None

    def get_total_stock(self, obj):
        return sum(v.stock for v in obj.variants.all())


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "image_url",
            "category", "status", "variants", "created_at",
        ]


class InventoryTransactionSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = InventoryTransaction
        fields = [
            "id", "variant", "variant_sku", "transaction_type", "quantity",
            "reference_document", "created_by_username", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RestockRequestSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    reference_document = serializers.CharField(required=False, allow_blank=True, default="")
