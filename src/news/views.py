from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article
from .serializers import ArticleSerializer


class NewsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class NewsListView(APIView):
    def get(self, request):
        articles = Article.objects.order_by("-published_at")

        paginator = NewsPagination()
        page = paginator.paginate_queryset(articles, request)

        serializer = ArticleSerializer(page, many=True)

        return Response({
            "count": paginator.page.paginator.count,
            "results": serializer.data,
            "next_page": (
                paginator.page.next_page_number()
                if paginator.page.has_next()
                else None
            ),
        })