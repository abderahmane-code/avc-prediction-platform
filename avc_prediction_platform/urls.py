"""URL configuration for avc_prediction_platform project."""

from django.contrib import admin
from django.urls import include, path

from dashboard import views as dashboard_views
from prediction import views as prediction_views

urlpatterns = [
    path("admin/", admin.site.urls),
    # Public landing page — no auth required (Step 13).
    path("", dashboard_views.home, name="home"),
    path("accounts/", include("accounts.urls", namespace="accounts")),
    path("dashboard/", include("dashboard.urls", namespace="dashboard")),
    path("prediction/", include("prediction.urls", namespace="prediction")),
    # Step 11: dedicated AI-model comparison page at /modeles/comparaison/.
    path("modeles/", include("ai_models.urls", namespace="ai_models")),
    # Step 8: prediction history. Lives at the root /historique/ per spec.
    path("historique/", prediction_views.history, name="history"),
]
