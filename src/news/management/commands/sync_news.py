import json
import time
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

    API_TIMEOUT = (5, 15)
    IMAGE_TIMEOUT = (3, 7)
    MAX_API_RETRIES = 3

    def get_image(self, url):
        try:
            response = requests.get(
                url,
                timeout=self.IMAGE_TIMEOUT,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 "
                        "(compatible; FarsiNewsBot/1.0)"
                    )
                },
            )
            response.raise_for_status()

        except requests.RequestException:
            return None

        soup = BeautifulSoup(
            response.text,
            "html.parser",
        )

        tag = soup.find(
            "meta",
            property="og:image",
        )

        if tag and tag.get("content"):
            return tag["content"]

        for script in soup.find_all(
            "script",
            type="application/ld+json",
        ):
            try:
                data = json.loads(
                    script.string or ""
                )
            except (ValueError, TypeError):
                continue

            candidates = []

            if isinstance(data, dict):
                candidates.append(data)

            elif isinstance(data, list):
                candidates.extend(
                    item
                    for item in data
                    if isinstance(item, dict)
                )

            for item in candidates:
                image = item.get("image")

                if isinstance(image, str):
                    return image

                if isinstance(image, list):
                    for image_item in image:
                        if isinstance(image_item, str):
                            return image_item

                        if isinstance(image_item, dict):
                            image_url = image_item.get("url")

                            if image_url:
                                return image_url

                if isinstance(image, dict):
                    image_url = image.get("url")

                    if image_url:
                        return image_url

        return None

    def fetch_articles(self, from_time_string):
        last_error = None

        for attempt in range(
            1,
            self.MAX_API_RETRIES + 1,
        ):
            try:
                response = requests.get(
                    self.API_URL,
                    params={
                        "lang": "fa",
                        "size": 100,
                        "sort": "crawled",
                        "from": from_time_string,
                    },
                    timeout=self.API_TIMEOUT,
                )

                response.raise_for_status()

                return response.json()

            except (
                requests.RequestException,
                ValueError,
            ) as exc:
                last_error = exc

                if attempt < self.MAX_API_RETRIES:
                    wait_seconds = 2 ** (attempt - 1)

                    self.stdout.write(
                        self.style.WARNING(
                            "FreeNewsAPI request failed "
                            f"(attempt {attempt}/"
                            f"{self.MAX_API_RETRIES}). "
                            f"Retrying in {wait_seconds}s..."
                        )
                    )

                    time.sleep(wait_seconds)

        raise RuntimeError(
            "FreeNewsAPI request failed after "
            f"{self.MAX_API_RETRIES} attempts: "
            f"{last_error}"
        )

    def parse_datetime(self, value):
        if not value:
            return None

        try:
            parsed = timezone.datetime.fromisoformat(
                value.replace("Z", "+00:00")
            )

            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed)

            return parsed

        except (ValueError, TypeError):
            return None

    def handle(self, *args, **options):
        self.stdout.write(
            "Fetching Persian news from FreeNewsAPI..."
        )

        latest_news = (
            News.objects
            .exclude(crawled_at__isnull=True)
            .order_by("-crawled_at")
            .first()
        )

        if latest_news:
            from_time = latest_news.crawled_at

            self.stdout.write(
                "Fetching news after: "
                f"{from_time.isoformat()}"
            )
        else:
            from_time = (
                timezone.now()
                - timedelta(hours=2)
            )

            self.stdout.write(
                "No crawl cursor found. "
                f"Fetching from: {from_time.isoformat()}"
            )

        from_time_string = (
            from_time
            .astimezone(timezone.UTC)
            .strftime("%Y-%m-%dT%H:%M:%SZ")
        )

        try:
            data = self.fetch_articles(
                from_time_string
            )

        except RuntimeError as exc:
            self.stderr.write(
                self.style.ERROR(str(exc))
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

            published_at = self.parse_datetime(
                item.get("published_at")
            )

            crawled_at = self.parse_datetime(
                item.get("crawled_at")
            )

            if not published_at or not crawled_at:
                continue

            if not image:
                image = self.get_image(url)

            if not image:
                skipped_no_image += 1

                self.stdout.write(
                    self.style.WARNING(
                        "Skipped without image: "
                        f"{title[:80]}"
                    )
                )

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
                    crawled_at=crawled_at,
                )

                new_news += 1

            except IntegrityError:
                skipped_duplicate += 1

        cutoff = (
            timezone.now()
            - timedelta(days=7)
        )

        deleted_count, _ = (
            News.objects
            .filter(published_at__lt=cutoff)
            .delete()
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Sync complete. "
                f"{new_news} added, "
                f"{skipped_duplicate} duplicates skipped, "
                f"{skipped_no_image} without images skipped, "
                f"{deleted_count} old articles deleted."
            )
        )