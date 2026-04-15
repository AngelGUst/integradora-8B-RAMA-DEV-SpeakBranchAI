from django.db import migrations


NEW_SCALE = {
    'A1': 100,
    'A2': 200,
    'B1': 310,
    'B2': 450,
}


def apply_exam_scale(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')

    for level, xp in NEW_SCALE.items():
        Exam.objects.filter(type='LEVEL_UP', level=level).update(xp_required=xp, is_active=True)

    # Desactivar exámenes de niveles fuera del marco activo.
    Exam.objects.filter(type='LEVEL_UP', level__in=['C1', 'C2']).update(is_active=False)


def revert_exam_scale(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')

    Exam.objects.filter(type='LEVEL_UP', level='A1').update(xp_required=200)
    Exam.objects.filter(type='LEVEL_UP', level='A2').update(xp_required=500)
    Exam.objects.filter(type='LEVEL_UP', level='B1').update(xp_required=310)
    Exam.objects.filter(type='LEVEL_UP', level='B2').update(xp_required=2000)

    Exam.objects.filter(type='LEVEL_UP', level='C1').update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0003_update_b1_level_up_xp'),
    ]

    operations = [
        migrations.RunPython(apply_exam_scale, revert_exam_scale),
    ]
