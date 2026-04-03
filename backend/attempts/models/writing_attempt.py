# attempts/models/writing_attempt.py
from django.db import models
from django.conf import settings
from questions.models import Question

class WritingAttempt(models.Model):
    """Intentos de ejercicios de writing (evaluados por IA)"""
    
    DIFFICULTY_CHOICES = [
        ('EASY', 'Fácil'),
        ('MEDIUM', 'Medio'),
        ('HARD', 'Difícil'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='writing_attempts',
        verbose_name='usuario'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='writing_attempts',
        verbose_name='pregunta',
        limit_choices_to={'type': 'WRITING'}
    )
    
    # Textos
    prompt_text = models.TextField(
        verbose_name='instrucción',
        help_text='Instrucción del ejercicio'
    )
    student_text = models.TextField(
        verbose_name='texto del alumno'
    )
    
    # Scores por criterio (0-100)
    score_grammar = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación de gramática'
    )
    score_vocabulary = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación de vocabulario'
    )
    score_coherence = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación de coherencia'
    )
    score_spelling = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación de ortografía'
    )
    
    # Score overall (ponderado)
    score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación total',
        help_text='0-100 (grammar 35% + vocabulary 25% + coherence 25% + spelling 15%)'
    )
    
    # Feedback de IA
    ai_feedback = models.TextField(
        blank=True,
        default='',
        verbose_name='feedback de IA',
        help_text='Feedback generado por OpenAI GPT'
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
    
    # API response
    api_response_raw = models.JSONField(
        null=True,
        blank=True,
        verbose_name='respuesta raw de API',
        help_text='Respuesta raw de OpenAI'
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha del intento'
    )
    
    class Meta:
        db_table = 'writing_attempts'
        verbose_name = 'Intento de Writing'
        verbose_name_plural = 'Intentos de Writing'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['question']),
            models.Index(fields=['difficulty']),
        ]
    
    def __str__(self):
        return f"{self.user.first_name} - Writing {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        """Calcular score ponderado si hay scores individuales"""
        if self.score is None and all([
            self.score_grammar, self.score_vocabulary,
            self.score_coherence, self.score_spelling
        ]):
            self.calculate_weighted_score()
        
        if self.xp_earned == 0 and self.score:
            self.calculate_xp()
            
        super().save(*args, **kwargs)
    
    def calculate_weighted_score(self):
        """Calcula el score ponderado según los pesos definidos"""
        # grammar 35% + vocabulary 25% + coherence 25% + spelling 15%
        self.score = (
            self.score_grammar * 0.35 +
            self.score_vocabulary * 0.25 +
            self.score_coherence * 0.25 +
            self.score_spelling * 0.15
        )
    
    def calculate_xp(self):
        """Calcula el XP ganado"""
        if self.score is None:
            return
        
        xp_max = self.question.xp_max
        self.xp_earned = round(xp_max * (self.score / 100))
    
    def update_user_precision(self):
        """Actualiza la precisión de writing del usuario"""
        recent_attempts = WritingAttempt.objects.filter(
            user=self.user,
            score__isnull=False
        ).order_by('-created_at')[:10]
        
        if recent_attempts:
            avg_score = sum(a.score for a in recent_attempts) / len(recent_attempts)
            self.user.precision_writing = avg_score / 100
            self.user.save(update_fields=['precision_writing'])
    
    @property
    def scores_summary(self):
        """Resumen de scores para mostrar"""
        return {
            'grammar': self.score_grammar,
            'vocabulary': self.score_vocabulary,
            'coherence': self.score_coherence,
            'spelling': self.score_spelling,
            'total': self.score
        }