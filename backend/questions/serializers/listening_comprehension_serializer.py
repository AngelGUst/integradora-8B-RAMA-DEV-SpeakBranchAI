import json
from rest_framework import serializers
from .base_serializer import BaseQuestionSerializer


class ListeningComprehensionSerializer(BaseQuestionSerializer):
    class Meta(BaseQuestionSerializer.Meta):
        fields = BaseQuestionSerializer.Meta.fields + [
            'audio_url',
            'correct_answer',
            'max_replays',
        ]
        read_only_fields = BaseQuestionSerializer.Meta.read_only_fields + ['max_replays']

    def validate_audio_url(self, value):
        if not value:
            raise serializers.ValidationError('audio_url es requerido para Listening Comprehension.')
        return value

    def validate_correct_answer(self, value):
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            raise serializers.ValidationError(
                'Debe ser un JSON válido. Ejemplo: {"options": ["A","B","C","D"], "correct": "B"}'
            )
        if not isinstance(data.get('options'), list) or len(data['options']) < 2:
            raise serializers.ValidationError(
                'El JSON debe tener "options" como lista con al menos 2 elementos.'
            )
        if 'correct' not in data or not isinstance(data['correct'], str):
            raise serializers.ValidationError(
                'El JSON debe tener "correct" como string.'
            )
        if data['correct'] not in data['options']:
            raise serializers.ValidationError(
                '"correct" debe ser uno de los valores en "options".'
            )
        return value

    def create(self, validated_data):
        validated_data['type'] = 'LISTENING_COMPREHENSION'
        validated_data['max_replays'] = 3
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('type', None)
        validated_data['max_replays'] = 3
        return super().update(instance, validated_data)
