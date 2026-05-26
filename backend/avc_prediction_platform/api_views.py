import json
from datetime import datetime, time
from django.http import JsonResponse, Http404
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count, Q
from django.utils import timezone

from ai_models.models import AIModelPerformance
from prediction.models import PatientData, PredictionResult
from prediction.risk import (
    compute_risk_level,
    compute_factors,
    RISK_LEVEL_NOTE,
    FACTORS_NOTE,
    LEVEL_HIGH,
)
from prediction.ml.inference import predict_for_patient, MissingModelError, MISSING_MODEL_MESSAGE
from notifications.models import Notification
from notifications.services import notify, notify_admins, visible_for

User = get_user_model()

# Helper choices labels in French
GENDER_CHOICES = {"Male": "Homme", "Female": "Femme", "Other": "Autre"}
WORK_TYPE_CHOICES = {
    "Private": "Privé",
    "Self-employed": "Indépendant",
    "Govt_job": "Fonctionnaire",
    "children": "Enfant / Mineur",
    "Never_worked": "Sans activité",
}
RESIDENCE_TYPE_CHOICES = {"Urban": "Urbain", "Rural": "Rural"}
SMOKING_STATUS_CHOICES = {
    "formerly smoked": "Ex-fumeur",
    "never smoked": "Jamais fumé",
    "smokes": "Fumeur",
    "Unknown": "Inconnu",
}

def _fr_label(choices, value):
    return choices.get(value, value)

def _user_payload(user):
    return {
        "id": user.pk,
        "username": user.get_username(),
        "email": user.email or "",
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }

def _model_payload(perf):
    return {
        "name": perf.model_name,
        "accuracy": perf.accuracy,
        "precision": perf.precision,
        "recall": perf.recall,
        "f1": perf.f1_score,
        "roc_auc": perf.roc_auc,
        "is_best": perf.is_best_model,
    }

def _prediction_payload(pred):
    patient = pred.patient_data
    proba_pct = max(0.0, min(1.0, pred.risk_probability)) * 100
    return {
        "id": pred.pk,
        "created_at": pred.created_at.isoformat(),
        "age": patient.age,
        "gender": _fr_label(GENDER_CHOICES, patient.gender),
        "gender_raw": patient.gender,
        "hypertension": patient.hypertension,
        "heart_disease": patient.heart_disease,
        "ever_married": "Oui" if patient.ever_married == "Yes" else "Non",
        "ever_married_raw": patient.ever_married,
        "work_type": _fr_label(WORK_TYPE_CHOICES, patient.work_type),
        "work_type_raw": patient.work_type,
        "residence_type": _fr_label(RESIDENCE_TYPE_CHOICES, patient.residence_type),
        "residence_type_raw": patient.residence_type,
        "avg_glucose_level": patient.avg_glucose_level,
        "bmi": patient.bmi,
        "smoking_status": _fr_label(SMOKING_STATUS_CHOICES, patient.smoking_status),
        "smoking_status_raw": patient.smoking_status,
        "model_name": pred.model_name,
        "is_high": bool(pred.prediction),
        "risk_label": pred.risk_label,
        "probability": pred.risk_probability,
        "probability_pct": proba_pct,
        "probability_pct_int": int(round(proba_pct)),
        "recommendation": pred.recommendation,
        "risk_level": compute_risk_level(pred.risk_probability),
        "factors": compute_factors(patient),
        "username": pred.user.get_username() if pred.user else "—",
    }

def _notification_payload(notif):
    return {
        "id": notif.pk,
        "title": notif.title,
        "message": notif.message,
        "type": notif.notification_type,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat(),
    }

# ----------------- Auth Views -----------------

def session_status(request):
    if request.user.is_authenticated:
        return JsonResponse({"authenticated": True, "user": _user_payload(request.user)})
    return JsonResponse({"authenticated": False})

@csrf_exempt
def api_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
    except Exception:
        return JsonResponse({"error": "Données JSON invalides"}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is not None:
        auth_login(request, user)
        return JsonResponse({"success": True, "user": _user_payload(user)})
    return JsonResponse({"error": "Identifiants incorrects (Nom d'utilisateur ou mot de passe erroné)"}, status=400)

@csrf_exempt
def api_register(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        password_confirm = data.get("password_confirm")
    except Exception:
        return JsonResponse({"error": "Données JSON invalides"}, status=400)

    if not username or not password or not password_confirm:
        return JsonResponse({"error": "Champs requis manquants"}, status=400)
    if password != password_confirm:
        return JsonResponse({"error": "Les deux mots de passe ne correspondent pas"}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "Ce nom d'utilisateur est déjà pris"}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    notify_admins(
        title="Nouvel utilisateur inscrit",
        message="Un nouvel utilisateur vient de créer un compte.",
        notification_type=Notification.TYPE_INFO,
    )
    auth_login(request, user)
    return JsonResponse({"success": True, "user": _user_payload(user)})

@csrf_exempt
def api_logout(request):
    if request.user.is_authenticated:
        auth_logout(request)
    return JsonResponse({"success": True})

# ----------------- Dashboard -----------------

def dashboard_data(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    
    perfs = list(AIModelPerformance.objects.all().order_by("-is_best_model", "-f1_score", "model_name"))
    models_comparison = [_model_payload(p) for p in perfs]
    has_models = bool(models_comparison)

    best_perf = next((p for p in perfs if p.is_best_model), None)
    avg_precision = AIModelPerformance.objects.aggregate(v=Avg("precision"))["v"]

    user_predictions = PredictionResult.objects.filter(user=request.user)
    total_predictions = user_predictions.count()
    high_risk_count = user_predictions.filter(prediction=True).count()

    if total_predictions:
        if high_risk_count:
            high_risk_pct = (high_risk_count / total_predictions) * 100
            high_risk_delta = f"{high_risk_pct:.1f} % du total".replace(".", ",")
        else:
            high_risk_delta = "Aucune prédiction à risque pour le moment"
    else:
        high_risk_delta = "Aucune donnée pour le moment"

    best_label = best_perf.model_name if best_perf else "—"
    best_delta = f"F1 = {best_perf.f1_score:.3f}".replace(".", ",") if best_perf else "Aucun modèle entraîné"

    avg_value = f"{avg_precision * 100:.1f} %".replace(".", ",") if avg_precision is not None else "—"
    avg_delta = f"sur {len(perfs)} modèle{'s' if len(perfs) > 1 else ''}" if perfs else "Lancer l'entraînement"

    stats = [
        {"label": "Prédictions totales", "value": f"{total_predictions}", "delta": "Toutes prédictions", "icon": "activity", "accent": "blue"},
        {"label": "Cas à risque élevé", "value": f"{high_risk_count}", "delta": high_risk_delta, "icon": "alert", "accent": "red"},
        {"label": "Meilleur modèle", "value": best_label, "delta": best_delta, "icon": "trophy", "accent": "teal"},
        {"label": "Précision moyenne", "value": avg_value, "delta": avg_delta, "icon": "target", "accent": "blue"},
    ]

    recent_qs = user_predictions.select_related("patient_data").order_by("-created_at")[:5]
    recent_predictions = [_prediction_payload(p) for p in recent_qs]

    return JsonResponse({
        "stats": stats,
        "has_models": has_models,
        "recent_predictions": recent_predictions,
        "total_predictions": total_predictions,
    })

# ----------------- Predictions -----------------

@csrf_exempt
def new_prediction(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        age = float(data.get("age"))
        gender = data.get("gender")
        hypertension = bool(int(data.get("hypertension", 0)))
        heart_disease = bool(int(data.get("heart_disease", 0)))
        ever_married = data.get("ever_married")
        work_type = data.get("work_type")
        residence_type = data.get("residence_type")
        avg_glucose_level = float(data.get("avg_glucose_level"))
        bmi = float(data.get("bmi"))
        smoking_status = data.get("smoking_status")
    except Exception as e:
        return JsonResponse({"error": f"Paramètres invalides: {str(e)}"}, status=400)

    # Save patient data
    patient = PatientData.objects.create(
        user=request.user,
        gender=gender,
        age=age,
        hypertension=hypertension,
        heart_disease=heart_disease,
        ever_married=ever_married,
        work_type=work_type,
        residence_type=residence_type,
        avg_glucose_level=avg_glucose_level,
        bmi=bmi,
        smoking_status=smoking_status
    )

    # Run inference and persist PredictionResult
    try:
        out = predict_for_patient(patient)
        result = PredictionResult.objects.create(
            user=request.user,
            patient_data=patient,
            model_name=out.model_name,
            prediction=out.prediction,
            risk_label=out.risk_label,
            risk_probability=out.risk_probability,
            recommendation=out.recommendation,
        )

        # Notify
        notify(
            user=request.user,
            title="Prédiction créée",
            message="Votre prédiction a été enregistrée avec succès.",
            notification_type=Notification.TYPE_SUCCESS,
        )
        level = compute_risk_level(result.risk_probability)
        if level["key"] == LEVEL_HIGH:
            notify(
                user=request.user,
                title="Risque élevé détecté",
                message="Une prédiction récente indique un risque élevé. Consultez le rapport.",
                notification_type=Notification.TYPE_DANGER,
            )

        return JsonResponse({"success": True, "patient_id": patient.pk, "result_id": result.pk})
    except MissingModelError:
        notify(
            user=request.user,
            title="Modèle IA non entraîné",
            message="Le modèle IA n'est pas encore entraîné. Veuillez lancer l'entraînement.",
            notification_type=Notification.TYPE_WARNING,
        )
        return JsonResponse({"error": MISSING_MODEL_MESSAGE, "patient_id": patient.pk}, status=422)

def prediction_detail(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    
    try:
        pred = PredictionResult.objects.select_related("patient_data").get(pk=pk)
    except PredictionResult.DoesNotExist:
        return JsonResponse({"error": "Prediction not found"}, status=404)

    # Scope security
    if not (request.user.is_staff or request.user.is_superuser) and pred.user != request.user:
        return JsonResponse({"error": "Forbidden"}, status=403)

    payload = _prediction_payload(pred)
    payload["risk_level_note"] = RISK_LEVEL_NOTE
    payload["factors_note"] = FACTORS_NOTE
    return JsonResponse(payload)

def prediction_result(request, patient_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    try:
        patient = PatientData.objects.get(pk=patient_id)
    except PatientData.DoesNotExist:
        return JsonResponse({"error": "Patient not found"}, status=404)

    if not (request.user.is_staff or request.user.is_superuser) and patient.user != request.user:
        return JsonResponse({"error": "Forbidden"}, status=403)

    pred = PredictionResult.objects.filter(patient_data=patient).order_by("-created_at").first()
    if pred is None:
        # Patient exists but model training was missing at execution
        return JsonResponse({"error": MISSING_MODEL_MESSAGE, "patient_id": patient.pk}, status=422)

    payload = _prediction_payload(pred)
    payload["risk_level_note"] = RISK_LEVEL_NOTE
    payload["factors_note"] = FACTORS_NOTE
    return JsonResponse(payload)

# ----------------- History -----------------

def history_data(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    
    risk_filter = request.GET.get("risk", "all")
    model_filter = request.GET.get("model", "all").strip()
    date_from_str = request.GET.get("date_from", "")
    date_to_str = request.GET.get("date_to", "")
    proba_min_str = request.GET.get("proba_min", "")
    proba_max_str = request.GET.get("proba_max", "")
    q = request.GET.get("q", "").strip()

    base_qs = PredictionResult.objects.select_related("patient_data")
    if not (request.user.is_staff or request.user.is_superuser):
        base_qs = base_qs.filter(user=request.user)

    qs = base_qs

    # Filters
    if risk_filter == "low":
        qs = qs.filter(risk_probability__gte=0.0, risk_probability__lte=0.30)
    elif risk_filter == "medium":
        qs = qs.filter(risk_probability__gt=0.30, risk_probability__lte=0.60)
    elif risk_filter == "high":
        qs = qs.filter(risk_probability__gt=0.60, risk_probability__lte=1.0)

    if model_filter and model_filter != "all":
        qs = qs.filter(model_name=model_filter)

    try:
        if date_from_str:
            date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
            qs = qs.filter(created_at__gte=timezone.make_aware(datetime.combine(date_from, time.min)))
        if date_to_str:
            date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
            qs = qs.filter(created_at__lte=timezone.make_aware(datetime.combine(date_to, time.max)))
    except ValueError:
        pass

    try:
        if proba_min_str:
            qs = qs.filter(risk_probability__gte=float(proba_min_str) / 100.0)
        if proba_max_str:
            qs = qs.filter(risk_probability__lte=float(proba_max_str) / 100.0)
    except ValueError:
        pass

    if q:
        text_q = Q(model_name__icontains=q) | Q(risk_label__icontains=q) | Q(patient_data__gender__icontains=q)
        try:
            text_q |= Q(patient_data__age=float(q.replace(",", ".")))
        except ValueError:
            pass
        qs = qs.filter(text_q)

    qs = qs.order_by("-created_at")
    rows = [_prediction_payload(p) for p in qs]

    available_models = sorted({m for m in base_qs.values_list("model_name", flat=True) if m})

    return JsonResponse({
        "rows": rows,
        "available_models": available_models,
        "total_all": base_qs.count(),
        "total_filtered": len(rows),
    })

# ----------------- Models Comparison -----------------

def models_comparison(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    perfs = list(AIModelPerformance.objects.all().order_by("-is_best_model", "-f1_score", "model_name"))
    rows = [_model_payload(p) for p in perfs]
    has_models = bool(rows)

    best = next((r for r in rows if r["is_best"]), None)
    avg_precision = AIModelPerformance.objects.aggregate(v=Avg("precision"))["v"]
    avg_recall = AIModelPerformance.objects.aggregate(v=Avg("recall"))["v"]
    avg_f1 = AIModelPerformance.objects.aggregate(v=Avg("f1_score"))["v"]

    chart_payload = {
        "labels": [r["name"] for r in rows],
        "datasets": [
            {"label": "Accuracy", "data": [round(r["accuracy"], 4) for r in rows]},
            {"label": "Precision", "data": [round(r["precision"], 4) for r in rows]},
            {"label": "Recall", "data": [round(r["recall"], 4) for r in rows]},
            {"label": "F1-score", "data": [round(r["f1"], 4) for r in rows]},
            {"label": "ROC-AUC", "data": [round(r["roc_auc"] or 0.0, 4) for r in rows]},
        ],
        "f1_only": [round(r["f1"], 4) for r in rows],
        "best_index": next((i for i, r in enumerate(rows) if r["is_best"]), -1),
    }

    return JsonResponse({
        "rows": rows,
        "has_models": has_models,
        "best": best,
        "model_count": len(rows),
        "avg_precision_pct": round(avg_precision * 100, 1) if avg_precision is not None else None,
        "avg_recall_pct": round(avg_recall * 100, 1) if avg_recall is not None else None,
        "avg_f1": round(avg_f1, 3) if avg_f1 is not None else None,
        "chart_payload": chart_payload,
    })

# ----------------- User Stats -----------------

def statistics_data(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    
    user_predictions = PredictionResult.objects.filter(user=request.user)
    total = user_predictions.count()
    high = user_predictions.filter(prediction=True).count()
    low = total - high
    avg_proba = user_predictions.aggregate(v=Avg("risk_probability"))["v"] or 0.0

    perfs_count = AIModelPerformance.objects.count()
    best_perf = AIModelPerformance.objects.filter(is_best_model=True).first()

    high_pct = high / total * 100 if total else 0.0
    low_pct = low / total * 100 if total else 0.0

    stats = [
        {"label": "Prédictions totales", "value": f"{total}", "delta": "Mes diagnostics", "icon": "activity", "accent": "blue"},
        {"label": "Cas à risque élevé", "value": f"{high}", "delta": f"{high_pct:.1f} % du total".replace(".", ",") if total else "Aucun cas", "icon": "alert", "accent": "red"},
        {"label": "Cas à risque faible", "value": f"{low}", "delta": f"{low_pct:.1f} % du total".replace(".", ",") if total else "Aucun cas", "icon": "activity", "accent": "teal"},
        {"label": "Probabilité moyenne", "value": f"{avg_proba * 100:.1f} %".replace(".", ",") if total else "—", "delta": "Sur mes prédictions", "icon": "target", "accent": "blue"},
    ]

    return JsonResponse({
        "stats": stats,
        "has_predictions": bool(total),
        "high_count": high,
        "low_count": low,
        "best_model_name": best_perf.model_name if best_perf else None,
        "best_model_f1": best_perf.f1_score if best_perf else None,
        "trained_models_count": perfs_count,
    })

# ----------------- Notifications -----------------

def notifications_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    
    qs = visible_for(request.user).order_by("is_read", "-created_at")
    items = list(qs)
    unread_count = sum(1 for n in items if not n.is_read)

    return JsonResponse({
        "notifications": [_notification_payload(n) for n in items],
        "unread_count": unread_count,
    })

@csrf_exempt
def mark_notification_read(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    qs = visible_for(request.user)
    try:
        notification = qs.get(pk=pk)
    except Notification.DoesNotExist:
        return JsonResponse({"error": "Notification not found"}, status=404)

    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=["is_read"])
    return JsonResponse({"success": True})

@csrf_exempt
def mark_all_notifications_read(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    visible_for(request.user).filter(is_read=False).update(is_read=True)
    return JsonResponse({"success": True})

# ----------------- Platform Administration (Staff) -----------------

def _admin_required(view_func):
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Unauthorized"}, status=401)
        if not (request.user.is_staff or request.user.is_superuser):
            return JsonResponse({"error": "Accès réservé aux administrateurs."}, status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped

@_admin_required
def admin_dashboard(request):
    total_users = User.objects.count()
    total_predictions = PredictionResult.objects.count()
    high = PredictionResult.objects.filter(prediction=True).count()
    low = total_predictions - high

    perfs_count = AIModelPerformance.objects.count()
    best_perf = AIModelPerformance.objects.filter(is_best_model=True).first()
    avg_precision = AIModelPerformance.objects.aggregate(v=Avg("precision"))["v"]

    high_pct = high / total_predictions * 100 if total_predictions else 0.0
    low_pct = low / total_predictions * 100 if total_predictions else 0.0

    stats = [
        {"label": "Utilisateurs", "value": f"{total_users}", "delta": "Comptes actifs", "icon": "users", "accent": "blue"},
        {"label": "Prédictions totales", "value": f"{total_predictions}", "delta": "Toutes prédictions", "icon": "activity", "accent": "blue"},
        {"label": "Cas à risque élevé", "value": f"{high}", "delta": f"{high_pct:.1f} % du total".replace(".", ",") if total_predictions else "—", "icon": "alert", "accent": "red"},
        {"label": "Cas à risque faible", "value": f"{low}", "delta": f"{low_pct:.1f} % du total".replace(".", ",") if total_predictions else "—", "icon": "activity", "accent": "teal"},
        {"label": "Modèles entraînés", "value": f"{perfs_count}", "delta": "Modèles ML", "icon": "target", "accent": "blue"},
        {"label": "Meilleur modèle", "value": best_perf.model_name if best_perf else "—", "delta": f"F1 = {best_perf.f1_score:.3f}".replace(".", ",") if best_perf else "Aucun", "icon": "trophy", "accent": "teal"},
        {"label": "Précision moyenne", "value": f"{avg_precision * 100:.1f} %".replace(".", ",") if avg_precision is not None else "—", "delta": "Moyenne modèles", "icon": "target", "accent": "blue"},
    ]
    return JsonResponse({"stats": stats})

@_admin_required
def admin_users_list(request):
    selected_filter = request.GET.get("filter", "all")
    qs = User.objects.all().annotate(prediction_count=Count("prediction_results", distinct=True))

    if selected_filter == "staff":
        qs = qs.filter(Q(is_staff=True) | Q(is_superuser=True))
    elif selected_filter == "users":
        qs = qs.filter(is_staff=False, is_superuser=False)
    elif selected_filter == "active":
        qs = qs.filter(is_active=True)

    qs = qs.order_by("-date_joined")
    users = [
        {
            "id": u.pk,
            "username": u.get_username(),
            "email": u.email or "",
            "date_joined": u.date_joined.isoformat(),
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "is_active": u.is_active,
            "prediction_count": u.prediction_count,
        } for u in qs
    ]
    return JsonResponse({"users": users})

@_admin_required
def admin_user_detail(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    preds = PredictionResult.objects.filter(user=user).select_related("patient_data")
    total = preds.count()
    high = preds.filter(prediction=True).count()
    low = total - high

    recent = [_prediction_payload(p) for p in preds.order_by("-created_at")[:10]]

    return JsonResponse({
        "user": {
            "id": user.pk,
            "username": user.get_username(),
            "email": user.email or "",
            "date_joined": user.date_joined.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        },
        "stats": {
            "total": total,
            "high": high,
            "low": low,
        },
        "recent": recent,
    })

@_admin_required
def admin_predictions_list(request):
    selected_filter = request.GET.get("filter", "all")
    qs = PredictionResult.objects.select_related("user", "patient_data")

    if selected_filter == "high":
        qs = qs.filter(prediction=True)
    elif selected_filter == "low":
        qs = qs.filter(prediction=False)

    qs = qs.order_by("-created_at")[:200]
    rows = [_prediction_payload(p) for p in qs]

    return JsonResponse({"predictions": rows})
