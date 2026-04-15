import json
from rest_framework import serializers
from .base_serializer import BaseQuestionSerializer


class ListeningComprehensionSerializer(BaseQuestionSerializer):
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

    def validate_correct_answer(self, value):
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            raise serializers.ValidationError('Debe ser un JSON válido.')

        # New format: { "questions": [{ "text": "...", "options": [...], "correct": "..." }] }
        if 'questions' in data:
            questions = data['questions']
            if not isinstance(questions, list) or len(questions) < 1:
                raise serializers.ValidationError(
                    '"questions" debe ser una lista con al menos 1 pregunta.'
                )
            for i, q in enumerate(questions):
                if not isinstance(q.get('options'), list) or len(q['options']) < 2:
                    raise serializers.ValidationError(
                        f'Pregunta {i + 1}: "options" debe ser una lista con al menos 2 elementos.'
                    )
                if not isinstance(q.get('correct'), str):
                    raise serializers.ValidationError(
                        f'Pregunta {i + 1}: "correct" debe ser un string.'
                    )
                if q['correct'] not in q['options']:
                    raise serializers.ValidationError(
                        f'Pregunta {i + 1}: "correct" debe ser uno de los valores en "options".'
                    )
            return value

        # Legacy format: { "options": [...], "correct": "..." }
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
