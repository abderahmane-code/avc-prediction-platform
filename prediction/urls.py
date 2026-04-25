from django.urls import path

from . import views

app_name = "prediction"

urlpatterns = [
    path("new/", views.new_prediction, name="new"),
    path("result/<int:patient_id>/", views.result, name="result"),
    path("detail/<int:result_id>/", views.detail, name="detail"),
]
