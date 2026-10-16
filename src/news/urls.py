from django.urls import path

from .views import (
    HealthCheckView,
    NewsDetailsView,
    NewsListView,
    trigger_news_sync,
)


urlpatterns = [
    path(
        "health/",
        HealthCheckView.as_view(),
        name="health-check",
    ),
    path(
        "news/",
        NewsListView.as_view(),
        name="news-list",
    ),
    path(
        "news/<int:pk>/",
        NewsDetailsView.as_view(),
        name="news-details",
    ),

    path(
    "internal/sync-news/",
    trigger_news_sync,
    name="trigger-news-sync",
),
]