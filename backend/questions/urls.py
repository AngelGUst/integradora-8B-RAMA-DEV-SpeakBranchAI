from django.urls import include, path
from rest_framework.routers import DefaultRouter

from questions.views import (
    QuestionViewSet,
    QuestionVocabularyAddView,
    QuestionVocabularyRemoveView,
)

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='questions')

urlpatterns = [
    path('', include(router.urls)),
    # Vocabulary management endpoints
    path('questions/<int:question_id>/vocabulary/', QuestionVocabularyAddView.as_view(), name='add-question-vocabulary'),
    path('questions/<int:question_id>/vocabulary/<int:vocab_id>/', QuestionVocabularyRemoveView.as_view(), name='remove-question-vocabulary'),
]
