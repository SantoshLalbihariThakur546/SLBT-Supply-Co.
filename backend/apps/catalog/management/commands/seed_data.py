from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.catalog.models import Category, InventoryTransaction, Product, ProductVariant

CATALOG = {
    "Electronics": {
        "Laptops": [
            {
                "name": "Aperture Pro 14",
                "description": "A 14-inch workstation laptop built for developers and creators.",
                "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
                "variants": [
                    ("APRO14-8-256", "8GB / 256GB", "1199.00", 14),
                    ("APRO14-16-512", "16GB / 512GB", "1499.00", 6),
                    ("APRO14-32-1TB", "32GB / 1TB", "1899.00", 3),
                ],
            },
            {
                "name": "Bolt Air 13",
                "description": "Ultra-light 13-inch laptop with an 18-hour battery.",
                "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
                "variants": [
                    ("BAIR13-8-256", "8GB / 256GB", "899.00", 22),
                    ("BAIR13-16-512", "16GB / 512GB", "1099.00", 2),
                ],
            },
        ],
        "Headphones": [
            {
                "name": "Echo Studio ANC",
                "description": "Over-ear noise-cancelling headphones with studio tuning.",
                "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
                "variants": [
                    ("ECHO-ANC-BLK", "Black", "249.00", 40),
                    ("ECHO-ANC-WHT", "White", "249.00", 0),
                ],
            },
        ],
    },
    "Home & Kitchen": {
        "Coffee Makers": [
            {
                "name": "Brew Master 3000",
                "description": "Programmable drip coffee maker with thermal carafe.",
                "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
                "variants": [
                    ("BM3000-BLK", "Black", "79.99", 60),
                    ("BM3000-SLV", "Silver", "84.99", 18),
                ],
            },
        ],
    },
}


class Command(BaseCommand):
    help = "Seed the database with a realistic demo catalog (categories, products, variants, opening stock)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-admin",
            action="store_true",
            help="Also create a superuser admin/admin123 for quick local testing.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        created_products = 0
        created_variants = 0

        for category_name, subcats in CATALOG.items():
            parent, _ = Category.objects.get_or_create(
                slug=slugify(category_name), defaults={"name": category_name}
            )
            for subcat_name, products in subcats.items():
                sub, _ = Category.objects.get_or_create(
                    slug=slugify(f"{category_name}-{subcat_name}"),
                    defaults={"name": subcat_name, "parent": parent},
                )
                for p in products:
                    product, was_created = Product.objects.get_or_create(
                        slug=slugify(p["name"]),
                        defaults={
                            "category": sub,
                            "name": p["name"],
                            "description": p["description"],
                            "image_url": p["image_url"],
                            "status": Product.Status.ACTIVE,
                        },
                    )
                    if was_created:
                        created_products += 1
                    for sku, variant_name, price, opening_stock in p["variants"]:
                        variant, v_created = ProductVariant.objects.get_or_create(
                            sku=sku,
                            defaults={
                                "product": product,
                                "name": variant_name,
                                "price": Decimal(price),
                                "stock": 0,
                            },
                        )
                        if v_created:
                            created_variants += 1
                            if opening_stock > 0:
                                InventoryTransaction.objects.create(
                                    variant=variant,
                                    transaction_type=InventoryTransaction.TransactionType.RESTOCK,
                                    quantity=opening_stock,
                                    reference_document="SEED-OPENING-BALANCE",
                                )

        self.stdout.write(self.style.SUCCESS(
            f"Seed complete: {created_products} products, {created_variants} variants created "
            f"(existing rows were left untouched)."
        ))

        if options["with_admin"] and not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@example.com", "admin123")
            self.stdout.write(self.style.SUCCESS("Created superuser: admin / admin123"))
