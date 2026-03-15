# courses/admin.py
from django.contrib import admin
from .models import Course, Lesson, CourseEnrollment, LessonProgress

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'level', 'total_lessons', 'created_at')
    list_filter = ('level',)
    search_fields = ('name', 'description')
    ordering = ('level', 'name')
    readonly_fields = ('created_at',)

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order_index', 'content_type', 'duration_min', 'xp_value')
    list_filter = ('course', 'content_type')
    search_fields = ('title',)
    ordering = ('course', 'order_index')
    list_editable = ('order_index', 'duration_min', 'xp_value')
    readonly_fields = ('created_at',)
    
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
            'fields': ('created_at',)
        }),
    )

@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'enrolled_at', 'completed_at', 'progress_percentage')
    list_filter = ('course', 'enrolled_at', 'completed_at')
    search_fields = ('user__email', 'user__first_name', 'course__name')
    readonly_fields = ('enrolled_at',)
    raw_id_fields = ('user', 'course', 'current_lesson')

@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'lesson', 'completed', 'score', 'xp_earned', 'attempts', 'completed_at')
    list_filter = ('completed', 'lesson__course')
    search_fields = ('user__email', 'user__first_name', 'lesson__title')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'lesson')