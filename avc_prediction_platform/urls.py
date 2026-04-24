"""URL configuration for avc_prediction_platform project."""

from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", RedirectView.as_view(pattern_name="dashboard:index", permanent=False)),
    path("dashboard/", include("dashboard.urls", namespace="dashboard")),
    path("prediction/", include("prediction.urls", namespace="prediction")),
]
