from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework_simplejwt.authentication import JWTAuthentication

from system_config.models import SystemConfig

import os
from pathlib import Path
from django.conf import settings

# Create your views here.

def _require_admin(request):
    if not request.user.is_authenticated:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                token = jwt_auth.get_validated_token(auth_header.split(' ', 1)[1])
                request.user = jwt_auth.get_user(token)
            except Exception:
                return JsonResponse({'error': 'Authentication required'}, status=401)

    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if request.user.role != 'ADMIN':
        return JsonResponse({'error': 'Admin privileges required'}, status=403)
        

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
            val = float(body['adaptive_threshold_up'])
            if val <=0 or val > 100:
                return JsonResponse({'error': 'adaptive_threshold_up must be between 0 and 100'}, status=400)
            cfg.adaptive_threshold_up = val
            changed.append('adaptive_threshold_up')

        if 'adaptive_threshold_down' in body:
            val = float(body['adaptive_threshold_down'])
            if val <=0 or val > 100:
                return JsonResponse({'error': 'adaptive_threshold_down must be between 0 and 100'}, status=400)
            cfg.adaptive_threshold_down = val
            changed.append('adaptive_threshold_down')

        if cfg.adaptive_threshold_down >= cfg.adaptive_threshold_up:
            return JsonResponse(
                {'error': 'The lower threshold must be lower than the upper threshold.'}, 
                status=400
            )

        if 'registration_enabled' in body:
            cfg.registration_enabled = bool(body['registration_enabled'])
            changed.append('registration_enabled')

        # XP de niveles CEFR (A1–B2)
        xp_fields = ['xp_level_a1', 'xp_level_a2', 'xp_level_b1', 'xp_level_b2']
        xp_updated = False
        for field in xp_fields:
            if field in body:
                val = int(body[field])
                if val <= 0:
                    return JsonResponse({'error': f'{field} debe ser mayor que 0.'}, status=400)
                setattr(cfg, field, val)
                changed.append(field)
                xp_updated = True

        if xp_updated:
            levels = [cfg.xp_level_a1, cfg.xp_level_a2, cfg.xp_level_b1, cfg.xp_level_b2]
            if levels != sorted(levels) or len(set(levels)) != len(levels):
                return JsonResponse(
                    {'error': 'Los XP de nivel deben ser estrictamente ascendentes: A1 < A2 < B1 < B2.'},
                    status=400
                )

        if changed:
            cfg.save()

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
            if auth_header.startswith('Bearer '):
                try:
                    jwt_auth = JWTAuthentication()
                    token = jwt_auth.get_validated_token(auth_header.split(' ', 1)[1])
                    request.user = jwt_auth.get_user(token)
                except Exception:
                    return JsonResponse({'error': 'Authentication required'}, status=401)

        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required'}, status=401)

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
    
    