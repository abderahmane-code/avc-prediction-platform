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

`/dashboard/` reads real counts from PostgreSQL:

* **Prédictions totales** — number of `PredictionResult` rows (falls back to
  `PatientData.objects.count()` only when no predictions exist yet).
* **Cas à risque élevé** — `PredictionResult.objects.filter(prediction=True).count()`
  with the percentage of total predictions.
* **Meilleur modèle** / **Précision moyenne** — read from `AIModelPerformance`
  (Step 6).

## Next steps

Upcoming steps (tracked separately):

- Step 8: dedicated model-comparison page backed by `AIModelPerformance`
