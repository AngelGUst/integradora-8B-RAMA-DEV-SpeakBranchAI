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
        default=1,
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
        """Auto-asignar completed_at cuando se completa"""
        if self.completed and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        
        # Actualizar el progreso del curso si es necesario
        is_new_completion = not self.pk and self.completed
        
        super().save(*args, **kwargs)
        
        # Si es una nueva lección completada, actualizar la inscripción del curso
        if is_new_completion:
            self._update_course_progress()
    
    def _update_course_progress(self):
        """Actualiza el progreso del curso cuando se completa una lección"""
        from .enrollment import CourseEnrollment
        
        course = self.lesson.course
        enrollment = CourseEnrollment.objects.filter(
            user=self.user,
            course=course
        ).first()
        
        if enrollment:
            # Actualizar la lección actual a la siguiente
            next_lesson = self.lesson.next_lesson
            if next_lesson:
                enrollment.current_lesson = next_lesson
                enrollment.save()
            
            # Verificar si el curso está completo
            total_lessons = course.total_lessons
            completed_lessons = LessonProgress.objects.filter(
                user=self.user,
                lesson__course=course,
                completed=True
            ).count()
            
            if completed_lessons >= total_lessons and not enrollment.completed_at:
                enrollment.complete_course()
    
    @classmethod
    def get_user_progress_in_course(cls, user, course):
        """Obtiene todo el progreso de un usuario en un curso"""
        return cls.objects.filter(
            user=user,
            lesson__course=course
        ).select_related('lesson').order_by('lesson__order_index')