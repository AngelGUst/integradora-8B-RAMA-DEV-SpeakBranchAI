from django.db import models

# Create your models here.
class SystemConfig(models.Model):
    #Motor adaptativo
    adaptive_threshold_up = models.FloatField(default=16.0)
    adaptive_threshold_down = models.FloatField(default=10.0)

    registration_enabled = models.BooleanField(default=True)

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
    
