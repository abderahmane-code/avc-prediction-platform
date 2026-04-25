"""URL routes for the AI models app."""

from django.urls import path

from . import views

app_name = "ai_models"

urlpatterns = [
    path("comparaison/", views.comparison, name="comparison"),
]
