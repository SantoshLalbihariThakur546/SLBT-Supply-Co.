from django.contrib import admin

from .models import Category, InventoryTransaction, Product, ProductVariant


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "slug"]
    prepopulated_fields = {"slug": ("name",)}


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["sku", "name", "price", "stock", "low_stock_threshold"]
    # Stock is edited through InventoryTransaction (see model docstring /
    # ARCHITECTURE.md) — expose it here read-only so admins aren't tempted
    # to hand-edit it and silently desync the audit log.
    readonly_fields = ["stock"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "status", "created_at"]
    list_filter = ["status", "category"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ["sku", "product", "name", "price", "stock", "is_low_stock"]
    list_filter = ["product__category"]
    search_fields = ["sku", "name", "product__name"]
    readonly_fields = ["stock"]

    @admin.display(boolean=True, description="Low stock")
    def is_low_stock(self, obj):
        return obj.is_low_stock


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    """This is the intended way to change stock: create a RESTOCK (or, for
    corrections, ADJUSTMENT) transaction here and the signal in
    signals.py brings ProductVariant.stock back in sync automatically."""

    list_display = ["variant", "transaction_type", "quantity", "reference_document", "created_by", "created_at"]
    list_filter = ["transaction_type", "created_at"]
    search_fields = ["variant__sku", "reference_document"]
    autocomplete_fields = ["variant"]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
