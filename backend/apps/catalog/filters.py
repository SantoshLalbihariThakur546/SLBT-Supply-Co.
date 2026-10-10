import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug", lookup_expr="exact")
    min_price = django_filters.NumberFilter(field_name="variants__price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="variants__price", lookup_expr="lte")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")

    class Meta:
        model = Product
        # `status` isn't filterable here — ProductViewSet.get_queryset()
        # already restricts the catalog to ACTIVE products only.
        fields = ["category"]

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(variants__stock__gt=0).distinct()
        return queryset
