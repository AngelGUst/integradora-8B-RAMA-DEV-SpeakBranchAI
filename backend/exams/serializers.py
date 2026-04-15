"""Serializers para exámenes"""
import json

from rest_framework import serializers
from exams.models import Exam, ExamQuestion, ExamAttempt
from system_config.services import LevelProgressionService


class ExamQuestionSerializer(serializers.ModelSerializer):
    """Serializer para preguntas de un examen"""
    question_id = serializers.IntegerField(source='question.id')
    text = serializers.CharField(source='question.text')
    question_type = serializers.CharField(source='question.type')
    level = serializers.CharField(source='question.level')
    difficulty = serializers.CharField(source='question.difficulty')
    correct_answer = serializers.CharField(source='question.correct_answer')
    audio_url = serializers.CharField(source='question.audio_url')
    phonetic_text = serializers.CharField(source='question.phonetic_text')
    max_replays = serializers.IntegerField(source='question.max_replays')
    options = serializers.SerializerMethodField()
    resource_requirements = serializers.SerializerMethodField()
    points = serializers.IntegerField()
    order = serializers.IntegerField()

    class Meta:
        model = ExamQuestion
        fields = [
            'question_id', 'text', 'question_type', 'level', 'difficulty',
            'correct_answer', 'audio_url', 'phonetic_text', 'max_replays',
            'options', 'resource_requirements', 'points', 'order',
        ]

    def get_options(self, obj):
        raw = getattr(obj.question, 'correct_answer', None)
        if not raw:
            return []

        try:
            data = json.loads(raw)
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
        q_type = getattr(obj.question, 'type', '')
        is_speaking = q_type in ('SPEAKING', 'LISTENING_SHADOWING')
        has_audio = bool(getattr(obj.question, 'audio_url', None)) or q_type in (
            'LISTENING_COMPREHENSION', 'LISTENING_SHADOWING'
        )

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


class ExamSerializer(serializers.ModelSerializer):
    """Serializer para exámenes"""
    question_count = serializers.IntegerField(read_only=True)
    can_unlock = serializers.SerializerMethodField()
    is_unlocked = serializers.SerializerMethodField()
    last_attempt = serializers.SerializerMethodField()
    required_xp_for_level = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'level', 'type', 'name', 'description',
            'xp_required', 'passing_score', 'time_limit_minutes',
            'question_count', 'is_active', 'created_at',
            'can_unlock', 'is_unlocked', 'last_attempt', 'required_xp_for_level',
        ]
        read_only_fields = ['id', 'created_at']

    def get_can_unlock(self, obj):
        """Verifica si el usuario puede desbloquear este examen"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_unlock(request.user)
        return False

    def get_is_unlocked(self, obj):
        """Verifica si el examen ya está desbloqueado"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from exams.models import UnlockedExam
            return UnlockedExam.objects.filter(
                user=request.user, exam=obj
            ).exists()
        return False

    def get_last_attempt(self, obj):
        """Obtiene el último intento del usuario en este examen"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            attempt = ExamAttempt.objects.filter(
                user=request.user, exam=obj
            ).order_by('-started_at').first()
            if attempt:
                return {
                    'id': attempt.id,
                    'score': attempt.score,
                    'passed': attempt.passed,
                    'xp_earned': attempt.xp_earned,
                    'status': attempt.status,
                    'started_at': attempt.started_at,
                }
        return None

    def get_required_xp_for_level(self, obj):
        """XP requerido dinámico para LEVEL_UP, o xp_required para otros exámenes."""
        if obj.type == 'LEVEL_UP':
            next_level = LevelProgressionService.get_next_level(obj.level)
            if not next_level:
                return 0
            return LevelProgressionService.get_required_xp_for_level(next_level)
        return obj.xp_required


class ExamStartSerializer(serializers.Serializer):
    """Serializer para iniciar un examen"""
    exam_id = serializers.IntegerField()

    def validate_exam_id(self, value):
        """Validar que el examen existe y está activo"""
        try:
            exam = Exam.objects.get(id=value, is_active=True)
        except Exam.DoesNotExist:
            raise serializers.ValidationError("Examen no encontrado")

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado")

        # Verificar si el usuario puede acceder al examen
        if not exam.can_unlock(request.user):
            from exams.models import UnlockedExam
            # También permitir si ya está desbloqueado
            if not UnlockedExam.objects.filter(
                user=request.user, exam=exam
            ).exists():
                raise serializers.ValidationError(
                    "No tienes suficiente XP para acceder a este examen"
                )

        self.context['exam'] = exam
        return value


class ExamAttemptSerializer(serializers.ModelSerializer):
    """Serializer para intentos de examen"""
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    exam_level = serializers.CharField(source='exam.level', read_only=True)
    exam_type = serializers.CharField(source='exam.type', read_only=True)
    passing_score = serializers.IntegerField(source='exam.passing_score', read_only=True)
    time_limit_minutes = serializers.IntegerField(source='exam.time_limit_minutes', read_only=True)

    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_name', 'exam_level', 'exam_type',
            'passing_score', 'time_limit_minutes',
            'status', 'score', 'passed', 'xp_earned',
            'answers', 'started_at', 'completed_at', 'time_spent_seconds',
        ]
        read_only_fields = ['id', 'started_at', 'completed_at']


class ExamSubmitSerializer(serializers.Serializer):
    """Serializer para enviar respuestas de un examen"""
    attempt_id = serializers.IntegerField()
    answers = serializers.JSONField()
    time_spent_seconds = serializers.IntegerField(required=False, default=0)

    def validate_attempt_id(self, value):
        """Validar que el intento existe y pertenece al usuario"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado")

        try:
            attempt = ExamAttempt.objects.get(
                id=value,
                user=request.user,
                status='IN_PROGRESS'
            )
        except ExamAttempt.DoesNotExist:
            raise serializers.ValidationError("Intento no encontrado o ya completado")

        self.context['attempt'] = attempt
        return value

    def validate_answers(self, value):
        """Validar que las respuestas sean un diccionario"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Las respuestas deben ser un diccionario")
        return value
