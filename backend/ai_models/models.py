from django.db import models


class AIModelPerformance(models.Model):
    """Evaluation metrics recorded for a single trained AI model."""

    model_name = models.CharField(max_length=100)
    accuracy = models.FloatField()
    precision = models.FloatField()
    recall = models.FloatField()
    f1_score = models.FloatField()
    roc_auc = models.FloatField(null=True, blank=True)
    is_best_model = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AI model performance"
        verbose_name_plural = "AI model performance"

    def __str__(self) -> str:
        flag = " [best]" if self.is_best_model else ""
        return f"{self.model_name} (acc={self.accuracy:.3f}, f1={self.f1_score:.3f}){flag}"
