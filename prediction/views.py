from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import Http404
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
            else:
                messages.success(
                    request,
                    f"Prédiction calculée par {result.model_name}.",
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

    return render(
        request,
        "prediction/result.html",
        {
            "patient": patient,
            "prediction": prediction,
            "risk": risk,
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
RISK_FILTER_ALL = "all"
RISK_FILTER_HIGH = "high"
RISK_FILTER_LOW = "low"
RISK_FILTER_VALUES = (RISK_FILTER_ALL, RISK_FILTER_HIGH, RISK_FILTER_LOW)


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
    }


@login_required
def history(request):
    """Render the prediction history at ``/historique/``.

    Scoped to ``request.user`` so each clinician only sees their own
    predictions (staff/superusers see every row). Supports a
    ``?risk=high|low|all`` filter (defaults to ``all``). The page shows a
    clean French empty state when no :class:`PredictionResult` rows are
    visible to the user.
    """
    risk_filter = request.GET.get("risk", RISK_FILTER_ALL)
    if risk_filter not in RISK_FILTER_VALUES:
        risk_filter = RISK_FILTER_ALL

    base_qs = PredictionResult.objects.select_related("patient_data")
    if not (request.user.is_staff or request.user.is_superuser):
        base_qs = base_qs.filter(user=request.user)
    qs = base_qs.order_by("-created_at")
    if risk_filter == RISK_FILTER_HIGH:
        qs = qs.filter(prediction=True)
    elif risk_filter == RISK_FILTER_LOW:
        qs = qs.filter(prediction=False)

    rows = [_row_payload(p) for p in qs]
    total_all = base_qs.count()

    return render(
        request,
        "prediction/history.html",
        {
            "rows": rows,
            "risk_filter": risk_filter,
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
            "fr": fr,
            "page_title": f"Prédiction #{prediction.pk}",
            "active_nav": "history",
        },
    )
