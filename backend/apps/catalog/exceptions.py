from django.db import IntegrityError, OperationalError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Wrap DRF's default handler so raw DB errors become clean JSON.

    Without this, a lock timeout (OperationalError, raised when
    select_for_update(nowait=True) hits an already-locked row) or a
    CheckConstraint violation (IntegrityError, e.g. stock would go
    negative) would bubble up as an unhandled 500 with a stack trace
    instead of a message the frontend can show the user.
    """
    if isinstance(exc, OperationalError):
        return Response(
            {"error": "This item is being purchased by someone else right now. Please try again in a moment."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    if isinstance(exc, IntegrityError):
        return Response(
            {"error": "That action would leave stock in an invalid state. Please refresh and try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return exception_handler(exc, context)
