# Plateforme intelligente de prédiction du risque d'AVC

> **Cette application est un projet académique et ne remplace pas un diagnostic médical.**

Plateforme web Django + PostgreSQL + scikit-learn permettant de :
- saisir les données cliniques d'un patient,
- calculer un risque d'AVC à partir de plusieurs modèles d'apprentissage automatique,
- comparer les performances des modèles entraînés,
- consulter l'historique de chaque utilisateur,
- exporter chaque rapport au format PDF.

---

## 1. Description du projet

Application web académique illustrant un pipeline complet de prédiction médicale assistée par IA :
- Authentification par utilisateur — chaque clinicien voit uniquement ses propres patients.
- Saisie d'un formulaire patient, prédiction calculée par le meilleur modèle entraîné.
- Tableau de bord dynamique alimenté par PostgreSQL.
- Page de comparaison des modèles d'IA (table + graphiques Chart.js).
- Export PDF du rapport de prédiction (ReportLab).
- Page d'accueil publique présentant le projet.

---

## 2. Fonctionnalités

| Domaine | Fonctionnalité |
|---|---|
| Public | Page d'accueil `/` avec présentation, technologies, modèles comparés, avertissement médical |
| Authentification | `/accounts/{register,login,logout}/` (formulaires en français, messages utilisateur) |
| Prédiction | Formulaire patient validé, inférence en direct, page de résultat avec risque + recommandation |
| Historique | `/historique/` filtré par utilisateur (les administrateurs voient tout) |
| Détail | `/prediction/detail/<id>/` avec récap clinique + jauge circulaire |
| Export | `/prediction/detail/<id>/pdf/` — PDF A4 d'une page (ReportLab) |
| Modèles | `/modeles/comparaison/` : tableau + graphiques Chart.js + explication pédagogique |
| Tableau de bord | Statistiques live (total / risques élevés / meilleur modèle / précision moyenne) + prédictions récentes |
| Admin | `/admin/` — accès complet pour le staff/superuser |

---

## 3. Technologies utilisées

| Couche | Outils |
|---|---|
| Backend | Python 3.10+, Django 5.x |
| Base de données | PostgreSQL 14+ |
| Machine Learning | scikit-learn, pandas, numpy, joblib |
| PDF | ReportLab |
| Frontend | HTML5 / CSS3 (variables, grid, flex) / JavaScript vanilla |
| Graphiques | Chart.js (CDN) |
| Police | Inter (Google Fonts) |

Modèles comparés : **Logistic Regression**, **Random Forest**, **SVM**, **Naive Bayes**, **K-Nearest Neighbors**, **Decision Tree**.

---

## 4. Installation

### 4.1 Prérequis

- Python 3.10+
- PostgreSQL 14+
- Git

### 4.2 Cloner et créer un environnement virtuel

```bash
git clone https://github.com/abderahmane-code/avc-prediction-platform.git
cd avc-prediction-platform
python3 -m venv .venv
source .venv/bin/activate           # Linux / macOS
# .venv\Scripts\activate            # Windows PowerShell
pip install --upgrade pip
pip install -r requirements.txt
```

### 4.3 Configuration PostgreSQL

```bash
# Démarrer PostgreSQL (Ubuntu / Debian)
sudo systemctl start postgresql
# ou
sudo pg_ctlcluster 14 main start

# Créer la base et l'utilisateur
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE avc_prediction;"
```

### 4.4 Variables d'environnement

Copier le modèle puis ajuster les valeurs si nécessaire :

```bash
cp .env.example .env
```

Variables disponibles (`.env.example`) :

```
SECRET_KEY=replace-me-with-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=avc_prediction
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

> Le fichier `.env` est ignoré par Git (`.gitignore`) — ne jamais le committer.

### 4.5 Migrations

```bash
python manage.py migrate
```

---

## 5. Dataset

Le projet utilise le dataset public **Stroke Prediction Dataset** (Kaggle).

- Emplacement attendu : `prediction/ml/data/healthcare-dataset-stroke-data.csv`
- Le dossier est versionné via un `.gitkeep`, **mais le CSV n'est pas committé** (cf. `.gitignore`).
- Source : https://www.kaggle.com/datasets/fedesoriano/stroke-prediction-dataset

```bash
mkdir -p prediction/ml/data
# Télécharger le CSV manuellement et le placer ici :
# prediction/ml/data/healthcare-dataset-stroke-data.csv
```

---

## 6. Entraînement des modèles d'IA

```bash
python manage.py train_ai_models
```

Cette commande :
1. Lit le CSV `prediction/ml/data/healthcare-dataset-stroke-data.csv`.
2. Entraîne les 6 modèles (Logistic Regression, Random Forest, SVM, Naive Bayes, KNN, Decision Tree).
3. Persiste leurs métriques dans la table `AIModelPerformance` (PostgreSQL).
4. Sauvegarde les artefacts (`prediction/ml/artifacts/best_model.pkl`, `preprocessor.pkl`, `model_metrics.json`) — non versionnés.

Le modèle marqué « meilleur » (selon le F1-score) sera utilisé par `/prediction/new/` pour les inférences.

---

## 7. Lancer le serveur

```bash
python manage.py runserver
# http://127.0.0.1:8000/
```

---

## 8. Créer un superutilisateur

```bash
python manage.py createsuperuser
```

Le superutilisateur peut :
- accéder à `/admin/` (table users, patients, prédictions, modèles),
- voir l'historique de **tous** les utilisateurs,
- exporter le PDF de **n'importe quelle** prédiction.

---

## 9. Routes principales

| Route | Auth | Description |
|---|---|---|
| `/` | Publique | Page d'accueil (hero, présentation, technologies, modèles, avertissement) |
| `/accounts/register/` | Publique | Création de compte (username / email / password / confirm) |
| `/accounts/login/` | Publique | Connexion |
| `/accounts/logout/` | Authentifié | Déconnexion (POST CSRF) |
| `/dashboard/` | Authentifié | Statistiques + prédictions récentes + comparaison rapide |
| `/prediction/new/` | Authentifié | Formulaire patient → inférence → redirection vers `/prediction/result/<id>/` |
| `/prediction/result/<patient_id>/` | Owner / staff | Page de résultat (jauge, recommandation) |
| `/prediction/detail/<result_id>/` | Owner / staff | Détail d'une prédiction de l'historique |
| `/prediction/detail/<result_id>/pdf/` | Owner / staff | **Export PDF** du rapport |
| `/historique/` | Authentifié | Historique scopé à l'utilisateur (staff voit tout) |
| `/modeles/comparaison/` | Authentifié | Tableau + graphiques + explication des modèles |
| `/statistiques/` | Authentifié | Statistiques personnelles + doughnut Chart.js |
| `/parametres/` | Authentifié | Profil utilisateur + préférences (lecture seule) |
| `/gestion/` | **Staff/superuser** | Gestion plateforme — synthèse globale |
| `/gestion/utilisateurs/` | **Staff/superuser** | Liste des utilisateurs + filtres |
| `/gestion/utilisateurs/<id>/` | **Staff/superuser** | Fiche utilisateur + prédictions récentes |
| `/gestion/predictions/` | **Staff/superuser** | Toutes les prédictions + filtres + lien PDF |
| `/notifications/` | Authentifié | Notifications privées (utilisateur) ou privées + globales (admin) |
| `/notifications/<id>/read/` | Authentifié | Marquer une notification comme lue (POST) |
| `/notifications/read-all/` | Authentifié | Marquer toutes les notifications visibles comme lues (POST) |
| `/admin/` | Staff | Administration Django |

> Les routes « Owner / staff » renvoient **404** si l'utilisateur authentifié n'est ni propriétaire ni staff (pas de fuite d'existence de ligne).

---

## 10. Export PDF

Bouton **« Exporter le rapport PDF »** sur `/prediction/detail/<id>/`.

Le PDF généré (ReportLab, A4, une page) contient :
- bandeau de marque + bandeau pied-de-page (avertissement + numéro de page sur chaque page),
- titre `Rapport de prédiction AVC` + nom du projet,
- identifiant, date, clinicien,
- tableau **Données du patient** (10 champs avec libellés français),
- tableau **Résultat de la prédiction** (niveau de risque rouge si élevé, sarcelle si faible — probabilité — modèle),
- bloc **Recommandation clinique**,
- bloc **Avertissement médical** (texte exact).

Implémentation :
- Module `prediction/pdf_report.py` (ReportLab + Platypus).
- Vue `prediction.views.detail_pdf`, route nommée `prediction:detail_pdf`.
- Dépendance : `reportlab>=4.0` (pure Python, aucune dépendance système).

---

## 10bis. Gestion de la plateforme

L'application distingue deux rôles :

| Rôle | Description | Accès |
|---|---|---|
| **Utilisateur** | Compte normal créé via `/accounts/register/`. Ne voit que ses propres prédictions. | Pages applicatives uniquement. |
| **Administrateur** | `is_staff=True` ou `is_superuser=True`. Voit toutes les prédictions et tous les utilisateurs. | + section `/gestion/` + Django admin. |

La barre latérale affiche un item **« Gestion plateforme »** uniquement pour les administrateurs. Les pages de gestion sont en lecture seule (consultation/monitoring) : aucune action destructive (pas de suppression d'utilisateur, pas de réinitialisation de mot de passe). Pour ces opérations, utiliser **Django admin** à `/admin/`.

Pages d'administration disponibles :

- **`/gestion/`** — Tableau de bord administrateur : nombre d'utilisateurs, prédictions totales, cas à risque élevé / faible, modèles entraînés, meilleur modèle, précision moyenne, état de l'export PDF.
- **`/gestion/utilisateurs/`** — Liste des utilisateurs avec filtres : *Tous*, *Staff uniquement*, *Utilisateurs normaux*, *Actifs uniquement*. Affiche : nom, e-mail, date d'inscription, staff/superuser, nombre de prédictions, dernière connexion, statut.
- **`/gestion/utilisateurs/<id>/`** — Fiche utilisateur : profil + statistiques (total / risque élevé / risque faible) + 10 dernières prédictions avec lien vers le détail.
- **`/gestion/predictions/`** — Toutes les prédictions de la plateforme avec filtres *Toutes / Risque élevé / Risque faible*, liens vers le détail et l'export PDF de chaque prédiction.

Un utilisateur normal qui tente d'accéder à `/gestion/` (ou ses sous-routes) reçoit une réponse **403** avec le message **« Accès réservé aux administrateurs. »**.

### Créer un superutilisateur

```bash
python manage.py createsuperuser
```

---

## 10ter. Notifications

Une cloche dans la barre supérieure ouvre la page **`/notifications/`** (login requis). Le compteur rouge sur la cloche affiche le nombre de notifications non lues visibles par l'utilisateur courant — il est mis à jour à chaque rendu de page (context processor `notifications.context_processors.notifications`).

### Visibilité

| Type | `user` | Visible par |
|---|---|---|
| **Privée** | défini | uniquement le destinataire (et les administrateurs si elle leur est adressée) |
| **Globale / admin** | `NULL` | uniquement les comptes `is_staff` / `is_superuser` |

Un utilisateur normal ne voit donc **jamais** les notifications globales destinées aux administrateurs.

### Notifications créées automatiquement

| Déclencheur | Type | Destinataire | Titre / message |
|---|---|---|---|
| Création de prédiction réussie | `success` | utilisateur | *Prédiction créée — Votre prédiction a été enregistrée avec succès.* |
| Prédiction au niveau **Risque élevé** | `danger` | utilisateur | *Risque élevé détecté — Une prédiction récente indique un risque élevé. Consultez le rapport pour plus de détails.* |
| Soumission alors que les artefacts IA sont absents | `warning` | utilisateur | *Modèle IA non entraîné — Le modèle IA n'est pas encore entraîné. Veuillez exécuter `python manage.py train_ai_models`.* |
| Inscription d'un nouvel utilisateur | `info` | global (admins) | *Nouvel utilisateur inscrit — Un nouvel utilisateur vient de créer un compte.* |

### Actions

- **`POST /notifications/<id>/read/`** — marque une notification comme lue (uniquement si elle est visible par l'utilisateur courant ; sinon 404).
- **`POST /notifications/read-all/`** — marque toutes les notifications visibles non lues comme lues.

L'ordre d'affichage est : non lues d'abord, puis les plus récentes. Lorsqu'aucune notification n'existe, la page affiche **« Aucune notification pour le moment. »**

Les notifications sont gérables depuis Django admin (`/admin/`) : `list_display`, `list_filter`, `search_fields`, et `created_at` est en lecture seule.

---

## 11. Avertissement médical

> **Cette application est un projet académique et ne remplace pas un diagnostic médical.**

Cet avertissement est rappelé :
- sur la page d'accueil publique,
- en pied de chaque page authentifiée,
- dans le PDF exporté (corps + pied de page),
- sur la page de comparaison des modèles.

---

## 12. Note académique

Projet réalisé dans le cadre d'un travail académique. Les modèles sont entraînés sur un dataset public (Kaggle) à des fins pédagogiques. Aucun usage clinique réel n'est prévu ni recommandé.

---

## 13. Guide de présentation (Démo)

Suggestion de parcours pour la soutenance / démonstration devant l'administration de l'institut.

### Étape 1 — Page d'accueil publique (avant connexion)
1. Ouvrir `http://127.0.0.1:8000/`.
2. Montrer : titre, sous-titre, sections **Présentation / Objectifs / Technologies / Modèles d'IA comparés / Avertissement médical**.
3. Cliquer sur **« Commencer une prédiction »** : on est redirigé vers `/accounts/login/?next=/prediction/new/` → démontre la protection.

### Étape 2 — Création de compte / Connexion
1. Cliquer sur **« Créer un compte »**.
2. Renseigner username / email / mot de passe / confirmation.
3. Validation → redirection automatique vers `/dashboard/` avec un message de bienvenue.

### Étape 3 — Tableau de bord dynamique
1. Pointer les **4 cartes statistiques** (total prédictions, risques élevés, % risques élevés, meilleur modèle).
2. Montrer la carte **« Prédictions récentes »** avec lien vers chaque détail.
3. Insister : toutes les valeurs proviennent de PostgreSQL (`PredictionResult` + `AIModelPerformance`).

### Étape 4 — Démonstration d'une prédiction
1. Cliquer sur **« + Nouvelle prédiction »**.
2. Remplir le formulaire (par ex. patient âgé, hypertension, tabagique → forte probabilité de risque élevé).
3. Soumettre → page de résultat avec :
   - jauge circulaire (rouge si élevé, sarcelle si faible),
   - probabilité, modèle utilisé, recommandation clinique en français.

### Étape 5 — Comparaison des modèles d'IA
1. Cliquer sur **« Comparaison des modèles »** dans la sidebar.
2. Montrer :
   - le **tableau comparatif** (6 modèles × 5 métriques) avec la ligne du meilleur modèle surlignée + icône trophée,
   - les **deux graphiques Chart.js** (F1-score par modèle + grouped bar de toutes les métriques),
   - l'**explication pédagogique** (pourquoi le rappel/Recall est crucial en médecine, pourquoi le F1-score, pourquoi ce modèle a été choisi).

### Étape 6 — Export PDF du rapport
1. Retourner sur `/historique/` → cliquer sur une prédiction.
2. Sur la page de détail, cliquer **« Exporter le rapport PDF »**.
3. Ouvrir le PDF téléchargé : montrer le bandeau, le tableau patient, le bloc résultat coloré, la recommandation, l'avertissement médical.

### Étape 7 — Cloisonnement par utilisateur (sécurité)
1. Se déconnecter, créer / se connecter avec un **second compte**.
2. Aller sur `/historique/` → vide ou ne contient que les prédictions du second utilisateur.
3. Tenter `/prediction/detail/<id-du-premier-user>/` → **404** (pas de fuite).

### Étape 8 — Administration
1. Se connecter avec le superutilisateur.
2. Ouvrir `/admin/` → montrer les tables `User`, `PatientData`, `PredictionResult`, `AIModelPerformance`.
3. Revenir sur `/historique/` → le superuser voit **toutes** les prédictions.

---

## 14. Vérifications finales

```bash
python manage.py check
python manage.py migrate
python manage.py train_ai_models   # nécessite le CSV en place
python manage.py runserver
```

Toutes les routes du §9 doivent répondre comme indiqué.

---

## 15. Pistes d'amélioration possibles

Hors périmètre du projet académique, mais envisageable pour une suite :
- Tests unitaires et d'intégration (pytest + pytest-django + factories).
- CI/CD GitHub Actions (lint + tests + déploiement).
- Internationalisation (i18n) au-delà du français.
- Calibration probabiliste (Platt scaling / isotonic) pour des probabilités mieux étalonnées.
- Explainability (SHAP / LIME) sur la page de détail.
- Conteneurisation (`Dockerfile` + `docker-compose.yml` Postgres + Django + nginx).
- Stockage signé des PDFs sur S3/GCS pour archivage long terme.
- Rôles plus fins (médecin / chercheur / administrateur).

---

## Licence

Projet académique — usage pédagogique uniquement.
