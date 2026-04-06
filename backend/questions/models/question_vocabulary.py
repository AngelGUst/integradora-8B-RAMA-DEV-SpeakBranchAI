# questions/models/question_vocabulary.py
from django.db import models
from .question import Question
from vocabulary.models import Vocabulary  # Aún no creamos esta app, lo importaremos después

class QuestionVocabulary(models.Model):
    """Relación entre preguntas y vocabulario contextual"""

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='vocabulary_items',
        verbose_name='pregunta'
    )
    vocabulary = models.ForeignKey(
        'vocabulary.Vocabulary',  # Usamos string porque la app vocabulary aún no existe
        on_delete=models.CASCADE,
        related_name='questions',
        verbose_name='vocabulario'
    )
    is_key = models.BooleanField(
        default=False,
        verbose_name='palabra clave',
        help_text='Si es True, aparece primero en el vocabulario diario'
    )
    order = models.IntegerField(
        default=0,
        verbose_name='orden de importancia',
        help_text='Mayor número = mayor importancia (para decidir qué palabras asignar diariamente)'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de creación'
    )

    class Meta:
        db_table = 'question_vocabulary'
        verbose_name = 'Vocabulario de Pregunta'
        verbose_name_plural = 'Vocabulario de Preguntas'
        unique_together = ['question', 'vocabulary']  # Una palabra no puede repetirse en la misma pregunta
        indexes = [
            models.Index(fields=['question']),
            models.Index(fields=['vocabulary']),
            models.Index(fields=['is_key', 'order']),
        ]
        ordering = ['-is_key', '-order']
    
    def __str__(self):
        return f"{self.question.id} - {self.vocabulary.word}"