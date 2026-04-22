from rest_framework import serializers
from questions.models import Question

XP_BY_DIFFICULTY = {'EASY': 10, 'MEDIUM': 20, 'HARD': 30}


class BaseQuestionSerializer(serializers.ModelSerializer):
    xp_max = serializers.IntegerField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    vocabulary_items = serializers.SerializerMethodField(required=False)
    audio_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)

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

    def _validate_required_field(self, value, field_name, question_type=''):
        """Generic validation for required text fields"""
        if not value or not value.strip():
            msg = f'{field_name} es requerido'
            if question_type:
                msg += f' para {question_type}'
            msg += '.'
            raise serializers.ValidationError(msg)
        return value

    def validate(self, attrs):
        if attrs.get('audio_url', None) == '':
            attrs['audio_url'] = None

        difficulty = attrs.get('difficulty') or (
            self.instance.difficulty if self.instance else None
        )
        if difficulty:
            attrs['xp_max'] = XP_BY_DIFFICULTY.get(difficulty, 20)
        return attrs

    def get_vocabulary_items(self, obj):
        """
        Uses prefetched vocabulary_items — ordering is set in the Prefetch object
        on the view's get_queryset(). Calling .order_by() here would bypass the
        prefetch cache and trigger N individual queries.
        """
        from .question_vocabulary_serializer import QuestionVocabularyDetailSerializer

        vocab_items = obj.vocabulary_items.all()
        return QuestionVocabularyDetailSerializer(vocab_items, many=True).data
