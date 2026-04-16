from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from backend.middleware import get_current_user

User = get_user_model()


def auto_set_audit_fields(sender, instance, **kwargs):

    current_user = get_current_user()
    
   
    if not current_user or not current_user.is_authenticated:
        return

    has_created_by = hasattr(instance, 'created_by')
    has_updated_by = hasattr(instance, 'updated_by')
    
    if not (has_created_by or has_updated_by):
        return

    if instance.pk is None:
        if has_created_by and not instance.created_by:
            instance.created_by = current_user
            print(f"✅ Auto-asignado created_by={current_user.email} en {sender.__name__}")
    else:
        if has_updated_by:
            instance.updated_by = current_user
            print(f"✅ Auto-asignado updated_by={current_user.email} en {sender.__name__}")


def register_audit_signals():

    from django.apps import apps
    

    for model in apps.get_models():
        if hasattr(model, 'created_by') or hasattr(model, 'updated_by'):
            pre_save.connect(
                auto_set_audit_fields,
                sender=model,
                dispatch_uid=f'audit_{model._meta.app_label}_{model._meta.model_name}'
            )
            print(f"🔗 Signal de auditoría registrado para {model._meta.app_label}.{model._meta.model_name}")
