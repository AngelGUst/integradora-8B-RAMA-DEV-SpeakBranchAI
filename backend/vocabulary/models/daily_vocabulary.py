# vocabulary/models/daily_vocabulary.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from .vocabulary import Vocabulary

class DailyVocabulary(models.Model):
    """Vocabulario diario asignado a usuarios"""
    
    vocabulary = models.ForeignKey(
        Vocabulary,
        on_delete=models.CASCADE,
        related_name='daily_assignments',
        verbose_name='vocabulario'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_vocabulary',
        verbose_name='usuario'
    )
    date_assigned = models.DateField(
        default=timezone.now,
        verbose_name='fecha de asignación',
        db_index=True
    )
    
    # Estado
    was_seen = models.BooleanField(
        default=False,
        verbose_name='visto',
        help_text='Si el usuario ha visto esta palabra'
    )
    seen_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='fecha de vista'
    )
    was_practiced = models.BooleanField(
        default=False,
        verbose_name='practicado',
        help_text='Si el usuario practicó con esta palabra'
    )
    mastery_level = models.IntegerField(
        default=0,
        choices=[
            (0, 'No visto'),
            (1, 'Visto'),
            (2, 'En práctica'),
            (3, 'Aprendido'),
            (4, 'Dominado'),
        ],
        verbose_name='nivel de dominio'
    )
    
    # Tracking
    times_reviewed = models.IntegerField(
        default=0,
        verbose_name='veces repasado'
    )
    last_reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='último repaso'
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
        db_table = 'daily_vocabulary'
        verbose_name = 'Vocabulario Diario'
        verbose_name_plural = 'Vocabulario Diario'
        unique_together = ['vocabulary', 'user', 'date_assigned']  # Una palabra por día por usuario
        indexes = [
            models.Index(fields=['user', 'date_assigned']),
            models.Index(fields=['user', 'mastery_level']),
            models.Index(fields=['date_assigned', 'was_seen']),
        ]
        ordering = ['-date_assigned', 'vocabulary__word']
    
    def __str__(self):
        return f"{self.user.first_name} - {self.vocabulary.word} ({self.date_assigned})"
    
    def save(self, *args, **kwargs):
        """Actualizar seen_at si cambia was_seen"""
        if self.was_seen and not self.seen_at:
            self.seen_at = timezone.now()
        super().save(*args, **kwargs)
    
    def mark_as_seen(self):
        """Marca la palabra como vista"""
        self.was_seen = True
        self.save()
    
    def mark_as_practiced(self, success=True):
        """Marca la palabra como practicada y actualiza mastery"""
        self.was_practiced = True
        self.times_reviewed += 1
        self.last_reviewed_at = timezone.now()
        
        # Actualizar nivel de dominio basado en éxito
        if success and self.mastery_level < 4:
            self.mastery_level += 1
        elif not success and self.mastery_level > 0:
            self.mastery_level -= 1
        
        self.save()
    
    @classmethod
    def assign_daily_vocabulary(cls, user, date=None):
        """
        Asigna 5 palabras de vocabulario para un usuario en una fecha específica
        Algoritmo:
        1. Obtener ejercicios recientes del usuario (últimos 2 días)
        2. Buscar vocabulario vinculado vía question_vocabulary
        3. Priorizar palabras de ejercicios con menor score
        4. Completar hasta 5 con palabras random del nivel
        """
        from django.db.models import Count, Q
        from questions.models import QuestionVocabulary
        from attempts.models import SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt
        
        date = date or timezone.now().date()
        
        # Verificar si ya tiene asignaciones para esta fecha
        existing = cls.objects.filter(user=user, date_assigned=date).count()
        if existing >= 5:
            return cls.objects.filter(user=user, date_assigned=date)
        
        # Colección de palabras a asignar
        words_to_assign = set()
        
        # 1. Obtener IDs de palabras de ejercicios recientes
        recent_date = date - timezone.timedelta(days=2)
        
        # Obtener intentos recientes del usuario
        recent_attempts = []
        
        # Speaking attempts
        speaking_ids = SpeakingAttempt.objects.filter(
            user=user,
            created_at__date__gte=recent_date
        ).values_list('question_id', flat=True)
        recent_attempts.extend(speaking_ids)
        
        # Reading attempts
        reading_ids = ReadingAttempt.objects.filter(
            user=user,
            created_at__date__gte=recent_date
        ).values_list('question_id', flat=True)
        recent_attempts.extend(reading_ids)
        
        # Listening attempts
        listening_ids = ListeningAttempt.objects.filter(
            user=user,
            created_at__date__gte=recent_date
        ).values_list('question_id', flat=True)
        recent_attempts.extend(listening_ids)
        
        # Writing attempts
        writing_ids = WritingAttempt.objects.filter(
            user=user,
            created_at__date__gte=recent_date
        ).values_list('question_id', flat=True)
        recent_attempts.extend(writing_ids)
        
        # Buscar vocabulario relacionado con esas preguntas
        if recent_attempts:
            vocab_from_recent = Vocabulary.objects.filter(
                questions__question_id__in=recent_attempts,
                daily_flag=True
            ).exclude(
                daily_assignments__user=user,
                daily_assignments__date_assigned=date
            ).distinct()[:5]
            
            for vocab in vocab_from_recent:
                words_to_assign.add(vocab.id)
        
        # 2. Completar con palabras random del nivel del usuario
        if len(words_to_assign) < 5:
            needed = 5 - len(words_to_assign)
            random_vocab = Vocabulary.objects.filter(
                level=user.level,
                daily_flag=True
            ).exclude(
                Q(id__in=words_to_assign) |
                Q(daily_assignments__user=user, daily_assignments__date_assigned=date)
            ).order_by('?')[:needed]
            
            for vocab in random_vocab:
                words_to_assign.add(vocab.id)
        
        # 3. Crear las asignaciones
        assignments = []
        for vocab_id in words_to_assign:
            daily_vocab, created = cls.objects.get_or_create(
                vocabulary_id=vocab_id,
                user=user,
                date_assigned=date,
                defaults={'mastery_level': 0}
            )
            assignments.append(daily_vocab)
            
            # Incrementar contador de uso
            if created:
                Vocabulary.objects.filter(id=vocab_id).update(
                    times_used=models.F('times_used') + 1
                )
        
        return assignments
    
    @classmethod
    def get_user_daily_vocabulary(cls, user, date=None):
        """
        Obtiene el vocabulario diario de un usuario para una fecha
        Si no existe, lo genera automáticamente
        """
        date = date or timezone.now().date()
        
        daily_words = cls.objects.filter(
            user=user,
            date_assigned=date
        ).select_related('vocabulary')
        
        if not daily_words.exists():
            daily_words = cls.assign_daily_vocabulary(user, date)
        else:
            daily_words = list(daily_words)
        
        return daily_words
    
    @classmethod
    def get_words_for_review(cls, user, limit=10):
        """
        Obtiene palabras para repasar (las que tienen bajo mastery)
        """
        return cls.objects.filter(
            user=user,
            mastery_level__lt=3
        ).select_related('vocabulary').order_by(
            'mastery_level',
            'last_reviewed_at'
        )[:limit]