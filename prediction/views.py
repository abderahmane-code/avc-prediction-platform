from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render

from .forms import (
    GENDER_CHOICES_FR,
    RESIDENCE_TYPE_CHOICES_FR,
    SMOKING_STATUS_CHOICES_FR,
    WORK_TYPE_CHOICES_FR,
    PatientDataForm,
)
from .models import PatientData


def _fr_label(choices, value, fallback=""):
    for stored, label in choices:
        if stored == value:
            return label
    return fallback or value


def new_prediction(request):
    """Render the patient-data form and persist a valid submission.

    On a valid POST the new PatientData row is saved (linked to the current
    user when authenticated) and the user is redirected to the result page.
    The AI prediction itself is intentionally not run here yet.
    """
    if request.method == "POST":
        form = PatientDataForm(request.POST)
        if form.is_valid():
            patient = form.save(commit=False)
            if request.user.is_authenticated:
                patient.user = request.user
            patient.save()
            messages.success(request, "Données enregistrées avec succès.")
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
    """Temporary success page shown after saving a PatientData record.

    The real AI prediction wiring will replace the placeholder content in the
    next step.
    """
    patient = get_object_or_404(PatientData, pk=patient_id)
    fr = {
        "gender": _fr_label(GENDER_CHOICES_FR, patient.gender),
        "work_type": _fr_label(WORK_TYPE_CHOICES_FR, patient.work_type),
        "residence_type": _fr_label(RESIDENCE_TYPE_CHOICES_FR, patient.residence_type),
        "smoking_status": _fr_label(SMOKING_STATUS_CHOICES_FR, patient.smoking_status),
    }
    return render(
        request,
        "prediction/result.html",
        {
            "patient": patient,
            "fr": fr,
            "page_title": "Résultat de la prédiction",
            "active_nav": "new_prediction",
        },
    )
