"""Authentication forms for the AVC prediction platform.

The forms expose French labels / help texts and friendly error messages so
the views can render them straight into the existing ``base.html`` shell
without per-page customisation.
"""

from __future__ import annotations

from django import forms
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.forms import AuthenticationForm

User = get_user_model()


class RegisterForm(forms.Form):
    """Sign-up form using the stock :class:`User` model.

    Validates that the username is free, the email looks valid and the two
    password fields match (and pass Django's password validators).
    """

    username = forms.CharField(
        label="Nom d'utilisateur",
        max_length=150,
        widget=forms.TextInput(attrs={"autocomplete": "username", "autofocus": True}),
        error_messages={"required": "Le nom d'utilisateur est obligatoire."},
    )
    email = forms.EmailField(
        label="Adresse e-mail",
        widget=forms.EmailInput(attrs={"autocomplete": "email"}),
        error_messages={
            "required": "L'adresse e-mail est obligatoire.",
            "invalid": "Veuillez saisir une adresse e-mail valide.",
        },
    )
    password1 = forms.CharField(
        label="Mot de passe",
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        error_messages={"required": "Le mot de passe est obligatoire."},
    )
    password2 = forms.CharField(
        label="Confirmer le mot de passe",
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        error_messages={"required": "Veuillez confirmer le mot de passe."},
    )

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError(
                "Ce nom d'utilisateur est déjà pris."
            )
        return username

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if email and User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError(
                "Un compte utilise déjà cette adresse e-mail."
            )
        return email

    def clean(self):
        cleaned = super().clean()
        password1 = cleaned.get("password1")
        password2 = cleaned.get("password2")
        if password1 and password2 and password1 != password2:
            self.add_error(
                "password2",
                "Les deux mots de passe ne correspondent pas.",
            )
        if password1:
            from django.contrib.auth.password_validation import validate_password
            from django.core.exceptions import ValidationError

            try:
                validate_password(password1)
            except ValidationError as exc:
                for msg in exc.messages:
                    self.add_error("password1", msg)
        return cleaned

    def save(self) -> User:
        return User.objects.create_user(
            username=self.cleaned_data["username"],
            email=self.cleaned_data["email"],
            password=self.cleaned_data["password1"],
        )


class FrenchAuthenticationForm(AuthenticationForm):
    """Login form with French labels and a French invalid-credentials message."""

    error_messages = {
        "invalid_login": (
            "Nom d'utilisateur ou mot de passe incorrect."
        ),
        "inactive": "Ce compte est désactivé.",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = "Nom d'utilisateur"
        self.fields["password"].label = "Mot de passe"
        self.fields["username"].widget.attrs.update({"autofocus": True})
