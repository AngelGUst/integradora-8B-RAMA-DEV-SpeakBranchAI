"""
Tests para la app courses

Valida toda la lógica de negocio de cursos, lecciones, inscripciones y progreso.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

from .models import Course, Lesson, CourseEnrollment, LessonProgress
from .services import (
    CourseEnrollmentService, LessonProgressService,
    LessonCompletionService
)

User = get_user_model()


class CourseModelTest(TestCase):
    """Tests para el modelo Course"""
    
    def setUp(self):
        self.course = Course.objects.create(
            name='English A1',
            level='A1',
            description='Beginner English Course'
        )
    
    def test_course_creation(self):
        self.assertEqual(self.course.name, 'English A1')
        self.assertEqual(self.course.level, 'A1')
        self.assertEqual(self.course.total_lessons, 0)
    
    def test_course_cannot_be_deleted_with_active_students(self):
        """Un curso no puede borrarse si tiene alumnos inscritos"""
        user = User.objects.create_user(
            email='test@test.com',
            password='password123'
        )
        
        lesson = Lesson.objects.create(
            course=self.course,
            title='Lesson 1',
            order_index=1,
            content_type='VIDEO'
        )
        
        CourseEnrollment.objects.create(
            user=user,
            course=self.course,
            current_lesson=lesson
        )
        
        with self.assertRaises(ValidationError):
            self.course.delete()
    
    def test_get_first_lesson(self):
        """Obtener la primera lección del curso"""
        lesson1 = Lesson.objects.create(
            course=self.course,
            title='Lesson 1',
            order_index=1,
            content_type='VIDEO'
        )
        lesson2 = Lesson.objects.create(
            course=self.course,
            title='Lesson 2',
            order_index=2,
            content_type='EXERCISE_READING'
        )
        
        first = self.course.get_first_lesson()
        self.assertEqual(first, lesson1)


class LessonModelTest(TestCase):
    """Tests para el modelo Lesson"""
    
    def setUp(self):
        self.course = Course.objects.create(name='English A1', level='A1')
        self.lesson1 = Lesson.objects.create(
            course=self.course,
            title='Greetings',
            order_index=1,
            content_type='VIDEO',
            xp_value=50
        )
        self.lesson2 = Lesson.objects.create(
            course=self.course,
            title='Introductions',
            order_index=2,
            content_type='EXERCISE_READING',
            xp_value=50
        )
        self.user = User.objects.create_user(
            email='test@test.com',
            password='password123'
        )
    
    def test_lesson_ordering(self):
        """Las lecciones se pueden ordenar correctamente"""
        lessons = Lesson.objects.filter(course=self.course).order_by('order_index')
        self.assertEqual(lessons[0], self.lesson1)
        self.assertEqual(lessons[1], self.lesson2)
    
    def test_is_first_lesson(self):
        """Identificar la primera lección"""
        self.assertTrue(self.lesson1.is_first_lesson())
        self.assertFalse(self.lesson2.is_first_lesson())
    
    def test_is_last_lesson(self):
        """Identificar la última lección"""
        self.assertFalse(self.lesson1.is_last_lesson())
        self.assertTrue(self.lesson2.is_last_lesson())
    
    def test_first_lesson_is_always_unlocked(self):
        """La primera lección siempre está desbloqueada"""
        self.assertTrue(self.lesson1.is_unlocked_for_user(self.user))
    
    def test_second_lesson_locked_until_first_completed(self):
        """La segunda lección está bloqueada hasta completar la primera"""
        # Inicialmente bloqueada
        self.assertFalse(self.lesson2.is_unlocked_for_user(self.user))
        
        # Después de completar la primera
        progress = LessonProgress.objects.create(
            user=self.user,
            lesson=self.lesson1,
            completed=True,
            score=85
        )
        
        # Ahora está desbloqueada
        self.assertTrue(self.lesson2.is_unlocked_for_user(self.user))
    
    def test_next_lesson_property(self):
        """Obtener la siguiente lección"""
        self.assertEqual(self.lesson1.next_lesson, self.lesson2)
        self.assertIsNone(self.lesson2.next_lesson)
    
    def test_previous_lesson_property(self):
        """Obtener la lección anterior"""
        self.assertIsNone(self.lesson1.previous_lesson)
        self.assertEqual(self.lesson2.previous_lesson, self.lesson1)


class CourseEnrollmentTest(TestCase):
    """Tests para inscripciones en cursos"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@test.com',
            password='password123'
        )
        self.course = Course.objects.create(name='English A1', level='A1')
        self.lesson1 = Lesson.objects.create(
            course=self.course,
            title='Lesson 1',
            order_index=1,
            content_type='VIDEO',
            xp_value=50
        )
        self.lesson2 = Lesson.objects.create(
            course=self.course,
            title='Lesson 2',
            order_index=2,
            content_type='EXERCISE_READING',
            xp_value=50
        )
    
    def test_enroll_user(self):
        """Inscribir usuario en un curso"""
        enrollment = CourseEnrollmentService.enroll_user_in_course(
            self.user, self.course
        )
        
        self.assertEqual(enrollment.user, self.user)
        self.assertEqual(enrollment.course, self.course)
        self.assertEqual(enrollment.current_lesson, self.lesson1)
        self.assertIsNone(enrollment.completed_at)
    
    def test_cannot_enroll_in_another_course_same_level(self):
        """No puede inscribirse en dos cursos del mismo nivel"""
        course2 = Course.objects.create(name='English A1 Plus', level='A1')
        lesson = Lesson.objects.create(
            course=course2,
            title='Lesson 1',
            order_index=1,
            content_type='VIDEO'
        )
        
        CourseEnrollmentService.enroll_user_in_course(self.user, self.course)
        
        with self.assertRaises(ValidationError):
            CourseEnrollmentService.enroll_user_in_course(self.user, course2)
    
    def test_progress_percentage(self):
        """Calcular porcentaje de progreso"""
        enrollment = CourseEnrollmentService.enroll_user_in_course(
            self.user, self.course
        )
        
        self.assertEqual(enrollment.progress_percentage, 0)
        
        # Completar primera lección
        LessonProgress.objects.create(
            user=self.user,
            lesson=self.lesson1,
            completed=True,
            score=90
        )
        
        enrollment.refresh_from_db()
        self.assertEqual(enrollment.progress_percentage, 50)


class LessonProgressTest(TestCase):
    """Tests para el progreso de lecciones"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@test.com',
            password='password123'
        )
        self.course = Course.objects.create(name='English A1', level='A1')
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Lesson 1',
            order_index=1,
            content_type='VIDEO',
            xp_value=50
        )
    
    def test_create_lesson_progress(self):
        """Crear registro de progreso"""
        progress = LessonProgress.objects.create(
            user=self.user,
            lesson=self.lesson,
            completed=False,
            score=None
        )
        
        self.assertEqual(progress.user, self.user)
        self.assertEqual(progress.lesson, self.lesson)
        self.assertFalse(progress.completed)
        self.assertEqual(progress.attempts, 1)
    
    def test_best_score_saved(self):
        """Se guarda el mejor score entre intentos"""
        progress = LessonProgress.objects.create(
            user=self.user,
            lesson=self.lesson,
            completed=False
        )
        
        # Primer intento: score 75
        progress.update_attempt(75, 50)
        self.assertEqual(progress.score, 75)
        self.assertEqual(progress.xp_earned, 50)
        
        # Segundo intento: score 90 (mejor)
        progress.update_attempt(90, 50)
        self.assertEqual(progress.score, 90)  # Mejor score
        self.assertEqual(progress.xp_earned, 100)  # XP acumulado
        self.assertEqual(progress.attempts, 2)
        
        # Tercer intento: score 80 (peor)
        progress.update_attempt(80, 50)
        self.assertEqual(progress.score, 90)  # Sigue siendo 90 (mejor)
        self.assertEqual(progress.xp_earned, 150)  # XP acumulado
        self.assertEqual(progress.attempts, 3)
    
    def test_completed_at_set_on_completion(self):
        """Se establece completed_at cuando se completa"""
        progress = LessonProgress.objects.create(
            user=self.user,
            lesson=self.lesson,
            completed=False
        )
        
        self.assertIsNone(progress.completed_at)
        
        progress.update_attempt(90, 50)
        progress.refresh_from_db()
        
        self.assertTrue(progress.completed)
        self.assertIsNotNone(progress.completed_at)


class LessonCompletionServiceTest(TestCase):
    """Tests para el servicio de completar lecciones"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@test.com',
            password='password123'
        )
        self.course = Course.objects.create(name='English A1', level='A1')
        self.lesson1 = Lesson.objects.create(
            course=self.course,
            title='Lesson 1',
            order_index=1,
            content_type='VIDEO',
            xp_value=50
        )
        self.lesson2 = Lesson.objects.create(
            course=self.course,
            title='Lesson 2',
            order_index=2,
            content_type='EXERCISE_READING',
            xp_value=60
        )
        
        # Inscribir usuario
        self.enrollment = CourseEnrollmentService.enroll_user_in_course(
            self.user, self.course
        )
    
    def test_complete_first_lesson(self):
        """Completar la primera lección"""
        result = LessonCompletionService.complete_lesson(
            user=self.user,
            lesson=self.lesson1,
            score=92.5
        )
        
        self.assertTrue(result['is_first_completion'])
        self.assertEqual(result['score'], 92.5)
        self.assertEqual(result['xp_earned'], 50)
        self.assertFalse(result['course_completed'])
        self.assertEqual(result['next_lesson'], self.lesson2)
    
    def test_cannot_complete_locked_lesson(self):
        """No puede completar una lección bloqueada"""
        with self.assertRaises(ValidationError):
            LessonCompletionService.complete_lesson(
                user=self.user,
                lesson=self.lesson2,
                score=80
            )
    
    def test_unlock_next_lesson_on_completion(self):
        """La siguiente lección se desbloquea al completar"""
        # Lesson 2 está bloqueada
        self.assertFalse(self.lesson2.is_unlocked_for_user(self.user))
        
        # Completar lesson 1
        LessonCompletionService.complete_lesson(
            self.user, self.lesson1, 85
        )
        
        # Lesson 2 está desbloqueada
        self.assertTrue(self.lesson2.is_unlocked_for_user(self.user))
    
    def test_current_lesson_updated_on_completion(self):
        """current_lesson se actualiza al completar"""
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.current_lesson, self.lesson1)
        
        LessonCompletionService.complete_lesson(
            self.user, self.lesson1, 90
        )
        
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.current_lesson, self.lesson2)
    
    def test_course_completion(self):
        """El curso se marca como completado cuando se completan todas las lecciones"""
        # Completar lesson 1
        LessonCompletionService.complete_lesson(
            self.user, self.lesson1, 90
        )
        
        self.enrollment.refresh_from_db()
        self.assertIsNone(self.enrollment.completed_at)
        
        # Completar lesson 2
        LessonCompletionService.complete_lesson(
            self.user, self.lesson2, 85
        )
        
        self.enrollment.refresh_from_db()
        self.assertIsNotNone(self.enrollment.completed_at)
    
    def test_get_course_progress_summary(self):
        """Obtener resumen de progreso del curso"""
        # Completar lesson 1
        LessonCompletionService.complete_lesson(
            self.user, self.lesson1, 92
        )
        
        summary = LessonCompletionService.get_course_progress_summary(
            self.user, self.course
        )
        
        self.assertEqual(summary['total_lessons'], 2)
        self.assertEqual(summary['completed_lessons'], 1)
        self.assertEqual(summary['completion_percentage'], 50.0)
        self.assertEqual(summary['total_xp_earned'], 50)
        self.assertEqual(summary['total_xp_available'], 110)
        self.assertFalse(summary['is_completed'])


class LessonProgressServiceTest(TestCase):
    """Tests para el servicio de progreso"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@test.com',
            password='password123'
        )
        self.course = Course.objects.create(name='English A1', level='A1')
        self.lesson1 = Lesson.objects.create(
            course=self.course,
            title='Lesson 1',
            order_index=1,
            content_type='VIDEO'
        )
        self.lesson2 = Lesson.objects.create(
            course=self.course,
            title='Lesson 2',
            order_index=2,
            content_type='EXERCISE_READING'
        )
        self.lesson3 = Lesson.objects.create(
            course=self.course,
            title='Lesson 3',
            order_index=3,
            content_type='EXERCISE_WRITING'
        )
    
    def test_get_unlocked_lessons(self):
        """Obtener todas las lecciones desbloqueadas"""
        # Solo lesson 1 está desbloqueada
        unlocked = LessonProgressService.get_all_unlocked_lessons(self.user, self.course)
        self.assertEqual(len(unlocked), 1)
        self.assertEqual(unlocked[0], self.lesson1)
        
        # Completar lesson 1
        LessonProgress.objects.create(
            user=self.user,
            lesson=self.lesson1,
            completed=True
        )
        
        # Ahora lesson 1 y 2 están desbloqueadas
        unlocked = LessonProgressService.get_all_unlocked_lessons(self.user, self.course)
        self.assertEqual(len(unlocked), 2)
        self.assertIn(self.lesson1, unlocked)
        self.assertIn(self.lesson2, unlocked)
    
    def test_get_next_locked_lesson(self):
        """Obtener la siguiente lección bloqueada"""
        # Primera bloqueada es lesson 2
        next_locked = LessonProgressService.get_next_locked_lesson(self.user, self.course)
        self.assertEqual(next_locked, self.lesson2)
        
        # Completar lesson 1
        LessonProgress.objects.create(
            user=self.user,
            lesson=self.lesson1,
            completed=True
        )
        
        # Ahora es lesson 3
        next_locked = LessonProgressService.get_next_locked_lesson(self.user, self.course)
        self.assertEqual(next_locked, self.lesson3)
