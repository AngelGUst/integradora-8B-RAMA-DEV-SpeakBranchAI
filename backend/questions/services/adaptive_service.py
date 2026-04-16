from math import ceil
from typing import Iterable, List, Optional, Set

from questions.models import Question

DIFFICULTY_ORDER = ['EASY', 'MEDIUM', 'HARD']
EXERCISE_TYPES = [
    'READING',
    'SPEAKING',
    'LISTENING_SHADOWING',
    'LISTENING_COMPREHENSION',
    'WRITING',
]


def _adjust_difficulty(current: Optional[str], last_score: Optional[float]) -> str:
    if current in DIFFICULTY_ORDER and last_score is not None:
        idx = DIFFICULTY_ORDER.index(current)
        if last_score >= 80:
            idx = min(idx + 1, len(DIFFICULTY_ORDER) - 1)
        elif last_score <= 50:
            idx = max(idx - 1, 0)
        return DIFFICULTY_ORDER[idx]

    if last_score is None:
        return 'MEDIUM'
    if last_score >= 80:
        return 'HARD'
    if last_score <= 50:
        return 'EASY'
    return 'MEDIUM'


def _get_attempted_question_ids(user) -> Set[int]:
    try:
        from attempts.models import (
            SpeakingAttempt,
            ReadingAttempt,
            ListeningAttempt,
            WritingAttempt,
        )
    except Exception:
        return set()

    attempted = set()
    for model in (SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt):
        ids = model.objects.filter(user=user).values_list('question_id', flat=True)
        attempted.update(ids)
    return attempted


def _recent_attempt_type_counts(user, level: str) -> dict:
    """
    Count recent attempts by question type for balancing.
    Lower count => higher priority in next sessions.
    """
    counts = dict.fromkeys(EXERCISE_TYPES, 0)

    try:
        from attempts.models import (
            SpeakingAttempt,
            ReadingAttempt,
            ListeningAttempt,
            WritingAttempt,
        )
    except Exception:
        return counts

    for row in ReadingAttempt.objects.filter(user=user, question__level=level).values_list('question__type', flat=True):
        if row in counts:
            counts[row] += 1
    for row in SpeakingAttempt.objects.filter(user=user, question__level=level).values_list('question__type', flat=True):
        if row in counts:
            counts[row] += 1
    for row in ListeningAttempt.objects.filter(user=user, question__level=level).values_list('question__type', flat=True):
        if row in counts:
            counts[row] += 1
    for row in WritingAttempt.objects.filter(user=user, question__level=level).values_list('question__type', flat=True):
        if row in counts:
            counts[row] += 1

    return counts


def get_next_adaptive_question(
    user,
    level: str,
    q_type: Optional[str],
    last_score: Optional[float],
    current_difficulty: Optional[str],
    exclude_ids: Iterable[int],
    category: Optional[str],
) -> Optional[Question]:
    desired = _adjust_difficulty(current_difficulty, last_score)

    base_qs = Question.objects.filter(is_active=True, level=level)
    if q_type:
        base_qs = base_qs.filter(type=q_type)

    if category:
        base_qs = base_qs.filter(category=category)
    else:
        base_qs = base_qs.exclude(category=Question.Category.DIAGNOSTIC)

    attempted = _get_attempted_question_ids(user)
    exclude = set(exclude_ids) | attempted

    def first_available(difficulty: str) -> Optional[Question]:
        qs = base_qs.filter(difficulty=difficulty).exclude(id__in=exclude)
        return qs.order_by('?').first()

    # primary difficulty
    question = first_available(desired)
    if question:
        return question

    # fallback order based on desired difficulty
    if desired == 'HARD':
        fallback = ['MEDIUM', 'EASY']
    elif desired == 'EASY':
        fallback = ['MEDIUM', 'HARD']
    else:
        fallback = ['EASY', 'HARD']

    for diff in fallback:
        question = first_available(diff)
        if question:
            return question

    return None


def _dynamic_question_count(remaining_xp: int) -> int:
    """
    Define tamaño de sesión dinámico.

    - Si falta mucho XP, la sesión crece.
    - Si falta poco XP, la sesión se mantiene moderada.
    """
    if remaining_xp <= 0:
        return 5

    # Objetivo por sesión: ~35% del XP restante, acotado
    target_session_xp = min(240, max(60, ceil(remaining_xp * 0.35)))
    # XP promedio por ejercicio ~20
    count = ceil(target_session_xp / 20)
    return max(3, min(15, count))


def _difficulty_from_user_progress(user) -> str:
    """Dificultad base recomendada por el progreso actual del usuario."""
    try:
        progress = user.progress
    except Exception:
        return 'MEDIUM'

    values = [
        progress.average_speaking,
        progress.average_reading,
        progress.average_listening,
        progress.average_writing,
    ]
    valid = [v for v in values if v > 0]
    if not valid:
        return 'MEDIUM'

    avg = sum(valid) / len(valid)
    return progress.get_recommended_difficulty(avg)


def _distribution_for_desired(desired: str):
    """Distribución de preguntas por dificultad para la sesión."""
    if desired == 'HARD':
        return [('HARD', 0.6), ('MEDIUM', 0.3), ('EASY', 0.1)]
    if desired == 'EASY':
        return [('EASY', 0.6), ('MEDIUM', 0.3), ('HARD', 0.1)]
    return [('MEDIUM', 0.5), ('EASY', 0.25), ('HARD', 0.25)]


def _pick_by_difficulty(qs, count: int, distribution, selected_ids: Set[int]) -> List[Question]:
    picked: List[Question] = []

    for diff, ratio in distribution:
        target = max(0, int(round(count * ratio)))
        if target == 0:
            continue

        chunk = list(
            qs.filter(difficulty=diff)
            .exclude(id__in=selected_ids)
            .order_by('?')[:target]
        )
        picked.extend(chunk)
        selected_ids.update(q.id for q in chunk)

    if len(picked) < count:
        fallback = list(
            qs.exclude(id__in=selected_ids)
            .order_by('?')[:(count - len(picked))]
        )
        picked.extend(fallback)
        selected_ids.update(q.id for q in fallback)

    return picked[:count]


def _balance_type_targets(ordered_types: List[str], final_count: int) -> dict:
    """
    Distribute question count across types, prioritizing less-practiced types.
    Returns dict mapping type -> target count.
    """
    targets = dict.fromkeys(ordered_types, 0)
    
    # Give one slot to each available type first
    remaining = final_count
    for t in ordered_types:
        if remaining <= 0:
            break
        targets[t] += 1
        remaining -= 1
    
    # Round-robin remaining slots prioritizing less-practiced types
    idx = 0
    while remaining > 0 and ordered_types:
        t = ordered_types[idx % len(ordered_types)]
        targets[t] += 1
        remaining -= 1
        idx += 1
    
    return targets


def get_adaptive_session_questions(
    user,
    level: str,
    q_type: Optional[str],
    category: Optional[str],
    limit: Optional[int] = None,
    force_dynamic: bool = True,
) -> List[Question]:
    """
    Retorna una sesión de ejercicios adaptativa, aleatoria y de tamaño variable.
    """
    from system_config.services import LevelProgressionService

    level_progress = LevelProgressionService.get_user_level_progress(user)
    remaining_xp = int(level_progress.get('remaining_xp', 0) or 0)

    if force_dynamic or not limit:
        final_count = _dynamic_question_count(remaining_xp)
    else:
        final_count = max(1, min(30, int(limit)))

    base_qs = Question.objects.filter(is_active=True, level=level)
    if q_type:
        base_qs = base_qs.filter(type=q_type)

    if category:
        base_qs = base_qs.filter(category=category)
    else:
        base_qs = base_qs.exclude(category=Question.Category.DIAGNOSTIC)

    attempted = _get_attempted_question_ids(user)
    base_qs = base_qs.exclude(id__in=attempted)

    desired = _difficulty_from_user_progress(user)
    distribution = _distribution_for_desired(desired)

    selected = []
    selected_ids = set()

    # If type explicitly requested, keep old behavior but with better difficulty pick helper.
    if q_type:
        return _pick_by_difficulty(base_qs, final_count, distribution, selected_ids)

    # Balance types by user history (under-practiced types first)
    available_types = list(base_qs.values_list('type', flat=True).distinct())
    if not available_types:
        return []

    type_counts = _recent_attempt_type_counts(user, level)
    ordered_types = sorted(available_types, key=lambda t: type_counts.get(t, 0))

    # Calculate target count per type using helper function
    targets = _balance_type_targets(ordered_types, final_count)

    # Pick questions within each type using difficulty distribution
    for t in ordered_types:
        target = targets.get(t, 0)
        if target <= 0:
            continue
        typed_qs = base_qs.filter(type=t)
        chunk = _pick_by_difficulty(typed_qs, target, distribution, selected_ids)
        selected.extend(chunk)

    # 4) Fill remaining with best available mix
    if len(selected) < final_count:
        fallback = list(
            base_qs.exclude(id__in=selected_ids)
            .order_by('?')[:(final_count - len(selected))]
        )
        selected.extend(fallback)
        selected_ids.update(q.id for q in fallback)

    return selected[:final_count]
