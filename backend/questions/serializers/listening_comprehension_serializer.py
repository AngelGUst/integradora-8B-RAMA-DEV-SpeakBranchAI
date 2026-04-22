import json
from rest_framework import serializers
from .base_serializer import BaseQuestionSerializer
from .mixins import JSONQuestionValidatorMixin


class ListeningComprehensionSerializer(JSONQuestionValidatorMixin, BaseQuestionSerializer):
    class Meta(BaseQuestionSerializer.Meta):
        fields = BaseQuestionSerializer.Meta.fields + [
            'phonetic_text',
            'correct_answer',
            'max_replays',
        ]
        read_only_fields = BaseQuestionSerializer.Meta.read_only_fields + ['max_replays']

    def validate_phonetic_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('El texto del pasaje (TTS) es requerido para Listening Comprehension.')
        return value

    def validate_correct_answer(self, value):  # NOSONAR - DRF validators must return the value
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            raise serializers.ValidationError('Debe ser un JSON válido.')

        self.validate_json_question_format(data)
        return value  # NOSONAR - DRF validators must return the validated value

    def create(self, validated_data):
        validated_data['type'] = 'LISTENING_COMPREHENSION'
        validated_data['max_replays'] = 3
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('type', None)
        validated_data['max_replays'] = 3
        return super().update(instance, validated_data)
