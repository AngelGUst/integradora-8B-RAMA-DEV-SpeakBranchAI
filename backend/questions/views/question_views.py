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
    QuestionListSerializer,
    ListeningComprehensionSerializer,
    ListeningShadowingSerializer,
    ReadingQuestionSerializer,
    SpeakingQuestionSerializer,
    WritingQuestionSerializer,
    QuestionVocabularyDetailSerializer,
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
        qs = Question.objects.select_related('created_by').prefetch_related(
            'vocabulary_items',
            'vocabulary_items__vocabulary',
        ).filter(is_active=True)
        return QuestionFilter.apply(qs, self.request.query_params)

    def list(self, request, *args, **kwargs):
        """
        Allow fetching all questions in a single request with ?all=true.
        Keeps paginated behavior by default.
        """
        queryset = self.filter_queryset(self.get_queryset())
        all_mode = request.query_params.get('all', 'false').lower() == 'true'

        if all_mode:
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        return super().list(request, *args, **kwargs)

    def get_object(self):
        # Cache para evitar doble query en get_serializer_class + destroy
        if not hasattr(self, '_question_obj'):
            self._question_obj = super().get_object()
        return self._question_obj

    def get_serializer_class(self):
        # For list action, use lightweight serializer without nested vocabulary
        if self.action == 'list':
            return QuestionListSerializer
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
        data = serializer.data

        # Attach vocabulary items to detail response
        items = (
            QuestionVocabulary.objects
            .select_related('vocabulary')
            .filter(question=instance)
        )
        data['vocabulary_items'] = QuestionVocabularyDetailSerializer(items, many=True).data

        return Response(data)

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
