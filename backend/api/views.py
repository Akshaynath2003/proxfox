import os
import json
import jwt
import bcrypt
import secrets
from datetime import datetime, timedelta
from django.core.mail import send_mail
from bson import ObjectId
from bson.errors import InvalidId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pymongo import MongoClient
from django.conf import settings

# ─── MongoDB Connection ────────────────────────────────────────────────────────
_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
            # Extract DB name from URI or use default
            uri = settings.MONGO_URI
            db_name = uri.split('/')[-1].split('?')[0] or 'proxfox'
            _db = _client[db_name]
        except Exception as e:
            print(f"MongoDB connection error: {e}")
    return _db

# ─── Helpers ──────────────────────────────────────────────────────────────────
def generate_token(user_id):
    payload = {
        'id': str(user_id),
        'exp': datetime.utcnow() + timedelta(days=30),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')

def get_user_id_from_token(request):
    """Extract user ID from Bearer token. Returns None if invalid."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        return decoded.get('id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(request):
    """Returns (user_id, None) or (None, error_response)."""
    uid = get_user_id_from_token(request)
    if not uid:
        return None, JsonResponse({'message': 'Not authorized, token failed'}, status=401)
    return uid, None

def require_admin(request):
    """Returns (user_id, None) if user is admin, else (None, error_response)."""
    uid, err = require_auth(request)
    if err:
        return None, err
    db = get_db()
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user or user.get('role') != 'admin':
        return None, JsonResponse({'message': 'Not authorized as admin'}, status=403)
    return uid, None

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    doc = dict(doc)
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    # Serialize any nested ObjectIds
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

# ──────────────────────────────────────────────────────────────────────────────
# AUTH ROUTES  /api/auth/...
# ──────────────────────────────────────────────────────────────────────────────

@csrf_exempt
def register_user(request):
    """POST /api/auth/register"""
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phoneNumber', '')
        password = data.get('password', '')

        if not all([username, email, password]):
            return JsonResponse({'message': 'Please provide username, email and password'}, status=400)

        db = get_db()
        if db.users.find_one({'email': email}):
            return JsonResponse({'message': 'User already exists'}, status=400)

        role = 'admin' if email.startswith('admin') else 'user'
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        result = db.users.insert_one({
            'username': username,
            'email': email,
            'phoneNumber': phone,
            'password': hashed,
            'role': role,
            'status': 'active',
            'createdAt': datetime.utcnow()
        })

        return JsonResponse({
            '_id': str(result.inserted_id),
            'username': username,
            'email': email,
            'role': role,
            'token': generate_token(result.inserted_id)
        }, status=201)

    except Exception as e:
        print(f"Register error: {e}")
        return JsonResponse({'message': str(e)}, status=500)


@csrf_exempt
def login_user(request):
    """POST /api/auth/login"""
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        db = get_db()
        user = db.users.find_one({'email': email})

        if not user:
            return JsonResponse({'message': 'Invalid email or password'}, status=401)

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return JsonResponse({'message': 'Invalid email or password'}, status=401)

        if user.get('status') != 'active':
            return JsonResponse({'message': f"Account is {user.get('status')}"}, status=401)

        return JsonResponse({
            '_id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'token': generate_token(user['_id'])
        })

    except Exception as e:
        print(f"Login error: {e}")
        return JsonResponse({'message': 'Server Error'}, status=500)


@csrf_exempt
def forgot_password(request):
    """POST /api/auth/forgot-password"""
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        if not email:
            return JsonResponse({'message': 'Email is required'}, status=400)

        db = get_db()
        user = db.users.find_one({'email': email})

        # Always return success to avoid user enumeration
        if not user:
            return JsonResponse({'message': 'If that email exists, a reset link has been sent.'}, status=200)

        # Generate a secure random token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)

        # Store token in DB (replace any existing token for this user)
        db.password_reset_tokens.delete_many({'email': email})
        db.password_reset_tokens.insert_one({
            'email': email,
            'token': token,
            'expires_at': expires_at,
            'created_at': datetime.utcnow(),
        })

        # Build reset URL
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/auth?token={token}"

        # Send email
        send_mail(
            subject='ProxFox — Reset Your Password',
            message=(
                f"Hi {user.get('username', 'there')},\n\n"
                f"We received a request to reset your ProxFox password.\n\n"
                f"Click the link below to set a new password (valid for 1 hour):\n"
                f"{reset_url}\n\n"
                f"If you did not request this, you can safely ignore this email.\n\n"
                f"— The ProxFox Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return JsonResponse({'message': 'If that email exists, a reset link has been sent.'}, status=200)

    except Exception as e:
        print(f"Forgot password error: {e}")
        return JsonResponse({'message': 'Failed to send reset email. Please try again later.'}, status=500)


@csrf_exempt
def reset_password(request):
    """POST /api/auth/reset-password"""
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        token = data.get('token', '').strip()
        new_password = data.get('password', '')

        if not token or not new_password:
            return JsonResponse({'message': 'Token and new password are required'}, status=400)

        db = get_db()
        record = db.password_reset_tokens.find_one({'token': token})

        if not record:
            return JsonResponse({'message': 'Reset link is invalid or expired.'}, status=400)

        if datetime.utcnow() > record['expires_at']:
            db.password_reset_tokens.delete_one({'token': token})
            return JsonResponse({'message': 'Reset link has expired. Please request a new one.'}, status=400)

        # Hash new password and update user
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.users.update_one({'email': record['email']}, {'$set': {'password': hashed}})

        # Invalidate token
        db.password_reset_tokens.delete_one({'token': token})

        return JsonResponse({'message': 'Password updated successfully.'}, status=200)

    except Exception as e:
        print(f"Reset password error: {e}")
        return JsonResponse({'message': 'Server Error'}, status=500)


@csrf_exempt
def get_user_profile(request):
    """GET /api/auth/profile"""
    uid, err = require_auth(request)
    if err:
        return err
    try:
        db = get_db()
        user = db.users.find_one({'_id': ObjectId(uid)}, {'password': 0})
        if not user:
            return JsonResponse({'message': 'User not found'}, status=404)
        return JsonResponse(serialize_doc(user))
    except Exception as e:
        return JsonResponse({'message': 'Server Error'}, status=500)

# ──────────────────────────────────────────────────────────────────────────────
# FINANCE ROUTES  /api/finance/...
# ──────────────────────────────────────────────────────────────────────────────

@csrf_exempt
def transactions(request):
    """GET or POST /api/finance/transactions"""
    uid, err = require_auth(request)
    if err:
        return err

    db = get_db()

    if request.method == 'GET':
        try:
            txns = list(db.transactions.find({'user': uid}).sort('date', -1))
            return JsonResponse([serialize_doc(t) for t in txns], safe=False)
        except Exception as e:
            return JsonResponse({'message': 'Server Error'}, status=500)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
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
            return JsonResponse(doc, status=201)
        except Exception as e:
            return JsonResponse({'message': 'Server Error'}, status=500)

    return JsonResponse({'message': 'Method not allowed'}, status=405)


@csrf_exempt
def finance_summary(request):
    """GET /api/finance/summary"""
    uid, err = require_auth(request)
    if err:
        return err
    try:
        db = get_db()
        txns = list(db.transactions.find({'user': uid}))

        total_income = sum(t['amount'] for t in txns if t.get('type') == 'income')
        total_expense = sum(t['amount'] for t in txns if t.get('type') == 'expense')
        total_investment = sum(t['amount'] for t in txns if t.get('type') == 'investment')

        return JsonResponse({
            'totalIncome': total_income,
            'totalExpense': total_expense,
            'totalInvestment': total_investment,
            'balance': total_income - total_expense - total_investment
        })
    except Exception as e:
        return JsonResponse({'message': 'Server Error'}, status=500)

# ──────────────────────────────────────────────────────────────────────────────
# ADMIN ROUTES  /api/admin/...
# ──────────────────────────────────────────────────────────────────────────────

@csrf_exempt
def admin_users(request):
    """GET /api/admin/users"""
    uid, err = require_admin(request)
    if err:
        return err
    try:
        db = get_db()
        users = list(db.users.find({}, {'password': 0}))
        return JsonResponse([serialize_doc(u) for u in users], safe=False)
    except Exception as e:
        return JsonResponse({'message': 'Server Error'}, status=500)


@csrf_exempt
def admin_user_status(request, user_id):
    """PUT /api/admin/user/<user_id>/status"""
    uid, err = require_admin(request)
    if err:
        return err
    if request.method != 'PUT':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        new_status = data.get('status')
        db = get_db()
        result = db.users.find_one_and_update(
            {'_id': ObjectId(user_id)},
            {'$set': {'status': new_status}},
            return_document=True
        )
        if not result:
            return JsonResponse({'message': 'User not found'}, status=404)
        return JsonResponse({
            '_id': str(result['_id']),
            'username': result.get('username'),
            'email': result.get('email'),
            'status': result.get('status')
        })
    except Exception as e:
        return JsonResponse({'message': 'Server Error'}, status=500)


@csrf_exempt
def admin_stats(request):
    """GET /api/admin/stats"""
    uid, err = require_admin(request)
    if err:
        return err
    try:
        db = get_db()
        total_users = db.users.count_documents({})
        active_users = db.users.count_documents({'status': 'active'})
        total_transactions = db.transactions.count_documents({})
        return JsonResponse({
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalTransactions': total_transactions
        })
    except Exception as e:
        return JsonResponse({'message': 'Server Error'}, status=500)

# ──────────────────────────────────────────────────────────────────────────────
# SETTINGS ROUTES  /api/settings/...
# ──────────────────────────────────────────────────────────────────────────────

@csrf_exempt
def system_settings(request):
    """GET or PUT /api/settings"""
    uid, err = require_auth(request)
    if err:
        return err

    db = get_db()

    if request.method == 'GET':
        s = db.systemsettings.find_one({})
        if not s:
            s = {'theme': 'dark', 'notifications': True, 'currency': 'INR'}
            db.systemsettings.insert_one(s)
        return JsonResponse(serialize_doc(s))

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            s = db.systemsettings.find_one_and_update(
                {},
                {'$set': data},
                upsert=True,
                return_document=True
            )
            return JsonResponse(serialize_doc(s))
        except Exception as e:
            return JsonResponse({'message': 'Server Error'}, status=500)

    return JsonResponse({'message': 'Method not allowed'}, status=405)
