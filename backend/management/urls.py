"""URL routes for the platform management area (staff-only)."""

from django.urls import path

from . import views

app_name = "management"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("utilisateurs/", views.users_list, name="users"),
    path("utilisateurs/<int:user_id>/", views.user_detail, name="user_detail"),
    path("predictions/", views.predictions_list, name="predictions"),
]
