"""Train and compare stroke-prediction models on the public stroke dataset.

Usage
-----
    python prediction/ml/train_models.py [--csv path/to/data.csv]

The script expects the Kaggle "healthcare-dataset-stroke-data.csv" file at
``prediction/ml/data/healthcare-dataset-stroke-data.csv`` by default.  After
training it writes three artifacts to ``prediction/ml/artifacts/``:

* ``preprocessor.pkl``  – fitted ColumnTransformer (scaling + one-hot encoding)
* ``best_model.pkl``    – best-F1 estimator
* ``model_metrics.json`` – per-model metrics, dataset / split sizes, best name

Stroke datasets are typically heavily imbalanced (~5 % positive class), so the
script:

* uses a stratified train / test split,
* passes ``zero_division=0`` to all sklearn metrics, and
* sets ``class_weight="balanced"`` for the models that support it
  (Logistic Regression, Decision Tree, Random Forest, Linear-SVM).

Only the modeling pipeline is implemented here – integration into the Django
views is deliberately deferred to a later step.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier


# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #

ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
ARTIFACTS_DIR = ML_DIR / "artifacts"
DEFAULT_CSV = DATA_DIR / "healthcare-dataset-stroke-data.csv"

PREPROCESSOR_PATH = ARTIFACTS_DIR / "preprocessor.pkl"
BEST_MODEL_PATH = ARTIFACTS_DIR / "best_model.pkl"
METRICS_PATH = ARTIFACTS_DIR / "model_metrics.json"

TARGET = "stroke"
NUMERIC_FEATURES = ["age", "avg_glucose_level", "bmi"]
CATEGORICAL_FEATURES = [
    "gender",
    "ever_married",
    "work_type",
    "Residence_type",
    "smoking_status",
]
BINARY_FEATURES = ["hypertension", "heart_disease"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES + BINARY_FEATURES


# --------------------------------------------------------------------------- #
# Data loading & cleaning
# --------------------------------------------------------------------------- #

def load_dataset(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Dataset CSV not found at: {csv_path}\n"
            "Place 'healthcare-dataset-stroke-data.csv' inside "
            "prediction/ml/data/ — see README.md for details."
        )
    df = pd.read_csv(csv_path)
    if "id" in df.columns:
        df = df.drop(columns=["id"])
    missing = [c for c in ALL_FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset is missing required columns: {missing}\n"
            f"Expected columns: {ALL_FEATURES + [TARGET]}"
        )
    df = df[ALL_FEATURES + [TARGET]].copy()
    return df


def build_preprocessor() -> ColumnTransformer:
    """Numeric: median impute + StandardScaler. Categorical: OneHot. Binary: passthrough."""
    numeric = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer(
        transformers=[
            ("num", numeric, NUMERIC_FEATURES),
            ("cat", categorical, CATEGORICAL_FEATURES),
            ("bin", "passthrough", BINARY_FEATURES),
        ],
        verbose_feature_names_out=False,
    )


# --------------------------------------------------------------------------- #
# Model definitions
# --------------------------------------------------------------------------- #

def get_models(random_state: int = 42) -> Dict[str, object]:
    return {
        "Logistic Regression": LogisticRegression(
            max_iter=2000, class_weight="balanced", random_state=random_state
        ),
        "KNN": KNeighborsClassifier(n_neighbors=5),
        "Decision Tree": DecisionTreeClassifier(
            class_weight="balanced", random_state=random_state
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=300,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        ),
        "SVM": SVC(
            kernel="rbf",
            probability=True,
            class_weight="balanced",
            random_state=random_state,
        ),
        "Naive Bayes": GaussianNB(),
    }


# --------------------------------------------------------------------------- #
# Training & evaluation
# --------------------------------------------------------------------------- #

def evaluate(model, X_test, y_test) -> Tuple[Dict[str, float], np.ndarray]:
    y_pred = model.predict(X_test)

    proba = None
    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(X_test)[:, 1]
        except Exception:
            proba = None
    if proba is None and hasattr(model, "decision_function"):
        try:
            proba = model.decision_function(X_test)
        except Exception:
            proba = None

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": None,
    }

    if proba is not None and len(np.unique(y_test)) > 1:
        try:
            metrics["roc_auc"] = float(roc_auc_score(y_test, proba))
        except ValueError:
            metrics["roc_auc"] = None
    return metrics, y_pred


def print_table(rows: Dict[str, Dict[str, float]], best_name: str) -> None:
    headers = ["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]
    widths = [max(20, len(headers[0])), 9, 9, 9, 9, 9]

    def fmt_row(values):
        return "  ".join(str(v).ljust(w) for v, w in zip(values, widths))

    sep = "-" * (sum(widths) + 2 * (len(widths) - 1))
    print(sep)
    print(fmt_row(headers))
    print(sep)
    for name, m in rows.items():
        marker = " *" if name == best_name else ""
        print(fmt_row([
            f"{name}{marker}",
            f"{m['accuracy']:.4f}",
            f"{m['precision']:.4f}",
            f"{m['recall']:.4f}",
            f"{m['f1_score']:.4f}",
            "n/a" if m["roc_auc"] is None else f"{m['roc_auc']:.4f}",
        ]))
    print(sep)
    print(f"  * = best F1-score (selected for deployment): {best_name}")


# --------------------------------------------------------------------------- #
# Reusable orchestration
# --------------------------------------------------------------------------- #

def train_and_persist(
    csv_path: Path = DEFAULT_CSV,
    test_size: float = 0.2,
    random_state: int = 42,
    verbose: bool = True,
) -> dict:
    """Train all models on ``csv_path``, save artifacts, return the metrics payload.

    The returned payload is the same structure that gets written to
    ``model_metrics.json`` and is the public contract used by callers such as
    the ``train_ai_models`` Django management command.

    Raises
    ------
    FileNotFoundError
        If ``csv_path`` does not exist (re-raised from :func:`load_dataset`).
    """
    log = print if verbose else (lambda *a, **k: None)

    log(f"[1/5] Loading dataset from {csv_path} ...")
    df = load_dataset(csv_path)
    log(f"      rows={len(df)}  positives={int(df[TARGET].sum())} "
        f"({df[TARGET].mean()*100:.2f}%)  features={len(ALL_FEATURES)}")

    X = df[ALL_FEATURES]
    y = df[TARGET].astype(int)

    log(f"[2/5] Stratified train/test split (test_size={test_size}) ...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )
    log(f"      train={len(X_train)}  test={len(X_test)}  "
        f"train_pos={int(y_train.sum())}  test_pos={int(y_test.sum())}")

    log("[3/5] Fitting preprocessor (impute + scale + one-hot) ...")
    preprocessor = build_preprocessor()
    X_train_t = preprocessor.fit_transform(X_train)
    X_test_t = preprocessor.transform(X_test)
    log(f"      transformed shape: {X_train_t.shape}")

    log("[4/5] Training models ...")
    models = get_models(random_state=random_state)
    fitted: Dict[str, object] = {}
    metrics: Dict[str, Dict[str, float]] = {}
    for name, model in models.items():
        t0 = time.time()
        model.fit(X_train_t, y_train)
        m, _ = evaluate(model, X_test_t, y_test)
        m["fit_time_seconds"] = round(time.time() - t0, 3)
        fitted[name] = model
        metrics[name] = m
        roc_str = "n/a" if m["roc_auc"] is None else f"{m['roc_auc']:.4f}"
        log(f"      - {name:<22} f1={m['f1_score']:.4f}  acc={m['accuracy']:.4f}  "
            f"roc_auc={roc_str}  ({m['fit_time_seconds']}s)")

    best_name = max(metrics.keys(), key=lambda n: metrics[n]["f1_score"])
    best_model = fitted[best_name]

    log("[5/5] Saving artifacts ...")
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    joblib.dump(best_model, BEST_MODEL_PATH)

    payload = {
        "best_model": best_name,
        "best_model_path": str(BEST_MODEL_PATH.relative_to(ML_DIR.parent.parent)),
        "preprocessor_path": str(PREPROCESSOR_PATH.relative_to(ML_DIR.parent.parent)),
        "dataset": {
            "csv_path": str(csv_path),
            "rows": int(len(df)),
            "positives": int(df[TARGET].sum()),
            "positive_rate": float(df[TARGET].mean()),
        },
        "split": {
            "test_size": float(test_size),
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "stratified": True,
            "random_state": int(random_state),
        },
        "features": {
            "numeric": NUMERIC_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "binary": BINARY_FEATURES,
        },
        "models": metrics,
    }
    METRICS_PATH.write_text(json.dumps(payload, indent=2))

    log(f"      preprocessor -> {PREPROCESSOR_PATH}")
    log(f"      best_model   -> {BEST_MODEL_PATH}")
    log(f"      metrics      -> {METRICS_PATH}")
    return payload


# --------------------------------------------------------------------------- #
# CLI entry point
# --------------------------------------------------------------------------- #

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Path to the stroke CSV (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--test-size", type=float, default=0.2, help="Test split fraction (default: 0.2)"
    )
    parser.add_argument(
        "--random-state", type=int, default=42, help="Random state (default: 42)"
    )
    args = parser.parse_args(argv)

    payload = train_and_persist(
        csv_path=args.csv,
        test_size=args.test_size,
        random_state=args.random_state,
        verbose=True,
    )
    print()
    print("Model comparison (test set):")
    print_table(payload["models"], payload["best_model"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
