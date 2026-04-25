"""URL configuration for avc_prediction_platform project."""

from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

from prediction import views as prediction_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", RedirectView.as_view(pattern_name="dashboard:index", permanent=False)),
    path("accounts/", include("accounts.urls", namespace="accounts")),
    path("dashboard/", include("dashboard.urls", namespace="dashboard")),
    path("prediction/", include("prediction.urls", namespace="prediction")),
    # Step 8: prediction history. Lives at the root /historique/ per spec.
    path("historique/", prediction_views.history, name="history"),
]
