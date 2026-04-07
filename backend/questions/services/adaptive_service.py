from typing import Iterable, List, Optional, Set

from questions.models import Question

DIFFICULTY_ORDER = ['EASY', 'MEDIUM', 'HARD']


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
    for Model in (SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt):
        ids = Model.objects.filter(user=user).values_list('question_id', flat=True)
        attempted.update(ids)
    return attempted


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
