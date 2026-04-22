# questions/views/question_vocabulary_views.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from questions.models import Question, QuestionVocabulary
from questions.permissions import IsAdminRole
from questions.serializers import (
    QuestionVocabularyCreateSerializer,
    QuestionVocabularyDetailSerializer,
)

# Constant to avoid string duplication
MSG_QUESTION_NOT_FOUND = 'Pregunta no encontrada.'


class QuestionVocabularyAddView(APIView):
    """
    GET    /api/questions/{question_id}/vocabulary/   → lista vocabulario vinculado
    POST   /api/questions/{question_id}/vocabulary/   → añade vocabulario a la pregunta
    """

    permission_classes = [IsAdminRole]

    def get(self, request, question_id=None):
        try:
            question = Question.objects.get(id=question_id, is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': MSG_QUESTION_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND
            )

        items = (
            QuestionVocabulary.objects
            .select_related('vocabulary')
            .filter(question=question)
        )
        serializer = QuestionVocabularyDetailSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, question_id=None):
        """
        Body:
        {
            "vocabulary_id": 123,
            "is_key": true,
            "order": 10
        }
        """
        try:
            question = Question.objects.get(id=question_id, is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': MSG_QUESTION_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = QuestionVocabularyCreateSerializer(
            data=request.data,
            context={'question': question}
        )

        if serializer.is_valid():
            serializer.save()
            # Retornar el vocabulario creado con detalles
            vocab_item = QuestionVocabulary.objects.get(
                question=question,
                vocabulary_id=serializer.validated_data['vocabulary_id']
            )
            detail_serializer = QuestionVocabularyDetailSerializer(vocab_item)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuestionVocabularyRemoveView(APIView):
    """
    DELETE /api/questions/{question_id}/vocabulary/{vocab_id}/
    Elimina vocabulario de una pregunta.
    """

    permission_classes = [IsAdminRole]

    def delete(self, request, question_id=None, vocab_id=None):
        try:
            question = Question.objects.get(id=question_id, is_active=True)
        except Question.DoesNotExist:
            return Response(
                {'detail': MSG_QUESTION_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            vocab_item = QuestionVocabulary.objects.get(
                question=question,
                vocabulary_id=vocab_id
            )
            vocab_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except QuestionVocabulary.DoesNotExist:
            return Response(
                {'detail': 'Vocabulario no vinculado a esta pregunta.'},
                status=status.HTTP_404_NOT_FOUND
            )

