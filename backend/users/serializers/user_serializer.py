# users/serializers/user_serializer.py
from rest_framework import serializers
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    average_precision = serializers.FloatField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'age',
            'gender',
            'level',
            'role',
            'avatar_url',
            'average_precision',
            'is_active',
        )
