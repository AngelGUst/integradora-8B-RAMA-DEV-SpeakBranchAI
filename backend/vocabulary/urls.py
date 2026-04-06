# vocabulary/urls.py
from django.urls import path

from vocabulary.views import (
    DailyVocabularyView,
    ExerciseVocabularyView,
    MarkSeenView,
    MyVocabularyView,
    PracticeVocabularyView,
    VocabularyDetailView,
    VocabularyListView,
)

urlpatterns = [
    path('my/', MyVocabularyView.as_view(), name='my-vocabulary'),
    path('daily/', DailyVocabularyView.as_view(), name='daily-vocabulary'),
    path('daily/<int:pk>/seen/', MarkSeenView.as_view(), name='mark-seen'),
    path('daily/<int:pk>/practice/', PracticeVocabularyView.as_view(), name='practice-vocabulary'),
    path('exercise-words/', ExerciseVocabularyView.as_view(), name='exercise-vocabulary'),
    path('<int:pk>/', VocabularyDetailView.as_view(), name='vocabulary-detail'),
    path('', VocabularyListView.as_view(), name='vocabulary-list'),
]
