# attempts/models/reading_attempt.py
from django.db import models
from django.conf import settings
from questions.models import Question

class ReadingAttempt(models.Model):
    """Intentos de ejercicios de reading"""
    
    DIFFICULTY_CHOICES = [
        ('EASY', 'Fácil'),
        ('MEDIUM', 'Medio'),
        ('HARD', 'Difícil'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reading_attempts',
        verbose_name='usuario'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='reading_attempts',
        verbose_name='pregunta',
        limit_choices_to={'type': 'READING'}  # Solo preguntas de reading
    )
    
    # Respuesta
    selected_answer = models.TextField(
        verbose_name='respuesta seleccionada'
    )
    correct = models.BooleanField(
        default=False,
        verbose_name='es correcta'
    )
    
    # Resultados
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
    xp_earned = models.IntegerField(
        default=0,
        verbose_name='XP ganado'
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha del intento'
    )
    
    class Meta:
        db_table = 'reading_attempts'
        verbose_name = 'Intento de Reading'
        verbose_name_plural = 'Intentos de Reading'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['question']),
            models.Index(fields=['correct']),
            models.Index(fields=['difficulty']),
        ]
    
    def __str__(self):
        return f"{self.user.first_name} - Reading {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        """Auto-calcular si es correcto y XP"""
        # Verificar si la respuesta es correcta
        if not self.correct and self.selected_answer:
            self.correct = (self.selected_answer.strip().lower() == 
                          self.question.correct_answer.strip().lower())
        
        # Calcular score
        if self.score is None:
            self.score = 100.0 if self.correct else 0.0
        
        # Calcular XP
        if self.xp_earned == 0:
            self.calculate_xp()
            
        super().save(*args, **kwargs)
    
    def calculate_xp(self):
        """Calcula el XP ganado"""
        xp_max = self.question.xp_max
        self.xp_earned = round(xp_max * (self.score / 100))
    
    def update_user_precision(self):
        """Actualiza la precisión de reading del usuario"""
        recent_attempts = ReadingAttempt.objects.filter(
            user=self.user,
            score__isnull=False
        ).order_by('-created_at')[:10]
        
        if recent_attempts:
            avg_score = sum(a.score for a in recent_attempts) / len(recent_attempts)
            self.user.precision_reading = avg_score / 100
            self.user.save(update_fields=['precision_reading'])