from django.db import models


class News(models.Model):
    external_id = models.CharField(
        max_length=255,
        unique=True,
    )

    title = models.TextField()

    description = models.TextField(
        blank=True,
        null=True,
    )

    url = models.URLField(
        max_length=1000,
    )

    image = models.URLField(
        max_length=1000,
    )

    source = models.CharField(
        max_length=500,
    )

    published_at = models.DateTimeField()

    created_at = models.DateTimeField(
        auto_now_add=True,
        null=True,
        blank=True,
    )
    crawled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at"]
        indexes = [
            models.Index(
                fields=["-published_at"],
            ),
            models.Index(
                fields=["source"],
            ),
        ]

    def __str__(self):
        return self.title