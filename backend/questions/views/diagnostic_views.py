from django.db import transaction
from django.db.models import Case, IntegerField, Value, When
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from questions.models import Question
from questions.serializers import (
    DiagnosticQuestionSerializer,
    DiagnosticQuestionPublicSerializer,
    DiagnosticSubmitRequestSerializer,
    DiagnosticSubmitResponseSerializer,
    AdaptiveNextRequestSerializer,
)
from questions.services import evaluate_diagnostic, get_next_adaptive_question
from questions.services.adaptive_service import get_adaptive_session_questions
from users.models import UserProgress


class DiagnosticQuestionsView(ListAPIView):
    """
    Returns diagnostic questions for placement tests.
    Uses the public serializer that exposes MCQ options but NOT the correct answer.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DiagnosticQuestionPublicSerializer

    def get_queryset(self):
        return (
            Question.objects.filter(
                is_active=True,
                category=Question.Category.DIAGNOSTIC,
            )
            .order_by('?')
        )

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            limit = request.query_params.get('limit')
            if limit is not None:
                limit_value = int(limit)
                if limit_value <= 0:
                    raise ValueError
                queryset = queryset[:limit_value]
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {'detail': 'limit must be a positive integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {'detail': 'Unable to load diagnostic questions.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DiagnosticSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DiagnosticSubmitRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        answers = serializer.validated_data['answers']
        question_ids = [item['question_id'] for item in answers]

        questions = list(
            Question.objects.filter(
                id__in=question_ids,
                is_active=True,
                category=Question.Category.DIAGNOSTIC,
            )
        )

        if len(questions) != len(set(question_ids)):
            return Response(
                {'detail': 'One or more questions are invalid or not diagnostic.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questions_by_id = {q.id: q for q in questions}
        result = evaluate_diagnostic(questions_by_id, answers)

        with transaction.atomic():
            request.user.level = result.assigned_level
            request.user.diagnostic_completed = True
            request.user.save(update_fields=['level', 'diagnostic_completed'])

            progress, _ = UserProgress.objects.get_or_create(user=request.user)
            progress.level = result.assigned_level
            progress.level_start_xp = progress.total_xp
            progress.save(update_fields=['level', 'level_start_xp'])

        response_serializer = DiagnosticSubmitResponseSerializer({
            'assigned_level': result.assigned_level,
            'overall_accuracy': result.overall_accuracy,
            'total_correct': result.total_correct,
            'total_items': result.total_items,
            'by_level': result.by_level,
        })
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class LevelExercisesView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DiagnosticQuestionSerializer

    def list(self, request, *args, **kwargs):
        """
        Sesión adaptativa de ejercicios:
        - Tamaño variable por defecto (no fijo en 5)
        - Selección aleatoria
        - Dificultad balanceada según desempeño

        Query params:
        - level, type, category
        - limit (opcional)
        - strict_limit=true para respetar exactamente limit
        - dynamic=false para usar el comportamiento clásico
        """
        level = request.query_params.get('level') or getattr(request.user, 'level', 'A1')
        q_type = request.query_params.get('type')
        category = request.query_params.get('category')
        limit = request.query_params.get('limit')

        dynamic = request.query_params.get('dynamic', 'true').lower() != 'false'
        strict_limit = request.query_params.get('strict_limit', 'false').lower() == 'true'

        parsed_limit = None
        if limit is not None:
            try:
                parsed_limit = int(limit)
            except (TypeError, ValueError):
                parsed_limit = None

        if dynamic:
            questions = get_adaptive_session_questions(
                user=request.user,
                level=level,
                q_type=q_type,
                category=category,
                limit=parsed_limit,
                force_dynamic=not strict_limit,
            )
            serializer = self.get_serializer(questions, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        level = self.request.query_params.get('level') or getattr(self.request.user, 'level', 'A1')
        q_type = self.request.query_params.get('type')
        category = self.request.query_params.get('category')
        limit = self.request.query_params.get('limit')

        difficulty_order = Case(
            When(difficulty='EASY', then=Value(1)),
            When(difficulty='MEDIUM', then=Value(2)),
            When(difficulty='HARD', then=Value(3)),
            default=Value(4),
            output_field=IntegerField(),
        )

        qs = (
            Question.objects.filter(is_active=True, level=level)
            .exclude(category=Question.Category.DIAGNOSTIC)
            .select_related('created_by')
            .prefetch_related('vocabulary_items__vocabulary')
            .annotate(difficulty_order=difficulty_order)
            .order_by('difficulty_order', 'created_at')
        )

        if q_type:
            qs = qs.filter(type=q_type)
        if category:
            qs = qs.filter(category=category)

        if limit is not None:
            try:
                limit_value = int(limit)
                if limit_value > 0:
                    qs = qs[:limit_value]
            except ValueError:
                pass

        return qs.order_by('?')


class AdaptiveNextQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AdaptiveNextRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        level = data.get('level') or getattr(request.user, 'level', 'A1')
        q_type = data.get('type')
        category = data.get('category')
        last_score = data.get('last_score')
        current_difficulty = data.get('current_difficulty')
        exclude_ids = data.get('exclude_ids', [])

        question = get_next_adaptive_question(
            user=request.user,
            level=level,
            q_type=q_type,
            last_score=last_score,
            current_difficulty=current_difficulty,
            exclude_ids=exclude_ids,
            category=category,
        )

        if not question:
            return Response(
                {'detail': 'No questions available for the requested criteria.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(DiagnosticQuestionSerializer(question).data, status=status.HTTP_200_OK)
