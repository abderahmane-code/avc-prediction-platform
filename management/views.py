"""Platform management views (staff-only).

These views give administrators a consultation/monitoring area at
``/gestion/`` covering global stats, user management, and a global
prediction list. They are *read-only* on purpose — no destructive actions
(no delete, no password reset). Django admin remains available at
``/admin/`` for advanced operations.
"""

from functools import wraps

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db.models import Avg, Count, Q
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, render

from ai_models.models import AIModelPerformance
from prediction.models import PredictionResult
from prediction.risk import compute_risk_level


User = get_user_model()


def staff_required(view_func):
    """Decorator: allow only staff/superusers; otherwise 403 with FR message.

    Anonymous users are first bounced through ``@login_required``. Logged-in
    normal users get a 403 page with the canonical French denial string so
    the error is consistent across all admin routes.
    """

    @wraps(view_func)
    @login_required
    def _wrapped(request, *args, **kwargs):
        user = request.user
        if not (user.is_staff or user.is_superuser):
            messages.error(request, "Accès réservé aux administrateurs.")
            return HttpResponseForbidden(
                render(
                    request,
                    "management/forbidden.html",
                    {"page_title": "Accès refusé"},
                ).content
            )
        return view_func(request, *args, **kwargs)

    return _wrapped


# --------------------------------------------------------------------------- #
# /gestion/  — global platform dashboard
# --------------------------------------------------------------------------- #


@staff_required
def dashboard(request):
    total_users = User.objects.count()
    total_predictions = PredictionResult.objects.count()
    high = PredictionResult.objects.filter(prediction=True).count()
    low = total_predictions - high

    perfs_count = AIModelPerformance.objects.count()
    best_perf = AIModelPerformance.objects.filter(is_best_model=True).first()
    avg_precision = AIModelPerformance.objects.aggregate(v=Avg("precision"))["v"]

    if total_predictions:
        high_pct = high / total_predictions * 100
        low_pct = low / total_predictions * 100
    else:
        high_pct = low_pct = 0.0

    stats = [
        {
            "label": "Utilisateurs",
            "value": f"{total_users}",
            "delta": "Comptes enregistrés",
            "icon": "users",
            "accent": "blue",
        },
        {
            "label": "Prédictions totales",
            "value": f"{total_predictions:,}".replace(",", " "),
            "delta": "Toutes prédictions confondues",
            "icon": "activity",
            "accent": "blue",
        },
        {
            "label": "Cas à risque élevé",
            "value": f"{high}",
            "delta": (
                f"{high_pct:.1f} % du total".replace(".", ",")
                if total_predictions
                else "Aucune donnée"
            ),
            "icon": "alert",
            "accent": "red",
        },
        {
            "label": "Cas à risque faible",
            "value": f"{low}",
            "delta": (
                f"{low_pct:.1f} % du total".replace(".", ",")
                if total_predictions
                else "Aucune donnée"
            ),
            "icon": "activity",
            "accent": "teal",
        },
        {
            "label": "Modèles entraînés",
            "value": f"{perfs_count}",
            "delta": (
                "Voir la comparaison"
                if perfs_count
                else "Lancer 'python manage.py train_ai_models'"
            ),
            "icon": "trophy",
            "accent": "blue",
        },
        {
            "label": "Meilleur modèle",
            "value": best_perf.model_name if best_perf else "—",
            "delta": (
                f"F1 = {best_perf.f1_score:.3f}".replace(".", ",")
                if best_perf
                else "Aucun modèle entraîné"
            ),
            "icon": "trophy",
            "accent": "teal",
        },
        {
            "label": "Précision moyenne",
            "value": (
                f"{avg_precision * 100:.1f} %".replace(".", ",")
                if avg_precision is not None
                else "—"
            ),
            "delta": (
                f"sur {perfs_count} modèle{'s' if perfs_count > 1 else ''}"
                if perfs_count
                else "Aucun modèle entraîné"
            ),
            "icon": "trophy",
            "accent": "blue",
        },
        {
            "label": "Rapports PDF",
            "value": "Disponible",
            "delta": "Disponible depuis les détails",
            "icon": "activity",
            "accent": "teal",
        },
    ]

    context = {
        "page_title": "Gestion de la plateforme",
        "active_nav": "management",
        "stats": stats,
    }
    return render(request, "management/dashboard.html", context)


# --------------------------------------------------------------------------- #
# /gestion/utilisateurs/  — user list with filters
# --------------------------------------------------------------------------- #


_USER_FILTERS = {
    "all": "Tous les utilisateurs",
    "staff": "Staff uniquement",
    "users": "Utilisateurs normaux",
    "active": "Actifs uniquement",
}


@staff_required
def users_list(request):
    selected = request.GET.get("filter", "all")
    if selected not in _USER_FILTERS:
        selected = "all"

    qs = User.objects.all().annotate(
        prediction_count=Count("prediction_results", distinct=True)
    )
    if selected == "staff":
        qs = qs.filter(Q(is_staff=True) | Q(is_superuser=True))
    elif selected == "users":
        qs = qs.filter(is_staff=False, is_superuser=False)
    elif selected == "active":
        qs = qs.filter(is_active=True)

    qs = qs.order_by("-date_joined")

    rows = [
        {
            "id": u.pk,
            "username": u.get_username(),
            "email": u.email or "",
            "date_joined": u.date_joined,
            "last_login": u.last_login,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "is_active": u.is_active,
            "prediction_count": u.prediction_count,
        }
        for u in qs
    ]

    filters = [
        {"value": key, "label": label, "active": key == selected}
        for key, label in _USER_FILTERS.items()
    ]

    context = {
        "page_title": "Utilisateurs",
        "active_nav": "management",
        "users": rows,
        "filters": filters,
        "selected_filter": selected,
        "total_count": len(rows),
    }
    return render(request, "management/users_list.html", context)


# --------------------------------------------------------------------------- #
# /gestion/utilisateurs/<id>/  — user detail
# --------------------------------------------------------------------------- #


@staff_required
def user_detail(request, user_id: int):
    user = get_object_or_404(User, pk=user_id)
    preds = PredictionResult.objects.filter(user=user).select_related("patient_data")
    total = preds.count()
    high = preds.filter(prediction=True).count()
    low = total - high

    if user.is_superuser:
        account_type = "Administrateur"
    elif user.is_staff:
        account_type = "Administrateur"
    else:
        account_type = "Utilisateur"

    recent = []
    for p in preds.order_by("-created_at")[:10]:
        recent.append({
            "id": p.pk,
            "created_at": p.created_at,
            "age": p.patient_data.age,
            "is_high": bool(p.prediction),
            "risk_label": p.risk_label,
            "probability_pct": max(0.0, min(1.0, p.risk_probability)) * 100,
            "model_name": p.model_name,
            "risk_level": compute_risk_level(p.risk_probability),
        })

    context = {
        "page_title": user.get_username(),
        "active_nav": "management",
        "u": user,
        "account_type": account_type,
        "total": total,
        "high": high,
        "low": low,
        "recent": recent,
    }
    return render(request, "management/user_detail.html", context)


# --------------------------------------------------------------------------- #
# /gestion/predictions/  — global predictions with filters
# --------------------------------------------------------------------------- #


_PRED_FILTERS = {
    "all": "Toutes",
    "high": "Risque élevé",
    "low": "Risque faible",
}


@staff_required
def predictions_list(request):
    selected = request.GET.get("filter", "all")
    if selected not in _PRED_FILTERS:
        selected = "all"

    qs = PredictionResult.objects.select_related("user", "patient_data")
    if selected == "high":
        qs = qs.filter(prediction=True)
    elif selected == "low":
        qs = qs.filter(prediction=False)

    qs = qs.order_by("-created_at")[:200]

    rows = [
        {
            "id": p.pk,
            "created_at": p.created_at,
            "username": p.user.get_username() if p.user else "—",
            "age": p.patient_data.age,
            "is_high": bool(p.prediction),
            "risk_label": p.risk_label,
            "probability_pct": max(0.0, min(1.0, p.risk_probability)) * 100,
            "model_name": p.model_name,
            "risk_level": compute_risk_level(p.risk_probability),
        }
        for p in qs
    ]

    filters = [
        {"value": key, "label": label, "active": key == selected}
        for key, label in _PRED_FILTERS.items()
    ]

    context = {
        "page_title": "Prédictions globales",
        "active_nav": "management",
        "rows": rows,
        "filters": filters,
        "selected_filter": selected,
        "total_count": len(rows),
    }
    return render(request, "management/predictions_list.html", context)
