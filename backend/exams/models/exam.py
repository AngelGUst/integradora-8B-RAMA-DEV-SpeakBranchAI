# exams/models/exam.py
from django.db import models
from django.core.validators import MinValueValidator

class Exam(models.Model):
    """Modelo de exámenes"""
    
    LEVEL_CHOICES = [
        ('A1', 'Beginner (A1)'),
        ('A2', 'Elementary (A2)'),
        ('B1', 'Intermediate (B1)'),
        ('B2', 'Upper Intermediate (B2)'),
        ('C1', 'Advanced (C1)'),
        ('C2', 'Proficient (C2)'),
    ]
    
    EXAM_TYPE_CHOICES = [
        ('DIAGNOSTIC', 'Examen de Diagnóstico'),
        ('LEVEL_UP', 'Examen de Nivelación'),
        ('TOEFL', 'Examen TOEFL'),
    ]
    
    level = models.CharField(
        max_length=5,
        choices=LEVEL_CHOICES,
        verbose_name='nivel'
    )
    type = models.CharField(
        max_length=15,
        choices=EXAM_TYPE_CHOICES,
        verbose_name='tipo de examen'
    )
    name = models.CharField(
        max_length=200,
        verbose_name='nombre del examen',
        help_text='Nombre descriptivo del examen'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='descripción'
    )
    xp_required = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='XP requerido',
        help_text='Umbral de XP para desbloquear'
    )
    passing_score = models.IntegerField(
        default=70,
        validators=[MinValueValidator(0)],
        verbose_name='puntuación mínima',
        help_text='Puntuación mínima para aprobar (0-100)'
    )
    time_limit_minutes = models.IntegerField(
        default=60,
        validators=[MinValueValidator(1)],
        verbose_name='límite de tiempo (minutos)'
    )
    question_count = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1)],
        verbose_name='número de preguntas'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='activo'
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
        db_table = 'exams'
        verbose_name = 'Examen'
        verbose_name_plural = 'Exámenes'
        ordering = ['level', 'type', 'name']
        unique_together = ['level', 'type']  # Un solo examen de cada tipo por nivel
        indexes = [
            models.Index(fields=['level', 'type']),
            models.Index(fields=['xp_required']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.get_level_display()} - {self.get_type_display()}"
    
    @property
    def total_questions(self):
        """Retorna el número total de preguntas asignadas"""
        return self.questions.count()
    
    def get_questions(self):
        """Obtiene las preguntas asignadas al examen"""
        return self.questions.all().select_related('question')
    
    def can_unlock(self, user):
        """Verifica si un usuario puede desbloquear este examen"""
        from users.models import UserProgress
        
        try:
            progress = UserProgress.objects.get(user=user)
            return progress.total_xp >= self.xp_required
        except UserProgress.DoesNotExist:
            return False
    
    @classmethod
    def get_available_for_user(cls, user):
        """Obtiene todos los exámenes disponibles para un usuario"""
        from users.models import UserProgress
        from .unlocked_exam import UnlockedExam
        
        try:
            progress = UserProgress.objects.get(user=user)
            
            # Exámenes que puede desbloquear por XP
            available_by_xp = cls.objects.filter(
                xp_required__lte=progress.total_xp,
                is_active=True
            )
            
            # Exámenes ya desbloqueados
            unlocked = UnlockedExam.objects.filter(
                user=user
            ).values_list('exam_id', flat=True)
            
            # Exámenes no desbloqueados pero disponibles
            return available_by_xp.exclude(id__in=unlocked)
            
        except UserProgress.DoesNotExist:
            return cls.objects.none()