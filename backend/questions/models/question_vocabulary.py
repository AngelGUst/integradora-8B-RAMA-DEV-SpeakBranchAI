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
        ]
    
    def __str__(self):
        return f"{self.question.id} - {self.vocabulary.word}"