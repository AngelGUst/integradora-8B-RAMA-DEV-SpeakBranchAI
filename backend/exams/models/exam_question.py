# exams/models/exam_question.py
from django.db import models
from .exam import Exam
from questions.models import Question

class ExamQuestion(models.Model):
    """Relación entre exámenes y preguntas"""
    
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='exam_questions',
        verbose_name='examen'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='exams',
        verbose_name='pregunta'
    )
    order = models.IntegerField(
        default=0,
        verbose_name='orden',
        help_text='Orden de la pregunta en el examen'
    )
    points = models.IntegerField(
        default=10,
        verbose_name='puntos',
        help_text='Puntos que vale esta pregunta'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de creación'
    )
    
    class Meta:
        db_table = 'exam_questions'
        verbose_name = 'Pregunta de Examen'
        verbose_name_plural = 'Preguntas de Exámenes'
        ordering = ['exam', 'order']
        unique_together = [
            ['exam', 'question'],  # Una pregunta no puede repetirse en el mismo examen
            ['exam', 'order'],      # No puede haber dos preguntas con el mismo orden
        ]
        indexes = [
            models.Index(fields=['exam', 'order']),
            models.Index(fields=['question']),
        ]
    
    def __str__(self):
        return f"{self.exam} - Pregunta {self.order}"
    
    def save(self, *args, **kwargs):
        """Auto-asignar orden si no se proporciona"""
        if not self.order:
            last_order = ExamQuestion.objects.filter(
                exam=self.exam
            ).aggregate(
                max_order=models.Max('order')
            )['max_order']
            self.order = (last_order or 0) + 1
        super().save(*args, **kwargs)