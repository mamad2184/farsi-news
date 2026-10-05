from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from .models import News


class NewsListFutureArticleTests(TestCase):
	def test_list_excludes_future_articles(self):
		now = timezone.now()
		current_article = News.objects.create(
			external_id="current-article",
			title="Current article",
			url="https://example.com/current",
			source="Example",
			published_at=now,
		)
		News.objects.create(
			external_id="future-article",
			title="Future article",
			url="https://example.com/future",
			source="Example",
			published_at=now + timedelta(hours=1),
		)

		response = self.client.get("/news/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(
			[article["id"] for article in response.json()["results"]],
			[current_article.id],
		)
