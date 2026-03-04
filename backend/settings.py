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

# Email — Use console backend in dev (no credentials needed), SMTP in production
_email_user = os.getenv('EMAIL_HOST_USER', '')
_email_pass = os.getenv('EMAIL_HOST_PASSWORD', '')
_has_email_creds = bool(_email_user and _email_pass and 'your_gmail' not in _email_user)

if _has_email_creds:
    # Production: send real emails via Gmail SMTP
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.gmail.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = _email_user
    EMAIL_HOST_PASSWORD = _email_pass
    DEFAULT_FROM_EMAIL = _email_user
else:
    # Development: print emails to the terminal console
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    EMAIL_HOST_USER = ''
    DEFAULT_FROM_EMAIL = 'noreply@proxfox.app'

