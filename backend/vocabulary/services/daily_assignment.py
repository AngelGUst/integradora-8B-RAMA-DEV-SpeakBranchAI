# vocabulary/services/daily_assignment.py
import logging
from datetime import timedelta

from django.db.models import F, Min
from django.utils import timezone

from vocabulary.models import Vocabulary, DailyVocabulary

logger = logging.getLogger('speakbranch.vocabulary')


class VocabularyAssignmentError(Exception):
    """
    Raised when the daily vocabulary assignment process fails unexpectedly.
    Callers should catch this to return a 500 response to the client.
    """
    pass


# ---------------------------------------------------------------------------
# Step 2 helper
# ---------------------------------------------------------------------------

def get_recent_question_ids(user, days=2):
    """
    Queries all 4 attempt tables (READ ONLY) and returns a deduplicated list
    of question_ids from the last `days` days for the given user.

    External dependencies (attempts app):
        SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt

    Returns an empty list if the attempts app is not yet available, so the
    caller can fall back to random word assignment without crashing.
    """
    try:
        from attempts.models import (
            SpeakingAttempt,
            ReadingAttempt,
            ListeningAttempt,
            WritingAttempt,
        )
    except ImportError:
        logger.warning(
            'attempts app not available — skipping contextual vocabulary lookup. '
            'Falling back to random words by level.'
        )
        return []

    since = timezone.now().date() - timedelta(days=days)
    question_ids = set()

    for Model in (SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt):
        ids = (
            Model.objects
            .filter(user=user, created_at__date__gte=since)
            .values_list('question_id', flat=True)
        )
        question_ids.update(ids)

    return list(question_ids)


# ---------------------------------------------------------------------------
# Step 3 helpers
# ---------------------------------------------------------------------------

def _build_score_map(user, question_ids, since):
    """
    Internal helper. Builds {question_id: min_score} across all 4 attempt
    tables for the given user and question ids.

    Used by get_contextual_vocabulary to order words by worst performance.
    Returns an empty dict if the attempts app is unavailable.
    """
    try:
        from attempts.models import (
            SpeakingAttempt,
            ReadingAttempt,
            ListeningAttempt,
            WritingAttempt,
        )
    except ImportError:
        return {}

    score_map = {}

    for Model in (SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt):
        rows = (
            Model.objects
            .filter(user=user, question_id__in=question_ids, created_at__date__gte=since)
            .values('question_id')
            .annotate(min_score=Min('score'))
        )
        for row in rows:
            qid = row['question_id']
            min_s = row['min_score']
            if min_s is not None:
                if qid not in score_map or min_s < score_map[qid]:
                    score_map[qid] = min_s

    return score_map


def get_contextual_vocabulary(user, question_ids, date):
    """
    Queries QuestionVocabulary (READ ONLY) for Vocabulary words linked to
    the given question_ids.

    - Excludes words already assigned to the user on the given date.
    - Only considers words where daily_flag=True.
    - Orders by worst attempt score ascending (student reviews what they
      struggled with most).
    - Deduplicates when a word appears in multiple questions.

    External dependency: questions.models.QuestionVocabulary.
    Returns an empty list if QuestionVocabulary is unavailable, so assign_daily_vocabulary
    can continue with the random-fill step.
    """
    if not question_ids:
        return []

    try:
        from questions.models import QuestionVocabulary
    except ImportError:
        logger.warning(
            'questions app not available — skipping contextual vocabulary lookup.'
        )
        return []

    since = timezone.now().date() - timedelta(days=2)
    score_map = _build_score_map(user, question_ids, since)

    already_today = set(
        DailyVocabulary.objects
        .filter(user=user, date_assigned=date)
        .values_list('vocabulary_id', flat=True)
    )

    qv_items = (
        QuestionVocabulary.objects
        .filter(question_id__in=question_ids, vocabulary__daily_flag=True)
        .select_related('vocabulary')
        .exclude(vocabulary_id__in=already_today)
    )

    # Sort by worst score ascending in Python — scores span multiple tables
    # so a single DB ORDER BY is not feasible without raw SQL.
    sorted_items = sorted(
        qv_items,
        key=lambda qv: score_map.get(qv.question_id, float('inf'))
    )

    # Deduplicate by vocabulary_id; first occurrence has the worst-score question.
    seen_vocab_ids = set()
    result = []
    for qv in sorted_items:
        if qv.vocabulary_id not in seen_vocab_ids:
            seen_vocab_ids.add(qv.vocabulary_id)
            result.append(qv.vocabulary)
            if len(result) == 5:
                break

    return result


# ---------------------------------------------------------------------------
# Step 4 helper
# ---------------------------------------------------------------------------

def fill_with_random_vocabulary(user, already_selected, limit):
    """
    Fills remaining daily vocabulary slots with random Vocabulary words
    matching the user's current level from UserProgress (user.progress.level).

    Falls back to user.level if UserProgress does not exist yet.
    This is the only step that always executes regardless of whether the
    attempts or questions apps are available.

    Args:
        user:             the authenticated User instance.
        already_selected: iterable of Vocabulary ids to exclude.
        limit:            how many words to return at most.

    Returns:
        QuerySet of Vocabulary objects (up to `limit` items), ordered randomly.
    """
    if limit <= 0:
        return Vocabulary.objects.none()

    try:
        level = user.progress.level  # UserProgress related_name = 'progress'
    except Exception:
        level = getattr(user, 'level', 'A1')
        logger.warning(
            'UserProgress not available for user %s — using level=%s as fallback.',
            user.id,
            level,
        )

    return (
        Vocabulary.objects
        .filter(level=level, daily_flag=True)
        .exclude(id__in=list(already_selected))
        .order_by('?')[:limit]
    )


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def assign_daily_vocabulary(user, date):
    """
    Main orchestrator for the daily vocabulary assignment.

    Follows 5 steps:
      1. Idempotency — return existing words if already assigned for this date.
      2. Collect question_ids from recent exercise attempts (last 2 days).
      3. Find Vocabulary linked to those questions, ordered by worst attempt score.
      4. Fill remaining slots (up to 5 total) with random words from the user's level.
      5. Bulk-create DailyVocabulary records; return the list of 5 objects.

    All cross-app imports are wrapped in try/except ImportError so this function
    degrades gracefully when the attempts or questions apps are not yet migrated
    during parallel development. In that case it falls back to Step 4 only.

    Args:
        user: the authenticated User instance.
        date: datetime.date for which to assign words (usually today).

    Returns:
        list of DailyVocabulary objects (up to 5) for the given date.

    Raises:
        VocabularyAssignmentError: if no words are available at all, or if an
        unexpected error occurs during the process.
    """
    try:
        # ------------------------------------------------------------------
        # Step 1 — Idempotency
        # ------------------------------------------------------------------
        existing_qs = (
            DailyVocabulary.objects
            .filter(user=user, date_assigned=date)
            .select_related('vocabulary')
        )
        if existing_qs.count() >= 5:
            logger.debug(
                'Daily vocabulary already assigned for user %s on %s — returning existing.',
                user.id, date,
            )
            return list(existing_qs)

        # ------------------------------------------------------------------
        # Step 2 — Recent question ids
        # ------------------------------------------------------------------
        question_ids = get_recent_question_ids(user, days=2)
        logger.debug('Found %d recent question ids for user %s.', len(question_ids), user.id)

        # ------------------------------------------------------------------
        # Step 3 — Contextual vocabulary (worst score first)
        # ------------------------------------------------------------------
        contextual_words = get_contextual_vocabulary(user, question_ids, date)
        logger.debug(
            'Found %d contextual words for user %s.', len(contextual_words), user.id
        )

        selected_ids = {v.id for v in contextual_words}

        # ------------------------------------------------------------------
        # Step 4 — Fill remaining slots with random words by level
        # ------------------------------------------------------------------
        remaining = 5 - len(selected_ids)
        random_words = list(fill_with_random_vocabulary(user, selected_ids, remaining))
        logger.debug(
            'Filled %d random words for user %s.', len(random_words), user.id
        )

        all_words = contextual_words + random_words

        if not all_words:
            raise VocabularyAssignmentError(
                f'No vocabulary words available for user {user.id} on {date}. '
                "Ensure Vocabulary entries with daily_flag=True exist for the user's level."
            )

        # ------------------------------------------------------------------
        # Step 5 — Bulk create, skip already-assigned
        # ------------------------------------------------------------------
        already_assigned_ids = set(
            DailyVocabulary.objects
            .filter(user=user, date_assigned=date)
            .values_list('vocabulary_id', flat=True)
        )

        new_assignments = [
            DailyVocabulary(
                vocabulary=vocab,
                user=user,
                date_assigned=date,
                mastery_level=0,
            )
            for vocab in all_words
            if vocab.id not in already_assigned_ids
        ]

        if new_assignments:
            DailyVocabulary.objects.bulk_create(new_assignments, ignore_conflicts=True)
            Vocabulary.objects.filter(
                id__in=[dv.vocabulary_id for dv in new_assignments]
            ).update(times_used=F('times_used') + 1)

        result = list(
            DailyVocabulary.objects
            .filter(user=user, date_assigned=date)
            .select_related('vocabulary')
        )
        logger.debug(
            'Assigned %d daily vocabulary words for user %s on %s.',
            len(result), user.id, date,
        )
        return result

    except VocabularyAssignmentError:
        raise
    except Exception as exc:
        logger.exception(
            'Unexpected error during daily vocabulary assignment for user %s on %s.',
            user.id, date,
        )
        raise VocabularyAssignmentError(str(exc)) from exc
