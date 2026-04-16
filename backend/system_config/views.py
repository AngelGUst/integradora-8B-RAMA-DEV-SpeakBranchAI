from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework_simplejwt.authentication import JWTAuthentication

from system_config.models import SystemConfig
from system_config.services import LevelProgressionService

import os
from pathlib import Path
from django.conf import settings

# Constants to avoid string duplication
BEARER_PREFIX = 'Bearer '
MSG_AUTH_REQUIRED = 'Authentication required'

# Create your views here.

def _require_admin(request):
    if not request.user.is_authenticated:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith(BEARER_PREFIX):
            try:
                jwt_auth = JWTAuthentication()
                token = jwt_auth.get_validated_token(auth_header.split(' ', 1)[1])
                request.user = jwt_auth.get_user(token)
            except Exception:
                return JsonResponse({'error': MSG_AUTH_REQUIRED}, status=401)

        if not request.user.is_authenticated:
            return JsonResponse({'error': MSG_AUTH_REQUIRED}, status=401)
        if request.user.role != 'ADMIN':
            return JsonResponse({'error': 'Admin privileges required'}, status=403)
    return None


def _require_auth(request):
    if request.user.is_authenticated:
        return None

    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith(BEARER_PREFIX):
        try:
            jwt_auth = JWTAuthentication()
            token = jwt_auth.get_validated_token(auth_header.split(' ', 1)[1])
            request.user = jwt_auth.get_user(token)
            return None
        except Exception:
            pass

    return JsonResponse({'error': MSG_AUTH_REQUIRED}, status=401)


def _validate_threshold(value, name):
    """Validate threshold value is between 0 and 100"""
    val = float(value)
    if val <= 0 or val > 100:
        return JsonResponse(
            {'error': f'{name} must be between 0 and 100'}, 
            status=400
        )
    return val


def _validate_level_xp_requirements(incoming):
    """Validate level XP requirements structure and monotonicity"""
    if not isinstance(incoming, dict):
        return JsonResponse(
            {'error': 'level_xp_requirements must be a JSON object'}, 
            status=400
        ), None
    
    normalized = LevelProgressionService._normalize_overrides(incoming)
    invalid_levels = [
        key for key in incoming.keys()
        if str(key).upper() not in LevelProgressionService.LEVEL_SEQUENCE
    ]
    
    if invalid_levels:
        return JsonResponse(
            {'error': f'Invalid levels in level_xp_requirements: {", ".join(map(str, invalid_levels))}'},
            status=400
        ), None
    
    resolved_base = LevelProgressionService.get_level_xp_requirements()
    candidate = {**resolved_base, **normalized}
    
    prev_level = None
    prev_value = None
    for level in LevelProgressionService.LEVEL_SEQUENCE:
        current_value = int(candidate.get(level, 0) or 0)
        if prev_value is not None and current_value < prev_value:
            return JsonResponse(
                {
                    'error': (
                        'level_xp_requirements must be monotonic: '
                        f'{level} ({current_value}) cannot be lower than '
                        f'{prev_level} ({prev_value}).'
                    )
                },
                status=400,
            ), None
        prev_level = level
        prev_value = current_value
    
    return None, normalized
        

@method_decorator(csrf_exempt, name='dispatch')
class SystemConfigView(View):
    def get(self, request):
        err= _require_admin(request)
        if err:
            return err
        cfg = SystemConfig.get()
        return JsonResponse({
            'adaptive_threshold_up':  cfg.adaptive_threshold_up,
            'adaptive_threshold_down': cfg.adaptive_threshold_down,
            'registration_enabled':   cfg.registration_enabled,
            'xp_level_a1': cfg.xp_level_a1,
            'xp_level_a2': cfg.xp_level_a2,
            'xp_level_b1': cfg.xp_level_b1,
            'xp_level_b2': cfg.xp_level_b2,
        })

    def patch(self, request):
        err = _require_admin(request)
        if err:
            return err
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
        cfg = SystemConfig.get()
        changed = []

        if 'adaptive_threshold_up' in body:
            result = _validate_threshold(body['adaptive_threshold_up'], 'adaptive_threshold_up')
            if isinstance(result, JsonResponse):
                return result
            cfg.adaptive_threshold_up = result
            changed.append('adaptive_threshold_up')

        if 'adaptive_threshold_down' in body:
            result = _validate_threshold(body['adaptive_threshold_down'], 'adaptive_threshold_down')
            if isinstance(result, JsonResponse):
                return result
            cfg.adaptive_threshold_down = result
            changed.append('adaptive_threshold_down')

        if cfg.adaptive_threshold_down >= cfg.adaptive_threshold_up:
            return JsonResponse(
                {'error': 'The lower threshold must be lower than the upper threshold.'}, 
                status=400
            )

        if 'registration_enabled' in body:
            cfg.registration_enabled = bool(body['registration_enabled'])
            changed.append('registration_enabled')

        XP_LEVEL_FIELDS = {
            'xp_level_a1': 'xp_level_a1',
            'xp_level_a2': 'xp_level_a2',
            'xp_level_b1': 'xp_level_b1',
            'xp_level_b2': 'xp_level_b2',
        }
        for key, field in XP_LEVEL_FIELDS.items():
            if key in body:
                try:
                    val = int(body[key])
                    if val <= 0:
                        return JsonResponse({'error': f'{key} must be a positive integer'}, status=400)
                    setattr(cfg, field, val)
                    changed.append(field)
                except (TypeError, ValueError):
                    return JsonResponse({'error': f'{key} must be an integer'}, status=400)

        # Validate monotonic order for xp_level fields
        if any(f in changed for f in XP_LEVEL_FIELDS.values()):
            vals = [cfg.xp_level_a1, cfg.xp_level_a2, cfg.xp_level_b1, cfg.xp_level_b2]
            labels = ['xp_level_a1', 'xp_level_a2', 'xp_level_b1', 'xp_level_b2']
            for i in range(len(vals) - 1):
                if vals[i] >= vals[i + 1]:
                    return JsonResponse(
                        {'error': f'{labels[i]} ({vals[i]}) must be less than {labels[i+1]} ({vals[i+1]})'},
                        status=400,
                    )

        if changed:
            cfg.save(update_fields=changed)

            # Sync Exam.xp_required to match SystemConfig so LevelProgressionService
            # stays consistent when reading from the Exam table.
            if any(f in changed for f in XP_LEVEL_FIELDS.values()):
                try:
                    from exams.models import Exam
                    LEVEL_TO_NEXT_XP = {
                        'A1': cfg.xp_level_a1,
                        'A2': cfg.xp_level_a2,
                        'B1': cfg.xp_level_b1,
                        'B2': cfg.xp_level_b2,
                    }
                    for level, xp in LEVEL_TO_NEXT_XP.items():
                        Exam.objects.filter(type='LEVEL_UP', level=level).update(xp_required=xp)
                except Exception:
                    pass  # non-critical — LevelProgressionService will use SystemConfig directly

        return JsonResponse({
            'adaptive_threshold_up':  cfg.adaptive_threshold_up,
            'adaptive_threshold_down': cfg.adaptive_threshold_down,
            'registration_enabled':   cfg.registration_enabled,
            'xp_level_a1': cfg.xp_level_a1,
            'xp_level_a2': cfg.xp_level_a2,
            'xp_level_b1': cfg.xp_level_b1,
            'xp_level_b2': cfg.xp_level_b2,
        })

@method_decorator(csrf_exempt, name='dispatch')
class PublicLevelsView(View):
    """Devuelve solo los umbrales XP de niveles. Requiere auth, no admin."""

    def get(self, request):
        if not request.user.is_authenticated:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith(BEARER_PREFIX):
                try:
                    jwt_auth = JWTAuthentication()
                    token = jwt_auth.get_validated_token(auth_header.split(' ', 1)[1])
                    request.user = jwt_auth.get_user(token)
                except Exception:
                    return JsonResponse({'error': MSG_AUTH_REQUIRED}, status=401)

        if not request.user.is_authenticated:
            return JsonResponse({'error': MSG_AUTH_REQUIRED}, status=401)

        cfg = SystemConfig.get()
        return JsonResponse({
            'xp_level_a1': cfg.xp_level_a1,
            'xp_level_a2': cfg.xp_level_a2,
            'xp_level_b1': cfg.xp_level_b1,
            'xp_level_b2': cfg.xp_level_b2,
        })


@method_decorator(csrf_exempt, name='dispatch')
class ErrorLogsView(View):
    SOURCE_KEYWORDS = {
        'whisper': ['whisper', 'transcri', 'audio'],
        'gpt':     ['gpt', 'openai', 'writing', 'evaluat'],
        'all':     [],
    }

    def get(self, request):
        err = _require_admin(request)
        if err:
            return err
        
        source = request.GET.get('source', 'all').lower()
        limit = min(int(request.GET.get('limit', 100)), 500)

        log_path = Path(settings.LOGS_DIR) / 'error.log'
        if not log_path.exists():
            return JsonResponse({'lines': [], 'total': 0})
        
        keywords = self.SOURCE_KEYWORDS.get(source, [])

        lines = []

        with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if keywords:
                    lower = line.lower()
                    if not any(kw in lower for kw in keywords):
                        continue
                    lines.append(line)
                
        result= lines[-limit:]
        return JsonResponse({'lines': result, 'total': len(lines)})


@method_decorator(csrf_exempt, name='dispatch')
class LevelProgressionView(View):
    """Endpoint de consumo para frontend (no admin) con reglas dinámicas de XP por nivel."""

    def get(self, request):
        err = _require_auth(request)
        if err:
            return err

        return JsonResponse({
            'level_xp_requirements': LevelProgressionService.get_level_xp_requirements(),
            'level_ranges': LevelProgressionService.get_cumulative_level_ranges(),
        })
    
    