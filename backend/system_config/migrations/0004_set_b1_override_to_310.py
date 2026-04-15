from django.db import migrations


def set_b1_override_to_310(apps, schema_editor):
    SystemConfig = apps.get_model('system_config', 'SystemConfig')

    cfg, _ = SystemConfig.objects.get_or_create(
        pk=1,
        defaults={
            'adaptive_threshold_up': 16.0,
            'adaptive_threshold_down': 10.0,
            'registration_enabled': True,
            'level_xp_requirements': {
                'A1': 200,
                'A2': 500,
                'B1': 310,
                'B2': 2000,
                'C1': 4000,
            },
        },
    )

    requirements = cfg.level_xp_requirements if isinstance(cfg.level_xp_requirements, dict) else {}

    normalized = {}
    for key, value in requirements.items():
        k = str(key).upper().strip()
        try:
            normalized[k] = int(value)
        except (TypeError, ValueError):
            continue

    if normalized.get('B1') != 310:
        normalized['B1'] = 310
        cfg.level_xp_requirements = normalized
        cfg.save(update_fields=['level_xp_requirements'])


def noop_reverse(apps, schema_editor):
    # No-op reverse to avoid restoring an incorrect legacy value.
    return


class Migration(migrations.Migration):

    dependencies = [
        ('system_config', '0003_systemconfig_level_xp_requirements'),
    ]

    operations = [
        migrations.RunPython(set_b1_override_to_310, noop_reverse),
    ]
