import os

from dotenv import load_dotenv

from .settings import BASE_DIR

load_dotenv(BASE_DIR.parent / ".env")

from .settings import *  # noqa: E402,F403


TEST_DB_NAME = os.environ["NEON_TEST_DB_NAME"]

DATABASES["default"] = {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": TEST_DB_NAME,
    "USER": os.environ["NEON_TEST_DB_USER"],
    "PASSWORD": os.environ["NEON_TEST_DB_PASSWORD"],
    "HOST": os.environ["NEON_TEST_DB_HOST"],
    "PORT": os.environ.get(
        "NEON_TEST_DB_PORT",
        "5432",
    ),
    "OPTIONS": {
        "sslmode": "require",
    },
    "TEST": {
        "NAME": TEST_DB_NAME,
    },
}

TEST_RUNNER = "config.test_runner.PersistentTestRunner"