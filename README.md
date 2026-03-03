# 🦊 ProxFox — AI-Powered Personal Finance Analyzer

## 📁 Project Structure

```
proxfox/
├── 📄 index.html              ← React app entry point
├── 📄 vite.config.js          ← Vite config (proxies /api → localhost:5000)
├── 📄 package.json            ← Frontend dependencies
├── 📄 .env                    ← Environment variables (MongoDB URI, JWT secret)
├── 📄 .gitignore
│
├── 📂 src/                    ← React Frontend
│   ├── pages/                 ← Route pages (Dashboard, Login, Admin, etc.)
│   ├── components/            ← Reusable UI components
│   ├── context/               ← AuthContext (global login state)
│   └── main.jsx               ← App entry
│
└── 📂 backend/                ← Django Python Backend
    ├── manage.py              ← Run: python manage.py runserver 5000
    ├── settings.py            ← Django config
    ├── urls.py                ← Root URL router
    └── api/
        ├── views.py           ← All API endpoints
        └── urls.py            ← API routes
```

## 🚀 How to Run

Open **2 terminals**:

**Terminal 1 — Backend (Django):**
```bash
cd proxfox/backend
python manage.py runserver 5000
```

**Terminal 2 — Frontend (React):**
```bash
cd proxfox
npm run dev
```

Then open **http://localhost:5173**

## 🔑 Admin Access
Register with any email starting with `admin` (e.g. `admin@proxfox.com`) to get admin role.

## 🛠 Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Recharts |
| Backend | Django 5 + Django REST Framework |
| Database | MongoDB Atlas (PyMongo) |
| Auth | JWT + bcrypt |
| AI | Google Gemini API |
