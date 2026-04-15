from django.db import migrations


NEW_SCALE = {
    'A1': 100,
    'A2': 200,
    'B1': 310,
    'B2': 450,
}


OLD_SCALE = {
    'A1': 200,
    'A2': 500,
    'B1': 310,
    'B2': 2000,
    'C1': 4000,
}


def apply_new_scale(apps, schema_editor):
    SystemConfig = apps.get_model('system_config', 'SystemConfig')
    cfg, _ = SystemConfig.objects.get_or_create(pk=1)

    cfg.level_xp_requirements = dict(NEW_SCALE)
    cfg.save(update_fields=['level_xp_requirements'])


def revert_old_scale(apps, schema_editor):
    SystemConfig = apps.get_model('system_config', 'SystemConfig')
    cfg, _ = SystemConfig.objects.get_or_create(pk=1)

    cfg.level_xp_requirements = dict(OLD_SCALE)
    cfg.save(update_fields=['level_xp_requirements'])


class Migration(migrations.Migration):

    dependencies = [
        ('system_config', '0004_set_b1_override_to_310'),
    ]

    operations = [
        migrations.RunPython(apply_new_scale, revert_old_scale),
    ]
