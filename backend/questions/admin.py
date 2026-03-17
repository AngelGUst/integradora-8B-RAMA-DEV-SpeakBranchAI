# questions/admin.py
from django.contrib import admin
from .models import Question, QuestionVocabulary

class QuestionVocabularyInline(admin.TabularInline):
    """Inline para ver vocabulario relacionado en el admin"""
    model = QuestionVocabulary
    extra = 1
    autocomplete_fields = ['vocabulary']

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'level', 'difficulty', 'category', 'text_preview', 'is_active', 'created_at')
    list_filter = ('type', 'level', 'difficulty', 'category', 'is_active')
    search_fields = ('text', 'correct_answer', 'phonetic_text')
    ordering = ('-created_at',)
    list_editable = ('difficulty', 'is_active')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('created_by',)
    inlines = [QuestionVocabularyInline]
    
    fieldsets = (
        ('Contenido', {
            'fields': ('text', 'correct_answer', 'type')
        }),
        ('Clasificación', {
            'fields': ('level', 'category', 'difficulty')
        }),
        ('Multimedia', {
            'fields': ('audio_url', 'phonetic_text'),
            'classes': ('collapse',)
        }),
        ('Configuración', {
            'fields': ('xp_max', 'max_replays', 'is_active')
        }),
        ('Metadatos', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def text_preview(self, obj):
        """Vista previa del texto de la pregunta"""
        return obj.text[:75] + '...' if len(obj.text) > 75 else obj.text
    text_preview.short_description = 'Texto'
    
    def save_model(self, request, obj, form, change):
        """Auto-asignar created_by si es nuevo"""
        if not change:  # Si es nuevo
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(QuestionVocabulary)
class QuestionVocabularyAdmin(admin.ModelAdmin):
    list_display = ('question', 'vocabulary', 'created_at')
    list_filter = ('question__type', 'question__level')
    search_fields = ('question__text', 'vocabulary__word')
    raw_id_fields = ('question', 'vocabulary')
    autocomplete_fields = ('vocabulary',)