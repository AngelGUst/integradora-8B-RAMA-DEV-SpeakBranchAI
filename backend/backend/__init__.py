
def register_audit_signals():

    from backend.signals import register_audit_signals
    register_audit_signals()


# Registrar signals cuando Django esté listo
from django.apps import AppConfig


class BackendConfig(AppConfig):
    name = 'backend'
    
    def ready(self):
        # Registrar signals de auditoría
        register_audit_signals()


# Configurar la app por defecto
default_app_config = 'backend.BackendConfig'
