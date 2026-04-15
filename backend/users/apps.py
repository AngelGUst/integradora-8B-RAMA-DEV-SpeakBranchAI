# users/apps.py
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    verbose_name = 'Usuarios'

    def ready(self):
        # Registers the post_save signal that auto-creates UserProgress
        import users.signals  # noqa: F401