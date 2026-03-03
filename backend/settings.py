"""
Django settings for ProxFox backend.
Works for both local development and Render production.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from proxfox root (works locally)
load_dotenv(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = os.getenv('SECRET_KEY', 'django-proxfox-insecure-key-change-in-production')
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Allow localhost for dev + any Render/Vercel domain for prod
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'corsheaders',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'urls'

# CORS — allow all in dev, restrict in prod via env var
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

DATABASES = {}  # Using PyMongo directly — no Django ORM

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_TZ = True

# MongoDB + JWT — read from environment variables
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/proxfox')
JWT_SECRET = os.getenv('JWT_SECRET', 'proxfox_super_secret_key_123!')
