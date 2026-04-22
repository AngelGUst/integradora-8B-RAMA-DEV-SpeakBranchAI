from django.db import migrations


class Migration(migrations.Migration):
    """
    Remove the legacy level_xp_requirements JSON field.
    SystemConfig.xp_level_a1/a2/b1/b2 are now the single source of truth
    for XP thresholds, read directly by LevelProgressionService.
    """

    dependencies = [
        ('system_config', '0006_merge_20260415_2302'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='systemconfig',
            name='level_xp_requirements',
        ),
    ]
