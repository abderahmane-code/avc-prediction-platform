"""Helpers to create notifications from anywhere in the app (Step 18).

Centralising creation keeps callers (views, signals) trivial and ensures
the strings are consistent across the platform.
"""

from __future__ import annotations

from .models import Notification


def notify(
    *,
    user,
    title: str,
    message: str,
    notification_type: str = Notification.TYPE_INFO,
) -> Notification:
    """Create a private notification for ``user``.

    ``user`` may be ``None`` to create a global/admin notification (only
    staff/superusers will see it on the listing page).
    """
    return Notification.objects.create(
        user=user if user is not None and getattr(user, "is_authenticated", False) else None,
        title=title,
        message=message,
        notification_type=notification_type,
    )


def notify_admins(
    *,
    title: str,
    message: str,
    notification_type: str = Notification.TYPE_INFO,
) -> Notification:
    """Create a global notification (``user`` is ``NULL``)."""
    return Notification.objects.create(
        user=None,
        title=title,
        message=message,
        notification_type=notification_type,
    )


def visible_for(user):
    """Return the notification queryset visible to ``user``.

    - Anonymous → empty queryset.
    - Normal user → only their own private notifications.
    - Staff/superuser → their private + all global notifications.
    """
    qs = Notification.objects.all()
    if not user.is_authenticated:
        return qs.none()
    if user.is_staff or user.is_superuser:
        return qs.filter(models_q_user_or_global(user))
    return qs.filter(user=user)


def models_q_user_or_global(user):
    """Build a Q expression matching ``user``'s notifications + globals."""
    from django.db.models import Q

    return Q(user=user) | Q(user__isnull=True)


def unread_count_for(user) -> int:
    """Return the number of unread notifications visible to ``user``."""
    if not user.is_authenticated:
        return 0
    return visible_for(user).filter(is_read=False).count()
