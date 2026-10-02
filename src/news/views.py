from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article
from .serializers import ArticleSerializer


class NewsListView(APIView):
    def get(self, request):
        articles = Article.objects.order_by("-published_at")
        serializer = ArticleSerializer(articles, many=True)

        return Response(serializer.data)