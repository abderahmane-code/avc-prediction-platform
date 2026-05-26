from django.contrib import admin

from .models import AIModelPerformance


@admin.register(AIModelPerformance)
class AIModelPerformanceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "model_name",
        "accuracy",
        "precision",
        "recall",
        "f1_score",
        "roc_auc",
        "is_best_model",
        "created_at",
    )
    list_filter = ("is_best_model", "model_name", "created_at")
    search_fields = ("model_name",)
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
