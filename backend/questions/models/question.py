# questions/models/question.py
from django.db import models
from django.conf import settings

class Question(models.Model):
    """Modelo de preguntas para el banco de ejercicios"""
    
    # Tipos de ejercicio
    TYPE_CHOICES = [
        ('SPEAKING', 'Speaking'),
        ('READING', 'Reading'),
        ('LISTENING_SHADOWING', 'Listening Shadowing'),
        ('LISTENING_COMPREHENSION', 'Listening Comprehension'),
        ('WRITING', 'Writing'),
    ]
    
    # Niveles
    LEVEL_CHOICES = [
        ('A1', 'Beginner (A1)'),
        ('A2', 'Elementary (A2)'),
        ('B1', 'Intermediate (B1)'),
        ('B2', 'Upper Intermediate (B2)'),
        ('C1', 'Advanced (C1)'),
        ('C2', 'Proficient (C2)'),
    ]
    
    # Categorías
    CATEGORY_CHOICES = [
        ('DIAGNOSTIC', 'Examen diagnóstico'),
        ('PRACTICE', 'Solo ejercicio'),
        ('LEVEL_UP', 'Examen subir nivel'),
    ]
    
    # Dificultad
    DIFFICULTY_CHOICES = [
        ('EASY', 'Fácil'),
        ('MEDIUM', 'Medio'),
        ('HARD', 'Difícil'),
    ]
    
    # Campos principales
    text = models.TextField(
        verbose_name='texto de la pregunta'
    )
    type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        verbose_name='tipo de ejercicio'
    )
    level = models.CharField(
        max_length=5,
        choices=LEVEL_CHOICES,
        verbose_name='nivel'
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        verbose_name='categoría'
    )
    correct_answer = models.TextField(
        verbose_name='respuesta correcta'
    )
    
    # Campos multimedia
    audio_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        verbose_name='URL del audio',
        help_text='URL del audio pregrabado (TTS)'
    )
    phonetic_text = models.CharField(
        max_length=300,
        blank=True,
        verbose_name='transcripción fonética',
        help_text='Transcripción IPA ej: /dɒɡ/'
    )
    
    # Dificultad y XP
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default='MEDIUM',
        verbose_name='dificultad'
    )
    xp_max = models.IntegerField(
        default=20,
        verbose_name='XP máximo',
        help_text='EASY=10, MEDIUM=20, HARD=30'
    )
    
    # Control de repeticiones (para listening)
    max_replays = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='repeticiones máximas',
        help_text='NULL=ilimitado (shadowing), 3=comprensión'
    )
    
    # Metadatos
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,  # No permitir borrar usuarios que crearon preguntas
        related_name='questions_created',
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
    is_active = models.BooleanField(
        default=True,
        verbose_name='activa'
    )
    
    class Meta:
        db_table = 'questions'
        verbose_name = 'Pregunta'
        verbose_name_plural = 'Preguntas'
        ordering = ['level', 'difficulty', 'type']
        indexes = [
            models.Index(fields=['type', 'level', 'difficulty']),
            models.Index(fields=['category']),
            models.Index(fields=['created_by']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"[{self.level}] {self.get_type_display()} - {self.text[:50]}..."
    
    def save(self, *args, **kwargs):
        """Validar que xp_max coincida con la dificultad"""
        xp_by_difficulty = {
            'EASY': 10,
            'MEDIUM': 20,
            'HARD': 30
        }
        
        # Auto-asignar xp_max según dificultad si no se especificó
        if not self.xp_max or self.xp_max not in [10, 20, 30]:
            self.xp_max = xp_by_difficulty.get(self.difficulty, 20)
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validaciones personalizadas"""
        from django.core.exceptions import ValidationError
        
        # Validar que xp_max sea 10, 20 o 30
        if self.xp_max not in [10, 20, 30]:
            raise ValidationError({
                'xp_max': 'XP máximo debe ser 10, 20 o 30'
            })
        
        # Validar max_replays según el tipo
        if self.type in ['LISTENING_SHADOWING', 'LISTENING_COMPREHENSION']:
            if self.type == 'LISTENING_SHADOWING' and self.max_replays is not None:
                raise ValidationError({
                    'max_replays': 'Shadowing debe tener repeticiones ilimitadas (NULL)'
                })
            if self.type == 'LISTENING_COMPREHENSION' and self.max_replays != 3:
                raise ValidationError({
                    'max_replays': 'Comprensión auditiva debe tener máximo 3 repeticiones'
                })
        else:
            if self.max_replays is not None:
                raise ValidationError({
                    'max_replays': 'Solo ejercicios de listening pueden tener max_replays'
                })
    
    @property
    def xp_by_difficulty(self):
        """Retorna el XP máximo según dificultad"""
        return {
            'EASY': 10,
            'MEDIUM': 20,
            'HARD': 30
        }.get(self.difficulty, 20)
    
    @classmethod
    def get_questions_for_exam(cls, exam_level, exam_type, count=10):
        """
        Obtiene preguntas para un examen específico
        """
        base_query = cls.objects.filter(
            level=exam_level,
            is_active=True
        )
        
        if exam_type == 'DIAGNOSTIC':
            return base_query.filter(category='DIAGNOSTIC').order_by('?')[:count]
        elif exam_type == 'LEVEL_UP':
            return base_query.filter(category='LEVEL_UP').order_by('?')[:count]
        
        return base_query.order_by('?')[:count]