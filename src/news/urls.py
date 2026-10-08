from django.urls import path

from .views import (
    HealthCheckView,
    NewsDetailsView,
    NewsListView,
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
]