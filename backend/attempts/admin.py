# attempts/admin.py
from django.contrib import admin
from .models import (
    SpeakingAttempt, ReadingAttempt,
    ListeningAttempt, WritingAttempt
)

class BaseAttemptAdmin(admin.ModelAdmin):
    """Clase base con configuración común"""
    list_filter = ('difficulty', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'question__text')
    raw_id_fields = ('user', 'question')
    readonly_fields = ('created_at', 'xp_earned')
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'

@admin.register(SpeakingAttempt)
class SpeakingAttemptAdmin(BaseAttemptAdmin):
    list_display = ('user_email', 'question_id', 'score', 'transcription_match', 
                   'attempts_count', 'xp_earned', 'created_at')
    list_display_links = ('user_email',)
    fieldsets = (
        ('Usuario y Pregunta', {
            'fields': ('user', 'question')
        }),
        ('Textos', {
            'fields': ('expected_text', 'transcribed_text')
        }),
        ('Resultados', {
            'fields': ('transcription_match', 'score', 'xp_earned')
        }),
        ('Metadatos', {
            'fields': ('difficulty', 'attempts_count', 'api_response_raw')
        }),
        ('Fecha', {
            'fields': ('created_at',)
        }),
    )

@admin.register(ReadingAttempt)
class ReadingAttemptAdmin(BaseAttemptAdmin):
    list_display = ('user_email', 'question_id', 'correct', 'score', 'xp_earned', 'created_at')
    list_display_links = ('user_email',)
    list_filter = BaseAttemptAdmin.list_filter + ('correct',)
    fieldsets = (
        ('Usuario y Pregunta', {
            'fields': ('user', 'question')
        }),
        ('Respuesta', {
            'fields': ('selected_answer', 'correct')
        }),
        ('Resultados', {
            'fields': ('score', 'xp_earned')
        }),
        ('Metadatos', {
            'fields': ('difficulty',)
        }),
        ('Fecha', {
            'fields': ('created_at',)
        }),
    )

@admin.register(ListeningAttempt)
class ListeningAttemptAdmin(BaseAttemptAdmin):
    list_display = ('user_email', 'question_id', 'listening_type', 'score', 
                   'replays_used', 'xp_earned', 'created_at')
    list_display_links = ('user_email',)
    list_filter = BaseAttemptAdmin.list_filter + ('listening_type',)
    fieldsets = (
        ('Usuario y Pregunta', {
            'fields': ('user', 'question', 'listening_type')
        }),
        ('Shadowing', {
            'fields': ('transcribed_text', 'transcription_match'),
            'classes': ('collapse',)
        }),
        ('Comprensión', {
            'fields': ('selected_answer', 'correct'),
            'classes': ('collapse',)
        }),
        ('Resultados', {
            'fields': ('score', 'xp_earned', 'replays_used')
        }),
        ('Metadatos', {
            'fields': ('difficulty', 'api_response_raw')
        }),
        ('Fecha', {
            'fields': ('created_at',)
        }),
    )

@admin.register(WritingAttempt)
class WritingAttemptAdmin(BaseAttemptAdmin):
    list_display = ('user_email', 'question_id', 'score', 'xp_earned', 'created_at')
    list_display_links = ('user_email',)
    fieldsets = (
        ('Usuario y Pregunta', {
            'fields': ('user', 'question')
        }),
        ('Textos', {
            'fields': ('prompt_text', 'student_text')
        }),
        ('Scores por Criterio', {
            'fields': ('score_grammar', 'score_vocabulary', 
                      'score_coherence', 'score_spelling')
        }),
        ('Resultados', {
            'fields': ('score', 'xp_earned', 'ai_feedback')
        }),
        ('Metadatos', {
            'fields': ('difficulty', 'api_response_raw')
        }),
        ('Fecha', {
            'fields': ('created_at',)
        }),
    )