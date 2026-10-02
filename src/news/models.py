from django.db import models



class Article(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
    title = models.TextField()
    description = models.TextField(blank=True, null=True)
    url = models.URLField(max_length=1000)
    image = models.URLField(max_length=1000, blank=True, null=True)
    source = models.CharField(max_length=500)
    published_at = models.DateTimeField()

    def __str__(self):
        return self.title