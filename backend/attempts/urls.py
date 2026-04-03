from django.urls import path
from .views import SpeakingViewSet

speaking = SpeakingViewSet.as_view({'get': 'question'})
evaluate = SpeakingViewSet.as_view({'post': 'evaluate'})
transcribe = SpeakingViewSet.as_view({'post': 'transcribe'})
history = SpeakingViewSet.as_view({'get': 'history'})

urlpatterns = [
    path('speaking/question/', speaking),
    path('speaking/evaluate/', evaluate),
    path('speaking/transcribe/', transcribe),
    path('speaking/history/', history),
]