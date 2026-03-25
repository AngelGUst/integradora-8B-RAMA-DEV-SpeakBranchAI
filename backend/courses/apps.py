# courses/apps.py
from django.apps import AppConfig

class CoursesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'courses'
    verbose_name = 'Cursos y Lecciones'
    
    def ready(self):
        """Importar signals cuando la app está lista"""
        import courses.signals  # noqa: F401