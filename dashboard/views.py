from django.db.models import Avg
from django.shortcuts import render

from ai_models.models import AIModelPerformance
from prediction.models import PatientData, PredictionResult


PLACEHOLDER_RECOMMENDATION = (
    "Le modèle d'IA sera connecté au formulaire dans une prochaine étape : "
    "les recommandations cliniques afficheront alors la sortie réelle du "
    "modèle pour chaque patient."
)


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


def dashboard(request):
    """Render the main AVC prediction dashboard.

    The model-comparison table, the "Meilleur modèle" / "Précision moyenne"
    stat cards and the Chart.js dataset are all backed by the
    :class:`AIModelPerformance` rows in PostgreSQL. When that table is empty
    (e.g. before the very first ``manage.py train_ai_models`` run) every
    metric falls back to a ``—`` placeholder and the page still renders.
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

    total_predictions = PredictionResult.objects.count() or PatientData.objects.count()
    high_risk_count = PredictionResult.objects.filter(prediction=True).count()

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
            "delta": "Patients enregistrés" if total_predictions else "Aucune donnée pour le moment",
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

    sample_result = {
        "risk_label": "À venir",
        "risk_level": "low",
        "probability": 0.0,
        "model": best_label if has_models else "—",
        "recommendation": PLACEHOLDER_RECOMMENDATION,
        "contributors": [
            ("Hypertension", "—"),
            ("Glycémie moyenne", "—"),
            ("IMC", "—"),
            ("Âge", "—"),
        ],
    }

    context = {
        "page_title": "Tableau de bord",
        "active_nav": "dashboard",
        "stats": stats,
        "sample_result": sample_result,
        "models_comparison": models_comparison,
        "has_models": has_models,
    }
    return render(request, "dashboard/dashboard.html", context)
