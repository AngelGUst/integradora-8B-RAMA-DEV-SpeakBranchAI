from rest_framework import serializers
from .base_serializer import BaseQuestionSerializer


class ListeningShadowingSerializer(BaseQuestionSerializer):
    text = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Transcript mostrado DESPUÉS del intento (opcional).'
    )

    class Meta(BaseQuestionSerializer.Meta):
        fields = BaseQuestionSerializer.Meta.fields + [
            'audio_url',
            'correct_answer',
            'phonetic_text',
            'max_replays',
        ]
        read_only_fields = BaseQuestionSerializer.Meta.read_only_fields + ['max_replays']

    def validate_correct_answer(self, value):
        return self._validate_required_field(value, 'correct_answer', 'Listening Shadowing')

    def validate_phonetic_text(self, value):
        return self._validate_required_field(value, 'phonetic_text', 'Listening Shadowing')

    def create(self, validated_data):
        validated_data['type'] = 'LISTENING_SHADOWING'
        validated_data['max_replays'] = None
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('type', None)
        validated_data['max_replays'] = None
        return super().update(instance, validated_data)
