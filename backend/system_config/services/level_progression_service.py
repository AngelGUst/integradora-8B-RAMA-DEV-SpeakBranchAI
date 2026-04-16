from django.db.models import Sum

from system_config.models import SystemConfig


class LevelProgressionService:
    """Servicio central para reglas de progresión por nivel."""

    LEVEL_SEQUENCE = ['A1', 'A2', 'B1', 'B2']

    # Compatibilidad con umbrales históricos de migraciones de exámenes
    LEGACY_DEFAULT_REQUIREMENTS = {
        'A1': 100,
        'A2': 200,
        'B1': 310,
        'B2': 450,
    }

    @classmethod
    def get_next_level(cls, level):
        """Retorna el siguiente nivel CEFR o None si ya está al máximo."""
        try:
            idx = cls.LEVEL_SEQUENCE.index(level)
        except ValueError:
            return None

        if idx >= len(cls.LEVEL_SEQUENCE) - 1:
            return None

        return cls.LEVEL_SEQUENCE[idx + 1]

    @classmethod
    def get_base_requirements_from_exams(cls):
        """Obtiene XP requerido por nivel desde Exam (LEVEL_UP), creado por migraciones de exámenes."""
        from exams.models import Exam

        requirements = {}
        rows = Exam.objects.filter(type='LEVEL_UP', is_active=True).values('level', 'xp_required')
        for row in rows:
            level = row['level']
            if level in cls.LEVEL_SEQUENCE:
                requirements[level] = max(0, int(row['xp_required'] or 0))

        return requirements

    @classmethod
    def get_base_requirements_from_courses(cls):
        """Calcula XP requerido por nivel a partir de la tabla courses."""
        from courses.models import Course

        requirements = {}

        rows = (
            Course.objects
            .values('level')
            .annotate(total_xp=Sum('lessons__xp_value'))
        )

        for row in rows:
            level = row['level']
            total_xp = int(row['total_xp'] or 0)
            if level in cls.LEVEL_SEQUENCE:
                requirements[level] = max(0, total_xp)

        for level, legacy_value in cls.LEGACY_DEFAULT_REQUIREMENTS.items():
            requirements.setdefault(level, legacy_value)

        return requirements

    @staticmethod
    def _normalize_overrides(overrides):
        """Normaliza overrides manuales desde SystemConfig."""
        if not isinstance(overrides, dict):
            return {}

        normalized = {}
        for level, value in overrides.items():
            if not isinstance(level, str):
                continue
            level_key = level.upper().strip()
            if level_key not in LevelProgressionService.LEVEL_SEQUENCE:
                continue

            try:
                normalized[level_key] = max(0, int(value))
            except (TypeError, ValueError):
                continue

        return normalized

    @classmethod
    def _enforce_monotonic_requirements(cls, requirements):
        """Asegura que los umbrales no disminuyan entre niveles consecutivos."""
        monotonic = {}
        previous_threshold = 0

        for level in cls.LEVEL_SEQUENCE:
            raw_value = int(requirements.get(level, cls.LEGACY_DEFAULT_REQUIREMENTS.get(level, 0)) or 0)
            current_value = max(previous_threshold, raw_value)
            monotonic[level] = current_value
            previous_threshold = current_value

        return monotonic

    @classmethod
    def get_level_xp_requirements(cls):
        """Retorna mapa final de XP requerido por nivel."""
        cfg = SystemConfig.get()
        base_requirements = cls.get_base_requirements_from_exams()

        # Fallback a cursos si aún no existen exámenes seed/migrados
        if not base_requirements:
            base_requirements = cls.get_base_requirements_from_courses()

        # Compatibilidad total con defaults históricos
        for level, legacy in cls.LEGACY_DEFAULT_REQUIREMENTS.items():
            base_requirements.setdefault(level, legacy)

        overrides = cls._normalize_overrides(cfg.level_xp_requirements)

        base_requirements.update(overrides)
        return cls._enforce_monotonic_requirements(base_requirements)

    @classmethod
    def get_cumulative_level_ranges(cls):
        """
        Rangos acumulados para visualización en frontend.
        Devuelve: {"A1": [0, 100], "A2": [100, 200], ...}
        """
        requirements = cls.get_level_xp_requirements()
        ranges = {}

        previous_threshold = 0
        for level in cls.LEVEL_SEQUENCE:
            current_threshold = int(requirements.get(level, previous_threshold) or previous_threshold)
            ranges[level] = [previous_threshold, current_threshold]
            previous_threshold = current_threshold

        return ranges

    @classmethod
    def get_required_xp_for_level(cls, level):
        """XP acumulado requerido para alcanzar el nivel dado."""
        return cls.get_level_xp_requirements().get(level, 0)

    @classmethod
    def _sync_progress_with_user_level(cls, user, progress):
        """Asegura que el punto de partida sea el nivel actual del usuario."""
        update_fields = []

        if progress.level != user.level:
            progress.level = user.level
            progress.level_start_xp = progress.total_xp
            update_fields.extend(['level', 'level_start_xp'])

        if progress.level_start_xp > progress.total_xp:
            progress.level_start_xp = progress.total_xp
            if 'level_start_xp' not in update_fields:
                update_fields.append('level_start_xp')

        if update_fields:
            progress.save(update_fields=update_fields)

        return progress

    @classmethod
    def get_current_level_xp(cls, user, progress=None):
        """XP acumulado desde que el usuario inició su nivel actual."""
        from users.models import UserProgress

        if progress is None:
            progress, _ = UserProgress.objects.get_or_create(user=user)

        progress = cls._sync_progress_with_user_level(user, progress)
        return max(0, progress.total_xp - progress.level_start_xp)

    @classmethod
    def can_take_level_up_exam(cls, user, exam_level, progress=None):
        """Valida elegibilidad para presentar examen de subida."""
        from users.models import UserProgress

        if not user.diagnostic_completed:
            return False

        if progress is None:
            progress, _ = UserProgress.objects.get_or_create(user=user)

        progress = cls._sync_progress_with_user_level(user, progress)

        if progress.level != exam_level:
            return False

        next_level = cls.get_next_level(exam_level)
        if not next_level:
            return False

        required_xp = cls.get_required_xp_for_level(next_level)
        return progress.total_xp >= required_xp

    @classmethod
    def get_user_level_progress(cls, user, progress=None):
        """Resumen de progreso hacia el siguiente nivel."""
        from users.models import UserProgress

        if progress is None:
            progress, _ = UserProgress.objects.get_or_create(user=user)

        progress = cls._sync_progress_with_user_level(user, progress)

        current_level = progress.level
        next_level = cls.get_next_level(current_level)

        if not next_level:
            return {
                'current_level': current_level,
                'next_level': None,
                'required_xp': 0,
                'current_xp': progress.total_xp,
                'current_level_xp': 0,
                'remaining_xp': 0,
                'progress_percentage': 100.0,
                'diagnostic_completed': user.diagnostic_completed,
                'can_take_level_exam': False,
                'at_max_level': True,
            }

        required_xp = cls.get_required_xp_for_level(next_level)
        current_xp = progress.total_xp
        # Campo legacy mantenido para frontend: ahora representa XP total para la meta acumulada.
        current_level_xp = current_xp
        remaining_xp = max(0, required_xp - current_xp)
        progress_percentage = 100.0 if required_xp == 0 else min(100.0, (current_xp / required_xp) * 100)

        return {
            'current_level': current_level,
            'next_level': next_level,
            'required_xp': required_xp,
            'current_xp': current_xp,
            'current_level_xp': current_level_xp,
            'remaining_xp': remaining_xp,
            'progress_percentage': round(progress_percentage, 2),
            'diagnostic_completed': user.diagnostic_completed,
            'can_take_level_exam': user.diagnostic_completed and remaining_xp == 0,
            'at_max_level': False,
        }
