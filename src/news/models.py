from django.db import models

 

class Article(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
    title = models.TextField()
    description = models.TextField(blank=True)
    url = models.URLField()
    image = models.URLField(blank=True)
    source = models.CharField(max_length=255)
    published_at = models.DateTimeField()

    def __str__(self):
        return self.title