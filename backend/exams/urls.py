"""URLs para exámenes"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from exams.views import ExamViewSet, ExamAttemptViewSet

router = DefaultRouter()
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'exam-attempts', ExamAttemptViewSet, basename='exam-attempt')

urlpatterns = [
    path('', include(router.urls)),
]
