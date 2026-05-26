"""Train all stroke-prediction models and persist their metrics to PostgreSQL.

Usage::

    python manage.py train_ai_models [--csv PATH] [--test-size 0.2] [--random-state 42]

The command wraps :func:`prediction.ml.train_models.train_and_persist`:

1. Loads the dataset from ``prediction/ml/data/healthcare-dataset-stroke-data.csv``
   (or ``--csv`` override) and trains the six classifiers, saving
   ``preprocessor.pkl``, ``best_model.pkl`` and ``model_metrics.json`` to
   ``prediction/ml/artifacts/``.
2. Inside a database transaction, deletes every existing
   :class:`ai_models.models.AIModelPerformance` row and inserts one row per
   trained model with the F1-best one flagged via ``is_best_model=True``.

The command does **not** wire the model into the live prediction view — that's
done in a later step. Stroke predictions are still placeholders.
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from ai_models.models import AIModelPerformance
from prediction.ml.train_models import DEFAULT_CSV, train_and_persist


DATASET_NOT_FOUND_MSG = (
    "Dataset not found. Please place healthcare-dataset-stroke-data.csv "
    "inside prediction/ml/data/"
)


class Command(BaseCommand):
    help = (
        "Train all stroke-prediction models, save artifacts under "
        "prediction/ml/artifacts/, and refresh the AIModelPerformance table "
        "in PostgreSQL."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            type=Path,
            default=DEFAULT_CSV,
            help=f"Path to the stroke CSV (default: {DEFAULT_CSV}).",
        )
        parser.add_argument(
            "--test-size",
            type=float,
            default=0.2,
            help="Test split fraction (default: 0.2).",
        )
        parser.add_argument(
            "--random-state",
            type=int,
            default=42,
            help="Random seed (default: 42).",
        )

    def handle(self, *args, **options):
        csv_path: Path = options["csv"]
        test_size: float = options["test_size"]
        random_state: int = options["random_state"]

        if not csv_path.exists():
            raise CommandError(DATASET_NOT_FOUND_MSG)

        try:
            payload = train_and_persist(
                csv_path=csv_path,
                test_size=test_size,
                random_state=random_state,
                verbose=True,
            )
        except FileNotFoundError as exc:
            raise CommandError(DATASET_NOT_FOUND_MSG) from exc

        best_name: str = payload["best_model"]
        models_metrics: dict = payload["models"]

        self.stdout.write("")
        self.stdout.write("Refreshing AIModelPerformance table ...")

        with transaction.atomic():
            deleted, _ = AIModelPerformance.objects.all().delete()
            rows = [
                AIModelPerformance(
                    model_name=name,
                    accuracy=m["accuracy"],
                    precision=m["precision"],
                    recall=m["recall"],
                    f1_score=m["f1_score"],
                    roc_auc=m["roc_auc"],
                    is_best_model=(name == best_name),
                )
                for name, m in models_metrics.items()
            ]
            AIModelPerformance.objects.bulk_create(rows)

        self.stdout.write(
            self.style.SUCCESS(
                f"Replaced {deleted} old row(s) with {len(rows)} new "
                f"AIModelPerformance row(s); best_model={best_name}."
            )
        )
