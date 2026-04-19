# users/urls.py
from django.urls import path, re_path
from rest_framework_simplejwt.views import TokenRefreshView

from users.views.auth_views import (
    ConfirmEmailView,
    LoginView,
    LogoutView,
    DiagnosticCompleteView,
    MeView,
    MyAttemptsView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
)
from users.views.oauth_views import GoogleOAuthCallbackView, GoogleOAuthRedirectView
from users.views.progress_views import ProgressView
from users.views.admin_views import (
    AdminUserListView,
    AdminUserDetailView,
    AdminPasswordResetView,
    AdminUserAttemptsView,
)

urlpatterns = [
    # --- Registration & email confirmation ---
    path('register/', RegisterView.as_view(), name='auth-register'),
    re_path(r'^confirm-email/(?P<token>[^/]+)/$', ConfirmEmailView.as_view(), name='auth-confirm-email'),

    # --- Session ---
    path('me/', MeView.as_view(), name='auth-me'),
    path('diagnostic/complete/', DiagnosticCompleteView.as_view(), name='auth-diagnostic-complete'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),

    # --- Password reset (unauthenticated) ---
    path('password/reset/', PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),

    # --- Password change (requires JWT) ---
    path('password/change/', PasswordChangeView.as_view(), name='auth-password-change'),

    # --- Google OAuth ---
    path('google/', GoogleOAuthRedirectView.as_view(), name='auth-google'),
    path('google/callback/', GoogleOAuthCallbackView.as_view(), name='auth-google-callback'),

    # --- Progress ---
    path('progress/', ProgressView.as_view(), name='user-progress'),
    path('progress/complete/', ProgressView.as_view(), name='user-progress-complete'),

    # --- My attempts history ---
    path('attempts/', MyAttemptsView.as_view(), name='my-attempts'),

    # --- Admin: User Management ---
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<int:user_id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('users/<int:user_id>/reset-password/', AdminPasswordResetView.as_view(), name='admin-user-reset-password'),
    path('users/<int:user_id>/attempts/', AdminUserAttemptsView.as_view(), name='admin-user-attempts'),
]
