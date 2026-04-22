# users/views/oauth_views.py
from urllib.parse import urlencode

import requests as http_requests

from django.conf import settings
from django.shortcuts import redirect

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer

from users.models import User

# Google OAuth2 endpoints (stable, public)
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

GOOGLE_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
]


class GoogleOAuthRedirectView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Redirect to Google OAuth',
        description='Redirects the browser to Google\'s consent screen.',
        responses={302: OpenApiResponse(description='Redirect to Google')},
        tags=['Auth — Google OAuth'],
    )
    def get(self, request):
        params = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'response_type': 'code',
            'scope': ' '.join(GOOGLE_SCOPES),
            'access_type': 'offline',   # Request refresh_token from Google
            'prompt': 'select_account', # Always show the account picker
        }
        return redirect(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


def _verify_one_tap_credential(credential):
    """Verify Google One Tap ID token and return user info or error response"""
    tokeninfo_resp = http_requests.get(
        'https://oauth2.googleapis.com/tokeninfo',
        params={'id_token': credential},
        timeout=10,
    )
    if not tokeninfo_resp.ok:
        return None, Response(
            {'error': 'Failed to verify Google ID token.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    tokeninfo = tokeninfo_resp.json()
    if tokeninfo.get('aud') != settings.GOOGLE_CLIENT_ID:
        return None, Response(
            {'error': 'Google token audience mismatch.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    return tokeninfo, None


def _exchange_oauth_code(code):
    """Exchange OAuth code for access token and fetch user info"""
    token_resp = http_requests.post(GOOGLE_TOKEN_URL, data={
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
        'grant_type': 'authorization_code',
    }, timeout=10)

    if not token_resp.ok:
        return None, Response(
            {'error': 'Failed to exchange authorization code with Google.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    google_access_token = token_resp.json().get('access_token')

    userinfo_resp = http_requests.get(
        GOOGLE_USERINFO_URL,
        headers={'Authorization': f'Bearer {google_access_token}'},
        timeout=10,
    )

    if not userinfo_resp.ok:
        return None, Response(
            {'error': 'Failed to retrieve user info from Google.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return userinfo_resp.json(), None


class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Google OAuth callback',
        description=(
            'Exchange the Google authorization `code` for JWT tokens.\n\n'
            'The frontend receives the `code` from Google\'s redirect and forwards it here.'
        ),
        request=inline_serializer(
            name='GoogleCallbackRequest',
            fields={'code': serializers.CharField()},
        ),
        responses={
            200: inline_serializer(
                name='GoogleCallbackResponse',
                fields={
                    'access_token': serializers.CharField(),
                    'refresh_token': serializers.CharField(),
                    'is_new_user': serializers.BooleanField(),
                },
            ),
            400: OpenApiResponse(description='Missing code or Google API error'),
        },
        tags=['Auth — Google OAuth'],
    )
    def post(self, request):
        credential = request.data.get('credential')  # Google One Tap ID token
        code = request.data.get('code')              # OAuth authorization code (redirect flow)

        if not credential and not code:
            return Response(
                {'error': 'Either credential (One Tap) or code (OAuth) is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify credential or exchange code for user info
        if credential:
            google_user, error = _verify_one_tap_credential(credential)
            if error:
                return error
        else:
            google_user, error = _exchange_oauth_code(code)
            if error:
                return error

        email = google_user.get('email', '').lower()
        if not email:
            return Response(
                {'error': 'Could not retrieve email from Google account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract user info
        first_name = google_user.get('given_name') or google_user.get('name', 'User')
        avatar_url = google_user.get('picture')

        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'avatar_url': avatar_url,
                'is_active': True,
            },
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])
        elif avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
            user.save(update_fields=['avatar_url'])

        # Issue JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'is_new_user': created,
        }, status=status.HTTP_200_OK)
