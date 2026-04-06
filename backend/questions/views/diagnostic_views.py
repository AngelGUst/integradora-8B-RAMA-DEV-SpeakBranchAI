from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from questions.models import Question
from questions.serializers import DiagnosticQuestionSerializer


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
