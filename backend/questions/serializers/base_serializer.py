from rest_framework import serializers
from questions.models import Question

XP_BY_DIFFICULTY = {'EASY': 10, 'MEDIUM': 20, 'HARD': 30}


class BaseQuestionSerializer(serializers.ModelSerializer):
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
            'created_by',
            'created_at',
        ]
        read_only_fields = ['id', 'xp_max', 'created_by', 'created_at']

    def validate(self, attrs):
        difficulty = attrs.get('difficulty') or (
            self.instance.difficulty if self.instance else None
        )
        if difficulty:
            attrs['xp_max'] = XP_BY_DIFFICULTY.get(difficulty, 20)
        return attrs
