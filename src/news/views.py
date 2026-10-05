from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import News
from .serializers import NewsListSerializer, NewsDetailsSerializer


class NewsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

class NewsListView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()

        news = News.objects.filter(
            published_at__lte=timezone.now()
        ).order_by("-published_at")

        if query:
            news = news.filter(title__icontains=query)

        paginator = NewsPagination()
        page = paginator.paginate_queryset(news, request)

        serializer = NewsListSerializer(page, many=True)

        return Response({
            "count": paginator.page.paginator.count,
            "results": serializer.data,
            "next_page": (
                paginator.page.next_page_number()
                if paginator.page.has_next()
                else None
            ),
        })


class NewsDetailsView(APIView):
    def get(self, request, pk):
        news = get_object_or_404(News, pk=pk)

        serializer = NewsDetailsSerializer(news)

        return Response(serializer.data)




class SerachNewsViews(APIView):
    pass