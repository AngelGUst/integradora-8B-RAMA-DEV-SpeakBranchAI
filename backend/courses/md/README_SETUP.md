# PASOS PARA REGISTRAR LOS ENDPOINTS EN urls.py

## 1. Opción A: Registrar en backend/urls.py (principal)

Si tu proyecto Django tiene un único archivo `urls.py`:

```python
# backend/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Importar los viewsets
from courses.viewsets import (
    CourseViewSet, LessonViewSet,
    CourseEnrollmentViewSet, LessonProgressViewSet
)

# Crear el router
router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'enrollments', CourseEnrollmentViewSet, basename='enrollment')
router.register(r'lesson-progress', LessonProgressViewSet, basename='lesson-progress')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(router.urls)),  # Los endpoints estarán en /api/v1/...
    path('api-auth/', include('rest_framework.urls')),  # Para autenticación
]
```

## 2. Opción B: Registrar en courses/urls.py (app específica)

Si prefieres separar por app:

```python
# courses/urls.py (CREAR NUEVO ARCHIVO)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import viewsets

router = DefaultRouter()
router.register(r'courses', viewsets.CourseViewSet, basename='course')
router.register(r'lessons', viewsets.LessonViewSet, basename='lesson')
router.register(r'enrollments', viewsets.CourseEnrollmentViewSet, basename='enrollment')
router.register(r'lesson-progress', viewsets.LessonProgressViewSet, basename='lesson-progress')

app_name = 'courses'

urlpatterns = [
    path('', include(router.urls)),
]
```

Luego en `backend/urls.py`:

```python
# backend/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/courses/', include('courses.urls')),  # Los endpoints estarán en /api/v1/courses/...
    path('api-auth/', include('rest_framework.urls')),
]
```

---

## 3. Crear las migraciones

```bash
# Crear las migraciones para los cambios de modelos
python manage.py makemigrations courses

# Aplicar las migraciones
python manage.py migrate courses
```

---

## 4. Verificar que esté en INSTALLED_APPS

En `backend/settings.py`, asegúrate que `courses` está en INSTALLED_APPS:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # DRF
    'rest_framework',
    
    # Apps del proyecto
    'users',
    'courses',  # ← Asegúrate que esté aquí
    'vocabulary',
    'questions',
    'exams',
    'attempts',
]
```

---

## 5. Ejecutar los tests

```bash
# Ejecutar todos los tests de courses
python manage.py test courses

# Con verbose output
python manage.py test courses -v 2

# Solo un test específico
python manage.py test courses.tests.CourseModelTest.test_course_creation
```

---

## 6. Endpoint por endpoint

### CURSOS

```
GET    /api/v1/courses/               # Listar todos los cursos
GET    /api/v1/courses/{id}/          # Detalle de un curso
GET    /api/v1/courses/{id}/lessons/  # Lecciones del curso
GET    /api/v1/courses/{id}/progress/ # Progreso del usuario en el curso
GET    /api/v1/courses/my_courses/    # Cursos inscritos del usuario
```

### LECCIONES

```
GET    /api/v1/lessons/                  # Listar todas las lecciones
GET    /api/v1/lessons/{id}/             # Detalle de una lección
GET    /api/v1/lessons/{id}/is-unlocked/ # ¿Está desbloqueada?
POST   /api/v1/lessons/{id}/complete/    # Completar la lección
GET    /api/v1/lessons/{id}/progress/    # Progreso en la lección
```

### INSCRIPCIONES

```
GET    /api/v1/enrollments/                         # Mis inscripciones
GET    /api/v1/enrollments/{id}/                    # Detalle de inscripción
POST   /api/v1/enrollments/enroll/                  # Inscribirse en un curso
GET    /api/v1/enrollments/{id}/lessons_unlocked/   # Lecciones desbloqueadas
GET    /api/v1/enrollments/{id}/next_locked_lesson/ # Siguiente bloqueada
GET    /api/v1/enrollments/{id}/progress/           # Resumen de progreso
```

### PROGRESO

```
GET    /api/v1/lesson-progress/   # Todo el progreso del usuario
GET    /api/v1/lesson-progress/{id}/ # Detalle del progreso
```

---

## 7. Ejemplo de uso con CURL

### Inscribirse en un curso

```bash
curl -X POST http://localhost:8000/api/v1/enrollments/enroll/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 1
  }'
```

### Completar una lección

```bash
curl -X POST http://localhost:8000/api/v1/lessons/1/complete/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 85.5,
    "xp_earned": 50
  }'
```

### Ver progreso del curso

```bash
curl -X GET http://localhost:8000/api/v1/enrollments/1/progress/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. Importante: Asegúrate de agregar a requirements.txt

```
Django>=4.2
djangorestframework>=3.14.0
```

Instalación:
```bash
pip install djangorestframework
```

---

## 9. Migración al servidor de producción

Cuando despliegues a producción:

```bash
# En el servidor
python manage.py migrate courses
python manage.py collectstatic --noinput
```

---

## Checklist Final

- [ ] Actualizar `INSTALLED_APPS` en `settings.py`
- [ ] Registrar viewsets en `urls.py`
- [ ] Crear y aplicar migraciones (`makemigrations`, `migrate`)
- [ ] Instalar `djangorestframework` si no está
- [ ] Ejecutar tests (`python manage.py test courses`)
- [ ] Verificar que los endpoints responden en el navegador
- [ ] Probar con CURL o Postman
- [ ] Documentar en postman/swagger (opcional)

---

## Información Importante

### Autenticación

Todos los endpoints requieren autenticación. Se usa `permission_classes = [IsAuthenticated]`.

Si en `settings.py` tienes autenticación por Token:

```python
# Obtener token
curl -X POST http://localhost:8000/api-token-auth/ \
  -d "username=user&password=pass"

# Usar el token
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/v1/courses/
```

### Base de datos

Asegúrate de tener las tablas creadas:

```bash
python manage.py migrate
```

### Permisos

Los usuarios solo ven sus propias inscripciones y progreso. No pueden ver los de otros usuarios.

---

## Posibles Errores y Soluciones

### Error: "No module named 'rest_framework'"
```bash
pip install djangorestframework
```

### Error: "courses.signals module not found"
Asegúrate que en `courses/apps.py` tienes:
```python
def ready(self):
    import courses.signals
```

### Error: "ModuleNotFoundError: No module named 'courses.viewsets'"
Crea el archivo `courses/viewsets.py` (ya lo hemos hecho)

### Error: "course_enrollments already exists"
Las migraciones ya existen. Intenta:
```bash
python manage.py migrate courses --fake-initial
```

---

## Próximos Pasos

1. Considera agregar Swagger/OpenAPI para documentación interactiva
2. Agregar paginación en los listados
3. Agregar filtros avanzados
4. Implementar notificaciones cuando se completa un curso
5. Agregar webhooks para eventos importantes
