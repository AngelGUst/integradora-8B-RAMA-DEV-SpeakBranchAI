# courses/serializers.py
"""
Serializers para la app courses

Maneja la serialización/deserialización de datos para las API REST.
"""

from rest_framework import serializers
from .models import Course, Lesson, CourseEnrollment, LessonProgress


class CourseSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para Course"""
    total_lessons = serializers.IntegerField(read_only=True)
    total_xp = serializers.IntegerField(read_only=True)
    total_duration = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'name', 'level', 'description',
            'total_lessons', 'total_xp', 'total_duration', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LessonSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para Lesson"""
    is_first = serializers.SerializerMethodField()
    is_last = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'order_index', 'content_type',
            'duration_min', 'xp_value', 'is_first', 'is_last'
        ]
        read_only_fields = fields

    def get_is_first(self, obj):
        return obj.is_first_lesson()

    def get_is_last(self, obj):
        return obj.is_last_lesson()


class LessonDetailSerializer(LessonSimpleSerializer):
    """Serializer con detalle de Lesson"""
    course = CourseSimpleSerializer(read_only=True)

    class Meta(LessonSimpleSerializer.Meta):
        fields = LessonSimpleSerializer.Meta.fields + ['content_url', 'course']


class LessonProgressSerializer(serializers.ModelSerializer):
    """Serializer para LessonProgress"""
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    lesson_order = serializers.IntegerField(source='lesson.order_index', read_only=True)
    lesson_type = serializers.CharField(source='lesson.content_type', read_only=True)
    lesson_xp = serializers.IntegerField(source='lesson.xp_value', read_only=True)
    is_unlocked = serializers.SerializerMethodField()

    class Meta:
        model = LessonProgress
        fields = [
            'id', 'lesson', 'lesson_title', 'lesson_order', 'lesson_type',
            'lesson_xp', 'completed', 'completed_at', 'score',
            'xp_earned', 'attempts', 'is_unlocked', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_is_unlocked(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            from .services import LessonProgressService
            return LessonProgressService.can_access_lesson(request.user, obj.lesson)
        return False


class CourseProgressSerializer(serializers.Serializer):
    """Serializer para resumen de progreso del curso"""
    course = CourseSimpleSerializer()
    total_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    completion_percentage = serializers.FloatField()
    total_xp_earned = serializers.IntegerField()
    total_xp_available = serializers.IntegerField()
    is_completed = serializers.BooleanField()
    lessons = LessonProgressSerializer(many=True)


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer para CourseEnrollment"""
    course = CourseSimpleSerializer(read_only=True)
    current_lesson = LessonSimpleSerializer(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    total_xp_earned = serializers.IntegerField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = [
            'id', 'user', 'course', 'current_lesson',
            'enrolled_at', 'completed_at',
            'progress_percentage', 'total_xp_earned', 'is_completed'
        ]
        read_only_fields = fields


class LessonCompletionRequestSerializer(serializers.Serializer):
    """Serializer para completar una lección"""
    score = serializers.FloatField(
        min_value=0,
        max_value=100,
        help_text='Score obtenido (0-100)'
    )
    xp_earned = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='XP a otorgar (default: xp_value de la lección)'
    )


class LessonCompletionResponseSerializer(serializers.Serializer):
    """Serializer para respuesta de completar lección"""
    lesson = LessonSimpleSerializer()
    score = serializers.FloatField()
    xp_earned = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    level_progress = serializers.JSONField()
    is_first_completion = serializers.BooleanField()
    course_completed = serializers.BooleanField()
    next_lesson = LessonSimpleSerializer(required=False)
