"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../../api";
import { Activity, AlertTriangle, FileText, CheckCircle, RefreshCw, ChevronRight } from "lucide-react";

interface PredictionResult {
  id: number;
  created_at: string;
  age: number;
  gender: string;
  hypertension: boolean;
  heart_disease: boolean;
  ever_married: string;
  work_type: string;
  residence_type: string;
  avg_glucose_level: number;
  bmi: number;
  smoking_status: string;
  model_name: string;
  is_high: boolean;
  risk_label: string;
  probability: number;
  probability_pct: number;
  probability_pct_int: number;
  recommendation: string;
  risk_level: {
    key: string;
    label: string;
    description: string;
    accent: string;
    css: string;
    short: string;
  };
  factors: string[];
  risk_level_note: string;
  factors_note: string;
}

export default function PredictionResultPage() {
  const { patient_id } = useParams();
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadResult() {
      try {
        const data = await fetchApi(`/api/prediction/result/${patient_id}/`);
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Impossible de charger le résultat de la prédiction.");
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [patient_id]);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "250px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Évaluation clinique en cours par l&apos;IA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <article className="card">
        <header className="card__header">
          <div>
            <h2 className="card__title">Données enregistrées</h2>
            <p className="card__subtitle">Le patient a été enregistré, mais l&apos;évaluation IA n&apos;a pas pu aboutir.</p>
          </div>
          <span className="chip chip--muted">En attente</span>
        </header>
        <div className="alert alert--error" style={{ padding: "12px", borderRadius: "8px", background: "#f8eaea", color: "#c94c4c", fontSize: "14px", marginTop: "12px" }}>
          <strong>{error}</strong>
        </div>
        <div className="form-actions" style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
          <Link href="/dashboard" className="btn btn--ghost">Retour au tableau de bord</Link>
          <Link href="/prediction/new" className="btn btn--primary">Réessayer</Link>
        </div>
      </article>
    );
  }

  if (!result) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Main Risk Evaluation Card */}
      <article className={`card card--risk-${result.risk_level.css}`} aria-labelledby="result-title">
        <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h2 id="result-title" className="card__title">Résultat de la prédiction</h2>
            <p className="card__subtitle">
              Calculé par le modèle <strong>{result.model_name}</strong> le {new Date(result.created_at).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
            </p>
          </div>
          <span className={`chip chip--${result.risk_level.css}`}>{result.risk_level.label}</span>
        </header>

        <div className="risk-result">
          <div className="risk-gauge" role="img" aria-label={`Probabilité estimée d'AVC : ${result.probability_pct_int} %`}>
            <svg viewBox="0 0 120 120" className="risk-gauge__svg">
              <circle cx="60" cy="60" r="52" className="risk-gauge__track" />
              <circle
                cx="60"
                cy="60"
                r="52"
                className="risk-gauge__value"
                style={{ strokeDasharray: `${result.probability_pct_int} 1000` }}
                pathLength={100}
              />
            </svg>
            <div className="risk-gauge__text">
              <div className="risk-gauge__percent">{Math.round(result.probability_pct)} %</div>
              <div className="risk-gauge__label">Probabilité</div>
            </div>
          </div>

          <div className="risk-summary">
            <div className="risk-summary__line">
              <span className="risk-summary__label">Niveau de risque</span>
              <span className={`risk-summary__value risk-summary__value--${result.risk_level.css}`}>
                {result.risk_level.short}
              </span>
            </div>
            <div className="risk-summary__line">
              <span className="risk-summary__label">Probabilité estimée</span>
              <span className="risk-summary__value">{result.probability_pct.toFixed(1).replace(".", ",")} %</span>
            </div>
            <div className="risk-summary__line">
              <span className="risk-summary__label">Modèle utilisé</span>
              <span className="risk-summary__value">{result.model_name}</span>
            </div>
          </div>
        </div>

        <p className="risk-level-note" style={{ marginTop: "16px", color: "#8a8a8a", fontSize: "12.5px" }}>
          {result.risk_level_note}
        </p>

        <div className={`recommendation ${result.risk_level.key === "high" ? "recommendation--high" : ""}`} style={{ marginTop: "24px" }}>
          <div className="recommendation__title">Recommandation clinique</div>
          <p className="recommendation__text">{result.recommendation}</p>
        </div>
      </article>

      {/* 2. Influencing Risk Factors */}
      <article className="card" aria-labelledby="factors-title">
        <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h2 id="factors-title" className="card__title">Facteurs influençant la prédiction</h2>
            <p className="card__subtitle">Éléments présents dans le dossier patient et associés à un risque accru d&apos;AVC.</p>
          </div>
          <span className="chip chip--blue">{result.factors.length} facteur{result.factors.length > 1 ? "s" : ""}</span>
        </header>

        {result.factors.length > 0 ? (
          <ul className="factors-list" style={{ display: "flex", flexDirection: "column", gap: "12px", listStyle: "none", padding: 0 }}>
            {result.factors.map((factor, i) => (
              <li key={i} className="factors-list__item" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                <span className="factors-list__dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c94c4c", flexShrink: 0 }}></span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="factors-empty" style={{ color: "#009b4e", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle style={{ width: 18, height: 18 }} />
            <span>Aucun facteur clinique de risque élevé identifié.</span>
          </p>
        )}

        <p className="factor-disclaimer" style={{ marginTop: "16px", color: "#8a8a8a", fontSize: "12.5px" }}>
          {result.factors_note}
        </p>
      </article>

      {/* 3. Patient Recollection Data Card */}
      <article className="card" aria-labelledby="recap-title">
        <header className="card__header" style={{ marginBottom: "20px" }}>
          <h2 id="recap-title" className="card__title">Récapitulatif du patient</h2>
          <p className="card__subtitle">Fiche récapitulative des constantes cliniques encodées.</p>
        </header>

        <section className="patient-recap" aria-label="Récapitulatif du patient">
          <dl className="patient-recap__grid">
            <div><dt>Genre</dt><dd>{result.gender}</dd></div>
            <div><dt>Âge</dt><dd>{Math.round(result.age)} ans</dd></div>
            <div><dt>IMC (BMI)</dt><dd>{result.bmi.toFixed(1).replace(".", ",")}</dd></div>
            <div><dt>Hypertension</dt><dd>{result.hypertension ? "Oui" : "Non"}</dd></div>
            <div><dt>Maladie cardiaque</dt><dd>{result.heart_disease ? "Oui" : "Non"}</dd></div>
            <div><dt>Déjà marié(e)</dt><dd>{result.ever_married}</dd></div>
            <div><dt>Type d&apos;emploi</dt><dd>{result.work_type}</dd></div>
            <div><dt>Zone de résidence</dt><dd>{result.residence_type}</dd></div>
            <div><dt>Statut tabagique</dt><dd>{result.smoking_status}</dd></div>
            <div><dt>Glycémie moyenne</dt><dd>{result.avg_glucose_level.toFixed(1).replace(".", ",")} mg/dL</dd></div>
          </dl>
        </section>

        <div className="form-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
          {/* Direct proxy file download for Django ReportLab PDF */}
          <a
            href={`/prediction/detail/${result.id}/pdf`}
            className="btn btn--primary"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <FileText style={{ width: 16, height: 16 }} />
            <span>Exporter le rapport PDF</span>
          </a>
          <button onClick={() => router.push("/dashboard")} className="btn btn--ghost">
            Tableau de bord
          </button>
          <button onClick={() => router.push("/prediction/new")} className="btn btn--secondary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Activity style={{ width: 16, height: 16 }} />
            <span>Nouveau diagnostic</span>
          </button>
        </div>
      </article>
    </div>
  );
}
