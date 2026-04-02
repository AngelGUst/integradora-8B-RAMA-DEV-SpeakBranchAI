# users/serializers/login_serializer.py
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """
    Minimal serializer — only validates field presence/format.
    The actual authentication logic (inactive check, wrong password) is
    handled in LoginView so we can return distinct HTTP status codes
    (403 for unconfirmed email vs 400 for bad credentials).
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
