import json
import random

from rest_framework import serializers

from questions.models import Question


class DiagnosticAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer = serializers.JSONField()

    def validate_answer(self, value):
        if isinstance(value, (str, int, float)):
            return value
        if isinstance(value, list):
            if not all(isinstance(v, (str, int, float)) for v in value):
                raise serializers.ValidationError('answer list must contain only strings or numbers.')
            return value
        raise serializers.ValidationError('answer must be a string, number, or list of strings/numbers.')


class DiagnosticSubmitRequestSerializer(serializers.Serializer):
    answers = DiagnosticAnswerSerializer(many=True)

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError('answers cannot be empty.')
        return value


class DiagnosticSubmitResponseSerializer(serializers.Serializer):
    assigned_level = serializers.CharField()
    overall_accuracy = serializers.FloatField()
    total_correct = serializers.IntegerField()
    total_items = serializers.IntegerField()
    by_level = serializers.DictField()


class AdaptiveNextRequestSerializer(serializers.Serializer):
    level = serializers.CharField(required=False)
    type = serializers.CharField(required=False)
    category = serializers.CharField(required=False)
    last_score = serializers.FloatField(required=False, min_value=0, max_value=100)
    current_difficulty = serializers.CharField(required=False)
    exclude_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )


class DiagnosticQuestionSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    vocabulary_items = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    resource_requirements = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id',
            'text',
            'type',
            'level',
            'difficulty',
            'xp_max',
            'category',
            'correct_answer',
            'phonetic_text',
            'audio_url',
            'max_replays',
            'options',
            'resource_requirements',
            'created_by',
            'created_at',
            'vocabulary_items',
        ]
        read_only_fields = fields

    def get_vocabulary_items(self, obj):
        return [item.vocabulary.word for item in obj.vocabulary_items.all()]

    def get_options(self, obj):
        if not obj.correct_answer:
            return []
        try:
            data = json.loads(obj.correct_answer)
        except (json.JSONDecodeError, TypeError):
            return []

        if isinstance(data, dict) and 'questions' in data:
            questions = data.get('questions', [])
            if questions and isinstance(questions[0], dict):
                return list(questions[0].get('options', []))
        if isinstance(data, dict) and 'options' in data:
            return list(data.get('options', []))
        return []

    def get_resource_requirements(self, obj):
        options = self.get_options(obj)
        is_speaking = obj.type in ('SPEAKING', 'LISTENING_SHADOWING')
        has_audio = bool(obj.audio_url) or obj.type in ('LISTENING_COMPREHENSION', 'LISTENING_SHADOWING')

        if is_speaking:
            input_mode = 'speech'
        elif options:
            input_mode = 'mcq'
        else:
            input_mode = 'text'

        return {
            'requires_audio': has_audio,
            'requires_microphone': is_speaking,
            'has_options': bool(options),
            'input_mode': input_mode,
        }


class DiagnosticQuestionPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for diagnostic questions.
    Exposes MCQ options but NOT the correct answer, preventing client-side cheating.
    """
    options = serializers.SerializerMethodField()
    resource_requirements = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id',
            'text',
            'type',
            'level',
            'difficulty',
            'options',
            'audio_url',
            'phonetic_text',
            'max_replays',
            'resource_requirements',
        ]
        read_only_fields = fields

    def get_options(self, obj):
        """Extract MCQ options from correct_answer JSON without revealing the answer."""
        if not obj.correct_answer:
            return []
        try:
            data = json.loads(obj.correct_answer)
        except (json.JSONDecodeError, TypeError):
            return []

        options = []
        if isinstance(data, dict) and 'questions' in data:
            questions = data.get('questions', [])
            if questions and isinstance(questions[0], dict):
                options = list(questions[0].get('options', []))
        elif isinstance(data, dict) and 'options' in data:
            options = list(data.get('options', []))

        # Shuffle so the correct answer isn't always in the same position
        # SAFE: This is for UI randomization only, not security-sensitive
        # Pseudorandom is sufficient for shuffling quiz answer options
        random.shuffle(options)  # NOSONAR
        return options

    def get_resource_requirements(self, obj):
        options = self.get_options(obj)
        is_speaking = obj.type in ('SPEAKING', 'LISTENING_SHADOWING')
        has_audio = bool(obj.audio_url) or obj.type in ('LISTENING_COMPREHENSION', 'LISTENING_SHADOWING')

        if is_speaking:
            input_mode = 'speech'
        elif options:
            input_mode = 'mcq'
        else:
            input_mode = 'text'

        return {
            'requires_audio': has_audio,
            'requires_microphone': is_speaking,
            'has_options': bool(options),
            'input_mode': input_mode,
        }
