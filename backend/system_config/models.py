from django.db import models

# Create your models here.
class SystemConfig(models.Model):
    #Motor adaptativo
    adaptive_threshold_up = models.FloatField(default=16.0)
    adaptive_threshold_down = models.FloatField(default=10.0)
    level_xp_requirements = models.JSONField(
        default=dict,
        blank=True,
        help_text='XP requerido por nivel para habilitar examen de subida. Ej: {"A1": 200, "A2": 500}'
    )

    registration_enabled = models.BooleanField(default=True)

    # XP requerido para superar cada nivel CEFR (A1–B2)
    xp_level_a1 = models.IntegerField(default=200)
    xp_level_a2 = models.IntegerField(default=500)
    xp_level_b1 = models.IntegerField(default=1000)
    xp_level_b2 = models.IntegerField(default=2000)

    class Meta:
        db_table = 'system_config'
        verbose_name = 'Configuración del Sistema'

    def save(self, *args, **kwargs):
        self.pk = 1  # Asegura que solo haya una instancia
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
    
