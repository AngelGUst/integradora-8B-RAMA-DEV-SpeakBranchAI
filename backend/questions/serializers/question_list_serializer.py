from rest_framework import serializers
from questions.models import Question


class QuestionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing questions without nested vocabulary."""
    xp_max = serializers.IntegerField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)

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
        ]
        read_only_fields = ['id', 'xp_max', 'created_by', 'created_at']
