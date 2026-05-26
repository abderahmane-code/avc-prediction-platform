"""Inject the unread-notification count into every template (Step 18)."""

from __future__ import annotations

from .services import unread_count_for


def notifications(request):
    """Expose ``notifications_unread_count`` for the topbar bell."""
    return {
        "notifications_unread_count": unread_count_for(request.user),
    }
