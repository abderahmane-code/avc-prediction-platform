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

Step 5 ships a standalone training pipeline at `prediction/ml/train_models.py`.
It trains six classifiers on the public stroke dataset, evaluates them and
persists the best model + the fitted preprocessing pipeline.

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

### 7.2 Run the training script

```bash
source .venv/bin/activate
python prediction/ml/train_models.py
```

Optional flags: `--csv path/to/file.csv`, `--test-size 0.2`, `--random-state 42`.

### 7.3 Generated artifacts

After a successful run the following files are written under
`prediction/ml/artifacts/` (also git-ignored):

| File                | Description                                           |
|---------------------|-------------------------------------------------------|
| `preprocessor.pkl`  | Fitted ColumnTransformer (impute + scale + one-hot).  |
| `best_model.pkl`    | Best classifier by F1-score on the test set.          |
| `model_metrics.json`| All six models' metrics, dataset/split sizes, best id.|

Models trained: Logistic Regression, KNN, Decision Tree, Random Forest, SVM,
Naive Bayes. Stratified train/test split, `zero_division=0` for sklearn
metrics, and `class_weight="balanced"` is used wherever supported (LR, DT,
RF, SVM) to handle the strong class imbalance of the dataset.

The script prints a per-model comparison table to the terminal and marks the
selected best model. Integration into the Django views happens in a later
step — Step 5 only trains and persists artifacts.

## Next steps

Upcoming steps (tracked separately):

- Step 6: integrate `best_model.pkl` + `preprocessor.pkl` into `/prediction/new/`
- Step 7: model-comparison page backed by `model_metrics.json`
