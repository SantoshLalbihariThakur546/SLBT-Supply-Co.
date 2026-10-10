from rest_framework.routers import DefaultRouter

from .views import CheckoutView, OrderHistoryViewSet
from django.urls import path

router = DefaultRouter()
router.register("orders", OrderHistoryViewSet, basename="order")

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
] + router.urls
