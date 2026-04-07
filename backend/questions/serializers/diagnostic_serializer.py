from rest_framework import serializers

from questions.models import Question


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
            'correct_answer',
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
