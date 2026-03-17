# attempts/models/speaking_attempt.py
from django.db import models
from django.conf import settings
from questions.models import Question

class SpeakingAttempt(models.Model):
    """Intentos de ejercicios de speaking"""
    
    DIFFICULTY_CHOICES = [
        ('EASY', 'Fácil'),
        ('MEDIUM', 'Medio'),
        ('HARD', 'Difícil'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='speaking_attempts',
        verbose_name='usuario'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='speaking_attempts',
        verbose_name='pregunta',
        limit_choices_to={'type': 'SPEAKING'}  # Solo preguntas de speaking
    )
    
    # Textos
    expected_text = models.TextField(
        verbose_name='texto esperado'
    )
    transcribed_text = models.TextField(
        null=True,
        blank=True,
        verbose_name='texto transcrito',
        help_text='Texto devuelto por Whisper'
    )
    
    # Resultados
    transcription_match = models.FloatField(
        null=True,
        blank=True,
        verbose_name='coincidencia de transcripción',
        help_text='Similitud 0.0 a 1.0 (rapidfuzz)'
    )
    score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación',
        help_text='0-100'
    )
    
    # Metadatos
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        verbose_name='dificultad'
    )
    attempts_count = models.IntegerField(
        default=1,
        verbose_name='número de intentos',
        help_text='Reintentos del mismo ejercicio'
    )
    xp_earned = models.IntegerField(
        default=0,
        verbose_name='XP ganado'
    )
    
    # API response
    api_response_raw = models.JSONField(
        null=True,
        blank=True,
        verbose_name='respuesta raw de API',
        help_text='Respuesta raw de OpenAI Whisper'
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha del intento'
    )
    
    class Meta:
        db_table = 'speaking_attempts'
        verbose_name = 'Intento de Speaking'
        verbose_name_plural = 'Intentos de Speaking'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['question']),
            models.Index(fields=['difficulty']),
            models.Index(fields=['score']),
        ]
    
    def __str__(self):
        return f"{self.user.first_name} - Speaking {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        """Calcular XP si no se ha calculado"""
        if self.score is not None and self.xp_earned == 0:
            self.calculate_xp()
        super().save(*args, **kwargs)
    
    def calculate_xp(self):
        """Calcula el XP ganado basado en score y dificultad"""
        if self.score is None:
            return
        
        # Obtener xp_max de la pregunta
        xp_max = self.question.xp_max
        
        # Calcular XP base
        base_xp = xp_max * (self.score / 100)
        
        # Penalización por intentos extra (si hay más de 1 intento)
        penalty = 0
        if self.attempts_count > 1:
            penalty = 3 * (self.attempts_count - 1)
        
        # XP final (nunca negativo)
        self.xp_earned = max(0, round(base_xp - penalty))
    
    def update_user_precision(self):
        """Actualiza la precisión de speaking del usuario"""
        if self.score is None:
            return
        
        # Obtener los últimos 10 intentos del usuario
        recent_attempts = SpeakingAttempt.objects.filter(
            user=self.user,
            score__isnull=False
        ).order_by('-created_at')[:10]
        
        if recent_attempts:
            avg_score = sum(a.score for a in recent_attempts) / len(recent_attempts)
            self.user.precision_speaking = avg_score / 100  # Normalizar a 0-1
            self.user.save(update_fields=['precision_speaking'])