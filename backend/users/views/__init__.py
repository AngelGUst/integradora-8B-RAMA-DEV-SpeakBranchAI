# users/views/__init__.py
from .auth_views import (
    RegisterView,
    ConfirmEmailView,
    LoginView,
    LogoutView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    PasswordChangeView,
)
from .oauth_views import GoogleOAuthRedirectView, GoogleOAuthCallbackView

__all__ = [
    'RegisterView',
    'ConfirmEmailView',
    'LoginView',
    'LogoutView',
    'PasswordResetRequestView',
    'PasswordResetConfirmView',
    'PasswordChangeView',
    'GoogleOAuthRedirectView',
    'GoogleOAuthCallbackView',
]
