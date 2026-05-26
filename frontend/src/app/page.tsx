"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "./api";
import { Activity, ShieldAlert, Award, Database, Clock, TrendingUp } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await fetchApi("/api/auth/session/");
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch {
        // Treat session lookup failures as anonymous visitors.
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  return (
    <div className="landing-body">
      <header className="landing-nav" role="banner">
        <Link href="/" className="landing-nav__brand" aria-label="AVC Predict — accueil">
          <span className="landing-nav__mark" aria-hidden="true">
            <Activity style={{ width: 18, height: 18 }} />
          </span>
          <span className="landing-nav__brand-text">
            <span className="landing-nav__title">AVC Predict</span>
            <span className="landing-nav__sub">Plateforme clinique IA</span>
          </span>
        </Link>
        
        <nav className="landing-nav__links" aria-label="Navigation principale">
          <a href="#presentation">Présentation</a>
          <a href="#objectifs">Objectifs</a>
          <a href="#technologies">Technologies</a>
          <a href="#modeles">Modèles</a>
        </nav>
        
        <div className="landing-nav__actions">
          {loading ? (
            <span style={{ fontSize: "13px", color: "#6b6b6b" }}>Vérification...</span>
          ) : user ? (
            <>
              <Link className="btn btn--ghost btn--sm" href="/dashboard">
                Tableau de bord
              </Link>
              <Link className="btn btn--primary btn--sm" href="/prediction/new">
                Nouveau diagnostic
              </Link>
            </>
          ) : (
            <>
              <Link className="btn btn--ghost btn--sm" href="/login">
                Se connecter
              </Link>
              <Link className="btn btn--primary btn--sm" href="/register">
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="landing">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero__text">
            <span className="landing-hero__eyebrow">Projet académique · Django + Next.js + IA</span>
            <h1 id="hero-title" className="landing-hero__title">
              Plateforme intelligente de prédiction du risque d&apos;AVC
            </h1>
            <p className="landing-hero__lead">
              Une application web moderne basée sur Django, Next.js, PostgreSQL et l&apos;Intelligence
              Artificielle pour comparer des modèles de prédiction du risque d&apos;AVC.
            </p>
            <div className="landing-hero__cta" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
              {user ? (
                <>
                  <Link className="btn btn--primary" href="/dashboard">
                    Tableau de bord
                  </Link>
                  <Link className="btn btn--secondary" href="/prediction/new">
                    + Commencer une prédiction
                  </Link>
                  <Link className="btn btn--ghost" href="/modeles/comparaison">
                    Voir la comparaison des modèles
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn--primary" href="/login">
                    Se connecter
                  </Link>
                  <Link className="btn btn--ghost" href="/register">
                    Créer un compte
                  </Link>
                  <Link className="btn btn--secondary" href="/login?next=/prediction/new">
                    + Commencer une prédiction
                  </Link>
                  <Link className="btn btn--ghost" href="/login?next=/modeles/comparaison">
                    Voir la comparaison des modèles
                  </Link>
                </>
              )}
            </div>
            <p className="landing-hero__note" style={{ marginTop: "12px", fontSize: "13px", color: "#6b6b6b" }}>
              {user ? (
                <span>Connecté en tant que <strong>{user.username}</strong>.</span>
              ) : (
                <span>Les fonctions de prédiction nécessitent un compte clinicien.</span>
              )}
            </p>
          </div>
          
          <aside className="landing-hero__art" aria-hidden="true">
            <div className="landing-hero__card">
              <div className="landing-hero__card-row">
                <span className="landing-hero__chip landing-hero__chip--blue">Logistic Regression</span>
                <span className="landing-hero__chip landing-hero__chip--teal">Random Forest</span>
              </div>
              <div className="landing-hero__card-row">
                <span className="landing-hero__chip">SVM</span>
                <span className="landing-hero__chip">KNN</span>
                <span className="landing-hero__chip">Decision Tree</span>
                <span className="landing-hero__chip">Naive Bayes</span>
              </div>
              <div className="landing-hero__bars" aria-hidden="true">
                <span style={{ "--h": "60%" } as React.CSSProperties}></span>
                <span style={{ "--h": "78%" } as React.CSSProperties}></span>
                <span style={{ "--h": "90%" } as React.CSSProperties}></span>
                <span style={{ "--h": "70%" } as React.CSSProperties}></span>
                <span style={{ "--h": "82%" } as React.CSSProperties}></span>
                <span style={{ "--h": "95%" } as React.CSSProperties}></span>
              </div>
              <div className="landing-hero__card-foot">
                <span className="landing-hero__metric"><strong>F1</strong> · sélection</span>
                <span className="landing-hero__metric"><strong>ROC-AUC</strong> · qualité</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="presentation" className="landing-section" aria-labelledby="presentation-title">
          <header className="landing-section__head">
            <span className="landing-section__eyebrow">01 · Présentation du projet</span>
            <h2 id="presentation-title" className="landing-section__title">Une vitrine académique de l&apos;IA appliquée à la santé</h2>
            <p className="landing-section__lead">
              Cette plateforme illustre, dans un cadre universitaire, comment des
              modèles de Machine Learning peuvent assister la détection précoce du
              risque d&apos;accident vasculaire cérébral. Toutes les prédictions sont
              calculées à partir de données patient saisies par l&apos;utilisateur et
              comparées aux performances de plusieurs modèles entraînés sur un
              jeu de données publique.
            </p>
          </header>
        </section>

        <section id="objectifs" className="landing-section landing-section--alt" aria-labelledby="objectifs-title">
          <header className="landing-section__head">
            <span className="landing-section__eyebrow">02 · Objectifs</span>
            <h2 id="objectifs-title" className="landing-section__title">Ce que la plateforme cherche à démontrer</h2>
          </header>
          <div className="landing-grid">
            <article className="landing-feature">
              <span className="landing-feature__icon" aria-hidden="true">
                <Activity style={{ width: 24, height: 24 }} />
              </span>
              <h3 className="landing-feature__title">Évaluer plusieurs modèles d&apos;IA</h3>
              <p>Comparer six classifieurs sur des métriques cliniquement pertinentes : précision, rappel, F1-score et ROC-AUC.</p>
            </article>
            <article className="landing-feature">
              <span className="landing-feature__icon" aria-hidden="true">
                <Database style={{ width: 24, height: 24 }} />
              </span>
              <h3 className="landing-feature__title">Stocker chaque prédiction</h3>
              <p>Les saisies patient et les résultats sont persistés dans PostgreSQL avec un historique privé par utilisateur.</p>
            </article>
            <article className="landing-feature">
              <span className="landing-feature__icon" aria-hidden="true">
                <Clock style={{ width: 24, height: 24 }} />
              </span>
              <h3 className="landing-feature__title">Donner un retour clinique</h3>
              <p>Chaque résultat est présenté avec une probabilité, un niveau de risque et une recommandation en français.</p>
            </article>
            <article className="landing-feature">
              <span className="landing-feature__icon" aria-hidden="true">
                <TrendingUp style={{ width: 24, height: 24 }} />
              </span>
              <h3 className="landing-feature__title">Visualiser les performances</h3>
              <p>Des graphiques Chart.js permettent de comparer F1-score et toutes les métriques agrégées d&apos;un coup d&apos;œil.</p>
            </article>
          </div>
        </section>

        <section id="technologies" className="landing-section" aria-labelledby="technologies-title">
          <header className="landing-section__head">
            <span className="landing-section__eyebrow">03 · Technologies utilisées</span>
            <h2 id="technologies-title" className="landing-section__title">Une stack moderne et maîtrisée</h2>
            <p className="landing-section__lead">
              Le projet repose sur des outils open-source largement adoptés dans
              l&apos;industrie et l&apos;académie.
            </p>
          </header>
          <ul className="landing-badges" aria-label="Technologies utilisées">
            <li className="landing-badge landing-badge--blue">Django</li>
            <li className="landing-badge landing-badge--blue">Next.js</li>
            <li className="landing-badge landing-badge--teal">PostgreSQL</li>
            <li className="landing-badge">Python</li>
            <li className="landing-badge landing-badge--blue">Scikit-learn</li>
            <li className="landing-badge">Machine Learning</li>
            <li className="landing-badge landing-badge--teal">Chart.js</li>
          </ul>
        </section>

        <section id="modeles" className="landing-section landing-section--alt" aria-labelledby="modeles-title">
          <header className="landing-section__head">
            <span className="landing-section__eyebrow">04 · Modèles d&apos;IA comparés</span>
            <h2 id="modeles-title" className="landing-section__title">Six classifieurs entraînés sur le même jeu de données</h2>
            <p className="landing-section__lead">
              Le pipeline d&apos;entraînement charge le dataset, applique le même
              prétraitement à tous les modèles, puis sélectionne automatiquement
              le meilleur sur la base du F1-score.
            </p>
          </header>
          <div className="landing-models">
            <article className="landing-model">
              <h3>Logistic Regression</h3>
              <p>Modèle linéaire simple, robuste et facilement interprétable.</p>
            </article>
            <article className="landing-model">
              <h3>Random Forest</h3>
              <p>Ensemble d&apos;arbres de décision pour capter des interactions non linéaires.</p>
            </article>
            <article className="landing-model">
              <h3>SVM</h3>
              <p>Marges maximales sur les caractéristiques cliniques transformées.</p>
            </article>
            <article className="landing-model">
              <h3>KNN</h3>
              <p>Classification par proximité dans l&apos;espace des caractéristiques.</p>
            </article>
            <article className="landing-model">
              <h3>Decision Tree</h3>
              <p>Arbre de décision unique, lecture rapide des règles cliniques.</p>
            </article>
            <article className="landing-model landing-model--accent">
              <h3>Naive Bayes <span className="landing-model__pill">souvent retenu</span></h3>
              <p>Modèle probabiliste léger, performant sur les classes déséquilibrées.</p>
            </article>
          </div>
        </section>

        <section className="landing-section landing-section--cta" aria-label="Appel à l'action">
          <div className="landing-cta">
            <div>
              <h2 className="landing-cta__title">Prêt à explorer la plateforme ?</h2>
              <p className="landing-cta__sub">
                {user ? (
                  <span>Lancez une nouvelle prédiction ou consultez la comparaison détaillée des modèles.</span>
                ) : (
                  <span>Créez un compte pour soumettre des données patient et consulter votre historique privé.</span>
                )}
              </p>
            </div>
            <div className="landing-cta__buttons">
              {user ? (
                <>
                  <Link className="btn btn--primary" href="/prediction/new">
                    + Commencer une prédiction
                  </Link>
                  <Link className="btn btn--secondary" href="/modeles/comparaison">
                    Comparaison des modèles
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn--primary" href="/register">
                    Créer un compte
                  </Link>
                  <Link className="btn btn--ghost" href="/login">
                    Se connecter
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--disclaimer" aria-labelledby="disclaimer-title">
          <header className="landing-section__head">
            <span className="landing-section__eyebrow">05 · Avertissement médical</span>
            <h2 id="disclaimer-title" className="landing-section__title">Pour un usage académique uniquement</h2>
          </header>
          <div className="landing-disclaimer">
            <span className="landing-disclaimer__icon" aria-hidden="true">
              <ShieldAlert style={{ width: 24, height: 24 }} />
            </span>
            <p>
              Cette application est un projet académique et ne remplace pas un
              diagnostic médical. Les résultats fournis sont indicatifs ; toute
              décision clinique doit être prise par un professionnel de santé
              qualifié.
            </p>
          </div>
        </section>
      </main>

      <footer className="landing-footer" role="contentinfo">
        <div className="landing-footer__inner">
          <span className="landing-footer__brand">
            <span className="landing-nav__mark landing-nav__mark--sm" aria-hidden="true">
              <Activity style={{ width: 14, height: 14 }} />
            </span>
            AVC Predict — Plateforme clinique IA
          </span>
          <span className="landing-footer__note">Cette application est un projet académique et ne remplace pas un diagnostic médical.</span>
        </div>
      </footer>
    </div>
  );
}
