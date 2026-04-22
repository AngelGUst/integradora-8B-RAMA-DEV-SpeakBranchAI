# SpeakBranchAI

> Plataforma de aprendizaje de inglés impulsada por inteligencia artificial. Practica **speaking**, **listening**, **reading** y **writing** mediante ejercicios adaptativos, evaluación automatizada con Whisper y OpenAI, y un panel de administración completo.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-6-092E20?style=flat-square&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)

---

## Tecnologías

### Backend

| Herramienta | Descripción |
|---|---|
| **Python 3.11+** / **Django 6** / **Django REST Framework** | Core del servidor |
| **SimpleJWT** | Autenticación con tokens JWT |
| **OpenAI API** | Evaluación de escritura y retroalimentación |
| **Faster-Whisper** | Transcripción de audio para speaking |
| **gTTS** | Generación de audios |
| **PostgreSQL** | Base de datos (configurable) |
| **Gunicorn** | Servidor WSGI para producción |
| **drf-spectacular** | Documentación OpenAPI / Swagger |

### Frontend

| Herramienta | Descripción |
|---|---|
| **React 19** + **TypeScript** + **Vite** | Stack principal |
| **Tailwind CSS 4** | Estilos utilitarios |
| **React Router 7** | Navegación |
| **React Hook Form** + **Zod** | Formularios y validación |
| **Recharts** | Gráficas del dashboard |
| **Framer Motion** | Animaciones |
| **Google OAuth** (`@react-oauth/google`) | Autenticación con Google |

---

## Estructura del proyecto
 
```
integradora-8B-RAMA-DEV-SpeakBranchAI/
│
├── backend/                    # Código del servidor (Django / DRF)
│   ├── backend/                # Configuración principal (settings.py, urls.py)
│   ├── attempts/               # Registrar y gestionar intentos de usuario
│   ├── courses/                # Creación y gestión de cursos y lecciones
│   ├── dashboard/              # Lógica y API para el panel de administración
│   ├── exams/                  # Crear, gestionar y calificar exámenes
│   ├── questions/              # Administrar preguntas y respuestas
│   ├── system_config/          # Variables de configuración del sistema
│   ├── users/                  # Autenticación (Google OAuth), registro y perfiles
│   ├── vocabulary/             # Aprendizaje de vocabulario
│   ├── .env                    # Variables de entorno y conexión a BD
│   ├── manage.py               # CLI principal de Django
│   └── requirements.txt        # Dependencias del servidor (Python / Django)
│
├── frontend/                   # Interfaz de usuario (React + Vite + TypeScript)
│   ├── public/                 # Archivos estáticos accesibles directamente
│   ├── src/
│   │   ├── assets/             # Imágenes, iconos y tipografías
│   │   ├── components/         # Componentes UI reutilizables (botones, modales, etc.)
│   │   ├── features/           # Carpetas agrupadas por dominio (auth, perfil, etc.)
│   │   ├── hooks/              # Hooks personalizados de React
│   │   ├── pages/              # Vistas y pantallas principales
│   │   ├── router/             # Configuración de react-router-dom
│   │   ├── services/           # Conexión a la API del backend (Axios)
│   │   ├── shared/             # Helpers, configuración global y componentes base
│   │   └── types/              # Declaraciones de tipos TypeScript
│   ├── package.json            # Dependencias npm y configuración del proyecto
│   ├── tsconfig.json           # Configuración del compilador TypeScript
│   ├── vercel.json             # Configuración para despliegue en Vercel
│   └── vite.config.ts          # Configuración del empaquetador Vite
│
├── logs/                       # Archivos de depuración y registro del sistema
└── README.md                   # Documentación introductoria del proyecto
```
 
---

## Requisitos previos

- Python 3.11+
- Node.js 18+
- MySQL o PostgreSQL
- Cuenta de OpenAI con API key activa

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/integradora-8B-RAMA-DEV-SpeakBranchAI.git
cd integradora-8B-RAMA-DEV-SpeakBranchAI
```

### 2. Configurar el backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales de base de datos y API keys
# Ejemplo de .env
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=...
SUPABASE_HOST=...
SUPABASE_PORT=...
DB_CONN_MAX_AGE=...
DB_CONNECT_TIMEOUT=...
DB_SSLMODE=...
DB_DISABLE_SERVER_SIDE_CURSORS=...

SECRET_KEY=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

OPENAI_API_KEY=...

FRONTEND_URL=...

EMAIL_BACKEND=...
EMAIL_HOST=...
EMAIL_PORT=...
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
DEFAULT_FROM_EMAIL=...
```

### 4. Migraciones y servidor Django

```bash
python manage.py migrate
python manage.py runserver
```

### 5. Configurar el frontend

```bash
cd ../frontend
npm install
npm run dev

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.56.1:5173/
➜  Network: http://192.168.110.250:5173/
```

---

## Documentación de la API

Una vez levantado el servidor, la documentación Swagger estará disponible en:

```
http://localhost:8000/api/schema/swagger-ui/
```
