# Farsi News

A Persian-language news reader with a Django REST Framework API and a React frontend built with Vite.

## Requirements

- Python 3.14+
- Node.js 20.19+ or 22.12+
- A PostgreSQL database (the defaults are for Neon)

## Backend

From the repository root, create and configure `.env` using `.env.example` as a guide. Keep database passwords and production Django secrets out of source control. In development, the backend uses an unsafe fallback secret only while `DJANGO_DEBUG=true`; production requires `DJANGO_SECRET_KEY`.

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd src
python manage.py migrate
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/news/`. It caches successful results for one minute and serves the latest saved articles if the news provider is unavailable.

## Frontend

In a second terminal, from the repository root:

```sh
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173/`). During development, Vite proxies `/news/` to Django on port 8000. For production, serve the frontend and proxy `/news/` to Django on the same origin.

## Checks

```sh
cd src
python manage.py test news --settings=config.test_settings
```

```sh
cd frontend
npm run lint
npm run build
```