from django.db import models
from django.conf import settings

class AttemptLessonProgress(models.Model):
    """Rastrea el progreso XP del usuario por lección y dificultad
    
    Caps por dificultad:
    - EASY: máx 10 XP
    - MEDIUM: máx 20 XP
    - HARD: máx 30 XP
    - TOTAL: máx 60 XP
    
    Lección completada cuando: total_xp >= 60
    """
    
    TYPE_CHOICES = [
        ('READING', 'Reading'),
        ('SPEAKING', 'Speaking'),
        ('LISTENING_SHADOWING', 'Listening Shadowing'),
        ('LISTENING_COMPREHENSION', 'Listening Comprehension'),
        ('WRITING', 'Writing'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attempt_lesson_progress',
        verbose_name='usuario'
    )
    
    question_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        verbose_name='tipo de pregunta'
    )
    question_level = models.CharField(
        max_length=5,
        verbose_name='nivel del usuario (A1, A2, B1, etc)',
        help_text='Ej: A1, A2, B1'
    )
    
    # XP ganado por dificultad
    xp_easy = models.IntegerField(
        default=0,
        verbose_name='XP ganado en ejercicios EASY',
        help_text='Máximo 10'
    )
    xp_medium = models.IntegerField(
        default=0,
        verbose_name='XP ganado en ejercicios MEDIUM',
        help_text='Máximo 20'
    )
    xp_hard = models.IntegerField(
        default=0,
        verbose_name='XP ganado en ejercicios HARD',
        help_text='Máximo 30'
    )
    
    is_completed = models.BooleanField(
        default=False,
        verbose_name='lección completada (total_xp >= 60)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'attempt_lesson_progress'
        verbose_name = 'Progreso de Lección de Intentos'
        verbose_name_plural = 'Progreso de Lecciones de Intentos'
        unique_together = ('user', 'question_type', 'question_level')
        indexes = [
            models.Index(fields=['user', 'question_type', 'question_level']),
            models.Index(fields=['is_completed']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.question_type} {self.question_level}"
    
    @property
    def total_xp(self):
        """Total XP acumulado: easy + medium + hard"""
        return self.xp_easy + self.xp_medium + self.xp_hard
    
    @property
    def max_xp(self):
        """XP máximo posible: 10 + 20 + 30"""
        return 60
    
    def get_max_xp_for_difficulty(self, difficulty):
        """Retorna el máximo XP para una dificultad específica"""
        difficulty_map = {
            'EASY': 10,
            'MEDIUM': 20,
            'HARD': 30,
        }
        return difficulty_map.get(difficulty, 0)
    
    def get_current_xp_for_difficulty(self, difficulty):
        """Retorna el XP actual para una dificultad específica"""
        difficulty_map = {
            'EASY': self.xp_easy,
            'MEDIUM': self.xp_medium,
            'HARD': self.xp_hard,
        }
        return difficulty_map.get(difficulty, 0)
    
    def can_earn_xp(self, difficulty):
        """
        Verifica si puede ganar más XP en esta dificultad
        
        Args:
            difficulty (str): 'EASY', 'MEDIUM', 'HARD'
        
        Returns:
            bool: True si no ha alcanzado el máximo para esa dificultad
        """
        current = self.get_current_xp_for_difficulty(difficulty)
        max_allowed = self.get_max_xp_for_difficulty(difficulty)
        
        return current < max_allowed
    
    def add_xp(self, difficulty, amount):
        """
        Suma XP para una dificultad sin exceder su máximo
        
        Args:
            difficulty (str): 'EASY', 'MEDIUM', 'HARD'
            amount (int): XP a sumar
        """
        max_allowed = self.get_max_xp_for_difficulty(difficulty)
        
        if difficulty == 'EASY':
            self.xp_easy = min(self.xp_easy + amount, max_allowed)
        elif difficulty == 'MEDIUM':
            self.xp_medium = min(self.xp_medium + amount, max_allowed)
        elif difficulty == 'HARD':
            self.xp_hard = min(self.xp_hard + amount, max_allowed)
        
        # Marcar completada si alcanzó 60 XP total
        if self.total_xp >= 60:
            self.is_completed = True
        
        self.save()
    
    def get_progress_breakdown(self):
        """Retorna el desglose de progreso por dificultad"""
        return {
            'easy': {'current': self.xp_easy, 'max': 10},
            'medium': {'current': self.xp_medium, 'max': 20},
            'hard': {'current': self.xp_hard, 'max': 30},
            'total': {'current': self.total_xp, 'max': 60},
            'is_completed': self.is_completed,
        }