"""URL configuration for backend project."""

from django.contrib import admin
from django.urls import include, include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth endpoints
    path('api/auth/', include('users.urls')),

    # API schema & docs (only useful in development — disable in production)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/vocabulary/', include('vocabulary.urls')),
    path('api/', include('attempts.urls')),
    path('api/', include('questions.urls')),
    path('api/', include('exams.urls')),
    path('api/system/', include('system_config.url')),

]