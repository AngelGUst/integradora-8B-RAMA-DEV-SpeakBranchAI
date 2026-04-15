from django.db import migrations


TARGET_THRESHOLDS = {
    'A1': 200,  # target A2
    'A2': 310,  # target B1
    'B1': 450,  # target B2
}


def apply_thresholds(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')

    for level, xp in TARGET_THRESHOLDS.items():
        Exam.objects.filter(type='LEVEL_UP', level=level).update(xp_required=xp, is_active=True)

    Exam.objects.filter(type='LEVEL_UP', level__in=['B2', 'C1', 'C2']).update(is_active=False)


def revert_thresholds(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')

    # Reversión al esquema previo inmediato.
    Exam.objects.filter(type='LEVEL_UP', level='A1').update(xp_required=100, is_active=True)
    Exam.objects.filter(type='LEVEL_UP', level='A2').update(xp_required=200, is_active=True)
    Exam.objects.filter(type='LEVEL_UP', level='B1').update(xp_required=310, is_active=True)
    Exam.objects.filter(type='LEVEL_UP', level='B2').update(xp_required=450, is_active=True)
    Exam.objects.filter(type='LEVEL_UP', level='C1').update(is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0004_update_level_up_scale_a1_b2'),
    ]

    operations = [
        migrations.RunPython(apply_thresholds, revert_thresholds),
    ]
