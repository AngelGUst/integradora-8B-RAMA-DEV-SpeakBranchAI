"""
Verificar qué modelos están registrados en auditlog
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from auditlog.registry import auditlog
from system_config.models import SystemConfig

print("\n" + "="*70)
print("🔍 VERIFICANDO MODELOS REGISTRADOS EN AUDITLOG")
print("="*70)

# Ver todos los modelos registrados
registered = auditlog.get_models()
print(f"\n📋 Total de modelos registrados: {len(registered)}\n")

# Verificar si SystemConfig está registrado
is_registered = SystemConfig in registered
print(f"SystemConfig registrado: {'✅ SÍ' if is_registered else '❌ NO'}")

# Listar algunos modelos registrados
print("\n📝 Algunos modelos registrados:")
for i, model in enumerate(list(registered)[:15]):
    print(f"   {i+1}. {model._meta.app_label}.{model._meta.model_name}")

# Intentar registrar manualmente SystemConfig
if not is_registered:
    print("\n⚙️  Registrando SystemConfig manualmente...")
    auditlog.register(SystemConfig)
    print("   ✅ SystemConfig registrado")
    
    # Verificar nuevamente
    registered = auditlog.get_models()
    is_registered = SystemConfig in registered
    print(f"   Verificación: {'✅ SÍ' if is_registered else '❌ NO'}")

print("\n" + "="*70)
print()
