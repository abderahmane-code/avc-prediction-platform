from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render

from .forms import (
    GENDER_CHOICES_FR,
    RESIDENCE_TYPE_CHOICES_FR,
    SMOKING_STATUS_CHOICES_FR,
    WORK_TYPE_CHOICES_FR,
    PatientDataForm,
)
from .ml.inference import (
    MISSING_MODEL_MESSAGE,
    MissingModelError,
    predict_for_patient,
)
from .models import PatientData, PredictionResult
from .risk import (
    FACTORS_NOTE,
    LEVEL_HIGH,
    NO_FACTOR_MESSAGE,
    RISK_LEVEL_NOTE,
    compute_factors,
    compute_risk_level,
)
from notifications.models import Notification
from notifications.services import notify


def _fr_label(choices, value, fallback=""):
    for stored, label in choices:
        if stored == value:
            return label
    return fallback or value


def _run_inference_and_save(patient: PatientData, user):
    """Run live inference and persist a :class:`PredictionResult` row.

    Returns the created :class:`PredictionResult` on success. Returns ``None``
    when the AI artifacts are not on disk yet (in which case the patient row
    is still saved). Any other inference failure is re-raised so it surfaces
    in logs / Django's debug page.
    """
    try:
        out = predict_for_patient(patient)
    except MissingModelError:
        return None

    return PredictionResult.objects.create(
        user=user if user is not None and user.is_authenticated else None,
        patient_data=patient,
        model_name=out.model_name,
        prediction=out.prediction,
        risk_label=out.risk_label,
        risk_probability=out.risk_probability,
        recommendation=out.recommendation,
    )


def _can_view(user, owner) -> bool:
    """Return True if ``user`` may view a record owned by ``owner``.

    Staff/superusers can see everything; otherwise the user must match the
    owner. ``None`` owner (legacy/anonymous data) is only visible to staff.
    """
    if user.is_authenticated and (user.is_staff or user.is_superuser):
        return True
    if owner is None:
        return False
    return user.is_authenticated and owner.pk == user.pk


@login_required
def new_prediction(request):
    """Render the patient-data form, persist a submission and run a prediction.

    The :class:`PatientData` row is always saved on a valid submission. The
    accompanying :class:`PredictionResult` is only created if the trained
    artifacts are available; otherwise the user is redirected to the result
    page where a French missing-model message is shown.
    """
    if request.method == "POST":
        form = PatientDataForm(request.POST)
        if form.is_valid():
            patient = form.save(commit=False)
            if request.user.is_authenticated:
                patient.user = request.user
            patient.save()

            result = _run_inference_and_save(patient, request.user)
            if result is None:
                messages.warning(request, MISSING_MODEL_MESSAGE)
                # Step 18: notify user the AI model artifacts are missing.
                notify(
                    user=request.user,
                    title="Modèle IA non entraîné",
                    message=(
                        "Le modèle IA n'est pas encore entraîné. "
                        "Veuillez exécuter python manage.py train_ai_models."
                    ),
                    notification_type=Notification.TYPE_WARNING,
                )
            else:
                messages.success(
                    request,
                    f"Prédiction calculée par {result.model_name}.",
                )
                # Step 18: confirm prediction creation.
                notify(
                    user=request.user,
                    title="Prédiction créée",
                    message="Votre prédiction a été enregistrée avec succès.",
                    notification_type=Notification.TYPE_SUCCESS,
                )
                # Step 18: high-risk alert.
                level = compute_risk_level(result.risk_probability)
                if level["key"] == LEVEL_HIGH:
                    notify(
                        user=request.user,
                        title="Risque élevé détecté",
                        message=(
                            "Une prédiction récente indique un risque élevé. "
                            "Consultez le rapport pour plus de détails."
                        ),
                        notification_type=Notification.TYPE_DANGER,
                    )
            return redirect("prediction:result", patient_id=patient.pk)
    else:
        form = PatientDataForm()

    return render(
        request,
        "prediction/new.html",
        {
            "form": form,
            "page_title": "Nouvelle prédiction",
            "active_nav": "new_prediction",
        },
    )


@login_required
def result(request, patient_id: int):
    """Render the live prediction for a given :class:`PatientData`.

    Falls back to a French missing-model message when no
    :class:`PredictionResult` is attached to the patient (which only happens
    when the model artifacts are absent at submission time).

    Owner-scoped: only the user who submitted the patient (or staff) can
    view it. All other users get a 404 to avoid leaking row existence.
    """
    patient = get_object_or_404(PatientData, pk=patient_id)
    if not _can_view(request.user, patient.user):
        raise Http404()
    prediction = (
        PredictionResult.objects.filter(patient_data=patient)
        .order_by("-created_at")
        .first()
    )

    fr = {
        "gender": _fr_label(GENDER_CHOICES_FR, patient.gender),
        "work_type": _fr_label(WORK_TYPE_CHOICES_FR, patient.work_type),
        "residence_type": _fr_label(RESIDENCE_TYPE_CHOICES_FR, patient.residence_type),
        "smoking_status": _fr_label(SMOKING_STATUS_CHOICES_FR, patient.smoking_status),
    }

    risk = None
    risk_level = None
    factors: list[str] = []
    if prediction is not None:
        proba_pct = max(0.0, min(1.0, prediction.risk_probability)) * 100
        risk = {
            "is_high": bool(prediction.prediction),
            "label": prediction.risk_label,
            "model_name": prediction.model_name,
            "probability": prediction.risk_probability,
            "probability_pct": proba_pct,
            "probability_pct_int": int(round(proba_pct)),
            "recommendation": prediction.recommendation,
            "created_at": prediction.created_at,
        }
        risk_level = compute_risk_level(prediction.risk_probability)
        factors = compute_factors(patient)

    return render(
        request,
        "prediction/result.html",
        {
            "patient": patient,
            "prediction": prediction,
            "risk": risk,
            "risk_level": risk_level,
            "factors": factors,
            "no_factor_message": NO_FACTOR_MESSAGE,
            "risk_level_note": RISK_LEVEL_NOTE,
            "factors_note": FACTORS_NOTE,
            "missing_model_message": MISSING_MODEL_MESSAGE,
            "fr": fr,
            "page_title": "Résultat de la prédiction",
            "active_nav": "new_prediction",
        },
    )


# --------------------------------------------------------------------------- #
# Step 8: history + detail
# --------------------------------------------------------------------------- #

# Querystring values accepted by /historique/?risk=...
# Step 19: extended with the 3-level interpretation (low/medium/high).
RISK_FILTER_ALL = "all"
RISK_FILTER_HIGH = "high"
RISK_FILTER_MEDIUM = "medium"
RISK_FILTER_LOW = "low"
RISK_FILTER_VALUES = (
    RISK_FILTER_ALL,
    RISK_FILTER_HIGH,
    RISK_FILTER_MEDIUM,
    RISK_FILTER_LOW,
)
RISK_FILTER_BOUNDS = {
    # Probability ranges per risk level (matches prediction.risk thresholds).
    RISK_FILTER_LOW: (0.0, 0.30),
    RISK_FILTER_MEDIUM: (0.3001, 0.60),
    RISK_FILTER_HIGH: (0.6001, 1.0),
}


def _row_payload(prediction: PredictionResult) -> dict:
    """Build the per-row dict used by the history table template."""
    patient = prediction.patient_data
    proba_pct = max(0.0, min(1.0, prediction.risk_probability)) * 100
    return {
        "id": prediction.pk,
        "created_at": prediction.created_at,
        "age": patient.age,
        "gender": _fr_label(GENDER_CHOICES_FR, patient.gender),
        "hypertension": patient.hypertension,
        "heart_disease": patient.heart_disease,
        "avg_glucose_level": patient.avg_glucose_level,
        "bmi": patient.bmi,
        "model_name": prediction.model_name,
        "is_high": bool(prediction.prediction),
        "risk_label": prediction.risk_label,
        "probability": prediction.risk_probability,
        "probability_pct": proba_pct,
        "risk_level": compute_risk_level(prediction.risk_probability),
    }


def _parse_date(value: str):
    """Parse a YYYY-MM-DD date string. Returns ``None`` on any failure."""
    from datetime import datetime

    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _parse_float(value: str):
    """Parse a float (accepts ``,`` or ``.`` as decimal separator)."""
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


@login_required
def history(request):
    """Render the prediction history at ``/historique/`` (Step 19 filters).

    Scoped to ``request.user`` so each clinician only sees their own
    predictions (staff/superusers see every row). Supports filters via
    querystring:

    - ``risk``       — ``all`` / ``low`` / ``medium`` / ``high``
    - ``model``      — exact ``model_name`` match (or ``all``)
    - ``date_from`` / ``date_to`` — ``YYYY-MM-DD`` (inclusive)
    - ``proba_min`` / ``proba_max`` — percentages 0-100 (inclusive)
    - ``q``          — free text matched against model_name, risk_label,
                       gender label and exact age
    """
    from datetime import datetime, time

    from django.db.models import Q
    from django.utils import timezone

    risk_filter = request.GET.get("risk", RISK_FILTER_ALL)
    if risk_filter not in RISK_FILTER_VALUES:
        risk_filter = RISK_FILTER_ALL

    model_filter = (request.GET.get("model") or RISK_FILTER_ALL).strip()
    date_from = _parse_date(request.GET.get("date_from", ""))
    date_to = _parse_date(request.GET.get("date_to", ""))
    proba_min_pct = _parse_float(request.GET.get("proba_min", ""))
    proba_max_pct = _parse_float(request.GET.get("proba_max", ""))
    q = (request.GET.get("q") or "").strip()

    # Owner scoping (staff/superuser sees everything).
    base_qs = PredictionResult.objects.select_related("patient_data")
    if not (request.user.is_staff or request.user.is_superuser):
        base_qs = base_qs.filter(user=request.user)

    qs = base_qs

    # Risk level → probability range (no schema change required).
    if risk_filter in RISK_FILTER_BOUNDS:
        lo, hi = RISK_FILTER_BOUNDS[risk_filter]
        qs = qs.filter(risk_probability__gte=lo, risk_probability__lte=hi)

    # AI model exact match.
    if model_filter and model_filter != RISK_FILTER_ALL:
        qs = qs.filter(model_name=model_filter)

    # Date range (inclusive). Use end-of-day so date_to includes that day.
    if date_from:
        qs = qs.filter(
            created_at__gte=timezone.make_aware(datetime.combine(date_from, time.min))
        )
    if date_to:
        qs = qs.filter(
            created_at__lte=timezone.make_aware(datetime.combine(date_to, time.max))
        )

    # Probability range — UI is in percent (0-100).
    if proba_min_pct is not None:
        qs = qs.filter(risk_probability__gte=max(0.0, proba_min_pct) / 100.0)
    if proba_max_pct is not None:
        qs = qs.filter(risk_probability__lte=min(100.0, proba_max_pct) / 100.0)

    # Free-text search: model_name / risk_label / gender / numeric age.
    if q:
        text_q = Q(model_name__icontains=q) | Q(risk_label__icontains=q) | Q(
            patient_data__gender__icontains=q
        )
        try:
            text_q |= Q(patient_data__age=float(q.replace(",", ".")))
        except ValueError:
            pass
        qs = qs.filter(text_q)

    qs = qs.order_by("-created_at")
    rows = [_row_payload(p) for p in qs]
    total_all = base_qs.count()

    # Distinct model_name values visible to the user (drives the dropdown).
    available_models = sorted(
        {m for m in base_qs.values_list("model_name", flat=True) if m}
    )

    has_active_filters = bool(
        (risk_filter and risk_filter != RISK_FILTER_ALL)
        or (model_filter and model_filter != RISK_FILTER_ALL)
        or date_from
        or date_to
        or proba_min_pct is not None
        or proba_max_pct is not None
        or q
    )

    return render(
        request,
        "prediction/history.html",
        {
            "rows": rows,
            "risk_filter": risk_filter,
            "model_filter": model_filter or RISK_FILTER_ALL,
            "available_models": available_models,
            "date_from_value": request.GET.get("date_from", "") or "",
            "date_to_value": request.GET.get("date_to", "") or "",
            "proba_min_value": request.GET.get("proba_min", "") or "",
            "proba_max_value": request.GET.get("proba_max", "") or "",
            "q_value": q,
            "has_active_filters": has_active_filters,
            "total_all": total_all,
            "total_filtered": len(rows),
            "page_title": "Historique des prédictions",
            "active_nav": "history",
        },
    )


@login_required
def detail(request, result_id: int):
    """Render a single :class:`PredictionResult` at ``/prediction/detail/<id>/``.

    Owner-scoped: returns 404 (not 403) for non-owner / non-staff requests
    so we don't leak the existence of other users' rows.
    """
    prediction = get_object_or_404(
        PredictionResult.objects.select_related("patient_data"),
        pk=result_id,
    )
    if not _can_view(request.user, prediction.user):
        raise Http404()
    patient = prediction.patient_data

    fr = {
        "gender": _fr_label(GENDER_CHOICES_FR, patient.gender),
        "work_type": _fr_label(WORK_TYPE_CHOICES_FR, patient.work_type),
        "residence_type": _fr_label(RESIDENCE_TYPE_CHOICES_FR, patient.residence_type),
        "smoking_status": _fr_label(SMOKING_STATUS_CHOICES_FR, patient.smoking_status),
    }

    proba_pct = max(0.0, min(1.0, prediction.risk_probability)) * 100
    risk = {
        "is_high": bool(prediction.prediction),
        "label": prediction.risk_label,
        "model_name": prediction.model_name,
        "probability": prediction.risk_probability,
        "probability_pct": proba_pct,
        "probability_pct_int": int(round(proba_pct)),
        "recommendation": prediction.recommendation,
        "created_at": prediction.created_at,
    }

    return render(
        request,
        "prediction/detail.html",
        {
            "patient": patient,
            "prediction": prediction,
            "risk": risk,
            "risk_level": compute_risk_level(prediction.risk_probability),
            "factors": compute_factors(patient),
            "no_factor_message": NO_FACTOR_MESSAGE,
            "risk_level_note": RISK_LEVEL_NOTE,
            "factors_note": FACTORS_NOTE,
            "fr": fr,
            "page_title": f"Prédiction #{prediction.pk}",
            "active_nav": "history",
        },
    )


# --------------------------------------------------------------------------- #
# Step 14: PDF export
# --------------------------------------------------------------------------- #


@login_required
def detail_pdf(request, result_id: int):
    """Stream a PDF report for a single :class:`PredictionResult`.

    Same access rules as :func:`detail`: the prediction's owner may export
    their own report, staff/superusers may export any report, everyone else
    gets a 404 (so the route does not leak the existence of other users'
    rows). Uses ReportLab — pure-Python, no system dependencies.
    """
    from .pdf_report import render_prediction_report

    prediction = get_object_or_404(
        PredictionResult.objects.select_related("patient_data"),
        pk=result_id,
    )
    if not _can_view(request.user, prediction.user):
        raise Http404()

    patient = prediction.patient_data
    fr_labels = {
        "gender": _fr_label(GENDER_CHOICES_FR, patient.gender),
        "work_type": _fr_label(WORK_TYPE_CHOICES_FR, patient.work_type),
        "residence_type": _fr_label(RESIDENCE_TYPE_CHOICES_FR, patient.residence_type),
        "smoking_status": _fr_label(SMOKING_STATUS_CHOICES_FR, patient.smoking_status),
    }

    pdf_bytes = render_prediction_report(
        prediction=prediction,
        patient=patient,
        fr_labels=fr_labels,
    )
    filename = f"rapport-prediction-{prediction.pk}.pdf"
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
