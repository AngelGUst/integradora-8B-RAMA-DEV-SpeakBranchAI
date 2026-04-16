"""Views para exámenes"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated

from exams.models import Exam, ExamAttempt, UnlockedExam
from exams.serializers import (
    ExamSerializer,
    ExamQuestionSerializer,
    ExamStartSerializer,
    ExamAttemptSerializer,
    ExamSubmitSerializer,
)
from users.models import UserProgress
from system_config.services import LevelProgressionService



class ExamViewSet(ModelViewSet):
    """
    ViewSet para gestionar exámenes de nivel.
    
    list: Lista todos los exámenes de nivel disponibles
    retrieve: Obtiene detalles de un examen específico
    start: Inicia un intento de examen
    """
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options', 'post']

    def list(self, request, *args, **kwargs):
        """
        Override list to always return a list of exams (never a single object).
        """
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        """Solo exámenes de tipo LEVEL_UP activos"""
        user = self.request.user
        progress, _ = UserProgress.objects.get_or_create(user=user)

        # Fuente de verdad: nivel actual del usuario autenticado.
        # Evita inconsistencias si UserProgress quedó desfasado.
        progress = LevelProgressionService._sync_progress_with_user_level(user, progress)

        return Exam.objects.filter(
            type='LEVEL_UP',
            is_active=True,
            level=progress.level,
        ).order_by('level')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        Inicia un intento de examen.
        Retorna las preguntas del examen para que el usuario las responda.
        """
        exam = self.get_object()

        # Verificar si el usuario puede acceder al examen
        if not exam.can_unlock(request.user):
            if not UnlockedExam.objects.filter(
                user=request.user, exam=exam
            ).exists():
                return Response(
                    {'detail': 'No cumples requisitos para este examen. Verifica diagnóstico, nivel actual y XP requerido.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Desbloquear el examen permanentemente
        UnlockedExam.unlock_exam_for_user(request.user, exam)

        # Verificar si ya tiene un intento en progreso
        in_progress = ExamAttempt.objects.filter(
            user=request.user,
            exam=exam,
            status='IN_PROGRESS'
        ).first()

        if in_progress:
            # Continuar con el intento existente
            serializer = ExamAttemptSerializer(in_progress)
            questions = ExamQuestionSerializer(
                exam.exam_questions.select_related('question').order_by('order'),
                many=True
            )
            return Response({
                'attempt': serializer.data,
                'questions': questions.data,
                'continuing': True,
            })

        # Crear un nuevo intento
        attempt = ExamAttempt.objects.create(
            user=request.user,
            exam=exam,
            status='IN_PROGRESS'
        )

        # Obtener las preguntas del examen
        questions = ExamQuestionSerializer(
            exam.exam_questions.select_related('question').order_by('order'),
            many=True
        )

        serializer = ExamAttemptSerializer(attempt)
        return Response({
            'attempt': serializer.data,
            'questions': questions.data,
            'continuing': False,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """
        Obtiene las preguntas de un examen (sin iniciar intento).
        Útil para vista previa o información.
        """
        exam = self.get_object()
        questions = ExamQuestionSerializer(
            exam.exam_questions.select_related('question').order_by('order'),
            many=True
        )
        return Response({'questions': questions.data})


class ExamAttemptViewSet(ModelViewSet):
    """
    ViewSet para gestionar intentos de exámenes.
    
    list: Lista todos los intentos del usuario
    retrieve: Obtiene detalles de un intento específico
    submit: Envía las respuestas y completa el intento
    """
    serializer_class = ExamAttemptSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        """Solo intentos del usuario autenticado"""
        return ExamAttempt.objects.filter(
            user=self.request.user
        ).select_related('exam').order_by('-started_at')

    @action(detail=False, methods=['post'])
    def submit(self, request):
        """
        Envía las respuestas de un examen.
        Calcula el score y determina si aprobó.
        """
        serializer = ExamSubmitSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        attempt = serializer.context['attempt']
        answers = serializer.validated_data['answers']
        time_spent = serializer.validated_data.get('time_spent_seconds', 0)

        previous_best = ExamAttempt.objects.filter(
            user=request.user,
            exam=attempt.exam,
            status='COMPLETED',
            score__isnull=False,
        ).exclude(id=attempt.id).order_by('-score').first()
        previous_best_score = float(previous_best.score) if previous_best and previous_best.score is not None else 0.0

        # Calcular score y completar el intento
        score = attempt.complete_attempt(answers)
        attempt.time_spent_seconds = time_spent
        attempt.save()

        # Serializar el resultado
        result = ExamAttemptSerializer(attempt)
        return Response({
            'attempt': result.data,
            'score': score,
            'previous_best_score': round(previous_best_score, 2),
            'score_delta': round(float(score or 0) - previous_best_score, 2),
            'passed': attempt.passed,
            'message': '¡Felicidades! Has aprobado el examen.' if attempt.passed else 'No aprobaste el examen. Puedes intentarlo de nuevo.',
        }, status=status.HTTP_200_OK)
