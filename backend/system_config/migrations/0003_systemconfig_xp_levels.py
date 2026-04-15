from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('system_config', '0002_rename_registered_enable_systemconfig_registration_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemconfig',
            name='xp_level_a1',
            field=models.IntegerField(default=200),
        ),
        migrations.AddField(
            model_name='systemconfig',
            name='xp_level_a2',
            field=models.IntegerField(default=500),
        ),
        migrations.AddField(
            model_name='systemconfig',
            name='xp_level_b1',
            field=models.IntegerField(default=1000),
        ),
        migrations.AddField(
            model_name='systemconfig',
            name='xp_level_b2',
            field=models.IntegerField(default=2000),
        ),
    ]
