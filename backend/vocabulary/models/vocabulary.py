# vocabulary/models/vocabulary.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class Vocabulary(models.Model):
    """Modelo de palabras de vocabulario"""
    
    LEVEL_CHOICES = [
        ('A1', 'Beginner (A1)'),
        ('A2', 'Elementary (A2)'),
        ('B1', 'Intermediate (B1)'),
        ('B2', 'Upper Intermediate (B2)'),
        ('C1', 'Advanced (C1)'),
        ('C2', 'Proficient (C2)'),
    ]
    
    word = models.CharField(
        max_length=200,
        verbose_name='palabra',
        db_index=True
    )
    meaning = models.TextField(
        verbose_name='significado'
    )
    pronunciation = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='pronunciación',
        help_text='Ej: /dɒɡ/'
    )
    example_sentence = models.TextField(
        blank=True,
        null=True,
        verbose_name='oración de ejemplo'
    )
    level = models.CharField(
        max_length=5,
        choices=LEVEL_CHOICES,
        verbose_name='nivel'
    )
    category = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='categoría',
        help_text='Ej: Animals, Food, Business, etc.'
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='URL de imagen'
    )
    audio_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='URL de audio',
        help_text='Pronunciación en audio'
    )
    
    # Control de vocabulario diario
    daily_flag = models.BooleanField(
        default=False,
        verbose_name='incluir en vocabulario diario',
        help_text='Si está activo, puede aparecer en el vocabulario diario'
    )
    times_used = models.IntegerField(
        default=0,
        verbose_name='veces utilizado',
        help_text='Número de veces que ha aparecido en vocabulario diario'
    )
    
    # Metadatos
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='vocabulary_created',
        verbose_name='creado por'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de creación'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='última actualización'
    )
    
    class Meta:
        db_table = 'vocabulary'
        verbose_name = 'Vocabulario'
        verbose_name_plural = 'Vocabulario'
        ordering = ['level', 'word']
        indexes = [
            models.Index(fields=['word']),
            models.Index(fields=['level', 'daily_flag']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.word} ({self.get_level_display()})"
    
    def save(self, *args, **kwargs):
        """Guardar y actualizar contadores"""
        # Normalizar palabra (primera letra mayúscula para nombres propios?)
        if self.word:
            self.word = self.word.strip().lower()
        super().save(*args, **kwargs)
    
    @classmethod
    def get_words_by_level(cls, level, limit=50):
        """Obtiene palabras de un nivel específico"""
        return cls.objects.filter(
            level=level,
            daily_flag=True
        ).order_by('?')[:limit]
    
    @classmethod
    def search_by_word(cls, query):
        """Busca palabras que coincidan parcialmente"""
        return cls.objects.filter(
            word__icontains=query
        ).order_by('level', 'word')
    
    @property
    def times_assigned_to_user(self, user=None):
        """Número de veces que esta palabra ha sido asignada a un usuario"""
        from .daily_vocabulary import DailyVocabulary
        
        queryset = DailyVocabulary.objects.filter(vocabulary=self)
        if user:
            queryset = queryset.filter(user=user)
        return queryset.count()