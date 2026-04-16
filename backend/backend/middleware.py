import threading

_thread_locals = threading.local()


def get_current_user():

    return getattr(_thread_locals, 'user', None)


def get_current_request():
    return getattr(_thread_locals, 'request', None)


class CurrentUserMiddleware:
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Almacenar request y usuario en thread local
        _thread_locals.request = request
        _thread_locals.user = getattr(request, 'user', None)
        
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
