# vocabulary/views.py
import json
import logging

from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from vocabulary.models import DailyVocabulary, Vocabulary
from vocabulary.serializers import DailyVocabularySerializer, VocabularySerializer
from vocabulary.services import VocabularyAssignmentError, assign_daily_vocabulary

logger = logging.getLogger('speakbranch.vocabulary')


def _require_auth(request):
    """
    Returns a 401 JsonResponse if the request user is not authenticated.
    Supports both session auth and JWT Bearer tokens, since these are plain
    Django views (not DRF) and JWT middleware only runs on DRF views.
    """
    if request.user.is_authenticated:
        return None

    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            raw_token = auth_header.split(' ', 1)[1]
            validated_token = jwt_auth.get_validated_token(raw_token)
            request.user = jwt_auth.get_user(validated_token)
            return None
        except Exception:
            pass

    return JsonResponse({'error': 'Authentication required.'}, status=401)


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


@method_decorator(csrf_exempt, name='dispatch')
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


@method_decorator(csrf_exempt, name='dispatch')
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

        search = request.GET.get('search')
        if search:
            qs = qs.filter(word__icontains=search)

        return JsonResponse(
            {'data': VocabularySerializer(instance=qs, many=True).data},
            status=200,
        )

    def post(self, request):
        """POST /api/vocabulary/ — Create a new Vocabulary word (admin only)."""
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error
        if not request.user.is_staff and getattr(request.user, 'role', None) != 'ADMIN':
            return JsonResponse({'error': 'Forbidden.'}, status=403)

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)

        required = ('word', 'meaning', 'level')
        for field in required:
            if not body.get(field):
                return JsonResponse({'error': f'{field} is required.'}, status=400)

        vocab = Vocabulary.objects.create(
            word=body['word'],
            meaning=body['meaning'],
            pronunciation=body.get('pronunciation', ''),
            example_sentence=body.get('example_sentence', ''),
            level=body['level'],
            category=body.get('category', ''),
            image_url=body.get('image_url') or None,
            audio_url=body.get('audio_url') or None,
            daily_flag=body.get('daily_flag', True),
            created_by=request.user,
        )
        return JsonResponse({'data': VocabularySerializer(instance=vocab).data}, status=201)


@method_decorator(csrf_exempt, name='dispatch')
class VocabularyDetailView(View):
    """
    PATCH /api/vocabulary/<pk>/  — Update a Vocabulary word (admin only).
    DELETE /api/vocabulary/<pk>/ — Delete a Vocabulary word (admin only).
    """

    def _get_vocab(self, pk, request):
        auth_error = _require_auth(request)
        if auth_error:
            return None, auth_error
        if not request.user.is_staff and getattr(request.user, 'role', None) != 'ADMIN':
            return None, JsonResponse({'error': 'Forbidden.'}, status=403)
        try:
            return Vocabulary.objects.get(pk=pk), None
        except Vocabulary.DoesNotExist:
            return None, JsonResponse({'error': 'Not found.'}, status=404)

    def patch(self, request, pk):
        vocab, err = self._get_vocab(pk, request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)

        updatable = ('word', 'meaning', 'pronunciation', 'example_sentence',
                     'level', 'category', 'daily_flag')
        for field in updatable:
            if field in body:
                setattr(vocab, field, body[field])

        # Nullable URL fields
        if 'image_url' in body:
            vocab.image_url = body['image_url'] or None
        if 'audio_url' in body:
            vocab.audio_url = body['audio_url'] or None

        vocab.save()
        return JsonResponse({'data': VocabularySerializer(instance=vocab).data}, status=200)

    def delete(self, request, pk):
        vocab, err = self._get_vocab(pk, request)
        if err:
            return err
        vocab.delete()
        return JsonResponse({}, status=204)


class MyVocabularyView(View):
    """
    GET /api/vocabulary/my/

    Returns all vocabulary words the user has accumulated through exercises
    (every DailyVocabulary record ever created for this user), sorted by
    most recently added first.

    Response 200:
        { "data": [ <DailyVocabulary>, ... ], "total": <int> }
    """

    def get(self, request):
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error

        qs = (
            DailyVocabulary.objects
            .filter(user=request.user)
            .select_related('vocabulary')
        )

        level = request.GET.get('level')
        if level:
            qs = qs.filter(vocabulary__level=level)

        mastery = request.GET.get('mastery')
        if mastery is not None and mastery != '':
            qs = qs.filter(mastery_level=int(mastery))

        search = request.GET.get('search', '').strip()
        if search:
            qs = qs.filter(vocabulary__word__icontains=search)

        # Deduplicate by vocabulary word, keeping the entry with the highest
        # mastery level (and most recent if tied). Uses PostgreSQL DISTINCT ON.
        qs = qs.order_by('vocabulary_id', '-mastery_level', '-created_at').distinct('vocabulary_id')

        items = list(qs)
        return JsonResponse(
            {'data': DailyVocabularySerializer(instance=items, many=True).data,
             'total': len(items)},
            status=200,
        )


@method_decorator(csrf_exempt, name='dispatch')
class PracticeVocabularyView(View):
    """
    POST /api/vocabulary/daily/<pk>/practice/

    Updates mastery_level based on whether the user answered correctly.

    Request body:
        { "success": true | false }

    Response 200:
        { "data": <updated DailyVocabulary> }
    """

    def post(self, request, pk):
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

        try:
            body = json.loads(request.body)
            success = bool(body.get('success', True))
        except (json.JSONDecodeError, ValueError):
            success = True

        daily_vocab.mark_as_practiced(success=success)

        return JsonResponse(
            {'data': DailyVocabularySerializer(instance=daily_vocab).data},
            status=200,
        )


@method_decorator(csrf_exempt, name='dispatch')
class ExerciseVocabularyView(View):
    """
    POST /api/vocabulary/exercise-words/

    Returns the key vocabulary words linked to a question and registers them
    as DailyVocabulary entries for the authenticated user (today's date).

    Request body:
        { "question_id": <int> }

    Response 200:
        { "data": [ <Vocabulary>, ... ] }   — only is_key=True words

    Response 400:
        { "error": "<reason>" }
    """

    def post(self, request):
        auth_error = _require_auth(request)
        if auth_error:
            return auth_error

        try:
            body = json.loads(request.body)
            question_id = int(body.get('question_id', 0))
        except (json.JSONDecodeError, ValueError, TypeError):
            return JsonResponse({'error': 'Invalid request body.'}, status=400)

        if not question_id:
            return JsonResponse({'error': 'question_id is required.'}, status=400)

        from questions.models import QuestionVocabulary

        items = (
            QuestionVocabulary.objects
            .select_related('vocabulary')
            .filter(question_id=question_id)
            .order_by('order')
        )

        today = timezone.now().date()

        vocab_list = []
        for item in items:
            DailyVocabulary.objects.get_or_create(
                vocabulary=item.vocabulary,
                user=request.user,
                date_assigned=today,
                defaults={'mastery_level': 0},
            )
            vocab_list.append(item.vocabulary)

        return JsonResponse(
            {'data': VocabularySerializer(instance=vocab_list, many=True).data},
            status=200,
        )
