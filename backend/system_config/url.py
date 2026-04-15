from django.urls import path
from system_config.views import SystemConfigView, ErrorLogsView, PublicLevelsView

urlpatterns = [
    path('',       SystemConfigView.as_view(),  name='system-config'),
    path('logs/',  ErrorLogsView.as_view(),     name='system-config-logs'),
    path('levels/', PublicLevelsView.as_view(), name='system-config-levels'),
]