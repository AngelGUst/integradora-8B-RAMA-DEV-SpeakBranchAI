# users/models/user_progress.py
from django.db import models
from django.conf import settings

class UserProgress(models.Model):
    """Progreso del usuario para el motor adaptativo"""
    
    LEVEL_CHOICES = [
        ('A1', 'Beginner (A1)'),
        ('A2', 'Elementary (A2)'),
        ('B1', 'Intermediate (B1)'),
        ('B2', 'Upper Intermediate (B2)'),
        ('C1', 'Advanced (C1)'),
        ('C2', 'Proficient (C2)'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='progress'
    )
    
    level = models.CharField(
        max_length=5,
        choices=LEVEL_CHOICES,
        default='A1'
    )
    
    # Promedios por habilidad
    average_speaking = models.FloatField(default=0.0)
    average_reading = models.FloatField(default=0.0)
    average_listening = models.FloatField(default=0.0)
    average_writing = models.FloatField(default=0.0)
    
    # XP Global
    total_xp = models.IntegerField(default=0)
    
    # Streaks
    streak_days = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_progress'
        verbose_name = 'Progreso de Usuario'
        verbose_name_plural = 'Progresos de Usuarios'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['level']),
        ]
    
    def __str__(self):
        return f"Progreso de {self.user.first_name} - Nivel {self.level}"
    
    def update_streak(self):
        """Actualiza la racha del usuario"""
        from datetime import date, timedelta
        
        today = date.today()
        
        if not self.last_activity_date:
            self.streak_days = 1
        elif self.last_activity_date == today - timedelta(days=1):
            self.streak_days += 1
        elif self.last_activity_date < today - timedelta(days=1):
            self.streak_days = 1
        
        self.last_activity_date = today
        self.save()
    
    def add_xp(self, xp_amount):
        """Añade XP al usuario (nunca baja de 0)"""
        self.total_xp = max(0, self.total_xp + xp_amount)
        self.save()
    
    def get_recommended_difficulty(self, skill_avg):
        """
        Determina la dificultad recomendada según el promedio
        Retorna: 'EASY', 'MEDIUM', 'HARD'
        """
        if skill_avg >= 16:
            return 'HARD'
        elif skill_avg >= 10:
            return 'MEDIUM'
        else:
            return 'EASY'