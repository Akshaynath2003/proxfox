import json
import os
import random
import re
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/proxfox")
JWT_SECRET = os.getenv("JWT_SECRET", "proxfox_super_secret_key_123!")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("VITE_GEMINI_API_KEY", ""))
CORS_ALLOW_ALL = os.getenv("CORS_ALLOW_ALL_ORIGINS", "True") == "True"
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
MONGO_MAX_POOL_SIZE = int(os.getenv("MONGO_MAX_POOL_SIZE", "30"))
MONGO_MIN_POOL_SIZE = int(os.getenv("MONGO_MIN_POOL_SIZE", "5"))
MONGO_DB_NAME = MONGO_URI.rsplit("/", 1)[-1].split("?", 1)[0] or "proxfox"

mongo_client: MongoClient | None = None
mongo_db = None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_db():
    global mongo_client, mongo_db
    if mongo_db is None:
        mongo_client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connect=False,
            maxPoolSize=MONGO_MAX_POOL_SIZE,
            minPoolSize=MONGO_MIN_POOL_SIZE,
            retryWrites=True,
        )
        mongo_db = mongo_client[MONGO_DB_NAME]
    return mongo_db


def ensure_indexes() -> None:
    db = get_db()
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.users.create_index([("role", ASCENDING), ("status", ASCENDING)])
    db.transactions.create_index([("user", ASCENDING), ("date", DESCENDING)])
    db.goals.create_index([("user", ASCENDING), ("createdAt", DESCENDING)])
    db.password_reset_tokens.create_index([("email", ASCENDING), ("token", ASCENDING)])
    db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes()
    yield
    if mongo_client is not None:
        mongo_client.close()


app = FastAPI(title="ProxFox API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ALLOW_ALL or not CORS_ORIGINS else CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message", "Request failed")
    else:
        message = detail
    return JSONResponse(status_code=exc.status_code, content={"message": message})


def error(message: str, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail=message)


def serialize(doc: dict[str, Any] | None):
    if doc is None:
        return None
    result = dict(doc)
    for key, value in result.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def generate_token(user_id: ObjectId | str) -> str:
    payload = {
        "id": str(user_id),
        "exp": utcnow() + timedelta(days=30),
        "iat": utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def get_uid(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        return jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"]).get("id")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def require_auth(request: Request) -> str:
    uid = get_uid(request)
    if not uid:
        error("Not authorized, token failed", 401)
    return uid


def require_admin(request: Request) -> str:
    uid = require_auth(request)
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(uid)})
    if not user or user.get("role") != "admin":
        error("Not authorized as admin", 403)
    return uid


def parse_object_id(value: str, label: str):
    try:
        return ObjectId(value)
    except InvalidId:
        error(f"Invalid {label} ID")


def normalize_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        try:
            parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
                try:
                    return datetime.strptime(cleaned, fmt).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
    return None


def bucket_labels(range_param: str, start: datetime, end: datetime):
    labels: list[str] = []
    if range_param == "6months":
        cursor = datetime(start.year, start.month, 1, tzinfo=timezone.utc)
        while cursor <= end:
            labels.append(cursor.strftime("%b"))
            if cursor.month == 12:
                cursor = cursor.replace(year=cursor.year + 1, month=1)
            else:
                cursor = cursor.replace(month=cursor.month + 1)
        return labels

    cursor = start
    while cursor <= end:
        labels.append(cursor.strftime("%d %b") if range_param == "month" else cursor.strftime("%a"))
        cursor += timedelta(days=1)
    return labels


def chart_key(dt: datetime, range_param: str) -> str:
    if range_param == "6months":
        return dt.strftime("%b")
    if range_param == "month":
        return dt.strftime("%d %b")
    return dt.strftime("%a")


def compute_summary(db, uid: str):
    pipeline = [
        {"$match": {"user": uid}},
        {"$group": {"_id": "$type", "total": {"$sum": {"$ifNull": ["$amount", 0]}}}},
    ]
    totals = {row["_id"]: float(row["total"]) for row in db.transactions.aggregate(pipeline)}
    income = totals.get("income", 0.0)
    expense = totals.get("expense", 0.0)
    investment = totals.get("investment", 0.0)
    return {
        "totalIncome": income,
        "totalExpense": expense,
        "totalInvestment": investment,
        "balance": income - expense - investment,
    }


def compute_category_breakdown(db, uid: str):
    pipeline = [
        {"$match": {"user": uid, "type": "expense"}},
        {
            "$group": {
                "_id": {"$ifNull": ["$category", "Other"]},
                "value": {"$sum": {"$ifNull": ["$amount", 0]}},
            }
        },
        {"$sort": {"value": -1}},
    ]
    return [{"name": row["_id"], "value": round(float(row["value"]), 2)} for row in db.transactions.aggregate(pipeline)]


def compute_chart_data(db, uid: str, range_param: str):
    now = utcnow()
    if range_param == "month":
        start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif range_param == "6months":
        cursor = now - timedelta(days=150)
        start = datetime(cursor.year, cursor.month, 1, tzinfo=timezone.utc)
    else:
        start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)

    buckets = {label: {"income": 0.0, "expenses": 0.0} for label in bucket_labels(range_param, start, now)}
    cursor = db.transactions.find({"user": uid}, {"date": 1, "type": 1, "amount": 1})
    for txn in cursor:
        parsed_date = normalize_datetime(txn.get("date"))
        if not parsed_date or parsed_date < start or parsed_date > now:
            continue
        label = chart_key(parsed_date, range_param)
        bucket = buckets.setdefault(label, {"income": 0.0, "expenses": 0.0})
        amount = float(txn.get("amount", 0) or 0)
        if txn.get("type") == "income":
            bucket["income"] += amount
        else:
            bucket["expenses"] += amount

    return [
        {"name": label, "income": round(values["income"], 2), "expenses": round(values["expenses"], 2)}
        for label, values in buckets.items()
    ]


def dashboard_payload(db, uid: str, range_param: str):
    return {
        "summary": compute_summary(db, uid),
        "chartData": compute_chart_data(db, uid, range_param),
        "categoryData": compute_category_breakdown(db, uid),
    }


def load_gemini_model():
    if not GEMINI_API_KEY:
        error("Gemini API key not configured on server", 500)

    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)
    try:
        return genai.GenerativeModel("gemini-2.5-flash")
    except Exception:
        return genai.GenerativeModel("gemini-pro")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=201)
def register_user(payload: dict[str, Any]):
    username = payload.get("username", "").strip()
    email = payload.get("email", "").strip().lower()
    phone = payload.get("phoneNumber", "")
    password = payload.get("password", "")

    if not all([username, email, password]):
        error("Please provide username, email and password")

    db = get_db()
    if db.users.find_one({"email": email}):
        error("User already exists")

    role = "admin" if email.startswith("admin") else "user"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    result = db.users.insert_one(
        {
            "username": username,
            "email": email,
            "phoneNumber": phone,
            "password": hashed,
            "role": role,
            "status": "active",
            "createdAt": utcnow(),
        }
    )
    return {
        "_id": str(result.inserted_id),
        "username": username,
        "email": email,
        "role": role,
        "token": generate_token(result.inserted_id),
    }


@app.post("/api/auth/login")
def login_user(payload: dict[str, Any]):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    db = get_db()
    user = db.users.find_one({"email": email})
    if not user:
        error("Invalid email or password", 401)
    if not bcrypt.checkpw(password.encode(), user["password"].encode()):
        error("Invalid email or password", 401)
    if user.get("status") != "active":
        error(f"Account is {user.get('status')}", 401)

    return {
        "_id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "token": generate_token(user["_id"]),
    }


@app.post("/api/auth/forgot-password")
def forgot_password(payload: dict[str, Any]):
    email = payload.get("email", "").strip().lower()
    if not email:
        error("Email is required")

    db = get_db()
    user = db.users.find_one({"email": email})
    if not user:
        return {"message": "If that email exists, an OTP has been generated."}

    otp = f"{random.randint(100000, 999999)}"
    db.password_reset_tokens.delete_many({"email": email})
    db.password_reset_tokens.insert_one(
        {
            "email": email,
            "token": otp,
            "expires_at": utcnow() + timedelta(hours=1),
            "created_at": utcnow(),
        }
    )
    return {"message": "OTP generated successfully.", "otp": otp}


@app.post("/api/auth/reset-password")
def reset_password(payload: dict[str, Any]):
    email = payload.get("email", "").strip().lower()
    token = payload.get("token", "").strip()
    new_password = payload.get("password", "")
    if not email or not token or not new_password:
        error("Email, OTP, and new password are required")

    db = get_db()
    record = db.password_reset_tokens.find_one({"email": email, "token": token})
    if not record:
        error("OTP is invalid or expired.")
    if utcnow() > record["expires_at"]:
        db.password_reset_tokens.delete_one({"token": token})
        error("Reset link has expired. Please request a new one.")

    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.users.update_one({"email": record["email"]}, {"$set": {"password": hashed}})
    db.password_reset_tokens.delete_one({"token": token})
    return {"message": "Password updated successfully."}


@app.get("/api/auth/profile")
def get_user_profile(request: Request):
    uid = require_auth(request)
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(uid)}, {"password": 0})
    if not user:
        error("User not found", 404)
    return serialize(user)


@app.get("/api/finance/transactions")
def get_transactions(request: Request):
    uid = require_auth(request)
    db = get_db()
    txns = list(db.transactions.find({"user": uid}).sort("date", -1))
    return [serialize(txn) for txn in txns]


@app.post("/api/finance/transactions", status_code=201)
def create_transaction(request: Request, payload: dict[str, Any]):
    uid = require_auth(request)
    db = get_db()
    doc = {
        "user": uid,
        "amount": float(payload.get("amount", 0)),
        "type": payload.get("type", "expense"),
        "category": payload.get("category", "Other"),
        "description": payload.get("description", ""),
        "date": payload.get("date", utcnow().date().isoformat()),
        "createdAt": utcnow(),
    }
    result = db.transactions.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["createdAt"] = doc["createdAt"].isoformat()
    return doc


@app.put("/api/finance/transactions/{txn_id}")
def update_transaction(txn_id: str, request: Request, payload: dict[str, Any]):
    uid = require_auth(request)
    db = get_db()
    oid = parse_object_id(txn_id, "transaction")

    update: dict[str, Any] = {}
    for field in ("amount", "type", "category", "description", "date"):
        if field in payload:
            update[field] = float(payload[field]) if field == "amount" else payload[field]
    if not update:
        error("No fields to update")

    result = db.transactions.find_one_and_update(
        {"_id": oid, "user": uid},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        error("Transaction not found", 404)
    return serialize(result)


@app.delete("/api/finance/transactions/{txn_id}")
def delete_transaction(txn_id: str, request: Request):
    uid = require_auth(request)
    db = get_db()
    oid = parse_object_id(txn_id, "transaction")
    result = db.transactions.delete_one({"_id": oid, "user": uid})
    if result.deleted_count == 0:
        error("Transaction not found", 404)
    return {"message": "Transaction deleted"}


@app.get("/api/finance/summary")
def finance_summary(request: Request):
    uid = require_auth(request)
    return compute_summary(get_db(), uid)


@app.get("/api/finance/chart-data")
def chart_data(request: Request, range: str = Query(default="week")):
    uid = require_auth(request)
    return compute_chart_data(get_db(), uid, range)


@app.get("/api/finance/category-breakdown")
def category_breakdown(request: Request):
    uid = require_auth(request)
    return compute_category_breakdown(get_db(), uid)


@app.get("/api/finance/dashboard")
def finance_dashboard(request: Request, range: str = Query(default="week")):
    uid = require_auth(request)
    return dashboard_payload(get_db(), uid, range)


@app.post("/api/ai/parse-expense")
def parse_expense(request: Request, payload: dict[str, Any]):
    require_auth(request)
    text = payload.get("text", "").strip()
    if not text:
        error("Text is required")

    model = load_gemini_model()
    today = utcnow().strftime("%Y-%m-%d")
    prompt = f"""Extract financial transaction details from the following text.
Return ONLY a valid JSON object with these fields:
- "amount": number (the monetary amount)
- "category": string (one of: Food, Transport, Housing, Entertainment, Shopping, Health, Education, Utilities, Other)
- "date": string in YYYY-MM-DD format (if mentioned, else use "{today}")
- "description": string (brief summary)
- "type": string ("expense" or "income")
- "confidence": number 0-100 (how confident you are)

Text: "{text}"

Respond with ONLY the JSON object, no markdown, no explanation."""

    try:
        result = model.generate_content(prompt)
        raw = result.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        error("AI returned invalid JSON. Please try rephrasing.", 422)
    except Exception as exc:
        error(f"AI processing failed: {str(exc)}", 500)

    parsed.setdefault("amount", 0)
    parsed.setdefault("category", "Other")
    parsed.setdefault("date", today)
    parsed.setdefault("description", text)
    parsed.setdefault("type", "expense")
    parsed.setdefault("confidence", 50)
    return parsed


@app.post("/api/ai/chat")
def ai_chat(request: Request, payload: dict[str, Any]):
    uid = require_auth(request)
    message = payload.get("message", "").strip()
    history = payload.get("history", [])
    if not message:
        error("Message is required")

    db = get_db()
    txns = list(db.transactions.find({"user": uid}).sort("date", -1).limit(20))
    goals_list = list(db.goals.find({"user": uid}))

    income = sum(float(txn.get("amount", 0) or 0) for txn in txns if txn.get("type") == "income")
    expense = sum(float(txn.get("amount", 0) or 0) for txn in txns if txn.get("type") == "expense")
    balance = income - expense

    recent_txns = "".join(
        f"  - {txn.get('type', 'expense')}: ${float(txn.get('amount', 0) or 0):.0f} "
        f"on {txn.get('category', 'Other')} ({txn.get('description', '')})\n"
        for txn in txns[:10]
    )
    goals_text = "".join(
        f"  - {goal.get('name', '')}: ${float(goal.get('currentSavings', 0) or 0):.0f} / "
        f"${float(goal.get('targetAmount', 0) or 0):.0f} "
        f"({int(goal.get('deadlineMonths', 0) or 0)} months left, "
        f"needs ${float(goal.get('monthlyNeeded', 0) or 0):.0f}/mo)\n"
        for goal in goals_list
    )

    system_prompt = f"""You are ProxFox AI, a professional and friendly personal finance advisor.
You have access to the user's real financial data:

FINANCIAL SNAPSHOT:
- Total Income: ${income:.2f}
- Total Expenses: ${expense:.2f}
- Current Balance: ${balance:.2f}

RECENT TRANSACTIONS:
{recent_txns if recent_txns else '  No transactions yet.'}

SAVINGS GOALS:
{goals_text if goals_text else '  No goals set yet.'}

RULES:
- Keep responses concise (2-4 paragraphs max)
- Give specific, actionable advice based on their real data
- Use bullet points for lists
- Do not use markdown headers (# or ##)
- Be encouraging but honest about spending habits
- If they ask about something unrelated to finance, gently redirect"""

    model = load_gemini_model()
    conversation = [system_prompt + "\n\nUser: " + message]
    if history:
        transcript = system_prompt + "\n\n"
        for item in history[-6:]:
            role = "User" if item.get("role") == "user" else "ProxFox AI"
            transcript += f"{role}: {item.get('text', '')}\n\n"
        transcript += f"User: {message}\n\nProxFox AI:"
        conversation = [transcript]

    try:
        result = model.generate_content(conversation[0])
    except Exception as exc:
        error(f"AI processing failed: {str(exc)}", 500)
    return {"reply": result.text.strip()}


@app.get("/api/goals")
def get_goals(request: Request):
    uid = require_auth(request)
    db = get_db()
    goal_docs = list(db.goals.find({"user": uid}).sort("createdAt", -1))
    return [serialize(goal) for goal in goal_docs]


@app.post("/api/goals", status_code=201)
def create_goal(request: Request, payload: dict[str, Any]):
    uid = require_auth(request)
    db = get_db()
    name = payload.get("name", "").strip()
    target_amount = float(payload.get("targetAmount", 0))
    current_savings = float(payload.get("currentSavings", 0))
    deadline_months = int(payload.get("deadlineMonths", 12))
    if not name or target_amount <= 0:
        error("Goal name and target amount are required")

    remaining = target_amount - current_savings
    monthly_needed = round(remaining / max(deadline_months, 1), 2) if remaining > 0 else 0
    doc = {
        "user": uid,
        "name": name,
        "targetAmount": target_amount,
        "currentSavings": current_savings,
        "deadlineMonths": deadline_months,
        "monthlyNeeded": monthly_needed,
        "feasible": monthly_needed >= 0,
        "createdAt": utcnow(),
    }
    result = db.goals.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["createdAt"] = doc["createdAt"].isoformat()
    return doc


@app.put("/api/goals/{goal_id}")
def update_goal(goal_id: str, request: Request, payload: dict[str, Any]):
    uid = require_auth(request)
    db = get_db()
    oid = parse_object_id(goal_id, "goal")
    goal = db.goals.find_one({"_id": oid, "user": uid})
    if not goal:
        error("Goal not found", 404)

    update: dict[str, Any] = {}
    for field in ("name", "targetAmount", "currentSavings", "deadlineMonths"):
        if field in payload:
            if field in {"targetAmount", "currentSavings"}:
                update[field] = float(payload[field])
            elif field == "deadlineMonths":
                update[field] = int(payload[field])
            else:
                update[field] = payload[field]

    target = update.get("targetAmount", goal["targetAmount"])
    savings = update.get("currentSavings", goal["currentSavings"])
    months = update.get("deadlineMonths", goal["deadlineMonths"])
    remaining = target - savings
    update["monthlyNeeded"] = round(remaining / max(months, 1), 2) if remaining > 0 else 0
    update["feasible"] = update["monthlyNeeded"] >= 0

    result = db.goals.find_one_and_update(
        {"_id": oid, "user": uid},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    return serialize(result)


@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: str, request: Request):
    uid = require_auth(request)
    db = get_db()
    oid = parse_object_id(goal_id, "goal")
    result = db.goals.delete_one({"_id": oid, "user": uid})
    if result.deleted_count == 0:
        error("Goal not found", 404)
    return {"message": "Goal deleted"}


@app.get("/api/admin/users")
def admin_users(request: Request):
    require_admin(request)
    db = get_db()
    users = list(db.users.find({}, {"password": 0}))
    return [serialize(user) for user in users]


@app.put("/api/admin/user/{user_id}/status")
def admin_user_status(user_id: str, request: Request, payload: dict[str, Any]):
    require_admin(request)
    db = get_db()
    oid = parse_object_id(user_id, "user")
    result = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"status": payload.get("status")}},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        error("User not found", 404)
    return {
        "_id": str(result["_id"]),
        "username": result.get("username"),
        "email": result.get("email"),
        "status": result.get("status"),
    }


@app.get("/api/admin/stats")
def admin_stats(request: Request):
    require_admin(request)
    db = get_db()
    return {
        "totalUsers": db.users.count_documents({}),
        "activeUsers": db.users.count_documents({"status": "active"}),
        "totalTransactions": db.transactions.count_documents({}),
        "totalGoals": db.goals.count_documents({}),
    }


@app.get("/api/settings")
def get_settings(request: Request):
    require_auth(request)
    db = get_db()
    settings_doc = db.systemsettings.find_one({})
    if not settings_doc:
        settings_doc = {"theme": "dark", "notifications": True, "currency": "INR"}
        db.systemsettings.insert_one(settings_doc)
    return serialize(settings_doc)


@app.put("/api/settings")
def update_settings(request: Request, payload: dict[str, Any]):
    require_auth(request)
    db = get_db()
    settings_doc = db.systemsettings.find_one_and_update(
        {},
        {"$set": payload},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return serialize(settings_doc)
