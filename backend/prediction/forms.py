"""Forms for the stroke-risk prediction workflow.

The :class:`~prediction.models.PatientData` model stores values that match the
common public stroke dataset (English categorical strings, booleans for the
binary fields). The clinician-facing UI is in French, so this form layer
declares French labels / choices and maps them onto the model's storage values.
"""

from __future__ import annotations

from django import forms

from .models import PatientData


# Yes/No mapping shared by the three boolean fields on PatientData.
YES_NO_CHOICES = (
    ("1", "Oui"),
    ("0", "Non"),
)

# French label -> stored value (matches PatientData.GENDER_CHOICES values).
GENDER_CHOICES_FR = (
    ("Male", "Masculin"),
    ("Female", "Féminin"),
    ("Other", "Autre"),
)

WORK_TYPE_CHOICES_FR = (
    ("children", "Enfant"),
    ("Govt_job", "Fonctionnaire"),
    ("Private", "Travail privé"),
    ("Self-employed", "Indépendant"),
    ("Never_worked", "Sans emploi"),
)

RESIDENCE_TYPE_CHOICES_FR = (
    ("Urban", "Urbain"),
    ("Rural", "Rural"),
)

SMOKING_STATUS_CHOICES_FR = (
    ("smokes", "Fumeur"),
    ("formerly smoked", "Ancien fumeur"),
    ("never smoked", "Non fumeur"),
    ("Unknown", "Inconnu"),
)


class PatientDataForm(forms.ModelForm):
    """French-labelled form for collecting one PatientData submission."""

    gender = forms.ChoiceField(
        label="Genre",
        choices=GENDER_CHOICES_FR,
    )
    work_type = forms.ChoiceField(
        label="Type d'emploi",
        choices=WORK_TYPE_CHOICES_FR,
    )
    residence_type = forms.ChoiceField(
        label="Zone de résidence",
        choices=RESIDENCE_TYPE_CHOICES_FR,
    )
    smoking_status = forms.ChoiceField(
        label="Statut tabagique",
        choices=SMOKING_STATUS_CHOICES_FR,
    )

    hypertension = forms.TypedChoiceField(
        label="Hypertension",
        choices=YES_NO_CHOICES,
        coerce=lambda v: v == "1",
        empty_value=False,
    )
    heart_disease = forms.TypedChoiceField(
        label="Maladie cardiaque",
        choices=YES_NO_CHOICES,
        coerce=lambda v: v == "1",
        empty_value=False,
    )
    ever_married = forms.TypedChoiceField(
        label="Déjà marié(e)",
        choices=YES_NO_CHOICES,
        coerce=lambda v: v == "1",
        empty_value=False,
    )

    age = forms.FloatField(
        label="Âge",
        min_value=0,
        max_value=120,
        widget=forms.NumberInput(attrs={"step": "1", "placeholder": "ex. 54"}),
    )
    avg_glucose_level = forms.FloatField(
        label="Glycémie moyenne (mg/dL)",
        min_value=0,
        widget=forms.NumberInput(attrs={"step": "0.1", "placeholder": "ex. 110.5"}),
    )
    bmi = forms.FloatField(
        label="IMC (kg/m²)",
        min_value=0,
        widget=forms.NumberInput(attrs={"step": "0.1", "placeholder": "ex. 27.4"}),
    )

    class Meta:
        model = PatientData
        fields = (
            "gender",
            "age",
            "hypertension",
            "heart_disease",
            "ever_married",
            "work_type",
            "residence_type",
            "avg_glucose_level",
            "bmi",
            "smoking_status",
        )
