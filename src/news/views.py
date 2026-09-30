import requests



from rest_framework.response import Response
from rest_framework.views import APIView



class NewsListView(APIView):
    def get(self, request):
        response = requests.get(
            "https://freenewsapi.ai/v1/search",
            params={
                "lang": "fa",
                "date": "today",
                "sort": "date",
                "size": 10,
            },
            timeout=10,
        )

        return Response(response.json())