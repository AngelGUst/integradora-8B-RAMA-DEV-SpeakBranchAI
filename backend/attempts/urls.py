from django.urls import path
from .views import SpeakingViewSet, WritingViewSet

speaking = SpeakingViewSet.as_view({'get': 'question'})
evaluate = SpeakingViewSet.as_view({'post': 'evaluate'})
transcribe = SpeakingViewSet.as_view({'post': 'transcribe'})
history = SpeakingViewSet.as_view({'get': 'history'})

writing_evaluate = WritingViewSet.as_view({'post': 'evaluate'})

urlpatterns = [
    path('speaking/question/', speaking),
    path('speaking/evaluate/', evaluate),
    path('speaking/transcribe/', transcribe),
    path('speaking/history/', history),
    path('writing/evaluate/', writing_evaluate),
]