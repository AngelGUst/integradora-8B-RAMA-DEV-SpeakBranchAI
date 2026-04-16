# vocabulary/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Vocabulary, DailyVocabulary

@admin.register(Vocabulary)
class VocabularyAdmin(admin.ModelAdmin):
    list_display = ('word', 'level', 'category', 'daily_flag', 'times_used', 
                   'show_image_thumbnail', 'created_at')
    list_filter = ('level', 'category', 'daily_flag')
    search_fields = ('word', 'meaning', 'example_sentence')
    ordering = ('level', 'word')
    list_editable = ('daily_flag',)
    readonly_fields = ('times_used', 'created_at', 'updated_at')
    raw_id_fields = ('created_by',)
    
    fieldsets = (
        ('Palabra', {
            'fields': ('word', 'pronunciation', 'level', 'category')
        }),
        ('Significado', {
            'fields': ('meaning', 'example_sentence')
        }),
        ('Multimedia', {
            'fields': ('image_url', 'audio_url'),
            'classes': ('collapse',)
        }),
        ('Configuración', {
            'fields': ('daily_flag', 'times_used')
        }),
        ('Metadatos', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def show_image_thumbnail(self, obj):
        """Muestra miniatura de la imagen si existe"""
        if obj.image_url:
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover;"/>', obj.image_url)
        return '-'
    show_image_thumbnail.short_description = 'Imagen'
    
    def save_model(self, request, obj, form, change):
        """Auto-asignar created_by y updated_by"""
        if not change:
            # Si es nuevo, asignar created_by
            obj.created_by = request.user
        else:
            # Si es actualización, asignar updated_by
            obj.updated_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(DailyVocabulary)
class DailyVocabularyAdmin(admin.ModelAdmin):
    list_display = ('user', 'vocabulary_word', 'date_assigned', 'mastery_level', 
                   'was_seen', 'was_practiced', 'times_reviewed')
    list_filter = ('mastery_level', 'was_seen', 'was_practiced', 'date_assigned')
    search_fields = ('user__email', 'user__first_name', 'vocabulary__word')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'vocabulary')
    date_hierarchy = 'date_assigned'
    
    fieldsets = (
        ('Asignación', {
            'fields': ('user', 'vocabulary', 'date_assigned')
        }),
        ('Estado', {
            'fields': ('was_seen', 'seen_at', 'was_practiced', 'mastery_level')
        }),
        ('Seguimiento', {
            'fields': ('times_reviewed', 'last_reviewed_at')
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def vocabulary_word(self, obj):
        return obj.vocabulary.word
    vocabulary_word.short_description = 'Palabra'
    vocabulary_word.admin_order_field = 'vocabulary__word'
    
    actions = ['mark_as_seen', 'mark_as_practiced']
    
    def mark_as_seen(self, request, queryset):
        """Marca las palabras seleccionadas como vistas"""
        queryset.update(was_seen=True, seen_at=timezone.now())
    mark_as_seen.short_description = "Marcar como vistas"
    
    def mark_as_practiced(self, request, queryset):
        """Marca las palabras seleccionadas como practicadas"""
        queryset.update(
            was_practiced=True,
            times_reviewed=models.F('times_reviewed') + 1,
            last_reviewed_at=timezone.now()
        )
    mark_as_practiced.short_description = "Marcar como practicadas"