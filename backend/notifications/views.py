"""Notification listing + mark-as-read endpoints (Step 18).

Access rules:
- All endpoints require login.
- ``list_view`` shows private (and, for admins, global) notifications,
  unread first then newest.
- ``mark_read`` and ``mark_all_read`` only mutate notifications visible
  to the requesting user (so a regular user can't tamper with someone
  else's). They accept POST only and bounce back to ``/notifications/``.
"""

from __future__ import annotations

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from .models import Notification
from .services import visible_for


@login_required
def list_view(request):
    """Render ``/notifications/`` with the unread-first ordered list."""
    qs = visible_for(request.user).order_by("is_read", "-created_at")
    items = list(qs)

    return render(
        request,
        "notifications/list.html",
        {
            "notifications": items,
            "unread_count": sum(1 for n in items if not n.is_read),
            "page_title": "Notifications",
            "active_nav": "notifications",
        },
    )


@login_required
@require_http_methods(["POST"])
def mark_read(request, pk: int):
    """Mark one notification as read, scoped to what the user can see."""
    qs = visible_for(request.user)
    try:
        notification = qs.get(pk=pk)
    except Notification.DoesNotExist as exc:
        raise Http404() from exc

    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        messages.success(request, "Notification marquée comme lue.")
    return redirect("notifications:list")


@login_required
@require_http_methods(["POST"])
def mark_all_read(request):
    """Mark every visible notification as read."""
    updated = visible_for(request.user).filter(is_read=False).update(is_read=True)
    if updated:
        messages.success(
            request,
            f"{updated} notification(s) marquée(s) comme lue(s).",
        )
    else:
        messages.info(request, "Aucune notification non lue.")
    return redirect("notifications:list")
