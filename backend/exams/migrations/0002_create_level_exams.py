"""
Data migration: Create level-up exams for each CEFR level
"""
from django.db import migrations


def create_level_up_exams(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')
    
    # XP thresholds for each level transition
    exams_data = [
        {
            'level': 'A1',
            'name': 'Examen de Nivel A1 → A2',
            'description': 'Demuestra que has dominado el nivel A1 para avanzar al nivel A2.',
            'xp_required': 200,
            'passing_score': 70,
            'time_limit_minutes': 30,
            'question_count': 10,
        },
        {
            'level': 'A2',
            'name': 'Examen de Nivel A2 → B1',
            'description': 'Demuestra que has dominado el nivel A2 para avanzar al nivel B1.',
            'xp_required': 500,
            'passing_score': 70,
            'time_limit_minutes': 40,
            'question_count': 15,
        },
        {
            'level': 'B1',
            'name': 'Examen de Nivel B1 → B2',
            'description': 'Demuestra que has dominado el nivel B1 para avanzar al nivel B2.',
            'xp_required': 1000,
            'passing_score': 70,
            'time_limit_minutes': 45,
            'question_count': 15,
        },
        {
            'level': 'B2',
            'name': 'Examen de Nivel B2 → C1',
            'description': 'Demuestra que has dominado el nivel B2 para avanzar al nivel C1.',
            'xp_required': 2000,
            'passing_score': 70,
            'time_limit_minutes': 50,
            'question_count': 20,
        },
        {
            'level': 'C1',
            'name': 'Examen de Nivel C1 → C2',
            'description': 'Demuestra que has dominado el nivel C1 para avanzar al nivel C2.',
            'xp_required': 4000,
            'passing_score': 70,
            'time_limit_minutes': 60,
            'question_count': 20,
        },
    ]
    
    for data in exams_data:
        Exam.objects.get_or_create(
            level=data['level'],
            type='LEVEL_UP',
            defaults={
                'name': data['name'],
                'description': data['description'],
                'xp_required': data['xp_required'],
                'passing_score': data['passing_score'],
                'time_limit_minutes': data['time_limit_minutes'],
                'question_count': data['question_count'],
                'is_active': True,
            }
        )


def reverse_create_exams(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')
    Exam.objects.filter(type='LEVEL_UP').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0002_alter_exam_description'),
    ]

    operations = [
        migrations.RunPython(create_level_up_exams, reverse_create_exams),
    ]
