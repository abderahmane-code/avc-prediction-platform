from django.contrib import admin

from .models import PatientData, PredictionResult


@admin.register(PatientData)
class PatientDataAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "gender",
        "age",
        "hypertension",
        "heart_disease",
        "avg_glucose_level",
        "bmi",
        "smoking_status",
        "created_at",
    )
    list_filter = (
        "gender",
        "hypertension",
        "heart_disease",
        "ever_married",
        "work_type",
        "residence_type",
        "smoking_status",
        "created_at",
    )
    search_fields = ("user__username", "user__email", "id")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)


@admin.register(PredictionResult)
class PredictionResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "patient_data",
        "model_name",
        "prediction",
        "risk_label",
        "risk_probability",
        "created_at",
    )
    list_filter = ("model_name", "risk_label", "prediction", "created_at")
    search_fields = (
        "user__username",
        "user__email",
        "model_name",
        "patient_data__id",
    )
    autocomplete_fields = ("patient_data",)
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
