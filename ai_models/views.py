"""Views for the AI models app.

Step 11 introduces ``/modeles/comparaison/`` — a dedicated, login-protected
page that renders every :class:`AIModelPerformance` row alongside Chart.js
visualisations and a short French explainer about why Recall / F1-score
matter in medical prediction.
"""

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.db.models import Avg
from django.shortcuts import render

from .models import AIModelPerformance


def _model_payload(perf: AIModelPerformance) -> dict:
    """Map a row to the dict shape consumed by the template."""
    return {
        "name": perf.model_name,
        "accuracy": perf.accuracy,
        "precision": perf.precision,
        "recall": perf.recall,
        "f1": perf.f1_score,
        "roc_auc": perf.roc_auc,
        "is_best": perf.is_best_model,
    }


@login_required
def comparison(request):
    """Render the dedicated AI-model comparison page.

    The page is intentionally read-only: training is triggered exclusively
    by ``python manage.py train_ai_models``. When the table is empty the
    spec's empty-state copy is shown.
    """
    perfs = list(
        AIModelPerformance.objects.all().order_by(
            "-is_best_model", "-f1_score", "model_name"
        )
    )
    rows = [_model_payload(p) for p in perfs]
    has_models = bool(rows)

    best = next((r for r in rows if r["is_best"]), None)
    avg_precision = AIModelPerformance.objects.aggregate(v=Avg("precision"))["v"]
    avg_recall = AIModelPerformance.objects.aggregate(v=Avg("recall"))["v"]
    avg_f1 = AIModelPerformance.objects.aggregate(v=Avg("f1_score"))["v"]

    # Chart.js dataset. ROC-AUC may be null in the DB → coerce to 0 for the
    # chart (the table still shows an em-dash for nulls).
    chart_payload = {
        "labels": [r["name"] for r in rows],
        "datasets": [
            {
                "label": "Accuracy",
                "data": [round(r["accuracy"], 4) for r in rows],
            },
            {
                "label": "Precision",
                "data": [round(r["precision"], 4) for r in rows],
            },
            {
                "label": "Recall",
                "data": [round(r["recall"], 4) for r in rows],
            },
            {
                "label": "F1-score",
                "data": [round(r["f1"], 4) for r in rows],
            },
            {
                "label": "ROC-AUC",
                "data": [round(r["roc_auc"] or 0.0, 4) for r in rows],
            },
        ],
        "f1_only": [round(r["f1"], 4) for r in rows],
        "best_index": next(
            (i for i, r in enumerate(rows) if r["is_best"]), -1
        ),
    }

    context = {
        "page_title": "Comparaison des modèles d'IA",
        "active_nav": "models",
        "rows": rows,
        "has_models": has_models,
        "best": best,
        "model_count": len(rows),
        "avg_precision_pct": (
            round(avg_precision * 100, 1) if avg_precision is not None else None
        ),
        "avg_recall_pct": (
            round(avg_recall * 100, 1) if avg_recall is not None else None
        ),
        "avg_f1": round(avg_f1, 3) if avg_f1 is not None else None,
        "chart_payload": chart_payload,
    }
    return render(request, "ai_models/comparison.html", context)
