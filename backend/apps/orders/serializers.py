from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id", "variant", "product_name_snapshot", "variant_name_snapshot",
            "unit_price", "quantity", "line_total",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "status", "total_amount", "created_at", "items"]


class CheckoutItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CheckoutRequestSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Cart is empty.")
        seen = set()
        for item in items:
            if item["variant_id"] in seen:
                raise serializers.ValidationError("Duplicate variant in cart — merge quantities client-side.")
            seen.add(item["variant_id"])
        return items
