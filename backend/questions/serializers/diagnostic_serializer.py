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
            'phonetic_text',
            'audio_url',
            'max_replays',
            'created_by',
            'created_at',
            'vocabulary_items',
        ]
        read_only_fields = fields

    def get_vocabulary_items(self, obj):
        return [item.vocabulary.word for item in obj.vocabulary_items.all()]
