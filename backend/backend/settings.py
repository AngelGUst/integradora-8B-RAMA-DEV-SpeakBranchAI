"""
Django settings for backend project.
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

from backend.db_settings import get_database_config

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-local-secret-key')

DEBUG = True

ALLOWED_HOSTS = ['*']


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # Required for logout blacklisting
    'corsheaders',
    'drf_spectacular',                           # OpenAPI 3.0 schema + Swagger UI

    # Local apps
    'users.apps.UsersConfig',
    'questions.apps.QuestionsConfig',
    'attempts.apps.AttemptsConfig',
    'exams.apps.ExamsConfig',
    'vocabulary.apps.VocabularyConfig',
    'courses.apps.CoursesConfig',
    'django_extensions',
    'system_config.apps.SystemConfigConfig',
    'dashboard.apps.DashboardConfig',
]

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',            # Must be first — before CommonMiddleware
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'backend.middleware.CurrentUserMiddleware',         # Capturar usuario para auditoría
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTH_USER_MODEL = 'users.User'

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# ---------------------------------------------------------------------------
# Database — Supabase / PostgreSQL
# ---------------------------------------------------------------------------

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('SUPABASE_DB_NAME'),
        'USER': os.getenv('SUPABASE_DB_USER'),
        'PASSWORD': os.getenv('SUPABASE_DB_PASSWORD'),
        'HOST': os.getenv('SUPABASE_HOST'),
        'PORT': os.getenv('SUPABASE_PORT'),
    }
}


# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        # All endpoints require a valid JWT by default.
        # Override per-view with permission_classes = [AllowAny] where needed.
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}


# ---------------------------------------------------------------------------
# drf-spectacular (Swagger / ReDoc)
# ---------------------------------------------------------------------------

SPECTACULAR_SETTINGS = {
    'TITLE': 'SpeakBranch AI API',
    'DESCRIPTION': 'Backend API for the SpeakBranch English Learning Platform.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,  # Hide the raw schema endpoint from the docs UI
    'COMPONENT_SPLIT_REQUEST': True,
    # Tell Swagger UI to send JWT via the Authorize button
    'SECURITY': [{'BearerAuth': []}],
    'SWAGGER_UI_SETTINGS': {
        'persistAuthorization': True,   # Keeps the token after page refresh
        'displayRequestDuration': True,
    },
}


# ---------------------------------------------------------------------------
# SimpleJWT
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',    # React / Next.js dev server
    'http://localhost:5173',    # Vite dev server
    'http://192.168.0.179:5173',
]

# Allow credentials (cookies / Authorization header) on cross-origin requests
CORS_ALLOW_CREDENTIALS = True


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

# Use the console backend during development so emails are printed to stdout.
# Switch to smtp in production by setting EMAIL_BACKEND in .env.
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@speakbranch.ai')

# Base URL used to build links inside emails (email confirmation, password reset)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
# Must match the redirect URI registered in Google Cloud Console
GOOGLE_REDIRECT_URI = os.getenv(
    'GOOGLE_REDIRECT_URI',
    'http://localhost:8000/api/auth/google/callback/',
)


# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
SQL_DEBUG = os.getenv('SQL_DEBUG', '').lower() in {'1', 'true', 'yes'}
DB_LOG_LEVEL = 'DEBUG' if SQL_DEBUG else 'WARNING'

ROTATING_HANDLER = 'logging.handlers.RotatingFileHandler'

LOGS_DIR = BASE_DIR.parent / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {name} {funcName}:{lineno} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '{levelname} {asctime} {name} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
            'level': LOG_LEVEL,
        },
        'file': {
            'class': ROTATING_HANDLER,
            'filename': LOGS_DIR / 'debug.log',
            'formatter': 'verbose',
            'level': LOG_LEVEL,
            'maxBytes': 1024 * 1024 * 5,
            'backupCount': 3,
        },
        'file_django': {
            'class': ROTATING_HANDLER,
            'filename': LOGS_DIR / 'django.log',
            'formatter': 'verbose',
            'level': 'INFO',
            'maxBytes': 1024 * 1024 * 5,
            'backupCount': 3,
        },
        'file_db': {
            'class': ROTATING_HANDLER,
            'filename': LOGS_DIR / 'database.log',
            'formatter': 'verbose',
            'level': DB_LOG_LEVEL,
            'maxBytes': 1024 * 1024 * 5,
            'backupCount': 3,
        },
        'file_errors': {
            'class': ROTATING_HANDLER,
            'filename': LOGS_DIR / 'errors.log',
            'formatter': 'verbose',
            'level': 'ERROR',
            'maxBytes': 1024 * 1024 * 5,
            'backupCount': 3,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file_django'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['file_db'],
            'level': DB_LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch.users': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch.attempts': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch.exams': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch.questions': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch.courses': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch.vocabulary': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'speakbranch.external_api': {
            'handlers': ['console', 'file', 'file_errors'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}