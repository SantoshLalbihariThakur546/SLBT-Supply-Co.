from django.db.models import F
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import InventoryTransaction, ProductVariant


@receiver(post_save, sender=InventoryTransaction)
def update_variant_stock(sender, instance: InventoryTransaction, created, **kwargs):
    """Keep ProductVariant.stock in sync with the append-only transaction log.

    Deliberately uses a single `UPDATE ... SET stock = stock ± qty` queryset
    call (not `instance.save()`) for two reasons:
      1. It's one atomic SQL statement — no read-modify-write race, even
         without an explicit row lock.
      2. It sidesteps ProductVariant.save()'s full_clean() call, which would
         otherwise blow up trying to compare an F() expression to zero.
    The `stock_cannot_be_negative` CheckConstraint on ProductVariant is the
    actual safety net: if this update would push stock below zero, the
    database itself raises an IntegrityError.
    """
    if not created:
        return

    # RESTOCK and manual ADJUSTMENT add to stock; SALE deducts from it.
    # (quantity is always a positive integer — direction comes from type.)
    if instance.transaction_type == InventoryTransaction.TransactionType.SALE:
        delta = -instance.quantity
    else:
        delta = instance.quantity

    ProductVariant.objects.filter(pk=instance.variant_id).update(stock=F("stock") + delta)
