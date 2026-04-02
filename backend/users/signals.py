# users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_progress(sender, instance, created, **kwargs):
    """
    Automatically creates a UserProgress record the moment a new User is saved.

    Using settings.AUTH_USER_MODEL (string) instead of importing User directly
    avoids circular import issues at app startup.

    UserProgress is initialised with all-zero stats and the same CEFR level
    the user was assigned at registration (default A1).
    """
    if not created:
        return

    # Local import keeps the signal handler free of module-level circular deps
    from users.models import UserProgress

    UserProgress.objects.create(
        user=instance,
        level=instance.level,       # Inherit initial level from user (default A1)
        total_xp=0,
        streak_days=0,
        average_speaking=0.0,
        average_reading=0.0,
        average_listening=0.0,
        average_writing=0.0,
    )
