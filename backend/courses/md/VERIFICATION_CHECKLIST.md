# VERIFICACIÓN POST-INSTALACIÓN

Sigue estos pasos para verificar que todo fue implementado correctamente.

---

## ✅ VERIFICACIÓN DE ARCHIVOS

Verifica que todos estos archivos existen en `backend/courses/`:

```
courses/
├── models/
│   ├── __init__.py
│   ├── course.py             ✓ Modificado
│   ├── lesson.py             ✓ Modificado
│   ├── enrollment.py         ✓ Modificado
│   └── progress.py           ✓ Modificado
├── __init__.py
├── admin.py                  ✓ Modificado
├── apps.py                   ✓ Modificado
├── tests.py                  ✓ Modificado con 50+ tests
├── services.py               ✓ NUEVO - Lógica de negocio
├── serializers.py            ✓ NUEVO - API serialization
├── viewsets.py               ✓ NUEVO - API endpoints
├── signals.py                ✓ NUEVO - Actualizaciones automáticas
├── examples.py               ✓ NUEVO - Ejemplos de uso
├── IMPLEMENTATION_GUIDE.md   ✓ NUEVO - Guía técnica
├── README_SETUP.md           ✓ NUEVO - Instalación
├── FRONTEND_GUIDE.md         ✓ NUEVO - Guía frontend
└── IMPLEMENTATION_SUMMARY.md ✓ NUEVO - Resumen ejecutivo
```

---

## ✅ VERIFICACIÓN DE DEPENDENCIAS

Verifica que `djangorestframework` esté instalado:

```bash
pip freeze | grep djangorestframework
# Debe mostrar: djangorestframework==X.X.X

# Si no está instalado:
pip install djangorestframework
```

---

## ✅ VERIFICACIÓN DE settings.py

Asegúrate que en `backend/settings.py`:

### 1. `rest_framework` está en INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'courses',
    # ...
]
```

### 2. Configuración de DRF (opcional pero recomendado)

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}
```

---

## ✅ VERIFICACIÓN DE urls.py

Asegúrate que en `backend/urls.py` (o en la app urls.py):

```python
from django.urls import path, include
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

# En urlpatterns:
# path('api/v1/', include(router.urls)),
```

---

## ✅ VERIFICACIÓN DE MIGRACIONES

Ejecuta estos comandos:

```bash
# 1. Crear las migraciones
python manage.py makemigrations courses

# 2. Verificar que se crearon
ls -la backend/courses/migrations/

# 3. Aplicar las migraciones
python manage.py migrate courses

# 4. Verificar que las tablas existen en la BD
python manage.py dbshell
# SELECT * FROM courses;
# SELECT * FROM lessons;
# SELECT * FROM course_enrollments;
# SELECT * FROM lesson_progress;
```

---

## ✅ VERIFICACIÓN DE SEÑALES

En la shell de Django:

```bash
python manage.py shell
```

```python
# Verificar que los signals están registrados
from django.db.models.signals import post_save
from courses.models import LessonProgress

# Debería haber receptores registrados
print(post_save.receivers)
```

---

## ✅ VERIFICACIÓN DE TESTS

Ejecuta los tests para verificar que todo funciona:

```bash
# Ejecutar todos los tests de courses
python manage.py test courses

# Con verbose
python manage.py test courses -v 2

# Ver un test específico
python manage.py test courses.tests.CourseModelTest.test_course_creation
```

**Esperado:** ✓ 50+ tests deberían pasar (OK)

---

## ✅ VERIFICACIÓN DE ADMIN

1. Crea un superusuario si no existe:
```bash
python manage.py createsuperuser
```

2. Accede a `http://localhost:8000/admin/`

3. Verifica que existan estas 4 secciones bajo "COURSES":
   - ✓ Cursos
   - ✓ Lecciones
   - ✓ Course enrollments
   - ✓ Lesson progresses

4. Intenta crear un curso y una lección desde admin

---

## ✅ VERIFICACIÓN DE ENDPOINTS

Inicia el servidor:

```bash
python manage.py runserver
```

### Con la interfaz web de DRF

Accede a: `http://localhost:8000/api/v1/`

Deberías ver un listado de todos los endpoints disponibles.

### Con CURL

```bash
# Obtener token (si tienes TokenAuthentication)
TOKEN=$(curl -X POST http://localhost:8000/api-token-auth/ \
  -d "username=admin&password=password" | jq -r '.token')

# Verificar que todos los endpoints responden
curl -H "Authorization: Token $TOKEN" \
  http://localhost:8000/api/v1/courses/

# Esperado: JSON response con lista de cursos
```

---

## ✅ VERIFICACIÓN DE SERVICIOS

En la shell de Django:

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from courses.models import Course, Lesson
from courses.services import CourseEnrollmentService

User = get_user_model()

# Crear datos de prueba
user = User.objects.create_user('test@test.com', 'password')
course = Course.objects.create(name='Test', level='A1')
lesson = Lesson.objects.create(course=course, title='L1', order_index=1, content_type='VIDEO')

# Probar servicio
enrollment = CourseEnrollmentService.enroll_user_in_course(user, course)

print(f"✓ Usuario inscrito: {enrollment}")
print(f"✓ Lección actual: {enrollment.current_lesson}")
```

---

## ✅ VERIFICACIÓN DE EJEMPLOS

Ejecuta el script de ejemplos:

```bash
# Opción 1: Como script
python courses/examples.py

# Opción 2: En shell
python manage.py shell < courses/examples.py
```

**Esperado:** Debería mostrar 13 ejemplos funcionando correctamente

---

## ✅ VERIFICACIÓN DE DOCUMENTACIÓN

Verifica que estos archivos existan y sean legibles:

```bash
ls -la backend/courses/*.md

# Debería mostrar:
# - IMPLEMENTATION_GUIDE.md
# - README_SETUP.md
# - FRONTEND_GUIDE.md
# - IMPLEMENTATION_SUMMARY.md
```

---

## 🔧 TROUBLESHOOTING

### Problema: "ModuleNotFoundError: No module named 'rest_framework'"
**Solución:**
```bash
pip install djangorestframework
```

### Problema: "courses.signals module not found"
**Solución:** Verifica que en `courses/apps.py` esté:
```python
def ready(self):
    import courses.signals
```

### Problema: "Table doesn't exist: courses"
**Solución:**
```bash
python manage.py migrate courses
```

### Problema: Los endpoints no responden
**Solución:** Verifica que en `urls.py` esté el router registrado

### Problema: "Permission denied" en endpoints
**Solución:** Agrega el token o credenciales en el header

---

## 📊 ESTADÍSTICAS DE IMPLEMENTACIÓN

- ✅ **Modelos**: 4 modelos mejorados
- ✅ **Servicios**: 3 servicios con 12 métodos
- ✅ **Viewsets**: 4 viewsets con 20 endpoints
- ✅ **Serializers**: 8 serializers
- ✅ **Tests**: 50+ tests unitarios
- ✅ **Documentación**: 4 guías completas
- ✅ **Líneas de código**: 2000+ líneas implementadas

---

## 📋 CHECKLIST FINAL

- [ ] Se ejecutó `makemigrations` y `migrate`
- [ ] Se registraron los viewsets en `urls.py`
- [ ] Se ejecutaron los tests (`test courses`)
- [ ] Se verificaron los endpoints en navegador/curl
- [ ] Se probó inscripción en un curso
- [ ] Se probó completar una lección
- [ ] Se verificó el desbloqueo de lecciones
- [ ] Se probó el admin Django
- [ ] Se verificó que los signals funcionan
- [ ] Se leyó la documentación

---

## 🎯 PRÓXIMOS PASOS

1. **Conectar con tu frontend React**: Usa `FRONTEND_GUIDE.md`
2. **Crear datos iniciales**: Crea algunos cursos en admin
3. **Probar el flujo completo**: Inscribe, completa lecciones, verifica progreso
4. **Agregar validaciones adicionales**: Según necesites
5. **Implementar notificaciones**: Cuando se complete un curso

---

## 📞 PREGUNTAS FRECUENTES

**P: ¿Necesito inicializar algo especial?**
A: Solo ejecuta las migraciones: `python manage.py migrate courses`

**P: ¿Dónde están los ejemplos de uso?**
A: En `courses/examples.py`

**P: ¿Cómo uso desde el frontend?**
A: Lee `FRONTEND_GUIDE.md`

**P: ¿Qué pasa si reintento una lección?**
A: Se guarda el mejor score y se acumula XP

**P: ¿Puedo saltarme una lección?**
A: No, las lecciones se desbloquean secuencialmente

**P: ¿Dónde conozco todos los endpoints?**
A: En `IMPLEMENTATION_GUIDE.md` o en `/api/v1/`

---

## ✨ ¡ÉXITO!

Si todo aquí está ✓, la implementación está completa y lista para usar.

**¡Felicidades! 🚀**
