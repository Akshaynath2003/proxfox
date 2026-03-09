from django.urls import path
from . import views

urlpatterns = [
    # Health
    path('health', views.health_check),

    # Auth
    path('auth/register', views.register_user),
    path('auth/login', views.login_user),
    path('auth/profile', views.get_user_profile),
    path('auth/forgot-password', views.forgot_password),
    path('auth/reset-password', views.reset_password),

    # Finance
    path('finance/transactions', views.transactions),
    path('finance/transactions/<str:txn_id>', views.transaction_detail),
    path('finance/summary', views.finance_summary),
    path('finance/chart-data', views.chart_data),
    path('finance/category-breakdown', views.category_breakdown),

    # AI
    path('ai/parse-expense', views.parse_expense),
    path('ai/chat', views.ai_chat),

    # Goals
    path('goals', views.goals),
    path('goals/<str:goal_id>', views.goal_detail),

    # Admin
    path('admin/users', views.admin_users),
    path('admin/user/<str:user_id>/status', views.admin_user_status),
    path('admin/stats', views.admin_stats),

    # Settings
    path('settings', views.system_settings),
]
