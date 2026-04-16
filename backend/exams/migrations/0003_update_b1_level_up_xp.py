"""
Data migration: set B1 LEVEL_UP required XP to 310
"""
from django.db import migrations


def set_b1_xp_to_310(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')
    Exam.objects.filter(level='B1', type='LEVEL_UP').update(xp_required=310)


def revert_b1_xp_to_1000(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')
    Exam.objects.filter(level='B1', type='LEVEL_UP').update(xp_required=1000)


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0002_create_level_exams'),
    ]

    operations = [
        migrations.RunPython(set_b1_xp_to_310, revert_b1_xp_to_1000),
    ]
