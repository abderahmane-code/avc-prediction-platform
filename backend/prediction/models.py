from django.conf import settings
from django.db import models


class PatientData(models.Model):
    """Raw clinical inputs collected for a single stroke-risk prediction."""

    GENDER_CHOICES = [
        ("Male", "Male"),
        ("Female", "Female"),
        ("Other", "Other"),
    ]

    WORK_TYPE_CHOICES = [
        ("Private", "Private"),
        ("Self-employed", "Self-employed"),
        ("Govt_job", "Government job"),
        ("children", "Children"),
        ("Never_worked", "Never worked"),
    ]

    RESIDENCE_TYPE_CHOICES = [
        ("Urban", "Urban"),
        ("Rural", "Rural"),
    ]

    SMOKING_STATUS_CHOICES = [
        ("never smoked", "Never smoked"),
        ("formerly smoked", "Formerly smoked"),
        ("smokes", "Smokes"),
        ("Unknown", "Unknown"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_records",
    )
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    age = models.FloatField()
    hypertension = models.BooleanField(default=False)
    heart_disease = models.BooleanField(default=False)
    ever_married = models.BooleanField(default=False)
    work_type = models.CharField(max_length=20, choices=WORK_TYPE_CHOICES)
    residence_type = models.CharField(max_length=10, choices=RESIDENCE_TYPE_CHOICES)
    avg_glucose_level = models.FloatField()
    bmi = models.FloatField()
    smoking_status = models.CharField(max_length=20, choices=SMOKING_STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Patient data"
        verbose_name_plural = "Patient data"

    def __str__(self) -> str:
        owner = self.user.get_username() if self.user_id else "anonymous"
        return f"PatientData #{self.pk} ({owner}, age {self.age:g}, {self.gender})"


class PredictionResult(models.Model):
    """Output of running one AI model against one PatientData record."""

    RISK_LOW = "low"
    RISK_MODERATE = "moderate"
    RISK_HIGH = "high"
    RISK_LABEL_CHOICES = [
        (RISK_LOW, "Low"),
        (RISK_MODERATE, "Moderate"),
        (RISK_HIGH, "High"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prediction_results",
    )
    patient_data = models.ForeignKey(
        PatientData,
        on_delete=models.CASCADE,
        related_name="prediction_results",
    )
    model_name = models.CharField(max_length=100)
    prediction = models.BooleanField(help_text="True = stroke risk detected.")
    risk_label = models.CharField(max_length=20, choices=RISK_LABEL_CHOICES)
    risk_probability = models.FloatField(help_text="Probability in [0, 1].")
    recommendation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return (
            f"PredictionResult #{self.pk} "
            f"({self.model_name}, {self.risk_label}, p={self.risk_probability:.2f})"
        )
