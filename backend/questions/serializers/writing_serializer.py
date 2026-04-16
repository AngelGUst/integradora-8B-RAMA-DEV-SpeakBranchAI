from rest_framework import serializers
from .base_serializer import BaseQuestionSerializer


class WritingQuestionSerializer(BaseQuestionSerializer):
    class Meta(BaseQuestionSerializer.Meta):
        fields = BaseQuestionSerializer.Meta.fields + ['correct_answer']

    def validate_correct_answer(self, value):
        return self._validate_required_field(
            value,
            'correct_answer',
            'Writing (debe contener las instrucciones de evaluación para GPT)'
        )

    def create(self, validated_data):
        validated_data['type'] = 'WRITING'
        validated_data['phonetic_text'] = ''
        validated_data['audio_url'] = None
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('type', None)
        return super().update(instance, validated_data)
