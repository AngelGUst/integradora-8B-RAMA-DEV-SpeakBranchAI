from django.urls import path
from .views import (
    MetricsView,
    ActivityView,
    DistributionsView,
    ScoresView,
    AlertsView,
    TopStudentsView,
    RecentAttemptsView,
    ApiUsageView,
)

urlpatterns = [
    path('admin/dashboard/metrics/',         MetricsView.as_view(),         name='dashboard-metrics'),
    path('admin/dashboard/activity/',        ActivityView.as_view(),        name='dashboard-activity'),
    path('admin/dashboard/distributions/',   DistributionsView.as_view(),   name='dashboard-distributions'),
    path('admin/dashboard/scores/',          ScoresView.as_view(),          name='dashboard-scores'),
    path('admin/dashboard/alerts/',          AlertsView.as_view(),          name='dashboard-alerts'),
    path('admin/dashboard/top-students/',    TopStudentsView.as_view(),     name='dashboard-top-students'),
    path('admin/dashboard/recent-attempts/', RecentAttemptsView.as_view(),  name='dashboard-recent-attempts'),
    path('admin/dashboard/api-usage/',       ApiUsageView.as_view(),        name='dashboard-api-usage'),
]
