"""URL routes for the Notification listing + mark-as-read actions."""

from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.list_view, name="list"),
    path("<int:pk>/read/", views.mark_read, name="mark_read"),
    path("read-all/", views.mark_all_read, name="mark_all_read"),
]
