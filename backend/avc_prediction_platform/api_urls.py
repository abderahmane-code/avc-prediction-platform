from django.urls import path
from . import api_views

app_name = "api"

urlpatterns = [
    # Auth
    path("auth/session/", api_views.session_status, name="session_status"),
    path("auth/login/", api_views.api_login, name="login"),
    path("auth/register/", api_views.api_register, name="register"),
    path("auth/logout/", api_views.api_logout, name="logout"),
    
    # User App
    path("dashboard/", api_views.dashboard_data, name="dashboard"),
    path("prediction/new/", api_views.new_prediction, name="new_prediction"),
    path("prediction/detail/<int:pk>/", api_views.prediction_detail, name="prediction_detail"),
    path("prediction/result/<int:patient_id>/", api_views.prediction_result, name="prediction_result"),
    path("historique/", api_views.history_data, name="history"),
    path("modeles/comparaison/", api_views.models_comparison, name="models_comparison"),
    path("statistiques/", api_views.statistics_data, name="statistics"),
    
    # Notifications
    path("notifications/", api_views.notifications_list, name="notifications_list"),
    path("notifications/<int:pk>/read/", api_views.mark_notification_read, name="mark_notification_read"),
    path("notifications/read-all/", api_views.mark_all_notifications_read, name="mark_all_notifications_read"),
    
    # Platform management (Staff-only)
    path("gestion/", api_views.admin_dashboard, name="admin_dashboard"),
    path("gestion/utilisateurs/", api_views.admin_users_list, name="admin_users_list"),
    path("gestion/utilisateurs/<int:pk>/", api_views.admin_user_detail, name="admin_user_detail"),
    path("gestion/predictions/", api_views.admin_predictions_list, name="admin_predictions_list"),
]
