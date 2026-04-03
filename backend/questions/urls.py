from django.urls import include, path
from rest_framework.routers import DefaultRouter

from questions.views import QuestionViewSet

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='questions')

urlpatterns = [
    path('', include(router.urls)),
]
