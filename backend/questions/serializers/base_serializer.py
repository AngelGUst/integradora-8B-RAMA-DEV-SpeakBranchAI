from rest_framework import serializers
from questions.models import Question

XP_BY_DIFFICULTY = {'EASY': 10, 'MEDIUM': 20, 'HARD': 30}


class BaseQuestionSerializer(serializers.ModelSerializer):
    xp_max = serializers.IntegerField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    vocabulary_items = serializers.SerializerMethodField(required=False)

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
        read_only_fields = ['id', 'xp_max', 'created_by', 'created_at', 'vocabulary_items']

    def validate(self, attrs):
        difficulty = attrs.get('difficulty') or (
            self.instance.difficulty if self.instance else None
        )
        if difficulty:
            attrs['xp_max'] = XP_BY_DIFFICULTY.get(difficulty, 20)
        return attrs

    def get_vocabulary_items(self, obj):
        """
        Retorna el vocabulario vinculado a la pregunta ordenado por is_key y order
        Import lazy para evitar circular dependencies
        """
        from .question_vocabulary_serializer import QuestionVocabularyDetailSerializer

        vocab_items = obj.vocabulary_items.all().order_by('-is_key', '-order')
        return QuestionVocabularyDetailSerializer(vocab_items, many=True).data
