# questions/serializers/question_vocabulary_serializer.py

from rest_framework import serializers
from questions.models import QuestionVocabulary
from vocabulary.serializers import VocabularySerializer


class QuestionVocabularyDetailSerializer(serializers.ModelSerializer):
    """Serializer para vocabulario vinculado a una pregunta con detalles de la palabra"""

    vocabulary = serializers.SerializerMethodField()

    class Meta:
        model = QuestionVocabulary
        fields = ['id', 'vocabulary', 'is_key', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_vocabulary(self, obj):
        """Usa el custom VocabularySerializer para serializar la palabra"""
        return VocabularySerializer.to_dict(obj.vocabulary)


class QuestionVocabularyCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar vocabulario vinculado a una pregunta"""

    vocabulary_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = QuestionVocabulary
        fields = ['vocabulary_id', 'is_key', 'order']

    def create(self, validated_data):
        """Crea o actualiza la relación"""
        vocabulary_id = validated_data.pop('vocabulary_id')
        question = self.context['question']

        obj, _ = QuestionVocabulary.objects.update_or_create(
            question=question,
            vocabulary_id=vocabulary_id,
            defaults=validated_data
        )
        return obj
