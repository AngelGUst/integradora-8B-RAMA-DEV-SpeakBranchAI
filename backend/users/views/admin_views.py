"""
admin_views.py

Admin-only endpoints for user management.
All views require JWT authentication + role == ADMIN.

GET    /api/users/                    — paginated user list (search, role, level, is_active filters)
GET    /api/users/{id}/               — full user detail with progress snapshot
PATCH  /api/users/{id}/               — update level / role / is_active
DELETE /api/users/{id}/               — hard delete user
POST   /api/users/{id}/reset-password/ — admin sets new password directly
GET    /api/users/{id}/attempts/       — last 50 attempts across all 4 skill tables (tab=speaking|reading|listening|writing)
"""
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from attempts.models import SpeakingAttempt, ReadingAttempt, ListeningAttempt, WritingAttempt
from users.models import UserProgress

User = get_user_model()

LIMIT = 50  # attempts per tab


# ── Auth helper ───────────────────────────────────────────────────────────────

def _require_admin(request):
    """Returns None if valid admin JWT, else a JsonResponse error."""
    if not request.user.is_authenticated:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ', 1)[1])
                request.user = jwt_auth.get_user(validated_token)
            except Exception:
                return JsonResponse({'error': 'Authentication required.'}, status=401)
        else:
            return JsonResponse({'error': 'Authentication required.'}, status=401)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required.'}, status=401)

    if request.user.role != 'ADMIN':
        return JsonResponse({'error': 'Admin access required.'}, status=403)

    return None


# ── Serializer helpers ────────────────────────────────────────────────────────

def _user_row(user):
    """Compact representation for the list table."""
    progress = getattr(user, '_cached_progress', None)
    return {
        'id':               user.id,
        'first_name':       user.first_name,
        'email':            user.email,
        'role':             user.role,
        'level':            user.level,
        'is_active':        user.is_active,
        'gender':           user.gender,
        'age':              user.age,
        'avatar_url':       user.avatar_url,
        'created_at':       user.created_at.strftime('%Y-%m-%d') if user.created_at else None,
        'total_xp':         progress.total_xp if progress else 0,
        'streak_days':      progress.streak_days if progress else 0,
        'last_activity':    str(progress.last_activity_date) if (progress and progress.last_activity_date) else None,
    }


def _user_detail(user, progress):
    """Full representation for the detail drawer."""
    user._cached_progress = progress  # ensure _user_row picks up XP/streak
    return {
        **_user_row(user),
        'average_speaking':  progress.average_speaking if progress else 0.0,
        'average_reading':   progress.average_reading if progress else 0.0,
        'average_listening': progress.average_listening if progress else 0.0,
        'average_writing':   progress.average_writing if progress else 0.0,
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class AdminUserListView(View):
    """GET /api/users/ — list + search + filter"""

    def get(self, request):
        err = _require_admin(request)
        if err:
            return err

        qs = User.objects.all().order_by('-created_at')

        search = request.GET.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(first_name__icontains=search) | Q(email__icontains=search))

        role = request.GET.get('role', '').strip()
        if role in ('ADMIN', 'STUDENT'):
            qs = qs.filter(role=role)

        level = request.GET.get('level', '').strip()
        if level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'):
            qs = qs.filter(level=level)

        is_active = request.GET.get('is_active', '').strip()
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        # Simple page-based pagination
        page = max(1, int(request.GET.get('page', 1)))
        page_size = min(200, max(1, int(request.GET.get('page_size', 20))))
        total = qs.count()
        users = list(qs[(page - 1) * page_size: page * page_size])

        # Bulk-fetch progress for these users
        user_ids = [u.id for u in users]
        progress_map = {
            p.user_id: p
            for p in UserProgress.objects.filter(user_id__in=user_ids)
        }
        for u in users:
            u._cached_progress = progress_map.get(u.id)

        return JsonResponse({
            'count':    total,
            'page':     page,
            'pages':    (total + page_size - 1) // page_size,
            'results':  [_user_row(u) for u in users],
        })


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserDetailView(View):
    """GET/PATCH/DELETE /api/users/{id}/"""

    def _get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

    def get(self, request, user_id):
        err = _require_admin(request)
        if err:
            return err

        user = self._get_user(user_id)
        if not user:
            return JsonResponse({'error': 'User not found.'}, status=404)

        progress, _ = UserProgress.objects.get_or_create(user=user)
        return JsonResponse(_user_detail(user, progress))

    def patch(self, request, user_id):
        err = _require_admin(request)
        if err:
            return err

        user = self._get_user(user_id)
        if not user:
            return JsonResponse({'error': 'User not found.'}, status=404)

        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)

        updated = []

        if 'level' in body:
            if body['level'] in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'):
                user.level = body['level']
                updated.append('level')
                # Also sync UserProgress level
                progress, _ = UserProgress.objects.get_or_create(user=user)
                progress.level = body['level']
                progress.save(update_fields=['level'])
            else:
                return JsonResponse({'error': 'Invalid level.'}, status=400)

        if 'role' in body:
            if body['role'] in ('ADMIN', 'STUDENT'):
                user.role = body['role']
                user.is_staff = body['role'] == 'ADMIN'
                updated += ['role', 'is_staff']
            else:
                return JsonResponse({'error': 'Invalid role.'}, status=400)

        if 'is_active' in body:
            user.is_active = bool(body['is_active'])
            updated.append('is_active')

        if updated:
            user.save(update_fields=updated)

        progress, _ = UserProgress.objects.get_or_create(user=user)
        return JsonResponse(_user_detail(user, progress))

    def delete(self, request, user_id):
        err = _require_admin(request)
        if err:
            return err

        # Prevent self-deletion
        if str(request.user.id) == str(user_id):
            return JsonResponse({'error': 'Cannot delete your own account.'}, status=400)

        user = self._get_user(user_id)
        if not user:
            return JsonResponse({'error': 'User not found.'}, status=404)

        user.delete()
        return JsonResponse({'deleted': True}, status=200)


@method_decorator(csrf_exempt, name='dispatch')
class AdminPasswordResetView(View):
    """POST /api/users/{id}/reset-password/ — admin sets password directly"""

    def post(self, request, user_id):
        err = _require_admin(request)
        if err:
            return err

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)

        try:
            body = json.loads(request.body)
            new_password = body.get('new_password', '').strip()
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)

        if len(new_password) < 8:
            return JsonResponse({'error': 'Password must be at least 8 characters.'}, status=400)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return JsonResponse({'success': True})


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserAttemptsView(View):
    """GET /api/users/{id}/attempts/?tab=speaking|reading|listening|writing"""

    def get(self, request, user_id):
        err = _require_admin(request)
        if err:
            return err

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)

        tab = request.GET.get('tab', 'speaking').lower()

        if tab == 'speaking':
            rows = list(
                SpeakingAttempt.objects
                .filter(user=user)
                .select_related('question')
                .order_by('-created_at')[:LIMIT]
            )
            data = [
                {
                    'id':          r.id,
                    'question':    r.question.text[:120] if r.question else '',
                    'difficulty':  r.difficulty,
                    'score':       r.score,
                    'xp_earned':   r.xp_earned,
                    'transcribed': r.transcribed_text[:200] if r.transcribed_text else '',
                    'match':       r.transcription_match,
                    'created_at':  r.created_at.strftime('%Y-%m-%d %H:%M'),
                }
                for r in rows
            ]

        elif tab == 'reading':
            rows = list(
                ReadingAttempt.objects
                .filter(user=user)
                .select_related('question')
                .order_by('-created_at')[:LIMIT]
            )
            data = [
                {
                    'id':           r.id,
                    'question':     r.question.text[:120] if r.question else '',
                    'difficulty':   r.difficulty,
                    'score':        r.score,
                    'xp_earned':    r.xp_earned,
                    'selected':     r.selected_answer,
                    'correct':      r.correct,
                    'created_at':   r.created_at.strftime('%Y-%m-%d %H:%M'),
                }
                for r in rows
            ]

        elif tab == 'listening':
            rows = list(
                ListeningAttempt.objects
                .filter(user=user)
                .select_related('question')
                .order_by('-created_at')[:LIMIT]
            )
            data = [
                {
                    'id':            r.id,
                    'question':      r.question.text[:120] if r.question else '',
                    'listening_type': r.listening_type,
                    'difficulty':    r.difficulty,
                    'score':         r.score,
                    'xp_earned':     r.xp_earned,
                    'replays_used':  r.replays_used,
                    'correct':       r.correct,
                    'created_at':    r.created_at.strftime('%Y-%m-%d %H:%M'),
                }
                for r in rows
            ]

        elif tab == 'writing':
            rows = list(
                WritingAttempt.objects
                .filter(user=user)
                .select_related('question')
                .order_by('-created_at')[:LIMIT]
            )
            data = [
                {
                    'id':             r.id,
                    'question':       r.question.text[:120] if r.question else '',
                    'difficulty':     r.difficulty,
                    'score':          r.score,
                    'score_grammar':  r.score_grammar,
                    'score_vocab':    r.score_vocabulary,
                    'score_coherence':r.score_coherence,
                    'score_spelling': r.score_spelling,
                    'xp_earned':      r.xp_earned,
                    'ai_feedback':    r.ai_feedback[:300] if r.ai_feedback else '',
                    'created_at':     r.created_at.strftime('%Y-%m-%d %H:%M'),
                }
                for r in rows
            ]

        else:
            return JsonResponse({'error': 'Invalid tab. Use: speaking, reading, listening, writing'}, status=400)

        return JsonResponse({'tab': tab, 'results': data})
