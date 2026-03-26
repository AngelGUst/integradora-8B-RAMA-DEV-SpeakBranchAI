# GUÍA RÁPIDA PARA FRONTEND

Este documento proporciona una referencia rápida de los endpoints disponibles y cómo utilizarlos desde React.

---

## Autenticación

La mayoría de endpoints requieren un token de autenticación en el header:

```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

---

## Endpoints Principales

### 1. OBTENER CURSOS

**Endpoint:**
```
GET /api/v1/courses/
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "name": "English A1",
    "level": "A1",
    "description": "Beginner English Course",
    "total_lessons": 10,
    "total_xp": 500,
    "total_duration": 150,
    "created_at": "2024-03-23T10:00:00Z"
  }
]
```

**Uso en React:**
```javascript
const fetchCourses = async () => {
  const response = await fetch('/api/v1/courses/', { headers });
  return response.json();
};
```

---

### 2. INSCRIBIRSE EN UN CURSO

**Endpoint:**
```
POST /api/v1/enrollments/enroll/
```

**Body:**
```json
{
  "course_id": 1
}
```

**Respuesta:**
```json
{
  "id": 1,
  "user": 1,
  "course": {
    "id": 1,
    "name": "English A1",
    "level": "A1"
  },
  "current_lesson": {
    "id": 1,
    "title": "Greetings",
    "order_index": 1,
    "content_type": "VIDEO"
  },
  "enrolled_at": "2024-03-23T10:00:00Z",
  "completed_at": null,
  "progress_percentage": 0,
  "total_xp_earned": 0,
  "is_completed": false
}
```

**Uso en React:**
```javascript
const enrollCourse = async (courseId) => {
  const response = await fetch('/api/v1/enrollments/enroll/', {
    method: 'POST',
    headers,
    body: JSON.stringify({ course_id: courseId })
  });
  return response.json();
};
```

---

### 3. OBTENER MIS INSCRIPCIONES

**Endpoint:**
```
GET /api/v1/enrollments/
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "user": 1,
    "course": { /* ... */ },
    "current_lesson": { /* ... */ },
    "progress_percentage": 25.5,
    "total_xp_earned": 150,
    "is_completed": false
  }
]
```

---

### 4. OBTENER LECCIONES DE UN CURSO

**Endpoint:**
```
GET /api/v1/courses/1/lessons/
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "title": "Greetings",
    "order_index": 1,
    "content_type": "VIDEO",
    "duration_min": 5,
    "xp_value": 50,
    "is_first": true,
    "is_last": false
  },
  {
    "id": 2,
    "title": "Introductions",
    "order_index": 2,
    "content_type": "EXERCISE_READING",
    "duration_min": 10,
    "xp_value": 50,
    "is_first": false,
    "is_last": false
  }
]
```

---

### 5. VERIFICAR SI UNA LECCIÓN ESTÁ DESBLOQUEADA

**Endpoint:**
```
GET /api/v1/lessons/2/is-unlocked/
```

**Respuesta:**
```json
{
  "is_unlocked": true
}
```

**Uso en React:**
```javascript
const isLessonUnlocked = async (lessonId) => {
  const response = await fetch(`/api/v1/lessons/${lessonId}/is-unlocked/`, { headers });
  const data = await response.json();
  return data.is_unlocked;
};
```

---

### 6. COMPLETAR UNA LECCIÓN

**Endpoint:**
```
POST /api/v1/lessons/2/complete/
```

**Body:**
```json
{
  "score": 92.5,
  "xp_earned": 50
}
```

**Respuesta:**
```json
{
  "lesson": {
    "id": 2,
    "title": "Introductions",
    "order_index": 2
  },
  "score": 92.5,
  "xp_earned": 50,
  "total_xp": 200,
  "is_first_completion": true,
  "course_completed": false,
  "next_lesson": {
    "id": 3,
    "title": "Questions",
    "order_index": 3
  }
}
```

**Uso en React:**
```javascript
const completeLessonHandler = async (lessonId, score) => {
  const response = await fetch(`/api/v1/lessons/${lessonId}/complete/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      score: score,
      // xp_earned es opcional, si no lo pones usa el xp_value de la lección
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`¡Completaste con score ${result.score}!`);
    console.log(`Ganaste ${result.xp_earned} XP`);
    
    if (result.next_lesson) {
      console.log(`Siguiente lección: ${result.next_lesson.title}`);
    }
    
    if (result.course_completed) {
      console.log('¡Completaste el curso!');
    }
    
    return result;
  } else {
    const error = await response.json();
    console.error('Error:', error.error || error);
  }
};
```

---

### 7. OBTENER PROGRESO DE UNA LECCIÓN

**Endpoint:**
```
GET /api/v1/lessons/2/progress/
```

**Respuesta:**
```json
{
  "id": 1,
  "lesson": 2,
  "lesson_title": "Introductions",
  "lesson_order": 2,
  "lesson_type": "EXERCISE_READING",
  "lesson_xp": 50,
  "completed": true,
  "completed_at": "2024-03-23T11:00:00Z",
  "score": 92.5,
  "xp_earned": 50,
  "attempts": 1,
  "is_unlocked": true,
  "created_at": "2024-03-23T10:00:00Z",
  "updated_at": "2024-03-23T11:00:00Z"
}
```

---

### 8. OBTENER RESUMEN DE PROGRESO DEL CURSO

**Endpoint:**
```
GET /api/v1/enrollments/1/progress/
```

**Respuesta:**
```json
{
  "course": {
    "id": 1,
    "name": "English A1",
    "level": "A1"
  },
  "total_lessons": 10,
  "completed_lessons": 3,
  "completion_percentage": 30.0,
  "total_xp_earned": 150,
  "total_xp_available": 500,
  "is_completed": false,
  "lessons": [
    {
      "lesson": {
        "id": 1,
        "title": "Greetings",
        "order_index": 1
      },
      "completed": true,
      "score": 90.5,
      "xp_earned": 50,
      "attempts": 1,
      "is_unlocked": true
    },
    {
      "lesson": {
        "id": 2,
        "title": "Introductions",
        "order_index": 2
      },
      "completed": true,
      "score": 92.5,
      "xp_earned": 50,
      "attempts": 2,
      "is_unlocked": true
    },
    {
      "lesson": {
        "id": 3,
        "title": "Questions",
        "order_index": 3
      },
      "completed": true,
      "score": 85.0,
      "xp_earned": 50,
      "attempts": 1,
      "is_unlocked": true
    },
    {
      "lesson": {
        "id": 4,
        "title": "Answers",
        "order_index": 4
      },
      "completed": false,
      "score": null,
      "xp_earned": 0,
      "attempts": 0,
      "is_unlocked": true
    },
    {
      "lesson": {
        "id": 5,
        "title": "Conversations",
        "order_index": 5
      },
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

## Tipos de Contenido

Las lecciones pueden ser de los siguientes tipos:

```
VIDEO - Video de instrucción
TEXT - Lectura de texto
EXERCISE_READING - Ejercicio de lectura
EXERCISE_SPEAKING - Ejercicio de habla
EXERCISE_LISTENING_SHADOWING - Escucha y repetición
EXERCISE_LISTENING_COMPREHENSION - Comprensión auditiva
EXERCISE_WRITING - Ejercicio de escritura
```

---

## Flujo Típico de Uso

### 1. Usuario entra a la app

```javascript
// Obtener cursos disponibles
const courses = await fetchCourses();

// Mostrar lista de cursos en UI
```

### 2. Usuario selecciona un curso para inscribirse

```javascript
const enrollment = await enrollCourse(courseId);

// Mostrar confirmación de inscripción
// Guardar enrollment.id para referencia futura
```

### 3. Usuario ve las lecciones del curso

```javascript
const lessons = await fetchCourseLessons(courseId);

// Filtrar solo las desbloqueadas
const unlockedLessons = lessons.filter(
  lesson => /* verificar en progress o en is_unlocked */
);

// Mostrar en UI
```

### 4. Usuario accede a una lección

```javascript
// Verificar si está desbloqueada
const isUnlocked = await isLessonUnlocked(lessonId);

if (!isUnlocked) {
  alert('Debes completar la lección anterior primero');
  return;
}

// Mostrar la lección
showLesson(lessonId);
```

### 5. Usuario completa el ejercicio de la lección

```javascript
// El usuario completa el ejercicio (tu lógica)
const calculatedScore = calculateScore(userAnswers); // Tu función

// Enviar resultado al backend
const result = await completeLessonHandler(lessonId, calculatedScore);

// Mostrar resultado
if (result) {
  showSuccessMessage(`¡Score: ${result.score}%! +${result.xp_earned} XP`);
  
  // Si hay lección siguiente, ofrecerla
  if (result.next_lesson) {
    showButton(`Siguiente lección: ${result.next_lesson.title}`);
  }
  
  // Si se completó el curso
  if (result.course_completed) {
    showLevelUpNotification('¡Completaste el curso!');
  }
}
```

### 6. Usuario ve su progreso

```javascript
const progress = await getEnrollmentProgress(enrollmentId);

// Mostrar:
// - Barra de progreso: progress.completion_percentage
// - XP ganado: progress.total_xp_earned
// - Lecciones completadas: progress.completed_lessons / progress.total_lessons
// - Lista de lecciones con estado
```

---

## Estados de una Lección

Para cada lección, puedes determinar su estado:

```javascript
const getLessonState = (lesson) => {
  if (!lesson.is_unlocked) {
    return 'LOCKED';  // Bloqueada
  }
  
  if (!lesson.completed) {
    return 'UNLOCKED';  // Desbloqueada pero no completada
  }
  
  return 'COMPLETED';  // Completada
};

// Usar en UI para mostrar íconos, colores, etc.
```

---

## Manejo de Errores

```javascript
const completeLessonSafe = async (lessonId, score) => {
  try {
    // Validar score
    if (score < 0 || score > 100) {
      throw new Error('Score debe estar entre 0 y 100');
    }
    
    const response = await fetch(`/api/v1/lessons/${lessonId}/complete/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ score })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error desconocido');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al completar lección:', error);
    // Mostrar mensaje de error al usuario
    return null;
  }
};
```

---

## Notas Importantes

1. **Desbloqueo Secuencial**: Las lecciones se desbloquean en orden. No pueden saltarse.

2. **Mejor Score**: Si el usuario reintenta, solo se guarda el mejor score.

3. **XP Acumulativo**: Cada intento suma XP, aunque sea un reintento.

4. **Automático**: Todo se actualiza automáticamente en el backend. No necesitas hacer llamadas adicionales.

5. **Permisos**: Solo puedes ver tus propias inscripciones y progreso.

6. **Completación del Curso**: Se marca como completado automáticamente cuando termina la última lección.

---

## Optimizaciones Sugeridas

### Caché local para cursos y lecciones
```javascript
// Las lecciones y cursos no cambian frecuentemente
// Usar localStorage o sessionStorage
```

### Polling para actualizaciones de progreso
```javascript
// Actualizar el progreso cada X segundos/minutos
// setInterval(() => refreshProgress(), 30000);
```

### WebSocket para notificaciones en tiempo real
```javascript
// Conectar con WebSocket para notificaciones de LEVEL_UP
// cuando otro usuario complete un curso
```

---

## Ejemplo Completo en React

```javascript
import React, { useState, useEffect } from 'react';

export function CourseLearning({ courseId, token }) {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(false);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener lecciones
        const lessonsRes = await fetch(`/api/v1/courses/${courseId}/lessons/`, { headers });
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData);

        // Obtener progreso
        const progressRes = await fetch(`/api/v1/enrollments/1/progress/`, { headers });
        const progressData = await progressRes.json();
        setProgress(progressData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const handleCompleteLesson = async (lessonId, score) => {
    try {
      const response = await fetch(`/api/v1/lessons/${lessonId}/complete/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ score })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Actualizar progreso
        const updatedProgress = await fetch(`/api/v1/enrollments/1/progress/`, { headers });
        setProgress(await updatedProgress.json());

        alert(`¡Excelente! Score: ${result.score}% +${result.xp_earned} XP`);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Curso: {progress?.course.name}</h1>
      <p>Progreso: {progress?.completion_percentage.toFixed(1)}%</p>
      <p>XP: {progress?.total_xp_earned}</p>

      <div>
        <h2>Lecciones</h2>
        {lessons.map(lesson => (
          <div key={lesson.id}>
            <h3>{lesson.title}</h3>
            <p>Tipo: {lesson.content_type}</p>
            
            <button
              onClick={() => setCurrentLesson(lesson)}
              disabled={!lesson.is_unlocked}
            >
              {lesson.is_locked ? 'Bloqueada' : 'Acceder'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## URLs Base

```
Desarrollo:    http://localhost:8000/api/v1/
Producción:    https://tudominio.com/api/v1/
```
