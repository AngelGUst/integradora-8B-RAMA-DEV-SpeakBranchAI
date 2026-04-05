# Generated migration for QuestionVocabulary fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0002_update_category_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='questionvocabulary',
            name='is_key',
            field=models.BooleanField(default=False, help_text='Si es True, aparece primero en el vocabulario diario', verbose_name='palabra clave'),
        ),
        migrations.AddField(
            model_name='questionvocabulary',
            name='order',
            field=models.IntegerField(default=0, help_text='Mayor número = mayor importancia (para decidir qué palabras asignar diariamente)', verbose_name='orden de importancia'),
        ),
        migrations.AlterModelOptions(
            name='questionvocabulary',
            options={'ordering': ['-is_key', '-order'], 'verbose_name': 'Vocabulario de Pregunta', 'verbose_name_plural': 'Vocabulario de Preguntas'},
        ),
        migrations.AddIndex(
            model_name='questionvocabulary',
            index=models.Index(fields=['is_key', 'order'], name='question_v_is_key_order_idx'),
        ),
    ]
