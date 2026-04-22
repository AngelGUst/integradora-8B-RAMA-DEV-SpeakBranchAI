# exams/models/exam_attempt.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from .exam import Exam
from .unlocked_exam import UnlockedExam

class ExamAttempt(models.Model):
    """Intentos de exámenes realizados por usuarios"""
    
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'En progreso'),
        ('COMPLETED', 'Completado'),
        ('EXPIRED', 'Expirado'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exam_attempts',
        verbose_name='usuario'
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='attempts',
        verbose_name='examen'
    )
    
    # Estado y resultados
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS',
        verbose_name='estado'
    )
    score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='puntuación',
        help_text='Puntuación total del examen (0-100)'
    )
    passed = models.BooleanField(
        default=False,
        verbose_name='aprobado'
    )
    xp_earned = models.IntegerField(
        default=0,
        verbose_name='XP ganado'
    )
    
    # Respuestas (JSON con las respuestas del usuario)
    answers = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='respuestas',
        help_text='Diccionario con {pregunta_id: respuesta}'
    )
    
    # Tiempo
    started_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de inicio'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='fecha de completado'
    )
    time_spent_seconds = models.IntegerField(
        default=0,
        verbose_name='tiempo empleado (segundos)'
    )
    
    class Meta:
        db_table = 'exam_attempts'
        verbose_name = 'Intento de Examen'
        verbose_name_plural = 'Intentos de Exámenes'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', '-started_at']),
            models.Index(fields=['exam', 'status']),
            models.Index(fields=['passed']),
        ]
    
    def __str__(self):
        return f"{self.user.first_name} - {self.exam} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        """Actualizar passed si hay score"""
        if self.score is not None and not self.passed:
            self.passed = self.score >= self.exam.passing_score
        super().save(*args, **kwargs)
    
    def complete_attempt(self, answers_dict):
        """
        Completa el intento del examen calculando el score
        """
        import json

        self.answers = answers_dict
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()

        total_points = 0
        earned_points = 0

        exam_questions = self.exam.exam_questions.select_related('question')

        for eq in exam_questions:
            question = eq.question
            user_answer = answers_dict.get(str(question.id))

            total_points += eq.points

            if user_answer:
                if question.type in ['READING', 'LISTENING_COMPREHENSION']:
                    correct_value = self._extract_correct_answer(question.correct_answer)
                    if correct_value and user_answer.strip().lower() == correct_value.strip().lower():
                        earned_points += eq.points
                elif question.type == 'SPEAKING':
                    # Speaking questions are scored separately through pronunciation/fluency analysis
                    continue

        if total_points > 0:
            self.score = (earned_points / total_points) * 100

        self.calculate_xp()
        self.save()

        if self.passed:
            self._handle_passed_exam()

        return self.score

    @staticmethod
    def _extract_correct_answer(correct_answer_field):
        """Parse correct_answer JSON to extract the expected correct value."""
        import json
        try:
            data = json.loads(correct_answer_field)
        except (json.JSONDecodeError, TypeError):
            return correct_answer_field

        if isinstance(data, dict):
            if 'questions' in data and isinstance(data['questions'], list) and data['questions']:
                return data['questions'][0].get('correct', '')
            if 'correct' in data:
                return data['correct']

        return correct_answer_field
    
    def calculate_xp(self):
        """Calcula el XP ganado en el examen"""
        if self.score is None:
            return
        
        # Fórmula: XP base del examen * (score/100)
        base_xp = self.exam.question_count * 10  # 10 XP por pregunta
        self.xp_earned = round(base_xp * (self.score / 100))
    
    def _handle_passed_exam(self):
        """Maneja las consecuencias de aprobar un examen"""
        from users.models import UserProgress
        from system_config.services import LevelProgressionService
        
        # Actualizar nivel del usuario si es examen de nivelación
        if self.exam.type == 'LEVEL_UP':
            progress, _ = UserProgress.objects.get_or_create(user=self.user)

            # Debe aprobar el examen del nivel actual para poder subir
            if progress.level != self.exam.level:
                return

            next_level = LevelProgressionService.get_next_level(progress.level)
            if not next_level:
                return

            progress.level = next_level
            progress.level_start_xp = progress.total_xp
            progress.save(update_fields=['level', 'level_start_xp', 'last_updated'])

            # Actualizar también el nivel en el usuario
            self.user.level = next_level
            self.user.save(update_fields=['level'])
    
    def time_remaining(self):
        """Calcula el tiempo restante en segundos"""
        if self.status != 'IN_PROGRESS':
            return 0
        
        elapsed = (timezone.now() - self.started_at).total_seconds()
        time_limit = self.exam.time_limit_minutes * 60
        remaining = max(0, time_limit - elapsed)
        
        if remaining == 0:
            self.status = 'EXPIRED'
            self.save()
        
        return remaining
    
    @property
    def is_expired(self):
        """Verifica si el examen ha expirado"""
        return self.time_remaining() == 0