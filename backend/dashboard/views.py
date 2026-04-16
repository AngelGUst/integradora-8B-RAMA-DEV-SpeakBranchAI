"""
Admin Dashboard API views.
All endpoints require ADMIN role via IsAdminRole permission.
"""

from datetime import date, timedelta

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from attempts.models import (
    ListeningAttempt,
    ReadingAttempt,
    SpeakingAttempt,
    WritingAttempt,
)
from users.models import User, UserProgress


# ── Permission ────────────────────────────────────────────────

class IsAdminRole(BasePermission):
    """Permite acceso solo a usuarios con role='ADMIN'."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'ADMIN'
        )


# ── Helpers ───────────────────────────────────────────────────

def _trend(today_val: int | float, yesterday_val: int | float) -> float:
    """Porcentaje de cambio respecto a ayer. 0 si no hay base."""
    if yesterday_val == 0:
        return 100.0 if today_val > 0 else 0.0
    return round(((today_val - yesterday_val) / yesterday_val) * 100, 1)


def _all_attempts_date(target_date):
    """Cuenta todos los intentos en una fecha específica."""
    return (
        SpeakingAttempt.objects.filter(created_at__date=target_date).count()
        + ReadingAttempt.objects.filter(created_at__date=target_date).count()
        + ListeningAttempt.objects.filter(created_at__date=target_date).count()
        + WritingAttempt.objects.filter(created_at__date=target_date).count()
    )


def _active_users_date(target_date):
    """Usuarios únicos con al menos un intento en una fecha."""
    s = set(SpeakingAttempt.objects.filter(created_at__date=target_date).values_list('user_id', flat=True))
    r = set(ReadingAttempt.objects.filter(created_at__date=target_date).values_list('user_id', flat=True))
    l = set(ListeningAttempt.objects.filter(created_at__date=target_date).values_list('user_id', flat=True))
    w = set(WritingAttempt.objects.filter(created_at__date=target_date).values_list('user_id', flat=True))
    return len(s | r | l | w)


# ── Views ─────────────────────────────────────────────────────

class MetricsView(APIView):
    """GET /api/admin/dashboard/metrics/"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        today = date.today()
        yesterday = today - timedelta(days=1)

        total_users = User.objects.filter(role='STUDENT').count()
        active_today = _active_users_date(today)
        attempts_today = _all_attempts_date(today)
        avg_xp_result = UserProgress.objects.filter(
            user__role='STUDENT'
        ).aggregate(avg=Avg('total_xp'))
        avg_xp = round(avg_xp_result['avg'] or 0, 1)

        # Trends vs yesterday
        total_users_yesterday = User.objects.filter(
            role='STUDENT',
            created_at__date__lt=today
        ).count()
        active_yesterday = _active_users_date(yesterday)
        attempts_yesterday = _all_attempts_date(yesterday)
        avg_xp_yesterday_result = UserProgress.objects.filter(
            user__role='STUDENT',
            last_updated__date=yesterday
        ).aggregate(avg=Avg('total_xp'))
        avg_xp_yesterday = avg_xp_yesterday_result['avg'] or avg_xp  # fallback

        return Response({
            'total_users': total_users,
            'active_today': active_today,
            'attempts_today': attempts_today,
            'avg_xp': avg_xp,
            'trends': {
                'total_users': _trend(total_users, total_users_yesterday),
                'active_today': _trend(active_today, active_yesterday),
                'attempts_today': _trend(attempts_today, attempts_yesterday),
                'avg_xp': _trend(avg_xp, avg_xp_yesterday),
            },
        })


class ActivityView(APIView):
    """GET /api/admin/dashboard/activity/?days=30"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
            days = max(1, min(days, 365))
        except (ValueError, TypeError):
            days = 30

        start = date.today() - timedelta(days=days - 1)

        # Aggregate attempts per day for each model
        def daily_counts(qs):
            return {
                row['day'].strftime('%Y-%m-%d'): row['count']
                for row in (
                    qs.filter(created_at__date__gte=start)
                    .annotate(day=TruncDate('created_at'))
                    .values('day')
                    .annotate(count=Count('id'))
                )
                if row['day']
            }

        daily = {}
        for counts in [
            daily_counts(SpeakingAttempt.objects),
            daily_counts(ReadingAttempt.objects),
            daily_counts(ListeningAttempt.objects),
            daily_counts(WritingAttempt.objects),
        ]:
            for day_str, cnt in counts.items():
                daily[day_str] = daily.get(day_str, 0) + cnt

        result = [
            {
                'date': (start + timedelta(days=i)).strftime('%Y-%m-%d'),
                'attempts': daily.get((start + timedelta(days=i)).strftime('%Y-%m-%d'), 0),
            }
            for i in range(days)
        ]
        return Response(result)


class DistributionsView(APIView):
    """GET /api/admin/dashboard/distributions/"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        # Users by CEFR level
        level_qs = (
            User.objects.filter(role='STUDENT')
            .values('level')
            .annotate(count=Count('id'))
        )
        by_level = {row['level']: row['count'] for row in level_qs}
        # Ensure all levels present
        for lvl in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'):
            by_level.setdefault(lvl, 0)

        # Attempts by skill
        by_skill = {
            'SPEAKING': SpeakingAttempt.objects.count(),
            'READING': ReadingAttempt.objects.count(),
            'LISTENING_SHADOWING': ListeningAttempt.objects.filter(
                listening_type='LISTENING_SHADOWING'
            ).count(),
            'LISTENING_COMPREHENSION': ListeningAttempt.objects.filter(
                listening_type='LISTENING_COMPREHENSION'
            ).count(),
            'WRITING': WritingAttempt.objects.count(),
        }

        return Response({'by_level': by_level, 'by_skill': by_skill})


class ScoresView(APIView):
    """GET /api/admin/dashboard/scores/"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        def avg_or_zero(qs, field='score'):
            result = qs.aggregate(avg=Avg(field))
            return round(result['avg'] or 0, 1)

        return Response({
            'SPEAKING': avg_or_zero(SpeakingAttempt.objects.filter(score__isnull=False)),
            'READING': avg_or_zero(ReadingAttempt.objects.filter(score__isnull=False)),
            'LISTENING_SHADOWING': avg_or_zero(
                ListeningAttempt.objects.filter(
                    listening_type='LISTENING_SHADOWING', score__isnull=False
                )
            ),
            'LISTENING_COMPREHENSION': avg_or_zero(
                ListeningAttempt.objects.filter(
                    listening_type='LISTENING_COMPREHENSION', score__isnull=False
                )
            ),
            'WRITING': avg_or_zero(WritingAttempt.objects.filter(score__isnull=False)),
        })


class AlertsView(APIView):
    """GET /api/admin/dashboard/alerts/"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        # Questions with avg score < 30 (too hard)
        hard_speaking = (
            SpeakingAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__lt=30)
            .count()
        )
        hard_reading = (
            ReadingAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__lt=30)
            .count()
        )
        hard_listening = (
            ListeningAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__lt=30)
            .count()
        )
        hard_writing = (
            WritingAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__lt=30)
            .count()
        )

        # Questions with avg score > 95 (too easy)
        easy_speaking = (
            SpeakingAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__gt=95)
            .count()
        )
        easy_reading = (
            ReadingAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__gt=95)
            .count()
        )
        easy_listening = (
            ListeningAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__gt=95)
            .count()
        )
        easy_writing = (
            WritingAttempt.objects.filter(score__isnull=False)
            .values('question_id')
            .annotate(avg=Avg('score'))
            .filter(avg__gt=95)
            .count()
        )

        seven_days_ago = date.today() - timedelta(days=7)

        inactive_users = UserProgress.objects.filter(
            user__role='STUDENT',
        ).filter(
            Q(last_activity_date__lt=seven_days_ago) | Q(last_activity_date__isnull=True)
        ).count()

        no_diagnostic = User.objects.filter(
            role='STUDENT',
            diagnostic_completed=False,
        ).count()

        return Response({
            'hard_questions': hard_speaking + hard_reading + hard_listening + hard_writing,
            'easy_questions': easy_speaking + easy_reading + easy_listening + easy_writing,
            'inactive_users': inactive_users,
            'no_diagnostic': no_diagnostic,
        })


class TopStudentsView(APIView):
    """GET /api/admin/dashboard/top-students/"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        top = (
            UserProgress.objects
            .select_related('user')
            .filter(user__role='STUDENT', user__is_active=True)
            .order_by('-total_xp')[:5]
        )

        result = [
            {
                'rank': idx,
                'first_name': p.user.first_name,
                'email': p.user.email,
                'level': p.user.level,
                'total_xp': p.total_xp,
                'streak_days': p.streak_days,
            }
            for idx, p in enumerate(top, start=1)
        ]
        return Response(result)


class RecentAttemptsView(APIView):
    """GET /api/admin/dashboard/recent-attempts/"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        attempts = []

        for a in SpeakingAttempt.objects.select_related('user').order_by('-created_at')[:10]:
            attempts.append({
                'student_name': a.user.first_name,
                'skill': 'SPEAKING',
                'score': round(a.score or 0, 1),
                'xp_earned': a.xp_earned,
                'created_at': a.created_at.isoformat(),
            })

        for a in ReadingAttempt.objects.select_related('user').order_by('-created_at')[:10]:
            attempts.append({
                'student_name': a.user.first_name,
                'skill': 'READING',
                'score': round(a.score or 0, 1),
                'xp_earned': a.xp_earned,
                'created_at': a.created_at.isoformat(),
            })

        for a in ListeningAttempt.objects.select_related('user').order_by('-created_at')[:10]:
            attempts.append({
                'student_name': a.user.first_name,
                'skill': a.listening_type,
                'score': round(a.score or 0, 1),
                'xp_earned': a.xp_earned,
                'created_at': a.created_at.isoformat(),
            })

        for a in WritingAttempt.objects.select_related('user').order_by('-created_at')[:10]:
            attempts.append({
                'student_name': a.user.first_name,
                'skill': 'WRITING',
                'score': round(a.score or 0, 1),
                'xp_earned': a.xp_earned,
                'created_at': a.created_at.isoformat(),
            })

        attempts.sort(key=lambda x: x['created_at'], reverse=True)
        return Response(attempts[:10])


class ApiUsageView(APIView):
    """GET /api/admin/dashboard/api-usage/
    Estimación de uso: cada intento de Speaking/Shadowing = ~0.5 min de Whisper.
    Cada WritingAttempt = 1 texto evaluado por GPT.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        today = date.today()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Whisper: Speaking + Listening Shadowing
        whisper_week_count = (
            SpeakingAttempt.objects.filter(created_at__date__gte=week_ago).count()
            + ListeningAttempt.objects.filter(
                created_at__date__gte=week_ago,
                listening_type='LISTENING_SHADOWING',
            ).count()
        )
        whisper_month_count = (
            SpeakingAttempt.objects.filter(created_at__date__gte=month_ago).count()
            + ListeningAttempt.objects.filter(
                created_at__date__gte=month_ago,
                listening_type='LISTENING_SHADOWING',
            ).count()
        )

        # GPT: Writing evaluations
        gpt_week = WritingAttempt.objects.filter(created_at__date__gte=week_ago).count()
        gpt_month = WritingAttempt.objects.filter(created_at__date__gte=month_ago).count()

        # ~0.5 min average per Whisper attempt
        AVG_MINUTES_PER_ATTEMPT = 0.5

        return Response({
            'whisper_minutes_week': round(whisper_week_count * AVG_MINUTES_PER_ATTEMPT, 1),
            'gpt_texts_week': gpt_week,
            'whisper_minutes_month': round(whisper_month_count * AVG_MINUTES_PER_ATTEMPT, 1),
            'gpt_texts_month': gpt_month,
        })
