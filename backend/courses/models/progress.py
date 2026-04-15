# courses/models/progress.py
from django.db import models
from django.conf import settings
from .lesson import Lesson


class LessonProgress(models.Model):
    """Progreso de lecciones completadas por usuario"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lesson_progress',
        verbose_name='usuario'
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='progress',
        verbose_name='lección'
    )
    completed = models.BooleanField(
        default=False,
        verbose_name='completada'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='fecha de completado'
    )
    score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación',
        help_text='Score obtenido en la lección'
    )
    xp_earned = models.IntegerField(
        default=0,
        verbose_name='XP ganado'
    )
    attempts = models.IntegerField(
        default=0,
        verbose_name='intentos',
        help_text='Número de intentos realizados'
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
        db_table = 'lesson_progress'
        verbose_name = 'Progreso de Lección'
        verbose_name_plural = 'Progresos de Lecciones'
        unique_together = ['user', 'lesson']  # Un solo progreso por usuario/lección
        indexes = [
            models.Index(fields=['user', 'completed']),
            models.Index(fields=['lesson']),
            models.Index(fields=['completed_at']),
        ]

    def __str__(self):
        status = "✓" if self.completed else "○"
        return f"{status} {self.user.first_name} - {self.lesson.title}"

    def save(self, *args, **kwargs):
        """Auto-asignar completed_at la primera vez que se completa"""
        if self.completed and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    def update_attempt(self, new_score, new_xp_earned):
        """Actualiza el progreso cuando el usuario completa o reintenta

        Reglas:
        - score: se guarda el mejor score (max)
        - xp_earned: se acumula
        - attempts: se incrementa
        - completed: se marca como True cuando termina
        """
        from django.utils import timezone

        self.attempts += 1

        # Guardar el mejor score (no el último)
        if self.score is None:
            self.score = new_score
        else:
            self.score = max(self.score, new_score)

        # Acumular XP
        self.xp_earned += new_xp_earned

        # Marcar como completada la primera vez
        if not self.completed:
            self.completed = True
            self.completed_at = timezone.now()

        self.save()

    def is_completed(self):
        """Verifica si la lección está completada"""
        return self.completed

    def get_completion_status(self):
        """Retorna el estado de la lección"""
        if not self.completed:
            return 'not_started'
        return 'completed'

    @classmethod
    def get_user_progress_in_course(cls, user, course):
        """Obtiene todo el progreso de un usuario en un curso, ordenado por lección"""
        return cls.objects.filter(
            user=user,
            lesson__course=course
        ).select_related('lesson').order_by('lesson__order_index')

    @classmethod
    def get_or_create_progress(cls, user, lesson):
        """Obtiene o crea el progreso de un usuario en una lección"""
        progress, created = cls.objects.get_or_create(
            user=user,
            lesson=lesson
        )
        return progress, created
