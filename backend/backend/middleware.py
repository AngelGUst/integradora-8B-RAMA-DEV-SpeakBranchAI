import threading
from django.contrib.auth import get_user_model

_thread_locals = threading.local()


def get_current_user():

    return getattr(_thread_locals, 'user', None)


def get_current_request():
    return getattr(_thread_locals, 'request', None)


def get_or_create_api_user():
    """Obtiene o crea el usuario ficticio para transacciones sin autenticación"""
    User = get_user_model()
    try:
        api_user, created = User.objects.get_or_create(
            email='api-user@system.local',
            defaults={
                'first_name': 'API User',
                'is_active': False,  # Usuario inactivo para que no pueda iniciar sesión
                'role': 'STUDENT',
            }
        )
        return api_user
    except Exception as e:
        # Si hay algún error, devolver None
        print(f"⚠️  Error al obtener/crear usuario api-user: {e}")
        return None


class CurrentUserMiddleware:
    
    def __init__(self, get_response):
        self.get_response = get_response
        self._api_user = None  # Cache del usuario api-user
    
    def __call__(self, request):
        # Almacenar request en thread local
        _thread_locals.request = request
        
        # Extraer el usuario de la transacción
        user = getattr(request, 'user', None)
        
        # Si no hay usuario autenticado o es anónimo, asignar el usuario ficticio 'api-user'
        if user is None or not user.is_authenticated:
            # Usar cache para evitar consultas repetidas a la BD
            if self._api_user is None:
                self._api_user = get_or_create_api_user()
            
            if self._api_user is not None:
                # Asignar el usuario ficticio al request para que auditlog lo capture
                request.user = self._api_user
                _thread_locals.user = self._api_user
            else:
                _thread_locals.user = 'api-user'
        else:
            _thread_locals.user = user
        
        try:
            response = self.get_response(request)
        finally:
            # Limpiar thread locals después del request
            # para evitar fugas de memoria
            if hasattr(_thread_locals, 'request'):
                del _thread_locals.request
            if hasattr(_thread_locals, 'user'):
                del _thread_locals.user
        
        return response
