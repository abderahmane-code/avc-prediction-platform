"""Helpers for the 3-level risk interpretation and rule-based explanation.

Step 17 — purely presentational. The ML inference still produces the binary
``prediction`` flag and the continuous ``risk_probability`` like before; this
module only translates that probability into a 3-level interpretation
(``Faible`` / ``Moyen`` / ``Élevé``) and lists the simple clinical factors
present in the patient data so the UI can show them next to the result.

This is *not* a SHAP/LIME-style model explanation — it is a transparent
rule-based helper, on purpose. The disclaimer in the templates makes that
explicit to clinicians.
"""

from __future__ import annotations


# --------------------------------------------------------------------------- #
# 3-level risk interpretation
# --------------------------------------------------------------------------- #

LEVEL_LOW = "low"
LEVEL_MEDIUM = "medium"
LEVEL_HIGH = "high"

# Long French label (used in the prominent "Risque ___" line).
LEVEL_LABELS = {
    LEVEL_LOW: "Risque faible",
    LEVEL_MEDIUM: "Risque moyen",
    LEVEL_HIGH: "Risque élevé",
}

# Short French label (used in compact badges/chips and the PDF).
LEVEL_SHORT = {
    LEVEL_LOW: "Faible",
    LEVEL_MEDIUM: "Moyen",
    LEVEL_HIGH: "Élevé",
}

# Maps every level to the existing CSS modifier suffix on .badge--/.chip--/
# .filter-chip--/.card--risk-/.risk-summary__value-- so we re-use what's
# already in style.css. ``moderate`` is the existing amber/orange variant.
LEVEL_CSS = {
    LEVEL_LOW: "low",
    LEVEL_MEDIUM: "moderate",
    LEVEL_HIGH: "high",
}

# Public-facing notes shown alongside the 3-level interpretation and the
# factors list. Centralised here so they stay consistent across the result
# page, detail page, and PDF report.
RISK_LEVEL_NOTE = (
    "Ce niveau est calculé à partir de la probabilité estimée par le "
    "modèle IA."
)
FACTORS_NOTE = (
    "Ces facteurs sont affichés à titre indicatif et ne remplacent pas "
    "une interprétation médicale."
)
NO_FACTOR_MESSAGE = "Aucun facteur majeur détecté dans les données fournies."


def compute_risk_level(probability: float | int | None) -> dict:
    """Return a 3-level risk interpretation derived from ``probability``.

    ``probability`` is the model's ``risk_probability`` in ``[0, 1]`` (the
    same value persisted on :class:`PredictionResult`). Out-of-range and
    ``None`` values are clamped/treated as 0 so the UI never crashes.

    The returned dict contains the localized labels plus ``css`` (the
    existing modifier suffix on `.badge--*` / `.chip--*` / `.card--risk-*`
    so templates can render the right colour without further branching).
    """
    raw = float(probability) if probability is not None else 0.0
    pct = max(0.0, min(1.0, raw)) * 100

    if pct <= 30:
        key = LEVEL_LOW
    elif pct <= 60:
        key = LEVEL_MEDIUM
    else:
        key = LEVEL_HIGH

    return {
        "key": key,
        "label": LEVEL_LABELS[key],
        "short": LEVEL_SHORT[key],
        "css": LEVEL_CSS[key],
        "probability_pct": pct,
        "probability_pct_int": int(round(pct)),
    }


# --------------------------------------------------------------------------- #
# Rule-based factors
# --------------------------------------------------------------------------- #

# PatientData stores ``smoking_status`` using the dataset's English values.
_SMOKER_VALUES = frozenset({"smokes", "formerly smoked"})


def compute_factors(patient) -> list[str]:
    """Return the rule-based clinical factors detected on a patient row.

    The mapping follows the spec in Step 17:

    * ``age >= 60``                              → ``Âge avancé``
    * ``hypertension``                           → ``Hypertension``
    * ``heart_disease``                          → ``Maladie cardiaque``
    * ``avg_glucose_level >= 140``               → ``Niveau de glucose élevé``
    * ``bmi >= 30``                              → ``IMC élevé``
    * ``smoking_status`` in {smokes, formerly}   → ``Antécédents de tabagisme``

    The returned list is empty when no factor is detected; callers should
    show the :data:`NO_FACTOR_MESSAGE` empty-state in that case.
    """
    factors: list[str] = []

    age = getattr(patient, "age", None)
    if age is not None and age >= 60:
        factors.append("Âge avancé")

    if getattr(patient, "hypertension", False):
        factors.append("Hypertension")

    if getattr(patient, "heart_disease", False):
        factors.append("Maladie cardiaque")

    glucose = getattr(patient, "avg_glucose_level", None)
    if glucose is not None and glucose >= 140:
        factors.append("Niveau de glucose élevé")

    bmi = getattr(patient, "bmi", None)
    if bmi is not None and bmi >= 30:
        factors.append("IMC élevé")

    if getattr(patient, "smoking_status", None) in _SMOKER_VALUES:
        factors.append("Antécédents de tabagisme")

    return factors
