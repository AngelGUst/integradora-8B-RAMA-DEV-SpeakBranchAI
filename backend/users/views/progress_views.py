"""
progress_views.py

GET  /api/auth/progress/   → devuelve total_xp, streak_days, completed_question_ids
POST /api/auth/progress/complete/ → registra completion de un ejercicio
"""
import json

from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from attempts.models import SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt
from users.models import UserProgress, UserWeakCategory


def _require_auth(request):
    if request.user.is_authenticated:
        return None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(auth_header.split(' ', 1)[1])
            request.user = jwt_auth.get_user(validated_token)
            return None
        except Exception:
            pass
    return JsonResponse({'error': 'Authentication required.'}, status=401)


def _get_completed_ids(user):
    """Devuelve todos los question IDs que el usuario tiene al menos 1 attempt."""
    ids = set()
    ids.update(SpeakingAttempt.objects.filter(user=user).values_list('question_id', flat=True))
    ids.update(ReadingAttempt.objects.filter(user=user).values_list('question_id', flat=True))
    ids.update(ListeningAttempt.objects.filter(user=user).values_list('question_id', flat=True))
    ids.update(WritingAttempt.objects.filter(user=user).values_list('question_id', flat=True))
    return [str(i) for i in ids]


def _get_best_scores(user):
    """Devuelve el mejor score por question_id para todos los attempts del usuario."""
    from django.db.models import Max
    scores = {}

    for Model in (SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt):
        qs = (
            Model.objects
            .filter(user=user, score__isnull=False)
            .values('question_id')
            .annotate(best=Max('score'))
        )
        for row in qs:
            qid = str(row['question_id'])
            scores[qid] = max(scores.get(qid, 0), row['best'])

    return scores


# Skill → average field on UserProgress
_SKILL_FIELD = {
    'SPEAKING':                'average_speaking',
    'READING':                 'average_reading',
    'LISTENING_SHADOWING':     'average_listening',
    'LISTENING_COMPREHENSION': 'average_listening',
    'WRITING':                 'average_writing',
}


@method_decorator(csrf_exempt, name='dispatch')
class ProgressView(View):

    def get(self, request):
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error

        progress, _ = UserProgress.objects.get_or_create(user=request.user)

        return JsonResponse({
            'total_xp':             progress.total_xp,
            'streak_days':          progress.streak_days,
            'last_activity_date':   str(progress.last_activity_date) if progress.last_activity_date else None,
            'average_speaking':     progress.average_speaking,
            'average_reading':      progress.average_reading,
            'average_listening':    progress.average_listening,
            'average_writing':      progress.average_writing,
            'completed_question_ids': _get_completed_ids(request.user),
            'question_scores':        _get_best_scores(request.user),
        })

    def post(self, request):
        """
        Body: { "question_id": int, "question_type": str, "score": float, "xp_earned": int }
        Crea el Attempt correspondiente, actualiza UserProgress y UserWeakCategory.
        """
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error

        try:
            body = json.loads(request.body)
            question_id = int(body.get('question_id', 0))
            score       = float(body.get('score', 0))
            xp_earned   = int(body.get('xp_earned', 0))
            q_type      = body.get('question_type', '')
        except (json.JSONDecodeError, ValueError, TypeError):
            return JsonResponse({'error': 'Invalid body.'}, status=400)

        # ── Create Attempt record ──────────────────────────────────────────────
        if question_id:
            try:
                from questions.models import Question
                question = Question.objects.get(id=question_id)
                difficulty = question.difficulty or 'EASY'

                if q_type == 'SPEAKING':
                    SpeakingAttempt.objects.create(
                        user=request.user,
                        question=question,
                        expected_text=question.text,
                        score=score,
                        xp_earned=xp_earned,
                        difficulty=difficulty,
                    )

                elif q_type == 'LISTENING_SHADOWING':
                    ListeningAttempt.objects.create(
                        user=request.user,
                        question=question,
                        listening_type='LISTENING_SHADOWING',
                        score=score,
                        xp_earned=xp_earned,
                        difficulty=difficulty,
                    )

                elif q_type == 'LISTENING_COMPREHENSION':
                    ListeningAttempt.objects.create(
                        user=request.user,
                        question=question,
                        listening_type='LISTENING_COMPREHENSION',
                        correct=(score >= 50),
                        score=score,
                        xp_earned=xp_earned,
                        difficulty=difficulty,
                    )

                elif q_type == 'READING':
                    ReadingAttempt.objects.create(
                        user=request.user,
                        question=question,
                        selected_answer='',
                        correct=(score >= 50),
                        score=score,
                        xp_earned=xp_earned,
                        difficulty=difficulty,
                    )

                # WRITING attempts are already created by the evaluate_writing endpoint.

            except Exception:
                pass  # Never block XP update if attempt creation fails

        # ── Update UserProgress ───────────────────────────────────────────────
        progress, _ = UserProgress.objects.get_or_create(user=request.user)

        progress.add_xp(xp_earned)
        progress.update_streak()

        skill_field = _SKILL_FIELD.get(q_type)
        if skill_field:
            current_avg = getattr(progress, skill_field, 0.0)
            new_avg = current_avg * 0.8 + score * 0.2   # exponential moving average
            setattr(progress, skill_field, round(new_avg, 2))
            progress.save(update_fields=[skill_field])

            UserWeakCategory.update_weak_categories(
                user=request.user,
                skill=q_type,
                category='BASIC',
                new_score=score,
            )

        return JsonResponse({
            'total_xp':    progress.total_xp,
            'streak_days': progress.streak_days,
        })
