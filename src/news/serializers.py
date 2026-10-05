from rest_framework import serializers

from .models import News


class NewsListSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = (
            "id",
            "title",
            "description",
            "url",
            "image",
            "source",
            "published_at",
        )


class NewsDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = (
            "id",
            "title",
            "description",
            "url",
            "image",
            "source",
            "published_at",
        )