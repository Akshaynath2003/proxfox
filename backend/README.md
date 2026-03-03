# ProxFox Backend (Django + Python)

## Structure
```
backend/
├── manage.py          ← Run this to start the server
├── settings.py        ← Django config (MongoDB URI, CORS, JWT)
├── urls.py            ← Root URL router → /api/*
├── __init__.py
└── api/
    ├── views.py       ← All API logic (auth, finance, admin, settings)
    ├── urls.py        ← API route definitions
    └── __init__.py
```

## How to Run
```bash
cd proxfox/backend
python manage.py runserver 5000
```

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET  | /api/auth/profile | Get current user profile |
| GET  | /api/finance/transactions | List user transactions |
| POST | /api/finance/transactions | Add transaction |
| GET  | /api/finance/summary | Income/expense/balance summary |
| GET  | /api/admin/users | List all users (admin only) |
| PUT  | /api/admin/user/:id/status | Update user status (admin only) |
| GET  | /api/admin/stats | Platform stats (admin only) |
| GET  | /api/settings | Get system settings |
| PUT  | /api/settings | Update system settings |

## Tech Stack
- **Framework**: Django 5.x + Django REST Framework
- **Database**: MongoDB (via PyMongo — Atlas URI in root `.env`)
- **Auth**: JWT (PyJWT) + bcrypt password hashing
- **CORS**: django-cors-headers (allows localhost:5173)
