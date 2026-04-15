# attempts/models/listening_attempt.py
from django.db import models
from django.conf import settings
from questions.models import Question

class ListeningAttempt(models.Model):
    """Intentos de ejercicios de listening (shadowing y comprensión)"""
    
    LISTENING_TYPE_CHOICES = [
        ('LISTENING_SHADOWING', 'Listening Shadowing'),
        ('LISTENING_COMPREHENSION', 'Listening Comprehension'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('EASY', 'Fácil'),
        ('MEDIUM', 'Medio'),
        ('HARD', 'Difícil'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='listening_attempts',
        verbose_name='usuario'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='listening_attempts',
        verbose_name='pregunta',
        limit_choices_to={'type__in': ['LISTENING_SHADOWING', 'LISTENING_COMPREHENSION']}
    )
    
    # Tipo de listening
    listening_type = models.CharField(
        max_length=30,
        choices=LISTENING_TYPE_CHOICES,
        verbose_name='tipo de listening'
    )
    
    # Campos para LISTENING_SHADOWING
    transcribed_text = models.TextField(
        blank=True,
        default='',
        verbose_name='texto transcrito',
        help_text='Texto devuelto por Whisper'
    )
    transcription_match = models.FloatField(
        null=True,
        blank=True,
        verbose_name='coincidencia de transcripción'
    )
    
    # Campos para LISTENING_COMPREHENSION
    selected_answer = models.TextField(
        blank=True,
        default='',
        verbose_name='respuesta seleccionada'
    )
    correct = models.BooleanField(
        blank=True,
        default=False,
        verbose_name='es correcta'
    )
    
    # Comunes
    replays_used = models.IntegerField(
        default=0,
        verbose_name='repeticiones usadas',
        help_text='Cuántas veces reprodujo el audio'
    )
    score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación',
        help_text='0-100'
    )
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        verbose_name='dificultad'
    )
    xp_earned = models.IntegerField(
        default=0,
        verbose_name='XP ganado'
    )
    
    # API response (para shadowing)
    api_response_raw = models.JSONField(
        null=True,
        blank=True,
        verbose_name='respuesta raw de API'
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha del intento'
    )
    
    class Meta:
        db_table = 'listening_attempts'
        verbose_name = 'Intento de Listening'
        verbose_name_plural = 'Intentos de Listening'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['listening_type']),
            models.Index(fields=['question']),
        ]
    
    def __str__(self):
        return f"{self.user.first_name} - {self.get_listening_type_display()} {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        """Calcular score según el tipo"""
        if self.score is None:
            self.calculate_score()
        
        if self.xp_earned == 0:
            self.calculate_xp()
            
        super().save(*args, **kwargs)
    
    def calculate_score(self):
        """Calcula el score según el tipo de listening"""
        if self.listening_type == 'LISTENING_SHADOWING':
            if self.transcription_match is not None:
                self.score = self.transcription_match * 100
        else:  # LISTENING_COMPREHENSION
            if self.correct is not None:
                self.score = 100.0 if self.correct else 0.0
    
    def calculate_xp(self):
        """Calcula el XP ganado"""
        if self.score is None:
            return
        
        xp_max = self.question.xp_max
        base_xp = xp_max * (self.score / 100)
        
        # Penalización por usar demasiadas repeticiones
        max_allowed = self.question.max_replays or float('inf')
        if max_allowed != float('inf') and self.replays_used > max_allowed:
            penalty = 5 * (self.replays_used - max_allowed)
            base_xp = max(0, base_xp - penalty)
        
        self.xp_earned = round(base_xp)
    
    def update_user_precision(self):
        """Actualiza la precisión de listening del usuario"""
        recent_attempts = ListeningAttempt.objects.filter(
            user=self.user,
            score__isnull=False
        ).order_by('-created_at')[:10]
        
        if recent_attempts:
            avg_score = sum(a.score for a in recent_attempts) / len(recent_attempts)
            self.user.precision_listening = avg_score / 100
            self.user.save(update_fields=['precision_listening'])