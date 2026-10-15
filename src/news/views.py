from datetime import datetime, timedelta


from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import News
from .serializers import NewsDetailsSerializer, NewsListSerializer


class NewsPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100

@method_decorator(cache_page(30), name="dispatch")
class NewsListView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        source = request.query_params.get("source", "").strip()
        from_date = request.query_params.get("from", "").strip()
        to_date = request.query_params.get("to", "").strip()
        days_ago = request.query_params.get("days_ago", "").strip()

        if len(query) > 200:
            return Response(
                {"detail": "Search query is too long."},
                status=400,
            )

        if len(source) > 200:
            return Response(
                {"detail": "Source is too long."},
                status=400,
            )

        parsed_days_ago = None
        if days_ago:
            try:
                parsed_days_ago = int(days_ago)
            except ValueError:
                return Response(
                    {"detail": "Invalid 'days_ago'. Use an integer from 0 to 7."},
                    status=400,
                )

            if not 0 <= parsed_days_ago <= 7:
                return Response(
                    {"detail": "'days_ago' must be between 0 and 7."},
                    status=400,
                )

        parsed_from_date = None
        parsed_to_date = None

        if from_date:
            try:
                parsed_from_date = datetime.strptime(
                    from_date,
                    "%Y-%m-%d",
                ).date()
            except ValueError:
                return Response(
                    {"detail": "Invalid 'from' date. Use YYYY-MM-DD."},
                    status=400,
                )

        if to_date:
            try:
                parsed_to_date = datetime.strptime(
                    to_date,
                    "%Y-%m-%d",
                ).date()
            except ValueError:
                return Response(
                    {"detail": "Invalid 'to' date. Use YYYY-MM-DD."},
                    status=400,
                )

        if (
            parsed_from_date
            and parsed_to_date
            and parsed_from_date > parsed_to_date
        ):
            return Response(
                {"detail": "'from' date cannot be later than 'to' date."},
                status=400,
            )

        news = News.objects.filter(
            published_at__lte=timezone.now()
        ).order_by("-published_at")

        if query:
            news = news.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(source__icontains=query)
            )

        if source:
            news = news.filter(source__icontains=source)

        if parsed_days_ago is not None:
            target_date = timezone.localdate() - timedelta(days=parsed_days_ago)
            news = news.filter(published_at__date=target_date)
        else:
            if parsed_from_date:
                news = news.filter(published_at__date__gte=parsed_from_date)

            if parsed_to_date:
                news = news.filter(published_at__date__lte=parsed_to_date)

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



@method_decorator(cache_page(600), name="dispatch")
class NewsDetailsView(APIView):
    def get(self, request, pk):
        news = get_object_or_404(
            News,
            pk=pk,
            published_at__lte=timezone.now(),
        )
        serializer = NewsDetailsSerializer(news)
        return Response(serializer.data)


class HealthCheckView(APIView):
    def get(self, request):
        return Response({"status": "ok"})
