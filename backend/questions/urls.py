from django.urls import include, path
from rest_framework.routers import DefaultRouter

from questions.views import QuestionViewSet
from questions.views.diagnostic_views import DiagnosticQuestionsView

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='questions')

urlpatterns = [
    path('questions/diagnostic/', DiagnosticQuestionsView.as_view(), name='questions-diagnostic'),
    path('', include(router.urls)),
]
