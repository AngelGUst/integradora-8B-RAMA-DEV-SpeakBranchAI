# users/views/auth_views.py
from django.conf import settings
from django.contrib.auth import authenticate
from django.core import signing
from django.core.mail import send_mail

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer

from users.models import User
from users.serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
)

# Distinct salts prevent a token issued for one purpose being reused for another
EMAIL_CONFIRM_SALT = 'speakbranch-email-confirm'
PASSWORD_RESET_SALT = 'speakbranch-password-reset'

# Token lifetimes in seconds
EMAIL_CONFIRM_MAX_AGE = 86400   # 24 hours
PASSWORD_RESET_MAX_AGE = 3600   # 1 hour


# ---------------------------------------------------------------------------
# Registration & email confirmation
# ---------------------------------------------------------------------------

class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Register a new user',
        description=(
            'Creates an inactive user, then sends a confirmation email with a '
            'time-limited signed token. The account is only usable after the user '
            'clicks the link.'
        ),
        request=RegisterSerializer,
        responses={
            201: inline_serializer(
                name='RegisterResponse',
                fields={'message': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Validation errors'),
        },
        tags=['Auth'],
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # is_active=False: account cannot log in until email is confirmed.
        # The model default is True (for admin-created users), so we override here.
        user = User.objects.create_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            first_name=serializer.validated_data['first_name'],
            is_active=False,
        )

        self._send_confirmation_email(user)

        return Response(
            {'message': 'Check your email to confirm your account'},
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _send_confirmation_email(user):
        token = signing.dumps({'user_id': user.pk}, salt=EMAIL_CONFIRM_SALT)
        confirm_url = f"{settings.FRONTEND_URL}/auth/confirm-email/{token}"

        send_mail(
            subject='Confirm your SpeakBranch account',
            message=(
                f"Hi {user.first_name},\n\n"
                f"Please confirm your email address by clicking the link below:\n\n"
                f"{confirm_url}\n\n"
                f"This link expires in 24 hours.\n\n"
                f"If you did not create this account you can safely ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )


class ConfirmEmailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Confirm email address',
        description='Validates the signed token and activates the user account.',
        responses={
            200: inline_serializer(
                name='ConfirmEmailResponse',
                fields={'message': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid or expired token'),
            404: OpenApiResponse(description='User not found'),
        },
        tags=['Auth'],
    )
    def get(self, request, token):
        try:
            data = signing.loads(
                token,
                salt=EMAIL_CONFIRM_SALT,
                max_age=EMAIL_CONFIRM_MAX_AGE,
            )
        except signing.SignatureExpired:
            return Response(
                {'error': 'Confirmation link has expired. Please register again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except signing.BadSignature:
            return Response(
                {'error': 'Invalid confirmation link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=data['user_id'])
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_active:
            return Response(
                {'message': 'Email already confirmed. You can now log in.'},
                status=status.HTTP_200_OK,
            )

        user.is_active = True
        user.save(update_fields=['is_active'])

        return Response(
            {'message': 'Email confirmed. You can now log in.'},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Login / logout
# ---------------------------------------------------------------------------

class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Login',
        description=(
            'Returns access + refresh JWT tokens.\n\n'
            '- **400** — invalid credentials\n'
            '- **403** — email not yet confirmed'
        ),
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name='LoginResponse',
                fields={
                    'access_token': serializers.CharField(),
                    'refresh_token': serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description='Invalid email or password'),
            403: OpenApiResponse(description='Email not confirmed'),
        },
        tags=['Auth'],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower()
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {'error': 'Please confirm your email before logging in.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # authenticate() uses USERNAME_FIELD='email' when passed as kwarg
        authenticated_user = authenticate(request=request, email=email, password=password)
        if not authenticated_user:
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(authenticated_user)
        return Response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='Logout',
        description='Blacklists the refresh token. Requires a valid Bearer access token.',
        request=inline_serializer(
            name='LogoutRequest',
            fields={'refresh_token': serializers.CharField()},
        ),
        responses={
            200: inline_serializer(
                name='LogoutResponse',
                fields={'message': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid or missing token'),
        },
        tags=['Auth'],
    )
    def post(self, request):
        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return Response(
                {'error': 'refresh_token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'error': 'Invalid or already expired token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'message': 'Logged out successfully.'},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Password reset (unauthenticated flow)
# ---------------------------------------------------------------------------

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Request password reset',
        description=(
            'Sends a reset link to the email if it exists. '
            'Always returns 200 to prevent user enumeration.'
        ),
        request=PasswordResetRequestSerializer,
        responses={
            200: inline_serializer(
                name='PasswordResetRequestResponse',
                fields={'message': serializers.CharField()},
            ),
        },
        tags=['Auth — Password'],
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower()

        try:
            user = User.objects.get(email=email, is_active=True)
            self._send_reset_email(user)
        except User.DoesNotExist:
            pass  # Silent — do NOT reveal whether this email is registered

        return Response(
            {'message': 'If that email is registered you will receive a reset link shortly.'},
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _send_reset_email(user):
        token = signing.dumps({'user_id': user.pk}, salt=PASSWORD_RESET_SALT)
        reset_url = f"{settings.FRONTEND_URL}/auth/password/reset/{token}"

        send_mail(
            subject='Reset your SpeakBranch password',
            message=(
                f"Hi {user.first_name},\n\n"
                f"Click the link below to set a new password:\n\n"
                f"{reset_url}\n\n"
                f"This link expires in 1 hour.\n\n"
                f"If you did not request a password reset you can safely ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Confirm password reset',
        description='Validates the signed token (max 1 hour) and sets the new password.',
        request=PasswordResetConfirmSerializer,
        responses={
            200: inline_serializer(
                name='PasswordResetConfirmResponse',
                fields={'message': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid or expired token / passwords do not match'),
            404: OpenApiResponse(description='User not found'),
        },
        tags=['Auth — Password'],
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            data = signing.loads(
                token,
                salt=PASSWORD_RESET_SALT,
                max_age=PASSWORD_RESET_MAX_AGE,
            )
        except signing.SignatureExpired:
            return Response(
                {'error': 'Password reset link has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except signing.BadSignature:
            return Response(
                {'error': 'Invalid password reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=data['user_id'], is_active=True)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found or account is inactive.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response(
            {'message': 'Password updated successfully.'},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Password change (authenticated flow)
# ---------------------------------------------------------------------------

class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='Change password',
        description='Requires a valid Bearer JWT. Verifies the current password before updating.',
        request=PasswordChangeSerializer,
        responses={
            200: inline_serializer(
                name='PasswordChangeResponse',
                fields={'message': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Wrong current password or validation error'),
        },
        tags=['Auth — Password'],
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(serializer.validated_data['current_password']):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])

        return Response(
            {'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK,
        )
