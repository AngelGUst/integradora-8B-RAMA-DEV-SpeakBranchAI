# CURSOS - GUÍA DE IMPLEMENTACIÓN

## Resumen

La app `courses` implementa la lógica completa de cursos, lecciones, inscripciones y progreso según las reglas de negocio especificadas.

---

## Estructura

### Modelos

1. **Course** - Contenedor principal del curso (1 nivel CEFR)
2. **Lesson** - Unidad mínima dentro de un curso (con orden obligatorio)
3. **CourseEnrollment** - Inscripción de usuario a un curso
4. **LessonProgress** - Progreso del usuario en cada lección

### Servicios

Toda la lógica de negocio está concentrada en `services.py`:

- **CourseEnrollmentService** - Inscribir usuarios, obtener inscripciones
- **LessonProgressService** - Verificar desbloqueos, obtener lecciones desbloqueadas
- **LessonCompletionService** - Completar lecciones, calcular progreso, XP

### Signals

Archivo `signals.py` maneja actualizaciones automáticas cuando se completa una lección:
- Actualiza `current_lesson` en CourseEnrollment
- Verifica si se completó el curso
- Posibilidad de activar notificaciones

---

## Configuración de URLs

Agrega los viewsets a tu `urls.py`:

```python
# backend/urls.py (o backend/courses/urls.py)

from rest_framework.routers import DefaultRouter
from courses.viewsets import (
    CourseViewSet, LessonViewSet,
    CourseEnrollmentViewSet, LessonProgressViewSet
)

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'enrollments', CourseEnrollmentViewSet, basename='enrollment')
router.register(r'lesson-progress', LessonProgressViewSet, basename='lesson-progress')

urlpatterns = [
    path('api/', include(router.urls)),
]
```

---

## Endpoints Principales

### Cursos
- `GET /api/courses/` - Listar todos los cursos
- `GET /api/courses/{id}/` - Detalle del curso
- `GET /api/courses/{id}/lessons/` - Lecciones del curso
- `GET /api/courses/{id}/progress/` - Progreso del usuario (requiere inscripción)
- `GET /api/courses/my_courses/` - Cursos inscritos del usuario

### Lecciones
- `GET /api/lessons/` - Listar todas las lecciones
- `GET /api/lessons/{id}/` - Detalle de la lección
- `GET /api/lessons/{id}/is-unlocked/` - ¿Está desbloqueada?
- `POST /api/lessons/{id}/complete/` - Completar lección
- `GET /api/lessons/{id}/progress/` - Progreso en la lección

### Inscripciones
- `GET /api/enrollments/` - Listar inscripciones del usuario
- `GET /api/enrollments/{id}/` - Detalle de inscripción
- `POST /api/enrollments/enroll/` - Inscribir en un curso
- `GET /api/enrollments/{id}/lessons_unlocked/` - Lecciones desbloqueadas
- `GET /api/enrollments/{id}/next_locked_lesson/` - Siguiente bloqueada
- `GET /api/enrollments/{id}/progress/` - Resumen de progreso

### Progreso
- `GET /api/lesson-progress/` - Listar todo el progreso del usuario
- `GET /api/lesson-progress/{id}/` - Detalle del progreso

---

## Flujo Típico de Uso

### 1. Usuario se inscribe en un curso

```bash
POST /api/enrollments/enroll/
{
    "course_id": 1
}
```

Respuesta:
```json
{
    "id": 1,
    "course": {
        "id": 1,
        "name": "English A1",
        "level": "A1",
        "total_lessons": 10,
        "total_xp": 500,
        "total_duration": 150
    },
    "current_lesson": {
        "id": 1,
        "title": "Greetings",
        "order_index": 1,
        "content_type": "VIDEO"
    },
    "progress_percentage": 0.0,
    "enrolled_at": "2024-03-23T10:00:00Z"
}
```

### 2. Usuario accede a una lección

```bash
GET /api/lessons/1/is-unlocked/
```

Respuesta:
```json
{
    "is_unlocked": true
}
```

### 3. Usuario completa una lección

```bash
POST /api/lessons/1/complete/
{
    "score": 85.5,
    "xp_earned": 50  // opcional, usa lesson.xp_value si no se proporciona
}
```

Respuesta:
```json
{
    "lesson": {
        "id": 1,
        "title": "Greetings",
        "order_index": 1
    },
    "score": 85.5,
    "xp_earned": 50,
    "total_xp": 550,  // XP total del usuario
    "is_first_completion": true,
    "course_completed": false,
    "next_lesson": {
        "id": 2,
        "title": "Introductions",
        "order_index": 2
    }
}
```

### 4. Automaticamente luego de completar:
- Se actualiza `CourseEnrollment.current_lesson` a la siguiente
- Se actualiza `UserProgress.total_xp`
- Si es la última lección, `CourseEnrollment.completed_at` se llena

### 5. Usuario consulta su progreso

```bash
GET /api/enrollments/1/progress/
```

Respuesta:
```json
{
    "course": { /* ... */ },
    "total_lessons": 10,
    "completed_lessons": 1,
    "completion_percentage": 10.0,
    "total_xp_earned": 50,
    "total_xp_available": 500,
    "is_completed": false,
    "lessons": [
        {
            "id": 1,
            "completed": true,
            "score": 85.5,
            "xp_earned": 50,
            "attempts": 1,
            "is_unlocked": true
        },
        {
            "id": 2,
            "completed": false,
            "score": null,
            "xp_earned": 0,
            "attempts": 0,
            "is_unlocked": true
        },
        {
            "id": 3,
            "completed": false,
            "score": null,
            "xp_earned": 0,
            "attempts": 0,
            "is_unlocked": false
        }
    ]
}
```

---

## Reglas de Negocio Implementadas

### Desbloqueo de Lecciones

La lección solo se desbloquea cuando:
- Es la **primera lección** del curso, O
- La **lección anterior** tiene `completed=True`

```python
lesson.is_unlocked_for_user(user)  # True/False
```

### Progreso y Puntuación

- **Score**: Se guarda el **mejor** score, no el último
- **XP**: Se **acumula** con cada intento (no solo el primero)
- **Completed**: Se marca en la **primera** finalización

```python
progress = LessonProgress.objects.get(user=user, lesson=lesson)
progress.update_attempt(new_score=92, new_xp_earned=50)
```

### Inscripción en Cursos

- Usuario solo puede estar inscrito en **UN curso** por nivel
- La inscripción empieza en la **primera lección**
- No se puede eliminar un curso si tiene **alumnos activos**

```python
CourseEnrollmentService.enroll_user_in_course(user, course)
```

### Finalización de Cursos

El curso se marca como completado cuando:
- Se completan **TODAS** las lecciones
- Se llena automáticamente `CourseEnrollment.completed_at`

---

## Métodos Útiles de los Modelos

### Course

```python
course.total_lessons          # Número de lecciones
course.total_duration        # Duración total (minutos)
course.total_xp              # Total de XP disponible
course.active_students       # Cantidad de alumnos inscritos
course.get_first_lesson()    # Primera lección
```

### Lesson

```python
lesson.is_first_lesson()                    # ¿Es la primera?
lesson.is_last_lesson()                     # ¿Es la última?
lesson.is_unlocked_for_user(user)           # ¿Desbloqueada?
lesson.next_lesson                          # Siguiente lección
lesson.previous_lesson                      # Anterior lección
```

### CourseEnrollment

```python
enrollment.progress_percentage              # Porcentaje completado
enrollment.total_xp_earned                  # XP ganado
enrollment.is_completed                     # ¿Completado?
enrollment.can_access_lesson(lesson)        # ¿Accesible?
enrollment.get_all_progress()               # Todo el progreso
```

### LessonProgress

```python
progress.update_attempt(score, xp_earned)   # Registrar intento
progress.is_completed()                     # ¿Está completa?
progress.get_completion_status()            # Estado ('not_started', 'completed')
```

---

## Servicios Principales

### CourseEnrollmentService

```python
from courses.services import CourseEnrollmentService

# Inscribir usuario
enrollment = CourseEnrollmentService.enroll_user_in_course(user, course)

# Obtener inscripción activa
enrollment = CourseEnrollmentService.get_user_current_enrollment(user, level='A1')
```

### LessonProgressService

```python
from courses.services import LessonProgressService

# ¿Puede acceder?
can_access = LessonProgressService.can_access_lesson(user, lesson)

# Obtener lecciones desbloqueadas
unlocked = LessonProgressService.get_all_unlocked_lessons(user, course)

# Siguiente bloqueada
next_locked = LessonProgressService.get_next_locked_lesson(user, course)
```

### LessonCompletionService

```python
from courses.services import LessonCompletionService

# Completar lección
result = LessonCompletionService.complete_lesson(
    user=user,
    lesson=lesson,
    score=92.5,
    xp_earned=50  # optional
)

# Obtener progreso
progress = LessonCompletionService.get_lesson_progress(user, lesson)

# Resumen de progreso
summary = LessonCompletionService.get_course_progress_summary(user, course)
```

---

## Administración

En Django Admin:

1. **Courses** - Ver estadísticas, crear/editar cursos
2. **Lessons** - Crear/editar lecciones con order_index automático
3. **Course Enrollments** - Ver inscripciones y progreso de alumnos
4. **Lesson Progress** - Ver detalle del progreso en cada lección

---

## Testing

Ejemplo de test básico:

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from courses.models import Course, Lesson
from courses.services import LessonCompletionService

User = get_user_model()

class LessonCompletionTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='test@test.com', password='pass')
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
    
    def test_complete_lesson(self):
        result = LessonCompletionService.complete_lesson(
            user=self.user,
            lesson=self.lesson1,
            score=85.0
        )
        
        self.assertTrue(result['is_first_completion'])
        self.assertEqual(result['score'], 85.0)
        self.assertEqual(result['xp_earned'], 50)
    
    def test_lesson_unlock(self):
        # Lesson 2 está bloqueada
        self.assertFalse(
            LessonCompletionService.get_lesson_progress(self.user, self.lesson2)
        )
        
        # Completa lesson 1
        LessonCompletionService.complete_lesson(self.user, self.lesson1, 90.0)
        
        # Ahora lesson 2 está desbloqueada
        self.assertTrue(self.lesson2.is_unlocked_for_user(self.user))
```

---

## Notas Importantes

1. **Transactions**: Los servicios usan `@transaction.atomic` para garantizar consistencia
2. **Signals**: Se disparan automáticamente al guardar `LessonProgress`
3. **Validaciones**: Se valida desbloqueo antes de permitir completar
4. **XP Acumulativo**: Cada intento suma XP, no solo el primero
5. **Score Mejor**: Se guarda el mayor score entre intentos
6. **Automático**: Todo se actualiza automáticamente sin necesidad de hacer llamadas adicionales

---

## Próximas Implementaciones Posibles

- [ ] Notificaciones cuando se completa un curso (LEVEL_UP)
- [ ] Integración con badges/achievements
- [ ] Desbloqueo automático de exámenes después de X lecciones
- [ ] Recordatorios de lecciones no completadas
- [ ] Estadísticas por usuario/curso
- [ ] Exportar progreso a PDF
- [ ] Sincronización con app móvil
