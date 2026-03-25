# courses/admin.py
from django.contrib import admin
from django.db.models import Count, Q
from .models import Course, Lesson, CourseEnrollment, LessonProgress


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'level', 'total_lessons', 'total_duration', 'total_xp', 'active_students', 'created_at')
    list_filter = ('level', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('level', 'name')
    readonly_fields = ('created_at', 'total_lessons', 'total_duration', 'total_xp', 'active_students')

    fieldsets = (
        (None, {
            'fields': ('name', 'level', 'description')
        }),
        ('Estadísticas', {
            'fields': ('total_lessons', 'total_duration', 'total_xp', 'active_students'),
            'classes': ('collapse',)
        }),
        ('Metadatos', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order_index', 'content_type', 'duration_min', 'xp_value', 'created_at')
    list_filter = ('course', 'content_type', 'created_at')
    search_fields = ('title', 'course__name')
    ordering = ('course', 'order_index')
    list_editable = ('order_index', 'duration_min', 'xp_value')
    readonly_fields = ('created_at',)
    raw_id_fields = ('course',)

    fieldsets = (
        (None, {
            'fields': ('course', 'title', 'order_index')
        }),
        ('Contenido', {
            'fields': ('content_type', 'content_url', 'duration_min')
        }),
        ('Recompensa', {
            'fields': ('xp_value',)
        }),
        ('Metadatos', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'enrolled_at', 'completed_at', 'progress_percentage', 'total_xp_earned')
    list_filter = ('course__level', 'course', 'enrolled_at', 'completed_at')
    search_fields = ('user__email', 'user__first_name', 'course__name')
    readonly_fields = ('enrolled_at', 'progress_percentage', 'total_xp_earned')
    raw_id_fields = ('user', 'course', 'current_lesson')

    fieldsets = (
        (None, {
            'fields': ('user', 'course', 'current_lesson')
        }),
        ('Estado', {
            'fields': ('enrolled_at', 'completed_at')
        }),
        ('Progreso', {
            'fields': ('progress_percentage', 'total_xp_earned'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'course', 'current_lesson')


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'lesson', 'completed', 'score', 'xp_earned', 'attempts', 'completed_at')
    list_filter = ('completed', 'lesson__course', 'lesson__content_type', 'completed_at')
    search_fields = ('user__email', 'user__first_name', 'lesson__title')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'lesson')

    fieldsets = (
        (None, {
            'fields': ('user', 'lesson')
        }),
        ('Resultado', {
            'fields': ('completed', 'completed_at', 'score', 'xp_earned')
        }),
        ('Intentos', {
            'fields': ('attempts',)
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'lesson')
