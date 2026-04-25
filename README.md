# Plateforme intelligente de prédiction du risque d'AVC

Academic project: a Django web platform that predicts stroke risk (AVC) and
compares multiple AI models.

## Tech stack

- Python 3.10+
- Django 5.x
- PostgreSQL
- HTML / CSS / JavaScript (Bootstrap or clean custom CSS — added later)
- scikit-learn (integrated in a later step)

## Project structure

```
avc-prediction-platform/
├── avc_prediction_platform/   # Django project (settings, urls, wsgi, asgi)
├── accounts/                  # User accounts / auth app
├── dashboard/                 # Dashboard app
├── prediction/                # Stroke-risk prediction app
├── ai_models/                 # AI model management & comparison app
├── manage.py
├── requirements.txt
├── .env.example
└── README.md
```

## 1. Install dependencies

```bash
git clone https://github.com/abderahmane-code/avc-prediction-platform.git
cd avc-prediction-platform

python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt
```

## 2. Configure environment variables

Copy the example file and edit it with your own values:

```bash
cp .env.example .env
```

`.env` keys:

| Variable      | Description                           | Example             |
|---------------|---------------------------------------|---------------------|
| `SECRET_KEY`  | Django secret key                     | `a-long-random-str` |
| `DEBUG`       | Django debug flag                     | `True`              |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts       | `localhost,127.0.0.1` |
| `DB_NAME`     | PostgreSQL database name              | `avc_prediction`    |
| `DB_USER`     | PostgreSQL user                       | `postgres`          |
| `DB_PASSWORD` | PostgreSQL password                   | `postgres`          |
| `DB_HOST`     | PostgreSQL host                       | `localhost`         |
| `DB_PORT`     | PostgreSQL port                       | `5432`              |

## 3. Create the PostgreSQL database

Make sure PostgreSQL is running locally (e.g. via the `postgresql` service or
Docker). Then create the database and user matching your `.env`:

```bash
# Using the system postgres user
sudo -u postgres psql <<'SQL'
CREATE DATABASE avc_prediction;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE avc_prediction TO postgres;
ALTER DATABASE avc_prediction OWNER TO postgres;
SQL
```

On Ubuntu, if you don't have PostgreSQL yet:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo service postgresql start
```

## 4. Run migrations

```bash
python manage.py migrate
```

## 5. Start the development server

```bash
python manage.py runserver
```

Open http://127.0.0.1:8000/ — you should see Django's default welcome page
(the full UI is built in later steps).

## 6. (Optional) Create a superuser

```bash
python manage.py createsuperuser
```

Then visit http://127.0.0.1:8000/admin/ to log in.

## 7. Train the stroke-prediction models

The repository ships two equivalent ways to train the six classifiers:

* `python prediction/ml/train_models.py` — pure script, writes joblib +
  JSON artifacts only.
* `python manage.py train_ai_models` — Django management command that does
  the same training **and** refreshes the `AIModelPerformance` rows in
  PostgreSQL so the dashboard can read them.

Use the management command for normal operation; the script is kept for
quick offline runs without the Django context.

### 7.1 Place the dataset

Download `healthcare-dataset-stroke-data.csv` (the public Kaggle stroke
dataset — `fedesoriano/stroke-prediction-dataset`) and copy it to:

```
prediction/ml/data/healthcare-dataset-stroke-data.csv
```

The CSV is git-ignored on purpose; only the empty `data/` folder is tracked
via a `.gitkeep` file. Expected columns:

```
id, gender, age, hypertension, heart_disease, ever_married, work_type,
Residence_type, avg_glucose_level, bmi, smoking_status, stroke
```

If the file is missing, both entry points print:

> `Dataset not found. Please place healthcare-dataset-stroke-data.csv inside prediction/ml/data/`

### 7.2 Run the training command

```bash
source .venv/bin/activate
python manage.py train_ai_models
```

Optional flags: `--csv path/to/file.csv`, `--test-size 0.2`, `--random-state 42`.

The command:

1. Trains Logistic Regression, KNN, Decision Tree, Random Forest, SVM and
   Naive Bayes (stratified split, `zero_division=0` everywhere, and
   `class_weight="balanced"` for LR / DT / RF / SVM).
2. Saves three artifacts under `prediction/ml/artifacts/`:
   - `preprocessor.pkl` — fitted ColumnTransformer (impute + scale + one-hot)
   - `best_model.pkl` — best classifier by F1-score on the test set
   - `model_metrics.json` — all six models' metrics + dataset/split metadata
3. Wraps the database update in an `atomic()` transaction: deletes every
   existing `AIModelPerformance` row and inserts one row per trained model,
   flagging the F1-best model with `is_best_model=True`.

### 7.3 Verify in Django admin

```bash
python manage.py runserver
# then open http://127.0.0.1:8000/admin/ai_models/aimodelperformance/
```

You should see exactly six rows after a successful training run, with
exactly one row marked as `Is best model`.

### 7.4 Dashboard

`http://127.0.0.1:8000/dashboard/` reads `AIModelPerformance` from
PostgreSQL and renders:

* the `Meilleur modèle` and `Précision moyenne` stat cards,
* the per-model comparison table (sorted by best, then F1),
* the Chart.js bar chart with per-model Accuracy / Precision / Recall / F1 /
  ROC-AUC.

When the table is empty (e.g. before the first training run), every metric
falls back to a `—` placeholder and a hint asking the user to run
`python manage.py train_ai_models`. The page still renders correctly.

## 8. Live prediction workflow

`/prediction/new/` is wired to the trained artifacts. On a valid submission:

1. The patient record is saved to `PatientData` (with the current user when
   authenticated).
2. The view loads `prediction/ml/artifacts/preprocessor.pkl` and
   `prediction/ml/artifacts/best_model.pkl` (cached in-process and invalidated
   automatically when the files change on disk, so re-running the training
   command picks up immediately without a server restart).
3. The patient is mapped to the exact training schema — including the
   `residence_type → Residence_type` rename and `ever_married` boolean →
   `"Yes"/"No"` mapping — and scored.
4. Probability is read from `predict_proba(X)[:, 1]` when available, with a
   `decision_function` fallback that is squashed through a logistic, and a
   final `predict`-only fallback returning `1.0` / `0.0`.
5. A `PredictionResult` row is persisted with the model name (read from
   `model_metrics.json`), the boolean prediction, the French risk label,
   the probability and the French recommendation.
6. The user is redirected to `/prediction/result/<id>/`, which displays a
   circular probability gauge, the `Risque d'AVC : Élevé` / `Risque d'AVC :
   Faible` summary, the model name, the recommendation, and the medical
   disclaimer.

### 8.1 Missing-model graceful fallback

If `best_model.pkl` or `preprocessor.pkl` is absent (e.g. before the very
first training run, or when the artifacts were deleted), the form **still
saves** the `PatientData` row but **does not** create a `PredictionResult`.
The result page then renders an inline error block with the exact message:

> Le modèle IA n'est pas encore entraîné. Veuillez exécuter la commande :
> `python manage.py train_ai_models`

No 500 error, no crash — only the prediction half is skipped.

### 8.2 Dashboard live counts

See §10 below — every dashboard card / table / chart is now read from
PostgreSQL.

## 9. Prediction history

`/historique/` lists every saved `PredictionResult` (most recent first) with a
table covering Date / Âge / Genre / Hypertension / Maladie cardiaque /
Glucose / IMC / Modèle utilisé / Résultat / Probabilité, plus a `Détails`
button that opens `/prediction/detail/<id>/`. Quick filters
(`Tous` / `Risque élevé` / `Risque faible`) are wired to the
`?risk=high|low|all` querystring. The `Historique` sidebar entry is the
canonical entry point and is highlighted as active on both pages.

When no `PredictionResult` rows exist (e.g. fresh DB), the page renders a
clean empty state with the exact French message
`Aucune prédiction enregistrée pour le moment.` instead of crashing.

The detail page reuses the same probability gauge, risk-coloured chip,
recommendation block, patient recap, and medical disclaimer as the
post-submission `/prediction/result/<id>/` page — but is anchored on the
`PredictionResult` id so it stays addressable from the history table.

## 10. Fully dynamic dashboard

`/dashboard/` is entirely driven by PostgreSQL — no hardcoded values.

**Stat cards** (top row):

| Card | Source |
| ---- | ------ |
| Prédictions totales | `PredictionResult.objects.count()` |
| Cas à risque élevé | `PredictionResult.objects.filter(prediction=True).count()` + percentage of total |
| Meilleur modèle | `AIModelPerformance` row with `is_best_model=True`, with its F1 in the delta line |
| Précision moyenne | `AIModelPerformance.objects.aggregate(Avg("precision"))` over all rows |

**Actions rapides** card: three CTAs:

* `Nouvelle prédiction` → `/prediction/new/`
* `Voir l'historique` → `/historique/`
* `Comparaison des modèles` — disabled placeholder with a `Bientôt` chip
  until that page lands as its own step.

**Prédictions récentes** card: the 5 most recent `PredictionResult` rows
(joined to `PatientData` via `select_related`) with Date / Âge / Modèle /
Résultat (red `Risque élevé` / teal `Risque faible` badge) / Probabilité /
`Détails` link to `/prediction/detail/<id>/`. A `Voir tout` chip in the
header links to `/historique/`.

**Comparaison des modèles d'IA** table: every `AIModelPerformance` row,
sorted with the best-by-F1 first (highlighted via `models-table__row--best`
+ a `Meilleur` badge).

**Comparaison des performances** chart: Chart.js bar chart fed by
`json_script` with the same `AIModelPerformance` rows — Accuracy /
Precision / Recall / F1 / ROC-AUC per model. ROC-AUC nulls render as 0.

### 10.1 Empty states

| Table empty | Behaviour |
| ----------- | --------- |
| No `PredictionResult` | `Prédictions totales = 0`, `Cas à risque élevé = 0`, recent-predictions card shows `Aucune prédiction enregistrée pour le moment.` |
| No `AIModelPerformance` | `Meilleur modèle = —`, `Précision moyenne = —` (`Lancer 'python manage.py train_ai_models'` hint), comparison table shows the same hint, chart card shows an empty-state |
| Both empty | All four cards + both tables + chart show the placeholders above; no crash |

### 10.2 Verifying the dashboard locally

```bash
python manage.py check
python manage.py migrate
python manage.py train_ai_models   # populates AIModelPerformance + the 3 .pkl/.json artifacts
python manage.py runserver
# Submit at least 2 predictions via /prediction/new/, then open /dashboard/.
# Stat cards / recent-predictions / comparison table / chart should all
# reflect live PostgreSQL state.
```

To exercise the empty path:

```python
from prediction.models import PredictionResult
from ai_models.models import AIModelPerformance
PredictionResult.objects.all().delete()
AIModelPerformance.objects.all().delete()
```

Then reload `/dashboard/` and confirm the placeholders described in §10.1.

## 11. Authentication (Step 10)

The platform uses Django's stock authentication. The `accounts` app exposes:

| URL | View | Purpose |
| --- | ---- | ------- |
| `/accounts/register/` | `accounts.views.register` | Sign-up (username, e-mail, password, confirmation). Logs in immediately after success and redirects to `/dashboard/`. |
| `/accounts/login/`    | `accounts.views.FrenchLoginView` | French login form. Wrong credentials show `Nom d'utilisateur ou mot de passe incorrect.` |
| `/accounts/logout/`   | `accounts.views.logout_view` (POST) | Logs out and bounces to `/accounts/login/` with a French goodbye message. |

`LOGIN_URL = "accounts:login"`, `LOGIN_REDIRECT_URL = "dashboard:index"`.

### 11.1 Protected pages

The following pages require an authenticated user (`@login_required`).
Anonymous visitors are redirected to `/accounts/login/?next=...`:

- `/dashboard/`
- `/prediction/new/`
- `/prediction/result/<patient_id>/`
- `/prediction/detail/<result_id>/`
- `/historique/`

### 11.2 User-owned data

- `PatientData.user` and `PredictionResult.user` are populated automatically on submission (`prediction.views.new_prediction`).
- `/historique/` only lists the current user's `PredictionResult` rows.
- `/prediction/detail/<id>/` and `/prediction/result/<id>/` return **404** for non-owners (so we don't leak row existence).
- The dashboard stat cards (`Prédictions totales`, `Cas à risque élevé`) and the `Prédictions récentes` table are scoped to `request.user`. The model-performance metrics remain global because they describe the trained AI, not user activity.
- **Admin bypass:** Django staff / superusers see every row, both in Django admin (`/admin/`) and on `/historique/` and the detail/result pages.

### 11.3 Topbar

When authenticated, the topbar shows `Bonjour, <username>` and a `Déconnexion`
button (CSRF-protected POST form). When anonymous, it shows `Connexion` +
`Créer un compte` links instead. The sidebar footer also reflects the
current user's username + role (`Compte clinicien` / `Administrateur`).

### 11.4 Verifying authentication locally

```bash
python manage.py check
python manage.py migrate
python manage.py runserver
# 1. Open /accounts/register/ and create user A
# 2. Submit /prediction/new/ as user A → /historique/ shows the row
# 3. Click "Déconnexion" → redirected to /accounts/login/
# 4. Register user B, submit a different prediction → /historique/ shows only B's row
# 5. While logged in as B, visit /prediction/detail/<A's id>/ → 404
# 6. Try /dashboard/ logged out → redirected to /accounts/login/
```

## 12. Model comparison page (Step 11)

Step 11 introduces a dedicated, login-protected page that exposes every row
of `AIModelPerformance` in detail.

### 12.1 URL & layout

| URL | View | Notes |
| --- | --- | --- |
| `/modeles/comparaison/` | `ai_models.views.comparison` | `@login_required` — anonymous users land on `/accounts/login/?next=…`. |

The page is composed of:

1. **CTA card** — `Nouvelle prédiction` (blue) + `Voir l'historique` (teal).
2. **Best-model spotlight** — trophy icon, model name, F1-score, `Meilleur modèle` badge.
3. **Tableau comparatif** — `Modèle / Accuracy / Précision / Rappel / F1-score / ROC-AUC / Statut`. The best-model row is highlighted via `models-table__row--best` and prefixed with a small trophy.
4. **F1-score par modèle** — Chart.js bar chart (best model in teal, others in slate grey).
5. **Toutes les métriques** — Chart.js grouped bar chart with Accuracy / Précision / Rappel / F1-score / ROC-AUC for every model.
6. **Comment lire ces métriques ?** — three short French explainers: why Recall matters in medical prediction, why F1 balances precision & recall, and why the best model was selected.

### 12.2 Empty state

If `AIModelPerformance` has zero rows, the page replaces the table + charts +
explainer with a single card showing the exact spec text:

> Aucun modèle IA entraîné pour le moment. Exécutez la commande&nbsp;: `python manage.py train_ai_models`

The CTA card stays visible so users can still navigate to `/prediction/new/`
or `/historique/`.

### 12.3 Dashboard wiring

The dashboard's `Voir la comparaison des modèles` button (Step 9) is now a
working link to `/modeles/comparaison/` — the previous `disabled` / `Bientôt`
state is gone. The sidebar's `Comparaison des modèles` link points to the
same URL and is highlighted as active on the page.

### 12.4 Verifying locally

```bash
python manage.py check
python manage.py migrate
python manage.py train_ai_models           # populates AIModelPerformance
python manage.py runserver
# Login as any user, then:
# /modeles/comparaison/  → table, charts, explainer
# Dashboard CTA "Voir la comparaison des modèles" → /modeles/comparaison/
# Anonymous GET /modeles/comparaison/ → 302 to /accounts/login/?next=...
# To test the empty state:
#   python manage.py shell -c "from ai_models.models import AIModelPerformance; AIModelPerformance.objects.all().delete()"
#   then reload /modeles/comparaison/
```

## 13. UI polish (Step 12)

Step 12 is a CSS / asset-only sweep — no backend, view, URL, template logic, or
inference change. The goal was to bring every page closer to a polished medical
AI dashboard look: consistent depth, spacing, typography, focus states, and
mobile behaviour.

### 13.1 What changed visually

- **Background** — soft radial wash (blue + teal) on the app body for depth.
- **Sidebar active state** — left-edge accent bar (gradient blue → teal) and
  bolder weight on the current page; clearer visual anchor than just the
  filled blue pill.
- **Brand mark** — same gradient logo, now with a subtle elevated shadow.
- **Topbar** — `Bonjour, <username>` rendered as a soft pill (rounded
  surface-muted background) instead of inline text; on screens narrower than
  ~1100px the pill collapses so the title + actions stay legible.
- **Stat cards** — gradient icon tiles (rather than flat soft-colour blocks)
  and a 1px hover lift with a stronger border / shadow.
- **Primary buttons** — subtle 180° gradient + a coloured drop-shadow that
  matches the brand blue. Focus-visible state is now a 3px ring across all
  buttons / chips / inputs.
- **Tables** — alternating row tint (`nth-child(even)`) and sticky `<thead>`
  inside the scroll wrap, so the column labels stay visible while scrolling
  the comparison and history tables.
- **Risk gauge** — soft drop-shadow halo behind the circular indicator on
  the result and detail pages (no change to data).
- **Mobile sidebar** — adds a backdrop element + JS toggling. Tapping the
  backdrop or pressing Escape closes the drawer.
- **Auth hero** — keeps the existing dark teal/blue gradient but adds a
  subtle dotted texture overlay for a more "clinical" feel; the right-hand
  card is unchanged.
- Various smaller tweaks: pill chips on the active filter, larger tap
  targets, refined disclaimer footer spacing, search field grows on
  ≥1280px screens.

### 13.2 Files touched

- `static/css/style.css` — appended a `Step 12: visual polish` block (~150
  lines) at the end of the file, plus a few tweaks to existing rules. No
  existing rule was deleted.
- `static/js/main.js` — small extension of the mobile sidebar toggle to
  manage the new backdrop and Escape-to-close.
- `templates/base.html` — added the `<div class="sidebar-backdrop">` element.

No template, view, model, URL, training, or inference code was modified.

### 13.3 Verifying locally (Step 12)

```bash
python manage.py check
python manage.py migrate
python manage.py runserver
# Login as any user, then visit each page and compare to the screenshots in PR:
#   /dashboard/                  → polished stat cards + recent + comparison + chart
#   /prediction/new/             → polished form
#   /prediction/result/<id>/     → circular gauge with halo, recommendation card
#   /prediction/detail/<id>/     → same polish + breadcrumb + patient recap
#   /historique/                 → filter chips + alternating rows + badges
#   /modeles/comparaison/        → best-model card + comparison + 2 Chart.js charts
#   /accounts/login/             → split hero + dotted overlay + card
#   /accounts/register/          → same auth shell
# Resize Chrome to ~480px wide → sidebar collapses; click hamburger → drawer slides
# in with backdrop; tap backdrop or press Escape to close.
```



## 14. Public landing page (Step 13)

`/` is now a **public landing page** rendered by `dashboard.views.home` and the
`templates/landing.html` template. It is the first thing both anonymous and
authenticated visitors see — `/dashboard/` continues to require a login.

### 14.1 Layout

The landing page has its own thin chrome (no sidebar / topbar) and these
sections, in order:

1. **Sticky top nav** — brand, in-page anchors (Présentation / Objectifs /
   Technologies / Modèles), and auth actions on the right.
2. **Hero** — `Plateforme intelligente de prédiction du risque d'AVC` +
   subtitle + adaptive CTA buttons + a small visual card showing the six
   model names and a synthetic bar chart.
3. **§01 Présentation du projet**
4. **§02 Objectifs** — 4-card grid (Évaluer plusieurs modèles d'IA / Stocker
   chaque prédiction / Donner un retour clinique / Visualiser les
   performances).
5. **§03 Technologies utilisées** — pill badges: Django, PostgreSQL, Python,
   Scikit-learn, Machine Learning, Chart.js.
6. **§04 Modèles d'IA comparés** — 6-card grid (Logistic Regression, Random
   Forest, SVM, KNN, Decision Tree, Naive Bayes — last one styled as the
   "souvent retenu" model).
7. **CTA banner** — gradient blue→teal with role-aware buttons.
8. **§05 Avertissement médical** —
   `Cette application est un projet académique et ne remplace pas un
   diagnostic médical.`
9. **Footer** — brand mark + the same disclaimer text.

### 14.2 CTAs by auth state

- **Anonymous** — header shows `Se connecter` and `Créer un compte`. Hero
  shows all four buttons; the two "secured" CTAs route through
  `/accounts/login/?next=…` so they bounce through login on the way to
  `/prediction/new/` or `/modeles/comparaison/`. Bottom CTA banner shows
  `Créer un compte` + `Se connecter`.
- **Authenticated** — header shows `Tableau de bord` + `Déconnexion` (real
  CSRF-protected POST form). Hero shows `Tableau de bord` +
  `+ Commencer une prédiction` + `Voir la comparaison des modèles`. Bottom
  CTA banner shows `+ Commencer une prédiction` +
  `Comparaison des modèles`.

### 14.3 Files touched

- `avc_prediction_platform/urls.py` — replaced the `/` → `/dashboard/`
  redirect with `path("", dashboard_views.home, name="home")`.
- `dashboard/views.py` — added a thin public `home` view (renders the
  template — no login required, no DB hit).
- `templates/landing.html` — new template (standalone HTML — no
  `extends "base.html"`).
- `static/css/style.css` — appended a `Step 13: public landing page` block
  (~280 lines). No existing rule was deleted.
- `README.md` — this section.

No backend logic, model code, training command, or auth view was touched.

### 14.4 Verifying locally

```bash
python manage.py check
python manage.py migrate
python manage.py runserver
# Anonymous:
#   GET /                          → 200, landing page with login/register CTAs
#   /accounts/login/?next=/prediction/new/   → reachable from the secured CTA
#   GET /dashboard/                → 302 → /accounts/login/?next=/dashboard/
# Authenticated:
#   GET /                          → landing page with dashboard CTAs
#   GET /dashboard/                → still works
#   /prediction/new/, /historique/, /modeles/comparaison/ → still work
```

## 15. PDF report export (Step 14)

Each prediction can be exported as a one-page A4 PDF report from the detail
page.

### 15.1 Route

`GET /prediction/detail/<id>/pdf/` (URL name `prediction:detail_pdf`).

The route is **login-protected** and uses the same access rules as
`prediction:detail`:
- the prediction's owner can export their own report,
- staff / superusers can export any report,
- everyone else gets a 404 (no leak of other users' rows),
- a missing id returns 404.

The response is `Content-Type: application/pdf` with
`Content-Disposition: attachment; filename="rapport-prediction-<id>.pdf"`.

### 15.2 Contents

The PDF includes all the spec items, in this order:
- AVC Predict brand bar
- "RAPPORT CLINIQUE" eyebrow + title `Rapport de prédiction AVC`
- Project name `Plateforme intelligente de prédiction du risque d'AVC`
- Identifier, date, clinician
- **Données du patient** table (genre, âge, hypertension, maladie cardiaque,
  déjà marié(e), type d'emploi, zone de résidence, glycémie moyenne, IMC,
  statut tabagique)
- **Résultat de la prédiction** (niveau de risque — red/teal accent —,
  probabilité, modèle utilisé)
- **Recommandation clinique**
- **Avertissement médical** card —
  `Cette application est un projet académique et ne remplace pas un
  diagnostic médical.`
- Page footer with the same disclaimer + page number on every page.

### 15.3 Dependency

Uses [ReportLab](https://www.reportlab.com/) — pure Python, no system
deps, and bundled in `requirements.txt`:

```
reportlab>=4.0
```

WeasyPrint was considered but rejected: it depends on Cairo / Pango /
GdkPixbuf system libs that are not always present in production / CI
environments.

### 15.4 Files touched

- `prediction/pdf_report.py` — **new** rendering module (ReportLab + Platypus
  flowables).
- `prediction/views.py` — added `detail_pdf` view.
- `prediction/urls.py` — added `prediction:detail_pdf`.
- `prediction/templates/prediction/detail.html` — added the
  `Exporter le rapport PDF` button.
- `requirements.txt` — added `reportlab>=4.0`.
- `README.md` — this section.

### 15.5 Verifying locally

```bash
pip install -r requirements.txt
python manage.py check
python manage.py migrate
python manage.py runserver
# Login as a normal user → /prediction/detail/<id>/
# Click "Exporter le rapport PDF"
# A PDF is downloaded named rapport-prediction-<id>.pdf
# As a different normal user → /prediction/detail/<id>/pdf/ returns 404
# As a superuser → can export any prediction's report
```
