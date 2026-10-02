import requests
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from news.models import Article


class Command(BaseCommand):
    help = "Fetch latest Persian news and sync the database"

    def handle(self, *args, **options):
        self.stdout.write("Fetching news...")

        response = requests.get(
            "https://freenewsapi.ai/v1/search",
            params={
                "lang": "fa",
                "date": "today",
                "sort": "date",
                "size": 100,
            },
            timeout=10,
        )

        response.raise_for_status()
        data = response.json()

        results = data.get("results", [])
        new_articles = 0

        self.stdout.write(f"Received {len(results)} articles.")

        for item in results:
            if Article.objects.filter(external_id=item["id"]).exists():
                continue

            Article.objects.create(
                external_id=item["id"],
                title=item["title"],
                description=item.get("description"),
                url=item["url"],
                image=item.get("image"),
                source=item["sitename"],
                published_at=item["published_at"],
            )

            new_articles += 1

        cutoff = timezone.now() - timedelta(days=7)

        Article.objects.filter(published_at__lt=cutoff).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Sync complete. {new_articles} new articles added."
            )
        )