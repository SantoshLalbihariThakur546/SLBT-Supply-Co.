from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    """Hierarchical product categories (e.g. Electronics > Laptops)."""

    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="subcategories"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return f"{self.parent.name} > {self.name}" if self.parent else self.name


class Product(models.Model):
    """Base product definition. A product may have several purchasable variants."""

    class Status(models.TextChoices):
        DRAFT = "DR", _("Draft")
        ACTIVE = "AC", _("Active")
        ARCHIVED = "AR", _("Archived")

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True, help_text="Optional hero image for the catalog card.")
    status = models.CharField(max_length=2, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    """A specific purchasable SKU of a product (size, color, configuration, ...)."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255, help_text='e.g. "16GB / 512GB / Space Gray"')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(
        default=5, help_text="Stock at or below this triggers a 'Low stock' badge in the UI."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["product__name", "name"]
        constraints = [
            models.CheckConstraint(check=models.Q(price__gte=0), name="price_must_be_positive"),
            # Hard safety net at the DB level: even if application code has a
            # bug, Postgres will refuse to let stock go negative.
            models.CheckConstraint(check=models.Q(stock__gte=0), name="stock_cannot_be_negative"),
        ]

    @property
    def is_low_stock(self) -> bool:
        return 0 < self.stock <= self.low_stock_threshold

    @property
    def is_in_stock(self) -> bool:
        return self.stock > 0

    def clean(self):
        if self.stock < 0:
            raise ValidationError({"stock": "Stock cannot drop below zero."})

    def save(self, *args, **kwargs):
        # Only run full model validation when we're not doing a partial,
        # signal-driven stock update (see apps.catalog.signals) — that path
        # updates the row directly via a queryset .update(F(...)) call and
        # never touches this save() method, so this guard mostly protects
        # against someone later calling `variant.save(update_fields=["stock"])`
        # by hand with a non-concrete value.
        update_fields = kwargs.get("update_fields")
        if update_fields is None or "stock" not in update_fields:
            self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} - {self.name} ({self.sku})"


class InventoryTransaction(models.Model):
    """Append-only audit log for every stock addition and deduction."""

    class TransactionType(models.TextChoices):
        RESTOCK = "IN", _("Restock")
        SALE = "OUT", _("Sale")
        ADJUSTMENT = "ADJ", _("Manual Adjustment")

    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="inventory_transactions"
    )
    transaction_type = models.CharField(max_length=3, choices=TransactionType.choices)
    quantity = models.PositiveIntegerField()
    reference_document = models.CharField(max_length=128, blank=True)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="inventory_transactions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        sign = "+" if self.transaction_type == self.TransactionType.RESTOCK else "-"
        return f"{self.variant.sku} {sign}{self.quantity} ({self.get_transaction_type_display()})"
