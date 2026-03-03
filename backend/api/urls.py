from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register', views.register_user),
    path('auth/login', views.login_user),
    path('auth/profile', views.get_user_profile),

    # Finance
    path('finance/transactions', views.transactions),
    path('finance/summary', views.finance_summary),

    # Admin
    path('admin/users', views.admin_users),
    path('admin/user/<str:user_id>/status', views.admin_user_status),
    path('admin/stats', views.admin_stats),

    # Settings
    path('settings', views.system_settings),
]
