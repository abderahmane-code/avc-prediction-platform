from django.contrib import messages
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


def result(request, patient_id: int):
    """Render the live prediction for a given :class:`PatientData`.

    Falls back to a French missing-model message when no
    :class:`PredictionResult` is attached to the patient (which only happens
    when the model artifacts are absent at submission time).
    """
    patient = get_object_or_404(PatientData, pk=patient_id)
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
