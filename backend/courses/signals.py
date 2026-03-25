# courses/signals.py
"""
Signals para la app courses

Maneja actualizaciones automáticas en la lógica de progreso
cuando se completan lecciones o cursos.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LessonProgress, CourseEnrollment


@receiver(post_save, sender=LessonProgress)
def on_lesson_completed(sender, instance, created, update_fields, **kwargs):
    """Signal que se dispara cuando se guarda un LessonProgress

    Responsabilidades:
    1. Si la lección fue completada: actualizar current_lesson en CourseEnrollment
    2. Verificar si se completa el curso
    """
    # Solo procesar si la lección está completada
    if not instance.completed:
        return

    # Ignorar si solo fue actualizado XP o score (sin cambio en completed)
    if update_fields and 'completed' not in update_fields:
        return

    course = instance.lesson.course
    enrollment = CourseEnrollment.objects.filter(
        user=instance.user,
        course=course
    ).first()

    if not enrollment:
        return

    # Ya está completado, no hacer nada
    if enrollment.completed_at:
        return

    # Actualizar current_lesson a la siguiente
    next_lesson = instance.lesson.next_lesson
    if next_lesson:
        enrollment.current_lesson = next_lesson
        enrollment.save(update_fields=['current_lesson'])

    # Verificar si se completó el curso
    total_lessons = course.total_lessons
    completed_lessons = LessonProgress.objects.filter(
        user=instance.user,
        lesson__course=course,
        completed=True
    ).count()

    if completed_lessons >= total_lessons and not enrollment.completed_at:
        enrollment.complete_course()
        # Aquí se podría activar un signal para notificación LEVEL_UP
        # si la app de notificaciones está disponible
