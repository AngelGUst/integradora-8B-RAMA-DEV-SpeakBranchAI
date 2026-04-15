from django.db import migrations, models


class Migration(migrations.Migration):
    """
    streak_freeze and skill_metrics were added directly to the database
    without a migration. This migration updates Django's state to match
    the existing schema without touching the DB (SeparateDatabaseAndState).
    """

    dependencies = [
        ('users', '0002_user_diagnostic_completed'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            # DB already has the columns — no ALTER TABLE needed
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='userprogress',
                    name='streak_freeze',
                    field=models.IntegerField(default=0),
                ),
                migrations.AddField(
                    model_name='userprogress',
                    name='skill_metrics',
                    field=models.JSONField(blank=True, default=dict),
                ),
            ],
        ),
    ]
