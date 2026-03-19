"""
ProxFox Backend — API Views
All endpoints return JsonResponse. MongoDB via PyMongo, JWT auth, Gemini AI.
"""

import os, json, re, jwt, bcrypt, secrets
from datetime import datetime, timedelta
from collections import defaultdict

from bson import ObjectId
from bson.errors import InvalidId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from pymongo import MongoClient, ReturnDocument
from django.conf import settings

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
            db_name = settings.MONGO_URI.split('/')[-1].split('?')[0] or 'proxfox'
            _db = _client[db_name]
        except Exception as e:
            print(f"MongoDB connection error: {e}")
    return _db

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _json(data, status=200):
    return JsonResponse(data, status=status, safe=False)

def _err(msg, status=400):
    return JsonResponse({'message': msg}, status=status)

def _parse_body(request):
    try:
        return json.loads(request.body)
    except Exception:
        return {}

def _serialize(doc):
    """Convert MongoDB doc to JSON-safe dict."""
    if doc is None:
        return None
    doc = dict(doc)
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

def _generate_token(user_id):
    return jwt.encode(
        {'id': str(user_id), 'exp': datetime.utcnow() + timedelta(days=30), 'iat': datetime.utcnow()},
        settings.JWT_SECRET, algorithm='HS256'
    )

def _get_uid(request):
    """Extract user ID from Bearer token."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        return jwt.decode(auth[7:], settings.JWT_SECRET, algorithms=['HS256']).get('id')
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def _require_auth(request):
    uid = _get_uid(request)
    if not uid:
        return None, _err('Not authorized, token failed', 401)
    return uid, None

def _require_admin(request):
    uid, err = _require_auth(request)
    if err:
        return None, err
    db = get_db()
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user or user.get('role') != 'admin':
        return None, _err('Not authorized as admin', 403)
    return uid, None


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

def health_check(request):
    """GET /api/health — instant liveness probe, no DB."""
    return _json({'status': 'ok'})


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def register_user(request):
    """POST /api/auth/register"""
    if request.method != 'POST':
        return _err('Method not allowed', 405)
    try:
        data = _parse_body(request)
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phoneNumber', '')
        password = data.get('password', '')

        if not all([username, email, password]):
            return _err('Please provide username, email and password')

        db = get_db()
        if db.users.find_one({'email': email}):
            return _err('User already exists')

        role = 'admin' if email.startswith('admin') else 'user'
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        result = db.users.insert_one({
            'username': username, 'email': email, 'phoneNumber': phone,
            'password': hashed, 'role': role, 'status': 'active',
            'createdAt': datetime.utcnow()
        })

        return _json({
            '_id': str(result.inserted_id), 'username': username,
            'email': email, 'role': role,
            'token': _generate_token(result.inserted_id)
        }, 201)
    except Exception as e:
        print(f"Register error: {e}")
        return _err('Server Error', 500)


@csrf_exempt
def login_user(request):
    """POST /api/auth/login"""
    if request.method != 'POST':
        return _err('Method not allowed', 405)
    try:
        data = _parse_body(request)
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        db = get_db()
        user = db.users.find_one({'email': email})
        if not user:
            return _err('Invalid email or password', 401)
        if not bcrypt.checkpw(password.encode(), user['password'].encode()):
            return _err('Invalid email or password', 401)
        if user.get('status') != 'active':
            return _err(f"Account is {user.get('status')}", 401)

        return _json({
            '_id': str(user['_id']), 'username': user['username'],
            'email': user['email'], 'role': user['role'],
            'token': _generate_token(user['_id'])
        })
    except Exception as e:
        print(f"Login error: {e}")
        return _err('Server Error', 500)


@csrf_exempt
def forgot_password(request):
    """POST /api/auth/forgot-password"""
    if request.method != 'POST':
        return _err('Method not allowed', 405)
    try:
        email = _parse_body(request).get('email', '').strip().lower()
        if not email:
            return _err('Email is required')

        db = get_db()
        user = db.users.find_one({'email': email})
        if not user:
            return _json({'message': 'If that email exists, an OTP has been generated.'})

        import random
        otp = str(random.randint(100000, 999999))
        db.password_reset_tokens.delete_many({'email': email})
        db.password_reset_tokens.insert_one({
            'email': email, 'token': otp,
            'expires_at': datetime.utcnow() + timedelta(hours=1),
            'created_at': datetime.utcnow(),
        })

        # Return OTP in response so frontend can display it for demonstration
        return _json({'message': 'OTP generated successfully.', 'otp': otp})
    except Exception as e:
        print(f"Forgot password error: {e}")
        return _err('Failed to send reset email. Please try again later.', 500)


@csrf_exempt
def reset_password(request):
    """POST /api/auth/reset-password"""
    if request.method != 'POST':
        return _err('Method not allowed', 405)
    try:
        data = _parse_body(request)
        email = data.get('email', '').strip().lower()
        token = data.get('token', '').strip()
        new_password = data.get('password', '')
        if not email or not token or not new_password:
            return _err('Email, OTP, and new password are required')

        db = get_db()
        record = db.password_reset_tokens.find_one({'email': email, 'token': token})
        if not record:
            return _err('OTP is invalid or expired.')
        if datetime.utcnow() > record['expires_at']:
            db.password_reset_tokens.delete_one({'token': token})
            return _err('Reset link has expired. Please request a new one.')

        hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        db.users.update_one({'email': record['email']}, {'$set': {'password': hashed}})
        db.password_reset_tokens.delete_one({'token': token})
        return _json({'message': 'Password updated successfully.'})
    except Exception as e:
        print(f"Reset password error: {e}")
        return _err('Server Error', 500)


@csrf_exempt
def get_user_profile(request):
    """GET /api/auth/profile"""
    uid, err = _require_auth(request)
    if err:
        return err
    try:
        db = get_db()
        user = db.users.find_one({'_id': ObjectId(uid)}, {'password': 0})
        if not user:
            return _err('User not found', 404)
        return _json(_serialize(user))
    except Exception:
        return _err('Server Error', 500)


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSACTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def transactions(request):
    """GET | POST /api/finance/transactions"""
    uid, err = _require_auth(request)
    if err:
        return err
    db = get_db()

    if request.method == 'GET':
        txns = list(db.transactions.find({'user': uid}).sort('date', -1))
        return _json([_serialize(t) for t in txns])

    if request.method == 'POST':
        try:
            data = _parse_body(request)
            doc = {
                'user': uid,
                'amount': float(data.get('amount', 0)),
                'type': data.get('type', 'expense'),
                'category': data.get('category', 'Other'),
                'description': data.get('description', ''),
                'date': data.get('date', datetime.utcnow().isoformat()),
                'createdAt': datetime.utcnow()
            }
            result = db.transactions.insert_one(doc)
            doc['_id'] = str(result.inserted_id)
            doc['createdAt'] = doc['createdAt'].isoformat()
            return _json(doc, 201)
        except Exception as e:
            print(f"Create transaction error: {e}")
            return _err('Server Error', 500)

    return _err('Method not allowed', 405)


@csrf_exempt
def transaction_detail(request, txn_id):
    """PUT | DELETE /api/finance/transactions/<txn_id>"""
    uid, err = _require_auth(request)
    if err:
        return err
    db = get_db()

    try:
        oid = ObjectId(txn_id)
    except InvalidId:
        return _err('Invalid transaction ID')

    if request.method == 'PUT':
        try:
            data = _parse_body(request)
            update = {}
            for field in ('amount', 'type', 'category', 'description', 'date'):
                if field in data:
                    update[field] = float(data[field]) if field == 'amount' else data[field]
            if not update:
                return _err('No fields to update')

            result = db.transactions.find_one_and_update(
                {'_id': oid, 'user': uid}, {'$set': update},
                return_document=ReturnDocument.AFTER
            )
            if not result:
                return _err('Transaction not found', 404)
            return _json(_serialize(result))
        except Exception as e:
            print(f"Update transaction error: {e}")
            return _err('Server Error', 500)

    if request.method == 'DELETE':
        result = db.transactions.delete_one({'_id': oid, 'user': uid})
        if result.deleted_count == 0:
            return _err('Transaction not found', 404)
        return _json({'message': 'Transaction deleted'})

    return _err('Method not allowed', 405)


# ═══════════════════════════════════════════════════════════════════════════════
# FINANCE SUMMARY & CHART DATA
# ═══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def finance_summary(request):
    """GET /api/finance/summary"""
    uid, err = _require_auth(request)
    if err:
        return err
    try:
        db = get_db()
        txns = list(db.transactions.find({'user': uid}))
        income = sum(t['amount'] for t in txns if t.get('type') == 'income')
        expense = sum(t['amount'] for t in txns if t.get('type') == 'expense')
        investment = sum(t['amount'] for t in txns if t.get('type') == 'investment')
        return _json({
            'totalIncome': income, 'totalExpense': expense,
            'totalInvestment': investment, 'balance': income - expense - investment
        })
    except Exception:
        return _err('Server Error', 500)


@csrf_exempt
def chart_data(request):
    """GET /api/finance/chart-data?range=week|month|6months
    Returns [{name, income, expenses}] for area/bar charts.
    """
    uid, err = _require_auth(request)
    if err:
        return err
    try:
        db = get_db()
        range_param = request.GET.get('range', 'week')

        now = datetime.utcnow()
        if range_param == 'month':
            start = now - timedelta(days=30)
        elif range_param == '6months':
            start = now - timedelta(days=180)
        else:
            start = now - timedelta(days=7)

        txns = list(db.transactions.find({'user': uid}))

        # Group by day label
        buckets = defaultdict(lambda: {'income': 0, 'expenses': 0})

        for t in txns:
            try:
                d = datetime.fromisoformat(t['date']) if isinstance(t['date'], str) else t['date']
            except Exception:
                continue
            if d < start:
                continue

            if range_param == '6months':
                label = d.strftime('%b')  # month name
            elif range_param == 'month':
                label = d.strftime('%d %b')  # day + month
            else:
                label = d.strftime('%a')  # weekday

            amt = t.get('amount', 0)
            if t.get('type') == 'income':
                buckets[label]['income'] += amt
            else:
                buckets[label]['expenses'] += amt

        result = [{'name': k, **v} for k, v in buckets.items()]
        return _json(result)
    except Exception as e:
        print(f"Chart data error: {e}")
        return _err('Server Error', 500)


@csrf_exempt
def category_breakdown(request):
    """GET /api/finance/category-breakdown
    Returns [{name, value}] for pie charts — expenses only.
    """
    uid, err = _require_auth(request)
    if err:
        return err
    try:
        db = get_db()
        txns = list(db.transactions.find({'user': uid, 'type': 'expense'}))
        cats = defaultdict(float)
        for t in txns:
            cats[t.get('category', 'Other')] += t.get('amount', 0)
        result = [{'name': k, 'value': round(v, 2)} for k, v in cats.items()]
        result.sort(key=lambda x: x['value'], reverse=True)
        return _json(result)
    except Exception as e:
        print(f"Category breakdown error: {e}")
        return _err('Server Error', 500)


# ═══════════════════════════════════════════════════════════════════════════════
# AI EXPENSE PARSING  (Google Gemini)
# ═══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def parse_expense(request):
    """POST /api/ai/parse-expense
    Body: { "text": "Spent 500 on groceries yesterday" }
    Returns: { amount, category, date, description, confidence }
    """
    uid, err = _require_auth(request)
    if err:
        return err
    if request.method != 'POST':
        return _err('Method not allowed', 405)

    try:
        text = _parse_body(request).get('text', '').strip()
        if not text:
            return _err('Text is required')

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return _err('Gemini API key not configured on server', 500)

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
        except Exception:
            model = genai.GenerativeModel('gemini-pro')

        today = datetime.utcnow().strftime('%Y-%m-%d')
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

        result = model.generate_content(prompt)
        raw = result.text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        parsed = json.loads(raw)
        # Ensure required fields
        parsed.setdefault('amount', 0)
        parsed.setdefault('category', 'Other')
        parsed.setdefault('date', today)
        parsed.setdefault('description', text)
        parsed.setdefault('type', 'expense')
        parsed.setdefault('confidence', 50)

        return _json(parsed)
    except json.JSONDecodeError:
        return _err('AI returned invalid JSON. Please try rephrasing.', 422)
    except Exception as e:
        print(f"AI parse error: {e}")
        return _err(f'AI processing failed: {str(e)}', 500)


@csrf_exempt
def ai_chat(request):
    """POST /api/ai/chat
    Body: { "message": "How can I save more?", "history": [...] }
    Returns: { "reply": "..." }
    Proxies to Gemini with full financial context.
    """
    uid, err = _require_auth(request)
    if err:
        return err
    if request.method != 'POST':
        return _err('Method not allowed', 405)

    try:
        data = _parse_body(request)
        message = data.get('message', '').strip()
        history = data.get('history', [])
        if not message:
            return _err('Message is required')

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return _err('Gemini API key not configured on server', 500)

        # Gather user's financial context for personalized advice
        db = get_db()
        txns = list(db.transactions.find({'user': uid}).sort('date', -1).limit(20))
        goals_list = list(db.goals.find({'user': uid}))

        income = sum(t['amount'] for t in txns if t.get('type') == 'income')
        expense = sum(t['amount'] for t in txns if t.get('type') == 'expense')
        balance = income - expense

        # Build financial snapshot
        recent_txns_str = ""
        for t in txns[:10]:
            recent_txns_str += f"  - {t.get('type','expense')}: ${t.get('amount',0):.0f} on {t.get('category','Other')} ({t.get('description','')})\n"

        goals_str = ""
        for g in goals_list:
            goals_str += f"  - {g.get('name','')}: ${g.get('currentSavings',0):.0f} / ${g.get('targetAmount',0):.0f} ({g.get('deadlineMonths',0)} months left, needs ${g.get('monthlyNeeded',0):.0f}/mo)\n"

        system_prompt = f"""You are ProxFox AI, a professional and friendly personal finance advisor.
You have access to the user's real financial data:

FINANCIAL SNAPSHOT:
- Total Income: ${income:.2f}
- Total Expenses: ${expense:.2f}
- Current Balance: ${balance:.2f}

RECENT TRANSACTIONS:
{recent_txns_str if recent_txns_str else '  No transactions yet.'}

SAVINGS GOALS:
{goals_str if goals_str else '  No goals set yet.'}

RULES:
- Keep responses concise (2-4 paragraphs max)
- Give specific, actionable advice based on their real data
- Use bullet points for lists
- Do not use markdown headers (# or ##)
- Be encouraging but honest about spending habits
- If they ask about something unrelated to finance, gently redirect"""

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
        except Exception:
            model = genai.GenerativeModel('gemini-pro')

        # Build conversation with history
        conversation = [system_prompt + "\n\nUser: " + message]
        if history:
            conv_text = system_prompt + "\n\n"
            for h in history[-6:]:  # Last 6 messages for context
                role = "User" if h.get('role') == 'user' else "ProxFox AI"
                conv_text += f"{role}: {h.get('text', '')}\n\n"
            conv_text += f"User: {message}\n\nProxFox AI:"
            conversation = [conv_text]

        result = model.generate_content(conversation[0])
        reply = result.text.strip()

        return _json({'reply': reply})
    except Exception as e:
        print(f"AI chat error: {e}")
        return _err(f'AI processing failed: {str(e)}', 500)


# ═══════════════════════════════════════════════════════════════════════════════
# SAVINGS GOALS
# ═══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def goals(request):
    """GET | POST /api/goals"""
    uid, err = _require_auth(request)
    if err:
        return err
    db = get_db()

    if request.method == 'GET':
        user_goals = list(db.goals.find({'user': uid}).sort('createdAt', -1))
        return _json([_serialize(g) for g in user_goals])

    if request.method == 'POST':
        try:
            data = _parse_body(request)
            name = data.get('name', '').strip()
            target_amount = float(data.get('targetAmount', 0))
            current_savings = float(data.get('currentSavings', 0))
            deadline_months = int(data.get('deadlineMonths', 12))

            if not name or target_amount <= 0:
                return _err('Goal name and target amount are required')

            remaining = target_amount - current_savings
            monthly_needed = round(remaining / max(deadline_months, 1), 2) if remaining > 0 else 0
            feasible = monthly_needed >= 0

            doc = {
                'user': uid, 'name': name,
                'targetAmount': target_amount,
                'currentSavings': current_savings,
                'deadlineMonths': deadline_months,
                'monthlyNeeded': monthly_needed,
                'feasible': feasible,
                'createdAt': datetime.utcnow()
            }
            result = db.goals.insert_one(doc)
            doc['_id'] = str(result.inserted_id)
            doc['createdAt'] = doc['createdAt'].isoformat()
            return _json(doc, 201)
        except Exception as e:
            print(f"Create goal error: {e}")
            return _err('Server Error', 500)

    return _err('Method not allowed', 405)


@csrf_exempt
def goal_detail(request, goal_id):
    """PUT | DELETE /api/goals/<goal_id>"""
    uid, err = _require_auth(request)
    if err:
        return err
    db = get_db()

    try:
        oid = ObjectId(goal_id)
    except InvalidId:
        return _err('Invalid goal ID')

    if request.method == 'PUT':
        try:
            data = _parse_body(request)
            update = {}
            for field in ('name', 'targetAmount', 'currentSavings', 'deadlineMonths'):
                if field in data:
                    if field in ('targetAmount', 'currentSavings'):
                        update[field] = float(data[field])
                    elif field == 'deadlineMonths':
                        update[field] = int(data[field])
                    else:
                        update[field] = data[field]

            # Recalculate monthly needed
            goal = db.goals.find_one({'_id': oid, 'user': uid})
            if not goal:
                return _err('Goal not found', 404)

            target = update.get('targetAmount', goal['targetAmount'])
            savings = update.get('currentSavings', goal['currentSavings'])
            months = update.get('deadlineMonths', goal['deadlineMonths'])
            remaining = target - savings
            update['monthlyNeeded'] = round(remaining / max(months, 1), 2) if remaining > 0 else 0
            update['feasible'] = update['monthlyNeeded'] >= 0

            result = db.goals.find_one_and_update(
                {'_id': oid, 'user': uid}, {'$set': update},
                return_document=ReturnDocument.AFTER
            )
            return _json(_serialize(result))
        except Exception as e:
            print(f"Update goal error: {e}")
            return _err('Server Error', 500)

    if request.method == 'DELETE':
        result = db.goals.delete_one({'_id': oid, 'user': uid})
        if result.deleted_count == 0:
            return _err('Goal not found', 404)
        return _json({'message': 'Goal deleted'})

    return _err('Method not allowed', 405)


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def admin_users(request):
    """GET /api/admin/users"""
    uid, err = _require_admin(request)
    if err:
        return err
    try:
        db = get_db()
        users = list(db.users.find({}, {'password': 0}))
        return _json([_serialize(u) for u in users])
    except Exception:
        return _err('Server Error', 500)


@csrf_exempt
def admin_user_status(request, user_id):
    """PUT /api/admin/user/<user_id>/status"""
    uid, err = _require_admin(request)
    if err:
        return err
    if request.method != 'PUT':
        return _err('Method not allowed', 405)
    try:
        data = _parse_body(request)
        db = get_db()
        result = db.users.find_one_and_update(
            {'_id': ObjectId(user_id)},
            {'$set': {'status': data.get('status')}},
            return_document=ReturnDocument.AFTER
        )
        if not result:
            return _err('User not found', 404)
        return _json({
            '_id': str(result['_id']), 'username': result.get('username'),
            'email': result.get('email'), 'status': result.get('status')
        })
    except Exception:
        return _err('Server Error', 500)


@csrf_exempt
def admin_stats(request):
    """GET /api/admin/stats"""
    uid, err = _require_admin(request)
    if err:
        return err
    try:
        db = get_db()
        return _json({
            'totalUsers': db.users.count_documents({}),
            'activeUsers': db.users.count_documents({'status': 'active'}),
            'totalTransactions': db.transactions.count_documents({}),
            'totalGoals': db.goals.count_documents({})
        })
    except Exception:
        return _err('Server Error', 500)


# ═══════════════════════════════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def system_settings(request):
    """GET | PUT /api/settings"""
    uid, err = _require_auth(request)
    if err:
        return err
    db = get_db()

    if request.method == 'GET':
        s = db.systemsettings.find_one({})
        if not s:
            s = {'theme': 'dark', 'notifications': True, 'currency': 'INR'}
            db.systemsettings.insert_one(s)
        return _json(_serialize(s))

    if request.method == 'PUT':
        try:
            data = _parse_body(request)
            s = db.systemsettings.find_one_and_update(
                {}, {'$set': data}, upsert=True,
                return_document=ReturnDocument.AFTER
            )
            return _json(_serialize(s))
        except Exception:
            return _err('Server Error', 500)

    return _err('Method not allowed', 405)
