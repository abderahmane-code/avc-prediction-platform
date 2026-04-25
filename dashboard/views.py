"""Dashboard view for the AVC prediction platform.

Every metric on the dashboard is read from PostgreSQL:

* :class:`PredictionResult` powers the ``Prédictions totales`` /
  ``Cas à risque élevé`` stat cards and the ``Prédictions récentes`` table.
* :class:`AIModelPerformance` powers the ``Meilleur modèle`` /
  ``Précision moyenne`` stat cards, the comparison table, and the
  Chart.js dataset.

The page deliberately renders cleanly when either table is empty: stat
cards fall back to ``—`` placeholders, the comparison table shows a
``train_ai_models`` hint, the chart card swaps in an empty-state, and the
recent-predictions table shows ``Aucune prédiction enregistrée pour le
moment.``
"""

from django.contrib.auth.decorators import login_required
from django.db.models import Avg
from django.shortcuts import render

from ai_models.models import AIModelPerformance
from prediction.models import PredictionResult


# Number of rows shown in the "Prédictions récentes" card.
RECENT_PREDICTIONS_LIMIT = 5


def home(request):
    """Public landing page rendered at ``/``.

    Available to everyone — does not require authentication. CTAs adapt to
    the current auth state: anonymous users see ``Se connecter`` / ``Créer un
    compte`` and the "secured" CTAs (``Commencer une prédiction``, ``Voir la
    comparaison des modèles``) bounce through the login flow via
    ``?next=…``. Authenticated users see ``Tableau de bord`` /
    ``Commencer une prédiction`` / ``Voir la comparaison des modèles``.
    """
    return render(request, "landing.html")


def _model_perf_payload(perf: AIModelPerformance) -> dict:
    """Map an :class:`AIModelPerformance` row to the dict the template expects."""
    return {
        "name": perf.model_name,
        "accuracy": perf.accuracy,
        "precision": perf.precision,
        "recall": perf.recall,
        "f1": perf.f1_score,
        "roc_auc": perf.roc_auc,
        "is_best": perf.is_best_model,
    }


def _recent_prediction_payload(prediction: PredictionResult) -> dict:
    """Build the per-row dict used by the ``Prédictions récentes`` card."""
    patient = prediction.patient_data
    proba_pct = max(0.0, min(1.0, prediction.risk_probability)) * 100
    return {
        "id": prediction.pk,
        "created_at": prediction.created_at,
        "age": patient.age,
        "is_high": bool(prediction.prediction),
        "risk_label": prediction.risk_label,
        "probability": prediction.risk_probability,
        "probability_pct": proba_pct,
        "model_name": prediction.model_name,
    }


@login_required
def dashboard(request):
    """Render the main AVC prediction dashboard, fully backed by PostgreSQL.

    Stat cards / recent predictions are scoped to ``request.user`` so each
    clinician only sees their own activity. Model performance metrics are
    global (they reflect the trained AI models, not user data).
    """
    perfs = list(
        AIModelPerformance.objects.all().order_by(
            "-is_best_model", "-f1_score", "model_name"
        )
    )
    models_comparison = [_model_perf_payload(p) for p in perfs]
    has_models = bool(models_comparison)

    best_perf = next((p for p in perfs if p.is_best_model), None)
    avg_precision = AIModelPerformance.objects.aggregate(v=Avg("precision"))["v"]

    user_predictions = PredictionResult.objects.filter(user=request.user)
    total_predictions = user_predictions.count()
    high_risk_count = user_predictions.filter(prediction=True).count()

    if total_predictions:
        if high_risk_count:
            high_risk_pct = (high_risk_count / total_predictions) * 100
            high_risk_delta = f"{high_risk_pct:.1f} % du total".replace(".", ",")
        else:
            high_risk_delta = "Aucune prédiction à risque pour le moment"
    else:
        high_risk_delta = "Aucune donnée pour le moment"

    if best_perf is not None:
        best_label = best_perf.model_name
        best_delta = f"F1 = {best_perf.f1_score:.3f}".replace(".", ",")
    else:
        best_label = "—"
        best_delta = "Aucun modèle entraîné"

    if avg_precision is not None:
        avg_value = f"{avg_precision * 100:.1f} %".replace(".", ",")
        avg_delta = f"sur {len(perfs)} modèle{'s' if len(perfs) > 1 else ''}"
    else:
        avg_value = "—"
        avg_delta = "Lancer 'python manage.py train_ai_models'"

    stats = [
        {
            "label": "Prédictions totales",
            "value": f"{total_predictions:,}".replace(",", " "),
            "delta": (
                "Toutes prédictions confondues"
                if total_predictions
                else "Aucune donnée pour le moment"
            ),
            "icon": "activity",
            "accent": "blue",
        },
        {
            "label": "Cas à risque élevé",
            "value": f"{high_risk_count}",
            "delta": high_risk_delta,
            "icon": "alert",
            "accent": "red",
        },
        {
            "label": "Meilleur modèle",
            "value": best_label,
            "delta": best_delta,
            "icon": "trophy",
            "accent": "teal",
        },
        {
            "label": "Précision moyenne",
            "value": avg_value,
            "delta": avg_delta,
            "icon": "target",
            "accent": "blue",
        },
    ]

    recent_qs = (
        user_predictions.select_related("patient_data")
        .order_by("-created_at")[:RECENT_PREDICTIONS_LIMIT]
    )
    recent_predictions = [_recent_prediction_payload(p) for p in recent_qs]

    context = {
        "page_title": "Tableau de bord",
        "active_nav": "dashboard",
        "stats": stats,
        "models_comparison": models_comparison,
        "has_models": has_models,
        "recent_predictions": recent_predictions,
        "has_recent_predictions": bool(recent_predictions),
        "total_predictions": total_predictions,
    }
    return render(request, "dashboard/dashboard.html", context)
