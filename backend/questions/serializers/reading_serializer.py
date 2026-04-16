import json
from rest_framework import serializers
from .base_serializer import BaseQuestionSerializer
from .mixins import JSONQuestionValidatorMixin


class ReadingQuestionSerializer(JSONQuestionValidatorMixin, BaseQuestionSerializer):
    class Meta(BaseQuestionSerializer.Meta):
        fields = BaseQuestionSerializer.Meta.fields + ['correct_answer']

    def validate_correct_answer(self, value):  # NOSONAR - DRF validators must return the value
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            raise serializers.ValidationError('Debe ser un JSON válido.')

        self.validate_json_question_format(data)
        return value  # NOSONAR - DRF validators must return the validated value

    def create(self, validated_data):
        validated_data['type'] = 'READING'
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('type', None)
        return super().update(instance, validated_data)
