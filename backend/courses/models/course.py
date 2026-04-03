# courses/models/course.py
from django.db import models
from django.core.exceptions import ValidationError

class Course(models.Model):
    """Modelo de cursos
    
    Un curso es el contenedor principal que agrupa lecciones ordenadas
    de un solo nivel CEFR.
    """
    
    LEVEL_CHOICES = [
        ('A1', 'Beginner (A1)'),
        ('A2', 'Elementary (A2)'),
        ('B1', 'Intermediate (B1)'),
        ('B2', 'Upper Intermediate (B2)'),
    ]
    
    name = models.CharField(
        max_length=200,
        verbose_name='nombre del curso'
    )
    level = models.CharField(
        max_length=5,
        choices=LEVEL_CHOICES,
        verbose_name='nivel',
        help_text='Un curso solo puede tener UN nivel CEFR'
    )
    description = models.TextField(
        blank=True,
        verbose_name='descripción'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de creación'
    )
    
    class Meta:
        db_table = 'courses'
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering = ['level', 'name']
        indexes = [
            models.Index(fields=['level']),
            models.Index(fields=['name']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'level'],
                name='unique_course_name_per_level'
            ),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.level})"
    
    def delete(self, *args, **kwargs):
        """No se puede borrar un curso si tiene alumnos inscritos"""
        from .enrollment import CourseEnrollment
        
        active_enrollments = CourseEnrollment.objects.filter(
            course=self,
            completed_at__isnull=True
        ).exists()
        
        if active_enrollments:
            raise ValidationError(
                'No se puede borrar un curso que tiene alumnos inscritos activos.'
            )
        
        super().delete(*args, **kwargs)
    
    @property
    def total_lessons(self):
        """Retorna el número total de lecciones del curso"""
        return self.lessons.count()
    
    @property
    def total_duration(self):
        """Retorna la duración total del curso en minutos"""
        return self.lessons.aggregate(
            total=models.Sum('duration_min')
        )['total'] or 0
    
    @property
    def total_xp(self):
        """Retorna el total de XP disponible en el curso"""
        return self.lessons.aggregate(
            total=models.Sum('xp_value')
        )['total'] or 0
    
    @property
    def active_students(self):
        """Retorna el número de estudiantes activos en el curso"""
        from .enrollment import CourseEnrollment
        return CourseEnrollment.objects.filter(
            course=self,
            completed_at__isnull=True
        ).count()
    
    def get_first_lesson(self):
        """Retorna la primera lección del curso"""
        return self.lessons.order_by('order_index').first()