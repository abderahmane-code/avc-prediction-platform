"""Notification model (Step 18).

A :class:`Notification` is either *private* (``user`` set, only that user
sees it) or *global/admin* (``user`` is ``NULL``, only staff/superusers
see it). The four ``notification_type`` values map onto the existing
medical UI colour palette: info=blue, success=teal, warning=orange,
danger=red.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class Notification(models.Model):
    TYPE_INFO = "info"
    TYPE_SUCCESS = "success"
    TYPE_WARNING = "warning"
    TYPE_DANGER = "danger"
    TYPE_CHOICES = (
        (TYPE_INFO, "Information"),
        (TYPE_SUCCESS, "Succès"),
        (TYPE_WARNING, "Avertissement"),
        (TYPE_DANGER, "Alerte"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        help_text=(
            "Destinataire. Laisser vide pour une notification globale "
            "visible uniquement par les administrateurs."
        ),
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_INFO,
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("is_read", "-created_at")
        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover - admin display only
        target = self.user.username if self.user_id else "global"
        return f"[{self.notification_type}] {self.title} → {target}"

    @property
    def is_global(self) -> bool:
        return self.user_id is None
