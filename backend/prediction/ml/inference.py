"""Live stroke-risk inference: load saved artifacts and score a PatientData row.

This module is the single entry point used by Django views to run a prediction
on a saved :class:`prediction.models.PatientData` instance. It mirrors the
feature contract of :mod:`prediction.ml.train_models` exactly, including the
``Residence_type`` capitalisation and the ``ever_married`` ``Yes/No`` strings
expected by the fitted ``ColumnTransformer``.

Usage::

    from prediction.ml.inference import predict_for_patient, MissingModelError
    try:
        result = predict_for_patient(patient_data)
    except MissingModelError:
        ...  # show 'le modèle IA n'est pas encore entraîné' message
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import joblib
import numpy as np
import pandas as pd

from .train_models import (
    ALL_FEATURES,
    BEST_MODEL_PATH,
    METRICS_PATH,
    PREPROCESSOR_PATH,
)


# --------------------------------------------------------------------------- #
# Public surface
# --------------------------------------------------------------------------- #

# User-facing strings (kept here so views/templates stay free of business
# rules). Wording is exactly what the spec mandates.
RISK_LABEL_HIGH = "Risque élevé"
RISK_LABEL_LOW = "Risque faible"

RECOMMENDATION_HIGH = (
    "Ce patient présente un risque élevé d'AVC. Une évaluation médicale "
    "approfondie est recommandée."
)
RECOMMENDATION_LOW = (
    "Le risque estimé est faible selon les données fournies. Il est "
    "recommandé de maintenir un suivi médical régulier."
)

MISSING_MODEL_MESSAGE = (
    "Le modèle IA n'est pas encore entraîné. Veuillez exécuter la commande : "
    "python manage.py train_ai_models"
)


class MissingModelError(RuntimeError):
    """Raised when ``best_model.pkl`` or ``preprocessor.pkl`` is unavailable."""

    def __init__(self, missing: list[Path]) -> None:
        super().__init__(MISSING_MODEL_MESSAGE)
        self.missing = list(missing)


@dataclass(frozen=True)
class PredictionOutput:
    """Bag of values ready to be written to a :class:`PredictionResult`."""

    prediction: bool
    risk_label: str
    risk_probability: float
    recommendation: str
    model_name: str


# --------------------------------------------------------------------------- #
# Loading / caching
# --------------------------------------------------------------------------- #

# A single in-process cache. Models are pickled scikit-learn objects so they
# are safe to share across threads for read-only inference.
_LOCK = Lock()
_CACHE: dict = {"signature": None, "preprocessor": None, "model": None, "name": None}


def _artifact_signature() -> tuple:
    """Return ``(mtime, size)`` for each artifact so we can invalidate the cache."""
    out = []
    for p in (PREPROCESSOR_PATH, BEST_MODEL_PATH):
        try:
            stat = p.stat()
            out.append((str(p), stat.st_mtime_ns, stat.st_size))
        except FileNotFoundError:
            out.append((str(p), None, None))
    return tuple(out)


def _read_best_model_name() -> str:
    """Return the model name from ``model_metrics.json``, or a sensible default."""
    if METRICS_PATH.exists():
        try:
            payload = json.loads(METRICS_PATH.read_text())
            name = payload.get("best_model")
            if isinstance(name, str) and name:
                return name
        except (json.JSONDecodeError, OSError):
            pass
    return "Modèle IA"


def _load_artifacts() -> tuple[object, object, str]:
    """Return ``(preprocessor, model, model_name)``.

    Raises :class:`MissingModelError` if either pkl file is missing on disk.
    Results are cached and invalidated whenever the artifacts' mtime changes,
    so re-running ``manage.py train_ai_models`` does NOT require a server
    restart.
    """
    missing = [p for p in (PREPROCESSOR_PATH, BEST_MODEL_PATH) if not p.exists()]
    if missing:
        raise MissingModelError(missing)

    sig = _artifact_signature()
    with _LOCK:
        if _CACHE["signature"] != sig:
            _CACHE["preprocessor"] = joblib.load(PREPROCESSOR_PATH)
            _CACHE["model"] = joblib.load(BEST_MODEL_PATH)
            _CACHE["name"] = _read_best_model_name()
            _CACHE["signature"] = sig
        return _CACHE["preprocessor"], _CACHE["model"], _CACHE["name"]


# --------------------------------------------------------------------------- #
# Feature mapping
# --------------------------------------------------------------------------- #

def _patient_to_dataframe(patient) -> pd.DataFrame:
    """Convert a saved :class:`PatientData` row to the training feature schema.

    Two model→dataset name mismatches that must be handled here:

    * Django field ``residence_type`` ↔ training feature ``Residence_type``.
    * Django booleans (True/False) ↔ training values:
        - ``hypertension`` / ``heart_disease`` → 0/1 ints (binary passthrough)
        - ``ever_married`` → "Yes" / "No" strings (categorical one-hot)
    """
    row = {
        "gender": patient.gender,
        "age": float(patient.age),
        "hypertension": int(bool(patient.hypertension)),
        "heart_disease": int(bool(patient.heart_disease)),
        "ever_married": "Yes" if patient.ever_married else "No",
        "work_type": patient.work_type,
        "Residence_type": patient.residence_type,
        "avg_glucose_level": float(patient.avg_glucose_level),
        "bmi": float(patient.bmi),
        "smoking_status": patient.smoking_status,
    }
    return pd.DataFrame([row], columns=ALL_FEATURES)


# --------------------------------------------------------------------------- #
# Probability helper
# --------------------------------------------------------------------------- #

def _risk_probability(model, X) -> tuple[float, int]:
    """Return ``(probability_of_class_1, predicted_class)``.

    Falls back gracefully through three strategies:

    1. ``predict_proba`` — read column for class 1 if available.
    2. ``decision_function`` — squash through a logistic to get a [0, 1] value.
    3. Bare ``predict`` — return ``1.0`` for positive, ``0.0`` for negative.
    """
    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(X)[0]
            classes = list(getattr(model, "classes_", []))
            if 1 in classes:
                p_pos = float(proba[classes.index(1)])
            else:
                # Single-class fallback: take last column.
                p_pos = float(proba[-1])
            return p_pos, int(p_pos >= 0.5)
        except Exception:  # noqa: BLE001 - sklearn can raise many things
            pass

    if hasattr(model, "decision_function"):
        try:
            score = float(np.ravel(model.decision_function(X))[0])
            p_pos = float(1.0 / (1.0 + np.exp(-score)))
            return p_pos, int(p_pos >= 0.5)
        except Exception:  # noqa: BLE001
            pass

    pred = int(model.predict(X)[0])
    return (1.0 if pred == 1 else 0.0), pred


# --------------------------------------------------------------------------- #
# Top-level entry point
# --------------------------------------------------------------------------- #

def predict_for_patient(patient) -> PredictionOutput:
    """Run inference on a saved :class:`PatientData`.

    Raises :class:`MissingModelError` if the artifacts are not on disk.
    """
    preprocessor, model, model_name = _load_artifacts()

    df = _patient_to_dataframe(patient)
    X = preprocessor.transform(df)
    proba, pred = _risk_probability(model, X)

    is_high = bool(pred)
    return PredictionOutput(
        prediction=is_high,
        risk_label=RISK_LABEL_HIGH if is_high else RISK_LABEL_LOW,
        risk_probability=float(max(0.0, min(1.0, proba))),
        recommendation=RECOMMENDATION_HIGH if is_high else RECOMMENDATION_LOW,
        model_name=model_name,
    )


def reset_cache() -> None:
    """Drop the in-process artifact cache (used by tests)."""
    with _LOCK:
        _CACHE.update(signature=None, preprocessor=None, model=None, name=None)


__all__ = [
    "MissingModelError",
    "MISSING_MODEL_MESSAGE",
    "PredictionOutput",
    "predict_for_patient",
    "reset_cache",
    "RECOMMENDATION_HIGH",
    "RECOMMENDATION_LOW",
    "RISK_LABEL_HIGH",
    "RISK_LABEL_LOW",
]
