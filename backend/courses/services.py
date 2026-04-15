# courses/services.py
"""
Servicios para la lógica de negocio de cursos

Maneja:
- Inscripción de usuarios a cursos
- Validación de desbloqueo de lecciones
- Actualización de progreso
- Cálculo de XP y scores
"""

from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Course, Lesson, CourseEnrollment, LessonProgress
from users.models import UserProgress
from system_config.services import LevelProgressionService


class CourseEnrollmentService:
    """Servicio para manejar inscripciones a cursos"""

    @staticmethod
    @transaction.atomic
    def enroll_user_in_course(user, course):
        """Inscribe un usuario en un curso

        Reglas:
        - Un usuario solo puede estar inscrito en UN curso activo por nivel
        - La inscripción empieza en la primera lección

        Returns:
            CourseEnrollment: La inscripción creada o existente

        Raises:
            ValidationError: Si ya hay una inscripción activa en ese nivel en otro curso
        """
        # Verificar si ya tiene una inscripción activa en ese nivel
        existing_enrollment = CourseEnrollment.objects.filter(
            user=user,
            course__level=course.level,
            completed_at__isnull=True
        ).first()

        if existing_enrollment and existing_enrollment.course != course:
            raise ValidationError(
                f'El usuario ya está inscrito en {existing_enrollment.course.name} '
                f'de nivel {course.level}'
            )

        if existing_enrollment:
            return existing_enrollment  # Ya está inscrito

        # Obtener la primera lección
        first_lesson = course.get_first_lesson()
        if not first_lesson:
            raise ValidationError('El curso no tiene lecciones')

        # Crear la inscripción
        enrollment = CourseEnrollment.objects.create(
            user=user,
            course=course,
            current_lesson=first_lesson
        )

        # Crear el progreso de la primera lección
        LessonProgress.objects.get_or_create(
            user=user,
            lesson=first_lesson
        )

        return enrollment

    @staticmethod
    def get_user_current_enrollment(user, level=None):
        """Obtiene la inscripción activa del usuario

        Args:
            user: Usuario
            level: (Opcional) Nivel CEFR específico

        Returns:
            CourseEnrollment: La inscripción activa o None
        """
        query = CourseEnrollment.objects.filter(
            user=user,
            completed_at__isnull=True
        ).select_related('course', 'current_lesson')

        if level:
            query = query.filter(course__level=level)

        return query.first()


class LessonProgressService:
    """Servicio para manejar el progreso de lecciones"""

    @staticmethod
    def can_access_lesson(user, lesson):
        """Verifica si un usuario puede acceder a una lección

        Reglas:
        - Primera lección: siempre accesible
        - Otras lecciones: solo si la anterior está completed=True
        """
        return lesson.is_unlocked_for_user(user)

    @staticmethod
    def get_all_unlocked_lessons(user, course):
        """Obtiene todas las lecciones desbloqueadas para el usuario en el curso"""
        unlocked_lessons = []
        lessons = course.lessons.all().order_by('order_index')

        for lesson in lessons:
            if LessonProgressService.can_access_lesson(user, lesson):
                unlocked_lessons.append(lesson)
            else:
                break  # Las lecciones siguientes también estarán bloqueadas

        return unlocked_lessons

    @staticmethod
    def get_next_locked_lesson(user, course):
        """Obtiene la siguiente lección bloqueada en el curso"""
        lessons = course.lessons.all().order_by('order_index')

        for lesson in lessons:
            if not LessonProgressService.can_access_lesson(user, lesson):
                return lesson

        return None


class LessonCompletionService:
    """Servicio para manejar la finalización de lecciones"""

    @staticmethod
    @transaction.atomic
    def complete_lesson(user, lesson, score, xp_earned=None):
        """Completa una lección para un usuario

        Flujo:
        1. Validar que la lección esté desbloqueada
        2. Obtener o crear el registro de progreso
        3. Actualizar el progreso (mejor score, XP acumulado)
        4. El signal on_lesson_completed actualiza current_lesson y completed_at del curso
        5. Actualizar UserProgress (total_xp)

        Raises:
            ValidationError: Si la lección no está desbloqueada o el usuario no está inscrito
        """
        if not LessonProgressService.can_access_lesson(user, lesson):
            raise ValidationError(
                'Esta lección no está desbloqueada. Completa la anterior primero.'
            )

        if xp_earned is None:
            xp_earned = lesson.xp_value

        if not (0 <= score <= 100):
            raise ValidationError('El score debe estar entre 0 y 100')

        progress, created = LessonProgress.get_or_create_progress(user, lesson)

        is_first_completion = not progress.completed
        progress.update_attempt(score, xp_earned)

        enrollment = CourseEnrollment.objects.filter(
            user=user,
            course=lesson.course
        ).first()

        if not enrollment:
            raise ValidationError('Usuario no está inscrito en este curso')

        # Actualizar UserProgress (total_xp)
        user_progress, _ = UserProgress.objects.get_or_create(user=user)
        user_progress.total_xp += xp_earned
        user_progress.save()
        level_progress = LevelProgressionService.get_user_level_progress(user, progress=user_progress)

        # Refrescar enrollment para leer el estado actualizado por el signal
        enrollment.refresh_from_db()

        return {
            'lesson': lesson,
            'progress': progress,
            'score': progress.score,
            'xp_earned': xp_earned,
            'total_xp': user_progress.total_xp,
            'level_progress': level_progress,
            'is_first_completion': is_first_completion,
            'course_completed': enrollment.completed_at is not None,
            'next_lesson': lesson.next_lesson,
        }

    @staticmethod
    def get_lesson_progress(user, lesson):
        """Obtiene el progreso de un usuario en una lección específica"""
        return LessonProgress.objects.filter(
            user=user,
            lesson=lesson
        ).first()

    @staticmethod
    def get_course_progress_summary(user, course):
        """Obtiene un resumen del progreso del usuario en el curso"""
        progress_records = LessonProgress.get_user_progress_in_course(user, course)

        total_lessons = course.total_lessons
        completed_lessons = progress_records.filter(completed=True).count()
        total_xp_earned = sum(p.xp_earned for p in progress_records)

        enrollment = CourseEnrollment.objects.filter(
            user=user,
            course=course
        ).first()

        return {
            'course': course,
            'total_lessons': total_lessons,
            'completed_lessons': completed_lessons,
            'completion_percentage': (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0,
            'total_xp_earned': total_xp_earned,
            'total_xp_available': course.total_xp,
            'is_completed': enrollment.is_completed if enrollment else False,
            'lessons': [
                {
                    'lesson': p.lesson,
                    'completed': p.completed,
                    'score': p.score,
                    'xp_earned': p.xp_earned,
                    'attempts': p.attempts,
                    'is_unlocked': LessonProgressService.can_access_lesson(user, p.lesson),
                }
                for p in progress_records
            ],
        }
