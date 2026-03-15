# courses/models/enrollment.py
from django.db import models
from django.conf import settings
from .course import Course
from .lesson import Lesson

class CourseEnrollment(models.Model):
    """Inscripciones de usuarios a cursos"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_enrollments',
        verbose_name='usuario'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name='curso'
    )
    enrolled_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de inscripción'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='fecha de completado'
    )
    current_lesson = models.ForeignKey(
        Lesson,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        verbose_name='lección actual'
    )
    
    class Meta:
        db_table = 'course_enrollments'
        verbose_name = 'Inscripción'
        verbose_name_plural = 'Inscripciones'
        unique_together = ['user', 'course']  # Un usuario no puede inscribirse dos veces al mismo curso
        indexes = [
            models.Index(fields=['user', 'course']),
            models.Index(fields=['enrolled_at']),
            models.Index(fields=['completed_at']),
        ]
    
    def __str__(self):
        status = "Completado" if self.completed_at else "En progreso"
        return f"{self.user.first_name} - {self.course.name} ({status})"
    
    @property
    def progress_percentage(self):
        """Calcula el porcentaje de progreso del curso"""
        total_lessons = self.course.total_lessons
        if total_lessons == 0:
            return 0
        
        completed_lessons = LessonProgress.objects.filter(
            user=self.user,
            lesson__course=self.course,
            completed=True
        ).count()
        
        return (completed_lessons / total_lessons) * 100
    
    @property
    def is_completed(self):
        """Verifica si el curso está completado"""
        return self.completed_at is not None
    
    def complete_course(self):
        """Marca el curso como completado"""
        from django.utils import timezone
        self.completed_at = timezone.now()
        self.save()