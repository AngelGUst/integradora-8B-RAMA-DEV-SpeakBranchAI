# exams/models/unlocked_exam.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from .exam import Exam

class UnlockedExam(models.Model):
    """Exámenes desbloqueados por usuarios (permanente)"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='unlocked_exams',
        verbose_name='usuario'
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='unlocked_by',
        verbose_name='examen'
    )
    unlocked_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='fecha de desbloqueo'
    )
    
    class Meta:
        db_table = 'user_unlocked_exams'
        verbose_name = 'Examen Desbloqueado'
        verbose_name_plural = 'Exámenes Desbloqueados'
        unique_together = ['user', 'exam']  # Un usuario no puede desbloquear el mismo examen dos veces
        indexes = [
            models.Index(fields=['user', 'unlocked_at']),
            models.Index(fields=['exam']),
        ]
    
    def __str__(self):
        return f"{self.user.first_name} - {self.exam}"
    
    @classmethod
    def unlock_exam_for_user(cls, user, exam):
        """
        Desbloquea un examen para un usuario si cumple los requisitos
        Retorna: (UnlockedExam, created, message)
        """
        from users.models import UserProgress
        
        # Verificar si ya está desbloqueado
        if cls.objects.filter(user=user, exam=exam).exists():
            return None, False, "El examen ya estaba desbloqueado"
        
        # Verificar requisitos de XP
        try:
            progress = UserProgress.objects.get(user=user)
            if progress.total_xp < exam.xp_required:
                return None, False, f"Se requieren {exam.xp_required} XP para desbloquear"
        except UserProgress.DoesNotExist:
            return None, False, "Usuario no tiene progreso registrado"
        
        # Desbloquear examen
        unlocked = cls.objects.create(user=user, exam=exam)
        
        # Crear notificación (asumiendo que la app notifications existe)
        try:
            from notifications.models import Notification
            Notification.objects.create(
                user=user,
                type='EXAM_UNLOCKED',
                message=f"¡Has desbloqueado el examen {exam}!"
            )
        except ImportError:
            pass  # La app notifications aún no existe
        
        return unlocked, True, "Examen desbloqueado exitosamente"