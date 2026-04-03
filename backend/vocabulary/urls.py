# vocabulary/urls.py
from django.urls import path

from vocabulary.views import DailyVocabularyView, MarkSeenView, VocabularyListView

urlpatterns = [
    path('daily/', DailyVocabularyView.as_view(), name='daily-vocabulary'),
    path('daily/<int:pk>/seen/', MarkSeenView.as_view(), name='mark-seen'),
    path('', VocabularyListView.as_view(), name='vocabulary-list'),
]
