from django.urls import include, path
from rest_framework.routers import DefaultRouter

from questions.views import (
    QuestionViewSet,
    QuestionVocabularyAddView,
    QuestionVocabularyRemoveView,
)
from questions.views.diagnostic_views import DiagnosticQuestionsView

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='questions')

urlpatterns = [
    path('questions/diagnostic/', DiagnosticQuestionsView.as_view(), name='questions-diagnostic'),
    path('', include(router.urls)),
    # Vocabulary management endpoints
    path('questions/<int:question_id>/vocabulary/', QuestionVocabularyAddView.as_view(), name='add-question-vocabulary'),
    path('questions/<int:question_id>/vocabulary/<int:vocab_id>/', QuestionVocabularyRemoveView.as_view(), name='remove-question-vocabulary'),
]
