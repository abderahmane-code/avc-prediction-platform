"""URL routes for the accounts app."""

from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.register, name="register"),
    path("login/", views.FrenchLoginView.as_view(), name="login"),
    path("logout/", views.logout_view, name="logout"),
]
