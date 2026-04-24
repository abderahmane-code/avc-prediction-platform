# Plateforme intelligente de prédiction du risque d'AVC

Academic project: a Django web platform that predicts stroke risk (AVC) and
compares multiple AI models. This repository currently contains **Step 1**:
the base Django project with PostgreSQL configuration. Frontend pages and the
AI model are not implemented yet.

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

## Next steps

Upcoming steps (tracked separately):

- Step 2: authentication UI (login / register) and base templates
- Step 3: dashboard layout + navigation
- Step 4: prediction form and AVC risk workflow
- Step 5: AI model training, persistence with `joblib`, and model comparison
