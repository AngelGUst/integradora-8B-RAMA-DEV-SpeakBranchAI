from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='diagnostic_completed',
            field=models.BooleanField(default=False),
        ),
    ]
