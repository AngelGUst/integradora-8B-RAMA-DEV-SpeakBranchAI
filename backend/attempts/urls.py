from django.urls import path
from .views import SpeakingViewSet, WritingViewSet, ReadingViewSet, ListeningShadowingViewSet, ListeningComprehensionViewSet

speaking = SpeakingViewSet.as_view({'get': 'question'})
evaluate = SpeakingViewSet.as_view({'post': 'evaluate'})
transcribe = SpeakingViewSet.as_view({'post': 'transcribe'})
history = SpeakingViewSet.as_view({'get': 'history'})
writing_evaluate = WritingViewSet.as_view({'post': 'evaluate'})
reading_question = ReadingViewSet.as_view({'get': 'question'})
reading_evaluate = ReadingViewSet.as_view({'post': 'evaluate'})
shadowing_question = ListeningShadowingViewSet.as_view({'get': 'question'})
shadowing_evaluate = ListeningShadowingViewSet.as_view({'post': 'evaluate'})
comprehension_question = ListeningComprehensionViewSet.as_view({'get': 'question'})
comprehension_evaluate = ListeningComprehensionViewSet.as_view({'post': 'evaluate'})

urlpatterns = [
    path('speaking/question/', speaking),
    path('speaking/evaluate/', evaluate),
    path('speaking/transcribe/', transcribe),
    path('speaking/history/', history),
    path('writing/evaluate/', writing_evaluate),
    path('reading/question/', reading_question),
    path('reading/evaluate/', reading_evaluate),
    path('shadowing/question/', shadowing_question),
    path('shadowing/evaluate/', shadowing_evaluate),
    path('comprehension/question/', comprehension_question),
    path('comprehension/evaluate/', comprehension_evaluate),
]
