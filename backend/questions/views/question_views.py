from django.db.models import Prefetch

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated

from questions.filters import QuestionFilter
from questions.models import Question, QuestionVocabulary
from questions.permissions import IsAdminRole
from questions.serializers import (
    BaseQuestionSerializer,
    ListeningComprehensionSerializer,
    ListeningShadowingSerializer,
    ReadingQuestionSerializer,
    SpeakingQuestionSerializer,
    WritingQuestionSerializer,
)

TYPE_SERIALIZER_MAP = {
    'SPEAKING': SpeakingQuestionSerializer,
    'READING': ReadingQuestionSerializer,
    'LISTENING_SHADOWING': ListeningShadowingSerializer,
    'LISTENING_COMPREHENSION': ListeningComprehensionSerializer,
    'WRITING': WritingQuestionSerializer,
}


class QuestionViewSet(ModelViewSet):
    permission_classes = [IsAdminRole]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get_queryset(self):
        vocab_prefetch = Prefetch(
            'vocabulary_items',
            queryset=QuestionVocabulary.objects
                .select_related('vocabulary')
                .order_by('-is_key', '-order'),
        )
        qs = (
            Question.objects
            .select_related('created_by')
            .prefetch_related(vocab_prefetch)
            .filter(is_active=True)
        )
        return QuestionFilter.apply(qs, self.request.query_params)

    def get_object(self):
        # Cache para evitar doble query en get_serializer_class + destroy
        if not hasattr(self, '_question_obj'):
            self._question_obj = super().get_object()
        return self._question_obj

    def get_serializer_class(self):
        # En create usamos el type del body
        if self.action == 'create':
            question_type = self.request.data.get('type')
        # En retrieve/update/destroy usamos el type del objeto existente
        elif self.kwargs.get('pk'):
            try:
                question_type = self.get_object().type
            except Exception:
                question_type = None
        else:
            question_type = None

        return TYPE_SERIALIZER_MAP.get(question_type, BaseQuestionSerializer)

    def create(self, request, *args, **kwargs):
        if 'type' not in request.data:
            return Response(
                {'type': 'Este campo es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        from exams.models import ExamQuestion

        instance = self.get_object()
        if ExamQuestion.objects.filter(question=instance).exists():
            return Response(
                {'detail': 'Cannot delete: question is used in an active exam.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
