from django.urls import path
from system_config.views import SystemConfigView, ErrorLogsView, LevelProgressionView, PublicLevelsView

urlpatterns = [
    path('',     SystemConfigView.as_view(), name='system-config'),
    path('logs/', ErrorLogsView.as_view(),   name='system-config-logs'),
    path('progression/', LevelProgressionView.as_view(), name='system-level-progression'),
    path('levels/', PublicLevelsView.as_view(), name='system-public-levels'),
]