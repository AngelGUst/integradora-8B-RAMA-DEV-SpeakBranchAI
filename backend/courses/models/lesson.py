# courses/models/lesson.py
from django.db import models
from .course import Course

class Lesson(models.Model):
    """Modelo de lecciones"""
    
    CONTENT_TYPE_CHOICES = [
        ('VIDEO', 'Video'),
        ('TEXT', 'Texto'),
        ('EXERCISE_READING', 'Ejercicio de Reading'),
        ('EXERCISE_SPEAKING', 'Ejercicio de Speaking'),
        ('EXERCISE_LISTENING_SHADOWING', 'Ejercicio de Listening Shadowing'),
        ('EXERCISE_LISTENING_COMPREHENSION', 'Ejercicio de Listening Comprehension'),
        ('EXERCISE_WRITING', 'Ejercicio de Writing'),
    ]
    
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='lessons',
        verbose_name='curso'
    )
    title = models.CharField(
        max_length=200,
        verbose_name='título'
    )
    order_index = models.IntegerField(
        default=0,
        verbose_name='índice de orden',
        help_text='Define el orden obligatorio de la lección'
    )
    content_type = models.CharField(
        max_length=40,
        choices=CONTENT_TYPE_CHOICES,
        verbose_name='tipo de contenido'
    )
    content_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='URL del contenido',
        help_text='URL del audio/video/texto'
    )
    duration_min = models.IntegerField(
        default=5,
        verbose_name='duración (minutos)'
    )
    xp_value = models.IntegerField(
        default=10,
        verbose_name='valor de XP',
        help_text='XP base por completar la lección'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de creación'
    )
    
    class Meta:
        db_table = 'lessons'
        verbose_name = 'Lección'
        verbose_name_plural = 'Lecciones'
        ordering = ['course', 'order_index']
        unique_together = ['course', 'order_index']  # No puede haber dos lecciones con el mismo orden en un curso
        indexes = [
            models.Index(fields=['course', 'order_index']),
            models.Index(fields=['content_type']),
        ]
    
    def __str__(self):
        return f"{self.course.name} - {self.order_index}: {self.title}"
    
    def save(self, *args, **kwargs):
        """Auto-asignar order_index si no se proporciona"""
        if not self.order_index:
            last_order = Lesson.objects.filter(
                course=self.course
            ).aggregate(
                max_order=models.Max('order_index')
            )['max_order']
            self.order_index = (last_order or 0) + 1
        super().save(*args, **kwargs)
    
    @property
    def next_lesson(self):
        """Retorna la siguiente lección del curso"""
        return Lesson.objects.filter(
            course=self.course,
            order_index__gt=self.order_index
        ).order_by('order_index').first()
    
    @property
    def previous_lesson(self):
        """Retorna la lección anterior del curso"""
        return Lesson.objects.filter(
            course=self.course,
            order_index__lt=self.order_index
        ).order_by('-order_index').first()