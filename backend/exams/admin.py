# exams/admin.py
from django.contrib import admin
from .models import Exam, ExamQuestion, ExamAttempt, UnlockedExam

class ExamQuestionInline(admin.TabularInline):
    """Inline para ver preguntas del examen"""
    model = ExamQuestion
    extra = 5
    raw_id_fields = ['question']
    fields = ['question', 'order', 'points']

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('name', 'level', 'type', 'question_count', 'xp_required', 
                   'passing_score', 'time_limit_minutes', 'is_active')
    list_filter = ('level', 'type', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('level', 'type')
    list_editable = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ExamQuestionInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description', 'level', 'type')
        }),
        ('Configuración', {
            'fields': ('xp_required', 'passing_score', 'time_limit_minutes', 
                      'question_count', 'is_active')
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Guardar y actualizar contador de preguntas"""
        super().save_model(request, obj, form, change)
        # Actualizar question_count basado en las preguntas asignadas
        obj.question_count = obj.exam_questions.count()
        obj.save()

@admin.register(ExamQuestion)
class ExamQuestionAdmin(admin.ModelAdmin):
    list_display = ('exam', 'question', 'order', 'points')
    list_filter = ('exam__level', 'exam__type')
    search_fields = ('exam__name', 'question__text')
    raw_id_fields = ('question',)
    list_editable = ('order', 'points')

@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'status', 'score', 'passed', 'xp_earned', 
                   'started_at', 'completed_at')
    list_filter = ('status', 'passed', 'exam__level', 'exam__type')
    search_fields = ('user__email', 'user__first_name', 'exam__name')
    readonly_fields = ('started_at', 'completed_at')
    raw_id_fields = ('user', 'exam')
    fieldsets = (
        ('Usuario y Examen', {
            'fields': ('user', 'exam')
        }),
        ('Resultados', {
            'fields': ('status', 'score', 'passed', 'xp_earned')
        }),
        ('Respuestas', {
            'fields': ('answers',),
            'classes': ('collapse',)
        }),
        ('Tiempo', {
            'fields': ('started_at', 'completed_at', 'time_spent_seconds')
        }),
    )

@admin.register(UnlockedExam)
class UnlockedExamAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'unlocked_at')
    list_filter = ('exam__level', 'exam__type')
    search_fields = ('user__email', 'user__first_name', 'exam__name')
    readonly_fields = ('unlocked_at',)
    raw_id_fields = ('user', 'exam')