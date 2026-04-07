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
    DiagnosticSubmitRequestSerializer,
    DiagnosticSubmitResponseSerializer,
    AdaptiveNextRequestSerializer,
)
from questions.services import evaluate_diagnostic, get_next_adaptive_question
from users.models import UserProgress


class DiagnosticQuestionsView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DiagnosticQuestionSerializer

    def get_queryset(self):
        return (
            Question.objects.filter(
                is_active=True,
                category=Question.Category.DIAGNOSTIC,
            )
            .select_related('created_by')
            .prefetch_related('vocabulary_items__vocabulary')
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
            progress.save(update_fields=['level'])

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

        return qs


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
