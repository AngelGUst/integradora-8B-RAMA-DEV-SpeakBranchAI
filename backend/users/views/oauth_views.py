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
        code = request.data.get('code')
        if not code:
            return Response(
                {'error': 'Authorization code is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Step 1: exchange code → Google access token ---
        token_resp = http_requests.post(GOOGLE_TOKEN_URL, data={
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }, timeout=10)

        if not token_resp.ok:
            return Response(
                {'error': 'Failed to exchange authorization code with Google.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        google_access_token = token_resp.json().get('access_token')

        # --- Step 2: fetch user profile from Google ---
        userinfo_resp = http_requests.get(
            GOOGLE_USERINFO_URL,
            headers={'Authorization': f'Bearer {google_access_token}'},
            timeout=10,
        )

        if not userinfo_resp.ok:
            return Response(
                {'error': 'Failed to retrieve user info from Google.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        google_user = userinfo_resp.json()
        email = google_user.get('email', '').lower()

        if not email:
            return Response(
                {'error': 'Could not retrieve email from Google account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        first_name = google_user.get('given_name') or google_user.get('name', 'User')
        avatar_url = google_user.get('picture')

        # --- Step 3: find or create user ---
        # is_active=True: Google already verified this email address
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'avatar_url': avatar_url,
                'is_active': True,
            },
        )

        if created:
            # Google users have no password — mark it explicitly unusable
            user.set_unusable_password()
            user.save(update_fields=['password'])
        elif avatar_url and not user.avatar_url:
            # Backfill avatar for existing users who haven't set one yet
            user.avatar_url = avatar_url
            user.save(update_fields=['avatar_url'])

        # --- Step 4: issue JWT tokens ---
        refresh = RefreshToken.for_user(user)
        return Response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'is_new_user': created,
        }, status=status.HTTP_200_OK)
