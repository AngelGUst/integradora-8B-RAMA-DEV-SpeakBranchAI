# vocabulary/views.py
import logging

from django.http import JsonResponse
from django.utils import timezone
from django.views import View

from vocabulary.models import DailyVocabulary, Vocabulary
from vocabulary.serializers import DailyVocabularySerializer, VocabularySerializer
from vocabulary.services import VocabularyAssignmentError, assign_daily_vocabulary

logger = logging.getLogger('speakbranch.vocabulary')


def _require_auth(request):
    """Returns a 401 JsonResponse if the request user is not authenticated."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required.'}, status=401)
    return None


class DailyVocabularyView(View):
    """
    GET /api/vocabulary/daily/

    Returns the 5 daily vocabulary words for today's date.
    Triggers assignment via assign_daily_vocabulary() if words have not yet
    been assigned for today — subsequent calls return the same 5 words.

    Response 200:
        { "data": [ <DailyVocabulary>, ... ] }

    Response 500:
        { "error": "<reason>" }
    """

    def get(self, request):
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error

        today = timezone.now().date()

        try:
            daily_words = assign_daily_vocabulary(request.user, today)
        except VocabularyAssignmentError as exc:
            logger.error(
                'VocabularyAssignmentError for user %s: %s', request.user.id, exc
            )
            return JsonResponse({'error': str(exc)}, status=500)

        return JsonResponse(
            {'data': DailyVocabularySerializer(instance=daily_words, many=True).data},
            status=200,
        )


class MarkSeenView(View):
    """
    PATCH /api/vocabulary/daily/<pk>/seen/

    Marks a DailyVocabulary entry as seen (was_seen=True, seen_at=NOW).
    Idempotent — calling it multiple times has no side effect.

    Path param:
        pk (int): id of the DailyVocabulary record.

    Response 200:
        { "data": <updated DailyVocabulary> }

    Response 404:
        { "error": "Not found." }
    """

    def patch(self, request, pk):
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error

        try:
            daily_vocab = (
                DailyVocabulary.objects
                .select_related('vocabulary')
                .get(pk=pk, user=request.user)
            )
        except DailyVocabulary.DoesNotExist:
            return JsonResponse({'error': 'Not found.'}, status=404)

        daily_vocab.mark_as_seen()

        return JsonResponse(
            {'data': DailyVocabularySerializer(instance=daily_vocab).data},
            status=200,
        )


class VocabularyListView(View):
    """
    GET /api/vocabulary/

    Returns all Vocabulary words. Supports optional query params:
        ?level=A1       filter by CEFR level (A1, A2, B1, B2, C1, C2)
        ?category=Food  filter by category (case-insensitive)

    Response 200:
        { "data": [ <Vocabulary>, ... ] }
    """

    def get(self, request):
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error

        qs = Vocabulary.objects.all()

        level = request.GET.get('level')
        if level:
            qs = qs.filter(level=level)

        category = request.GET.get('category')
        if category:
            qs = qs.filter(category__iexact=category)

        return JsonResponse(
            {'data': VocabularySerializer(instance=qs, many=True).data},
            status=200,
        )
