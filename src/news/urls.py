from django.urls import path
from .views import NewsListView, NewsDetailsView


urlpatterns = [
    path("news/", NewsListView.as_view(), name="news-list"),
    path("news/<int:pk>/", NewsDetailsView.as_view(), name="news-details"),
]