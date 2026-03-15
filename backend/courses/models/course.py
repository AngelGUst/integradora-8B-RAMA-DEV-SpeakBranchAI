# courses/models/course.py
from django.db import models

class Course(models.Model):
    """Modelo de cursos"""
    
    LEVEL_CHOICES = [
        ('A1', 'Beginner (A1)'),
        ('A2', 'Elementary (A2)'),
        ('B1', 'Intermediate (B1)'),
        ('B2', 'Upper Intermediate (B2)'),
        ('C1', 'Advanced (C1)'),
        ('C2', 'Proficient (C2)'),
    ]
    
    name = models.CharField(
        max_length=200,
        verbose_name='nombre del curso'
    )
    level = models.CharField(
        max_length=5,
        choices=LEVEL_CHOICES,
        verbose_name='nivel'
    )
    description = models.TextField(
        blank=True,
        null=True,
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
    
    def __str__(self):
        return f"{self.name} ({self.level})"
    
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