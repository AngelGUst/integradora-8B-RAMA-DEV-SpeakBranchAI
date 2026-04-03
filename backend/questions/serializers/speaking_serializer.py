from rest_framework import serializers
from questions.models import Question
from .base_serializer import BaseQuestionSerializer


class SpeakingQuestionSerializer(BaseQuestionSerializer):
    audio_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)

    class Meta(BaseQuestionSerializer.Meta):
        fields = BaseQuestionSerializer.Meta.fields + [
            'correct_answer',
            'phonetic_text',
            'audio_url',
        ]

    def validate_phonetic_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Este campo es requerido para Speaking.')
        return value

    def validate_correct_answer(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Este campo es requerido para Speaking.')
        return value

    def create(self, validated_data):
        validated_data['type'] = 'SPEAKING'
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('type', None)
        return super().update(instance, validated_data)
