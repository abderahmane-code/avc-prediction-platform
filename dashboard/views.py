from django.shortcuts import render


def dashboard(request):
    """Render the main AVC prediction dashboard.

    All data is currently static placeholder content; the prediction form,
    history and charts will be wired to the database / AI models in later steps.
    """
    context = {
        "page_title": "Tableau de bord",
        "active_nav": "dashboard",
        "stats": [
            {
                "label": "Prédictions totales",
                "value": "1 248",
                "delta": "+12% ce mois",
                "icon": "activity",
                "accent": "blue",
            },
            {
                "label": "Cas à risque élevé",
                "value": "86",
                "delta": "6,9% du total",
                "icon": "alert",
                "accent": "red",
            },
            {
                "label": "Meilleur modèle",
                "value": "Random Forest",
                "delta": "F1 = 0,912",
                "icon": "trophy",
                "accent": "teal",
            },
            {
                "label": "Précision moyenne",
                "value": "93,4%",
                "delta": "sur 5 modèles",
                "icon": "target",
                "accent": "blue",
            },
        ],
        "sample_result": {
            "risk_label": "Élevé",
            "risk_level": "high",
            "probability": 0.87,
            "model": "Random Forest",
            "recommendation": (
                "Un risque élevé d'AVC a été détecté. Il est recommandé de "
                "consulter rapidement un médecin pour un bilan cardiovasculaire "
                "complet et une prise en charge adaptée."
            ),
            "contributors": [
                ("Hypertension", "Élevée"),
                ("Glycémie moyenne", "228 mg/dL"),
                ("IMC", "36,6"),
                ("Âge", "67 ans"),
            ],
        },
        "models_comparison": [
            {
                "name": "Random Forest",
                "accuracy": 0.942,
                "precision": 0.918,
                "recall": 0.905,
                "f1": 0.912,
                "roc_auc": 0.958,
                "is_best": True,
            },
            {
                "name": "Gradient Boosting",
                "accuracy": 0.936,
                "precision": 0.911,
                "recall": 0.894,
                "f1": 0.902,
                "roc_auc": 0.951,
                "is_best": False,
            },
            {
                "name": "Logistic Regression",
                "accuracy": 0.913,
                "precision": 0.880,
                "recall": 0.862,
                "f1": 0.871,
                "roc_auc": 0.930,
                "is_best": False,
            },
            {
                "name": "Support Vector Machine",
                "accuracy": 0.921,
                "precision": 0.895,
                "recall": 0.870,
                "f1": 0.882,
                "roc_auc": 0.936,
                "is_best": False,
            },
            {
                "name": "K-Nearest Neighbors",
                "accuracy": 0.894,
                "precision": 0.851,
                "recall": 0.832,
                "f1": 0.841,
                "roc_auc": 0.905,
                "is_best": False,
            },
        ],
    }
    return render(request, "dashboard/dashboard.html", context)
