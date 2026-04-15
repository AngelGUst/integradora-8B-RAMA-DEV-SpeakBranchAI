"""
Serializers para los módulos Speaking y Writing.
"""

from rest_framework import serializers
from questions.models import Question
from .models import SpeakingAttempt, WritingAttempt


class SpeakingQuestionSerializer(serializers.ModelSerializer):
    """Datos de la pregunta que ve el alumno."""

    class Meta:
        model = Question
        fields = ['id', 'text', 'difficulty', 'level', 'phonetic_text', 'xp_max']
        read_only_fields = fields


class SpeakingEvaluateRequestSerializer(serializers.Serializer):
    """Valida el body del POST /speaking/evaluate/."""

    question_id = serializers.IntegerField()
    transcript = serializers.CharField(max_length=500, allow_blank=False)
    attempts_count = serializers.IntegerField(min_value=1, default=1)


class SpeakingEvaluateResponseSerializer(serializers.ModelSerializer):
    """Respuesta devuelta al alumno tras evaluar su pronunciación."""

    word = serializers.CharField(source='question.correct_answer', read_only=True)

    class Meta:
        model = SpeakingAttempt
        fields = [
            'id', 'word', 'transcribed_text',
            'score', 'xp_earned', 'attempts_count', 'created_at'
        ]
        read_only_fields = fields


class SpeakingHistorySerializer(serializers.ModelSerializer):
    """Historial de intentos del alumno."""

    question_text = serializers.CharField(source='question.text', read_only=True)
    question_difficulty = serializers.CharField(source='question.difficulty', read_only=True)

    class Meta:
        model = SpeakingAttempt
        fields = [
            'id', 'question_text', 'question_difficulty',
            'transcribed_text', 'score', 'xp_earned',
            'attempts_count', 'created_at'
        ]
        read_only_fields = fields


class WritingEvaluateRequestSerializer(serializers.Serializer):
    """Valida el body del POST /writing/evaluate/."""

    question_id = serializers.IntegerField()
    student_text = serializers.CharField(min_length=10, max_length=3000)


class WritingEvaluateResponseSerializer(serializers.Serializer):
    """Respuesta devuelta al alumno tras evaluar su writing."""

    score = serializers.IntegerField()
    score_grammar = serializers.FloatField()
    score_vocabulary = serializers.FloatField()
    score_coherence = serializers.FloatField()
    score_spelling = serializers.FloatField()
    feedback = serializers.CharField()
    xp_earned = serializers.IntegerField()