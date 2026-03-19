# ProxFox Backend (FastAPI + Python)

## Structure
```text
backend/
|-- fastapi_app.py     <- FastAPI entrypoint for Render / local dev
|-- manage.py          <- Legacy Django runner kept for compatibility
|-- settings.py        <- Legacy Django config
|-- urls.py            <- Legacy Django URL router
|-- __init__.py
`-- api/
    |-- views.py       <- Legacy Django API logic
    |-- urls.py        <- Legacy Django route definitions
    `-- __init__.py
```

## How to Run
```bash
cd proxfox/backend
uvicorn fastapi_app:app --reload
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
| GET  | /api/finance/dashboard | Combined dashboard payload |
| GET  | /api/admin/users | List all users (admin only) |
| PUT  | /api/admin/user/:id/status | Update user status (admin only) |
| GET  | /api/admin/stats | Platform stats (admin only) |
| GET  | /api/settings | Get system settings |
| PUT  | /api/settings | Update system settings |

## Tech Stack
- **Framework**: FastAPI + Uvicorn
- **Database**: MongoDB via PyMongo
- **Auth**: JWT + bcrypt password hashing
- **CORS**: FastAPI CORSMiddleware
