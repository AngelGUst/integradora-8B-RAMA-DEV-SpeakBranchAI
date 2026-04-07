import json
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

from questions.models import Question

LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

# Tuning knobs
MIN_ITEMS_PER_LEVEL = 2
LEVEL_PASS_THRESHOLD = 0.60  # 60%+ in a level to be considered passed


@dataclass
class DiagnosticResult:
    assigned_level: str
    overall_accuracy: float
    total_correct: int
    total_items: int
    by_level: Dict[str, Dict[str, float]]


def _normalize(value) -> str:
    return str(value).strip().lower()


def _parse_correct_answers(question: Question) -> List[str]:
    """Return a list of correct answers for a question.

    - READING & LISTENING_COMPREHENSION use JSON in correct_answer.
    - All other types use correct_answer as a single expected value.
    """
    if question.type in ('READING', 'LISTENING_COMPREHENSION'):
        try:
            data = json.loads(question.correct_answer or '{}')
        except (json.JSONDecodeError, TypeError):
            return []

        if isinstance(data, dict) and 'questions' in data:
            return [q.get('correct', '') for q in data.get('questions', [])]
        if isinstance(data, dict):
            return [data.get('correct', '')]
        return []

    return [question.correct_answer or '']


def _coerce_answers(value) -> List[str]:
    if isinstance(value, list):
        return [_normalize(v) for v in value]
    return [_normalize(value)]


def evaluate_diagnostic(
    questions_by_id: Dict[int, Question],
    answers: Iterable[Dict],
) -> DiagnosticResult:
    stats = {
        level: {'total': 0, 'correct': 0, 'accuracy': 0.0}
        for level in LEVEL_ORDER
    }

    total_items = 0
    total_correct = 0

    for item in answers:
        question = questions_by_id[item['question_id']]
        expected = _parse_correct_answers(question)
        provided = _coerce_answers(item['answer'])

        level = question.level
        per_item_total = len(expected)
        per_item_correct = 0

        for idx, exp in enumerate(expected):
            if idx < len(provided) and _normalize(exp) == provided[idx]:
                per_item_correct += 1

        stats[level]['total'] += per_item_total
        stats[level]['correct'] += per_item_correct
        total_items += per_item_total
        total_correct += per_item_correct

    for level in LEVEL_ORDER:
        total = stats[level]['total']
        correct = stats[level]['correct']
        stats[level]['accuracy'] = round((correct / total) if total else 0.0, 4)

    overall_accuracy = round((total_correct / total_items) if total_items else 0.0, 4)
    assigned_level = determine_level(stats)

    return DiagnosticResult(
        assigned_level=assigned_level,
        overall_accuracy=overall_accuracy,
        total_correct=total_correct,
        total_items=total_items,
        by_level=stats,
    )


def determine_level(stats: Dict[str, Dict[str, float]]) -> str:
    """Pick the highest level with enough items and accuracy >= threshold."""
    best_level = 'A1'
    for level in LEVEL_ORDER:
        total = stats[level]['total']
        accuracy = stats[level]['accuracy']
        if total >= MIN_ITEMS_PER_LEVEL and accuracy >= LEVEL_PASS_THRESHOLD:
            best_level = level
    return best_level
