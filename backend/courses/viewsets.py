# courses/viewsets.py
"""
ViewSets para la app courses

Expone los endpoints REST para la lógica de negocio de cursos.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError

from .models import Course, Lesson, CourseEnrollment, LessonProgress
from .serializers import (
    CourseSimpleSerializer, LessonDetailSerializer, LessonSimpleSerializer,
    CourseEnrollmentSerializer, LessonProgressSerializer,
    LessonCompletionRequestSerializer, LessonCompletionResponseSerializer,
    CourseProgressSerializer
)
from .services import (
    CourseEnrollmentService, LessonProgressService,
    LessonCompletionService
)


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para cursos

    Endpoints:
    - GET /courses/ - Listar todos los cursos
    - GET /courses/{id}/ - Detalle de un curso
    - GET /courses/{id}/lessons/ - Lecciones del curso
    - GET /courses/{id}/progress/ - Progreso del usuario en el curso
    """
    queryset = Course.objects.all()
    serializer_class = CourseSimpleSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def lessons(self, request, pk=None):
        """Obtiene todas las lecciones de un curso"""
        course = self.get_object()
        lessons = course.lessons.all().order_by('order_index')
        serializer = LessonSimpleSerializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Obtiene el progreso del usuario en el curso"""
        course = self.get_object()
        try:
            progress_data = LessonCompletionService.get_course_progress_summary(
                request.user, course
            )
            serializer = CourseProgressSerializer(progress_data)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        """Obtiene los cursos inscritos del usuario"""
        enrollments = CourseEnrollment.objects.filter(
            user=request.user,
            completed_at__isnull=True
        ).select_related('course')

        courses = [e.course for e in enrollments]
        serializer = CourseSimpleSerializer(courses, many=True)
        return Response(serializer.data)


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para lecciones

    Endpoints:
    - GET /lessons/ - Listar todas las lecciones
    - GET /lessons/{id}/ - Detalle de una lección
    - POST /lessons/{id}/complete/ - Completar una lección
    - GET /lessons/{id}/is-unlocked/ - Verificar si está desbloqueada
    """
    queryset = Lesson.objects.all()
    serializer_class = LessonDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LessonDetailSerializer
        return LessonSimpleSerializer

    @action(detail=True, methods=['get'])
    def is_unlocked(self, request, pk=None):
        """Verifica si una lección está desbloqueada para el usuario"""
        lesson = self.get_object()
        is_unlocked = LessonProgressService.can_access_lesson(request.user, lesson)
        return Response({'is_unlocked': is_unlocked})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Completa una lección

        Body:
        {
            "score": 85.5,
            "xp_earned": 50  (optional)
        }
        """
        lesson = self.get_object()

        serializer = LessonCompletionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = LessonCompletionService.complete_lesson(
                user=request.user,
                lesson=lesson,
                score=serializer.validated_data['score'],
                xp_earned=serializer.validated_data.get('xp_earned')
            )

            response_serializer = LessonCompletionResponseSerializer(result)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Obtiene el progreso del usuario en una lección"""
        lesson = self.get_object()
        progress = LessonCompletionService.get_lesson_progress(request.user, lesson)

        if progress:
            serializer = LessonProgressSerializer(progress, context={'request': request})
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'No hay progreso registrado para esta lección'},
                status=status.HTTP_404_NOT_FOUND
            )


class CourseEnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para inscripciones

    Endpoints:
    - GET /enrollments/ - Listar inscripciones del usuario
    - GET /enrollments/{id}/ - Detalle de una inscripción
    - POST /enrollments/enroll/ - Inscribir usuario en un curso
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CourseEnrollmentSerializer

    def get_queryset(self):
        return CourseEnrollment.objects.filter(
            user=self.request.user
        ).select_related('course', 'current_lesson')

    @action(detail=False, methods=['post'])
    def enroll(self, request):
        """Inscribir usuario en un curso

        Body:
        {
            "course_id": 1
        }
        """
        course_id = request.data.get('course_id')
        if not course_id:
            return Response(
                {'error': 'course_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        course = get_object_or_404(Course, pk=course_id)

        try:
            enrollment = CourseEnrollmentService.enroll_user_in_course(
                request.user, course
            )
            serializer = CourseEnrollmentSerializer(enrollment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def lessons_unlocked(self, request, pk=None):
        """Obtiene todas las lecciones desbloqueadas en la inscripción"""
        enrollment = self.get_object()
        unlocked = LessonProgressService.get_all_unlocked_lessons(
            enrollment.user, enrollment.course
        )
        serializer = LessonSimpleSerializer(unlocked, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def next_locked_lesson(self, request, pk=None):
        """Obtiene la siguiente lección bloqueada"""
        enrollment = self.get_object()
        next_locked = LessonProgressService.get_next_locked_lesson(
            enrollment.user, enrollment.course
        )

        if next_locked:
            serializer = LessonSimpleSerializer(next_locked)
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'Todas las lecciones están desbloqueadas'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Obtiene el resumen de progreso de la inscripción"""
        enrollment = self.get_object()
        progress_data = LessonCompletionService.get_course_progress_summary(
            enrollment.user, enrollment.course
        )
        serializer = CourseProgressSerializer(progress_data)
        return Response(serializer.data)


class LessonProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para progreso de lecciones

    Endpoints:
    - GET /lesson-progress/ - Listar progreso del usuario
    - GET /lesson-progress/{id}/ - Detalle del progreso
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LessonProgressSerializer

    def get_queryset(self):
        return LessonProgress.objects.filter(
            user=self.request.user
        ).select_related('lesson')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
