# courses/examples.py
"""
Ejemplos de uso de la app courses

Estos ejemplos muestran cómo usar los servicios y modelos
de forma programática desde cualquier parte del código.

Para usar: copiar el código en un script o en la shell de Django
python manage.py shell < courses/examples.py
"""

from django.contrib.auth import get_user_model
from .models import Course, Lesson, CourseEnrollment, LessonProgress
from .services import (
    CourseEnrollmentService, LessonProgressService,
    LessonCompletionService
)

User = get_user_model()

print("=" * 80)
print("EJEMPLOS DE USO - APP COURSES")
print("=" * 80)

# ============================================================================
# EJEMPLO 1: Crear un curso y lecciones
# ============================================================================

print("\n[EJEMPLO 1] Crear un curso con lecciones\n")

# Crear un curso
course = Course.objects.create(
    name="English A1 - Basics",
    level="A1",
    description="Learn the basics of English"
)
print(f"✓ Curso creado: {course}")

# Crear lecciones
lesson1 = Lesson.objects.create(
    course=course,
    title="Greetings and Introductions",
    order_index=1,
    content_type="VIDEO",
    content_url="https://example.com/video1.mp4",
    duration_min=10,
    xp_value=50
)
print(f"✓ Lección 1 creada: {lesson1}")

lesson2 = Lesson.objects.create(
    course=course,
    title="Numbers and Colors",
    order_index=2,
    content_type="EXERCISE_READING",
    content_url="https://example.com/exercise1.html",
    duration_min=15,
    xp_value=50
)
print(f"✓ Lección 2 creada: {lesson2}")

lesson3 = Lesson.objects.create(
    course=course,
    title="Speaking Practice",
    order_index=3,
    content_type="EXERCISE_SPEAKING",
    duration_min=20,
    xp_value=60
)
print(f"✓ Lección 3 creada: {lesson3}")

print(f"\nCurso tiene {course.total_lessons} lecciones")
print(f"Duración total: {course.total_duration} minutos")
print(f"XP disponible: {course.total_xp}")

# ============================================================================
# EJEMPLO 2: Crear un usuario e inscribirlo en el curso
# ============================================================================

print("\n[EJEMPLO 2] Inscribir usuario en un curso\n")

user = User.objects.create_user(
    email="student@example.com",
    password="password123",
    first_name="Juan",
    last_name="García"
)
print(f"✓ Usuario creado: {user.email}")

# Inscribir en el curso
enrollment = CourseEnrollmentService.enroll_user_in_course(user, course)
print(f"✓ Usuario inscrito en: {enrollment.course.name}")
print(f"  - Lección actual: {enrollment.current_lesson.title}")
print(f"  - Progreso: {enrollment.progress_percentage}%")
print(f"  - XP ganado: {enrollment.total_xp_earned}")

# ============================================================================
# EJEMPLO 3: Verificar desbloqueos de lecciones
# ============================================================================

print("\n[EJEMPLO 3] Verificar estado de desbloqueo\n")

for lesson in course.lessons.all().order_by('order_index'):
    is_unlocked = LessonProgressService.can_access_lesson(user, lesson)
    status = "🔓 DESBLOQUEADA" if is_unlocked else "🔒 BLOQUEADA"
    print(f"{status} - {lesson.title}")

# ============================================================================
# EJEMPLO 4: Completar la primera lección
# ============================================================================

print("\n[EJEMPLO 4] Completar primera lección\n")

result = LessonCompletionService.complete_lesson(
    user=user,
    lesson=lesson1,
    score=92.5
)

print(f"✓ Lección completada: {result['lesson'].title}")
print(f"  - Score: {result['score']}%")
print(f"  - XP ganado: {result['xp_earned']}")
print(f"  - Total XP: {result['total_xp']}")
print(f"  - Es primer intento: {result['is_first_completion']}")
print(f"  - Próxima lección: {result['next_lesson'].title if result['next_lesson'] else 'Ninguna'}")
print(f"  - ¿Curso completado?: {result['course_completed']}")

# ============================================================================
# EJEMPLO 5: Verificar desbloqueos nuevamente
# ============================================================================

print("\n[EJEMPLO 5] Verificar estado después de completar\n")

for lesson in course.lessons.all().order_by('order_index'):
    is_unlocked = LessonProgressService.can_access_lesson(user, lesson)
    status = "🔓 DESBLOQUEADA" if is_unlocked else "🔒 BLOQUEADA"
    print(f"{status} - {lesson.title}")

# ============================================================================
# EJEMPLO 6: Reintento con mejor score
# ============================================================================

print("\n[EJEMPLO 6] Reintento de lección (mejor score)\n")

# El usuario reintenta y obtiene mejor score
result2 = LessonCompletionService.complete_lesson(
    user=user,
    lesson=lesson1,
    score=95.5  # Mejor que 92.5
)

print(f"✓ Reintento completado:")
print(f"  - Score anterior: 92.5")
print(f"  - Score nuevo: 95.5")
print(f"  - Score guardado: {result2['score']} (el mejor ✓)")
print(f"  - Intentos: 2")

# Verificar que el score es el mejor
progress = LessonProgressService.get_lesson_progress(user, lesson1)
print(f"\nProgreso en bd:")
print(f"  - Score: {progress.score}")
print(f"  - XP ganado: {progress.xp_earned}")
print(f"  - Intentos: {progress.attempts}")

# ============================================================================
# EJEMPLO 7: Completar segunda lección
# ============================================================================

print("\n[EJEMPLO 7] Completar segunda lección\n")

result3 = LessonCompletionService.complete_lesson(
    user=user,
    lesson=lesson2,
    score=88.0
)

print(f"✓ Lección completada: {result3['lesson'].title}")
print(f"  - Score: {result3['score']}%")
print(f"  - XP total del usuario: {result3['total_xp']}")

# ============================================================================
# EJEMPLO 8: Obtener resumen de progreso
# ============================================================================

print("\n[EJEMPLO 8] Resumen de progreso del curso\n")

summary = LessonCompletionService.get_course_progress_summary(user, course)

print(f"Curso: {summary['course'].name}")
print(f"Lecciones completadas: {summary['completed_lessons']} / {summary['total_lessons']}")
print(f"Progreso: {summary['completion_percentage']:.1f}%")
print(f"XP ganado: {summary['total_xp_earned']} / {summary['total_xp_available']}")
print(f"Estado: {'✓ COMPLETADO' if summary['is_completed'] else '📚 EN PROGRESO'}")

print(f"\nDetalle de lecciones:")
for lesson_data in summary['lessons']:
    status = "✓" if lesson_data['completed'] else "○"
    locked = "" if lesson_data['is_unlocked'] else " [BLOQUEADA]"
    score = f" ({lesson_data['score']}%)" if lesson_data['score'] else ""
    print(f"  {status} {lesson_data['lesson'].title}{score}{locked}")

# ============================================================================
# EJEMPLO 9: Lecciones desbloqueadas y próxima bloqueada
# ============================================================================

print("\n[EJEMPLO 9] Lecciones desbloqueadas vs bloqueadas\n")

unlocked = LessonProgressService.get_all_unlocked_lessons(user, course)
print(f"Lecciones desbloqueadas: {len(unlocked)}")
for lesson in unlocked:
    print(f"  - {lesson.title}")

next_locked = LessonProgressService.get_next_locked_lesson(user, course)
if next_locked:
    print(f"\nPróxima lección bloqueada: {next_locked.title}")
else:
    print(f"\nTodas las lecciones están desbloqueadas")

# ============================================================================
# EJEMPLO 10: Información de inscripción
# ============================================================================

print("\n[EJEMPLO 10] Estado de inscripción\n")

enrollment.refresh_from_db()
print(f"Inscripción:")
print(f"  - Usuario: {enrollment.user.email}")
print(f"  - Curso: {enrollment.course.name}")
print(f"  - Lección actual: {enrollment.current_lesson.title if enrollment.current_lesson else 'Completado'}")
print(f"  - Fecha inscripción: {enrollment.enrolled_at}")
print(f"  - Fecha completado: {enrollment.completed_at or 'Aún no completado'}")
print(f"  - Progreso: {enrollment.progress_percentage:.1f}%")
print(f"  - ¿Completado?: {enrollment.is_completed}")

# ============================================================================
# EJEMPLO 11: Completar el curso
# ============================================================================

print("\n[EJEMPLO 11] Completar el curso entero\n")

# Completar la tercera lección
result_final = LessonCompletionService.complete_lesson(
    user=user,
    lesson=lesson3,
    score=87.0
)

print(f"✓ Última lección completada: {result_final['lesson'].title}")
print(f"✓ ¿Curso completado?: {result_final['course_completed']}")

# Verificar estado final
enrollment.refresh_from_db()
print(f"\nEstado final de la inscripción:")
print(f"  - ¿Completado?: {enrollment.is_completed}")
print(f"  - Fecha completado: {enrollment.completed_at}")
print(f"  - Progreso: {enrollment.progress_percentage:.1f}%")

# ============================================================================
# EJEMPLO 12: Error - intentar acceder a lección bloqueada
# ============================================================================

print("\n[EJEMPLO 12] Intentar acceder a lección bloqueada (deberá fallar)\n")

# Crear un nuevo usuario
user2 = User.objects.create_user(
    email="student2@example.com",
    password="password123"
)

# Inscribir en el curso
CourseEnrollmentService.enroll_user_in_course(user2, course)

# Intentar completar la 3ª lección sin completar las anteriores
try:
    LessonCompletionService.complete_lesson(
        user=user2,
        lesson=lesson3,
        score=90.0
    )
except Exception as e:
    print(f"✓ Error esperado: {str(e)}")
    print("  (No se puede completar lección bloqueada)")

# ============================================================================
# EJEMPLO 13: Error - intentar inscribirse en otro curso del mismo nivel
# ============================================================================

print("\n[EJEMPLO 13] Intentar inscribirse en otro A1 (deberá fallar)\n")

# Crear otro curso A1
other_course = Course.objects.create(
    name="English A1 - Advanced",
    level="A1"
)

try:
    CourseEnrollmentService.enroll_user_in_course(user2, other_course)
except Exception as e:
    print(f"✓ Error esperado: {str(e)}")
    print("  (Solo un curso por nivel)")

# ============================================================================
# RESUMEN
# ============================================================================

print("\n" + "=" * 80)
print("RESUMEN DE FUNCIONALIDADES DEMOSTRADAS")
print("=" * 80)

print("""
✓ Crear cursos y lecciones
✓ Inscribir usuarios  
✓ Verificar desbloqueos secuenciales
✓ Completar lecciones
✓ Guardar mejor score
✓ Acumular XP
✓ Obtener progreso
✓ Completar cursos
✓ Manejo de errores
✓ Validaciones

La lógica de negocio está completamente implementada y lista para usar!
""")

print("=" * 80)
