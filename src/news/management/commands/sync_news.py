import json
from datetime import timedelta

import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.utils import timezone

from news.models import News


class Command(BaseCommand):
    help = "Fetch Persian news from FreeNewsAPI"

    API_URL = "https://freenewsapi.ai/v1/search"

    def get_image(self, url):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # og:image
            tag = soup.find("meta", property="og:image")
            if tag and tag.get("content"):
                return tag["content"]

            # JSON-LD
            for script in soup.find_all(
                "script",
                type="application/ld+json",
            ):
                try:
                    data = json.loads(script.string or "")

                    if isinstance(data, dict):
                        image = data.get("image")

                        if isinstance(image, str):
                            return image

                        if isinstance(image, list) and image:
                            first = image[0]

                            if isinstance(first, str):
                                return first

                            if isinstance(first, dict):
                                return first.get("url")

                        if isinstance(image, dict):
                            return image.get("url")

                except (ValueError, TypeError):
                    continue

        except requests.RequestException:
            pass

        return None

    def handle(self, *args, **options):
        self.stdout.write(
            "Fetching Persian news from FreeNewsAPI..."
        )

        latest_news = (
            News.objects.filter(
                published_at__lte=timezone.now()
            )
            .order_by("-published_at")
            .first()
        )

        if latest_news:
            from_time = latest_news.published_at
            self.stdout.write(
                f"Fetching news after: {from_time.isoformat()}"
            )
        else:
            from_time = timezone.now() - timedelta(hours=2)
            self.stdout.write(
                f"No existing news found. Fetching from: "
                f"{from_time.isoformat()}"
            )

        from_time_string = from_time.astimezone(
            timezone.UTC
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

        try:
            response = requests.get(
                self.API_URL,
                params={
                    "lang": "fa",
                    "size": 100,
                    "sort": "date",
                    "from": from_time_string,
                },
                timeout=20,
            )
            response.raise_for_status()

            data = response.json()

        except (requests.RequestException, ValueError) as exc:
            self.stderr.write(
                self.style.ERROR(
                    f"FreeNewsAPI request failed: {exc}"
                )
            )
            return

        articles = data.get("results", [])

        self.stdout.write(
            f"Received {len(articles)} articles."
        )

        new_news = 0
        skipped_no_image = 0
        skipped_duplicate = 0

        for item in articles:
            external_id = item.get("id")
            title = item.get("title")
            url = item.get("url")
            image = item.get("image")

            if not external_id or not title or not url:
                continue

            if News.objects.filter(
                external_id=external_id
            ).exists():
                skipped_duplicate += 1
                continue

            # FreeNewsAPI image first.
            if not image:
                image = self.get_image(url)

            # No image = don't save.
            if not image:
                skipped_no_image += 1

                self.stdout.write(
                    self.style.WARNING(
                        f"Skipped without image: {title[:80]}"
                    )
                )

                continue

            published_at = item.get("published_at")

            if not published_at:
                continue

            try:
                published_at = timezone.datetime.fromisoformat(
                    published_at.replace("Z", "+00:00")
                )

                if timezone.is_naive(published_at):
                    published_at = timezone.make_aware(
                        published_at
                    )

                if published_at > timezone.now():
                    continue

            except (ValueError, TypeError):
                continue

            try:
                News.objects.create(
                    external_id=external_id,
                    title=title,
                    description=item.get("description"),
                    url=url,
                    image=image,
                    source=(
                        item.get("sitename")
                        or item.get("host")
                        or "Unknown"
                    ),
                    published_at=published_at,
                )

                new_news += 1

            except IntegrityError:
                skipped_duplicate += 1

        cutoff = timezone.now() - timedelta(days=7)

        deleted_count, _ = News.objects.filter(
            published_at__lt=cutoff
        ).delete()

        self.stdout.write(
            self.style.SUCCESS(
                "Sync complete. "
                f"{new_news} added, "
                f"{skipped_duplicate} duplicates skipped, "
                f"{skipped_no_image} without images skipped, "
                f"{deleted_count} old articles deleted."
            )
        )