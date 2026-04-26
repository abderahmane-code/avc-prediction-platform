"""Authentication views for the AVC prediction platform.

The login / logout views simply wrap Django's class-based views with
French templates + messages. The register view validates the custom
:class:`RegisterForm`, creates the user, logs them in immediately and
redirects to the dashboard.
"""

from __future__ import annotations

from django.contrib import messages
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods

from notifications.models import Notification
from notifications.services import notify_admins

from .forms import FrenchAuthenticationForm, RegisterForm


@require_http_methods(["GET", "POST"])
def register(request):
    """Render and process the sign-up form."""
    if request.user.is_authenticated:
        return redirect("dashboard:index")

    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Step 18: emit a global/admin notification on every signup.
            notify_admins(
                title="Nouvel utilisateur inscrit",
                message="Un nouvel utilisateur vient de créer un compte.",
                notification_type=Notification.TYPE_INFO,
            )
            auth_login(request, user)
            messages.success(
                request,
                f"Bienvenue {user.username} ! Votre compte a été créé avec succès.",
            )
            return redirect("dashboard:index")
    else:
        form = RegisterForm()

    return render(
        request,
        "accounts/register.html",
        {
            "form": form,
            "page_title": "Créer un compte",
            "active_nav": "auth",
            "hide_chrome": True,
        },
    )


class FrenchLoginView(LoginView):
    """Login page with French labels and a friendly success message."""

    template_name = "accounts/login.html"
    authentication_form = FrenchAuthenticationForm
    redirect_authenticated_user = True

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["page_title"] = "Connexion"
        ctx["active_nav"] = "auth"
        ctx["hide_chrome"] = True
        return ctx

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(
            self.request,
            f"Connexion réussie. Bonjour {form.get_user().username} !",
        )
        return response


@login_required
def logout_view(request):
    """Log the user out (GET or POST) and bounce them to the login page."""
    username = request.user.username
    auth_logout(request)
    messages.info(request, f"Vous avez été déconnecté(e), {username}. À bientôt !")
    return redirect(reverse_lazy("accounts:login"))
