from django.urls import path
from system_config.views import SystemConfigView, ErrorLogsView

urlpatterns = [
    path('',     SystemConfigView.as_view(), name='system-config'),
    path('logs/', ErrorLogsView.as_view(),   name='system-config-logs'),
]