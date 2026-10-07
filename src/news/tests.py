from datetime import timedelta
from unittest.mock import patch

from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import News


class NewsAPITests(APITestCase):
    def setUp(self):
        now = timezone.now()

        self.news_1 = News.objects.create(
            external_id="test-1",
            title="خبر اول",
            description="توضیحات خبر اول",
            url="https://example.com/news-1",
            image="https://example.com/image-1.jpg",
            source="Example",
            published_at=now,
            crawled_at=now,
        )

        self.news_2 = News.objects.create(
            external_id="test-2",
            title="خبر دوم",
            description="توضیحات خبر دوم",
            url="https://example.com/news-2",
            image="https://example.com/image-2.jpg",
            source="Example",
            published_at=now - timedelta(minutes=10),
            crawled_at=now - timedelta(minutes=10),
        )

    def test_news_list(self):
        response = self.client.get(reverse("news-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 2)

    def test_news_list_with_page_size(self):
        response = self.client.get(
            reverse("news-list"),
            {"page_size": 1},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNotNone(response.data["next_page"])

    def test_news_list_page_out_of_range(self):
        response = self.client.get(
            reverse("news-list"),
            {"page": 999},
        )

        self.assertEqual(response.status_code, 404)

    def test_news_detail(self):
        response = self.client.get(
            reverse("news-details", args=[self.news_1.id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "خبر اول")

    def test_news_search_by_title(self):
        response = self.client.get(
            reverse("news-list"),
            {"q": "اول"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["id"],
            self.news_1.id,
        )

    def test_news_search_by_description(self):
        response = self.client.get(
            reverse("news-list"),
            {"q": "توضیحات"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

    def test_news_search_by_source(self):
        response = self.client.get(
            reverse("news-list"),
            {"q": "Example"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

    def test_news_search_rejects_long_query(self):
        response = self.client.get(
            reverse("news-list"),
            {"q": "x" * 201},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["detail"],
            "Search query is too long.",
        )

    def test_news_detail_not_found(self):
        response = self.client.get(
            reverse("news-details", args=[999999])
        )

        self.assertEqual(response.status_code, 404)


class SyncNewsTests(APITestCase):
    def fake_api_response(self):
        now = timezone.now()

        return {
            "results": [
                {
                    "id": "sync-1",
                    "title": "خبر تستی",
                    "description": "توضیحات تستی",
                    "url": "https://example.com/test-news",
                    "image": "https://example.com/test-image.jpg",
                    "sitename": "Example",
                    "host": "example.com",
                    "published_at": now.isoformat(),
                    "crawled_at": now.isoformat(),
                }
            ]
        }

    @patch(
        "news.management.commands.sync_news.Command.fetch_articles"
    )
    def test_sync_creates_news(self, mock_fetch):
        mock_fetch.return_value = self.fake_api_response()

        call_command("sync_news")

        self.assertEqual(
            News.objects.filter(
                external_id="sync-1"
            ).count(),
            1,
        )

    @patch(
        "news.management.commands.sync_news.Command.fetch_articles"
    )
    def test_sync_skips_duplicate(self, mock_fetch):
        mock_fetch.return_value = self.fake_api_response()

        now = timezone.now()

        News.objects.create(
            external_id="sync-1",
            title="خبر قبلی",
            url="https://example.com/old",
            image="https://example.com/old.jpg",
            source="Example",
            published_at=now,
            crawled_at=now,
        )

        call_command("sync_news")

        self.assertEqual(
            News.objects.filter(
                external_id="sync-1"
            ).count(),
            1,
        )

    @patch(
        "news.management.commands.sync_news.Command.fetch_articles"
    )
    def test_sync_skips_article_without_image(self, mock_fetch):
        data = self.fake_api_response()
        data["results"][0]["image"] = None

        mock_fetch.return_value = data

        with patch(
            "news.management.commands.sync_news.Command.get_image",
            return_value=None,
        ):
            call_command("sync_news")

        self.assertEqual(
            News.objects.filter(
                external_id="sync-1"
            ).count(),
            0,
        )
