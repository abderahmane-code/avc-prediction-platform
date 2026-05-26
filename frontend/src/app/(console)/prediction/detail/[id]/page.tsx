"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../../api";
import { Activity, AlertTriangle, FileText, CheckCircle, ArrowLeft } from "lucide-react";

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
  shap_explanation: { [key: string]: number } | null;
  risk_level_note: string;
  factors_note: string;
}

const FEATURE_LABELS_FR: { [key: string]: string } = {
  age: "Âge avancé",
  avg_glucose_level: "Glycémie élevée",
  bmi: "Indice de Masse Corporelle (IMC)",
  gender: "Genre (Homme/Femme)",
  ever_married: "Statut matrimonial",
  work_type: "Activité professionnelle",
  residence_type: "Zone de résidence",
  smoking_status: "Tabagisme",
  hypertension: "Hypertension artérielle",
  heart_disease: "Maladie cardiaque",
};

export default function PredictionDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadDetail() {
      try {
        const data = await fetchApi(`/api/prediction/detail/${id}/`);
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Impossible de charger les détails de la prédiction.");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "250px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de la fiche récapitulative...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button onClick={() => router.push("/historique")} className="btn btn--ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px", alignSelf: "flex-start" }}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
          <span>Retour à l&apos;historique</span>
        </button>
        <div className="alert alert--error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // Process SHAP values for Explainable AI
  const shapData = result.shap_explanation;
  const sortedFeatures = shapData
    ? Object.entries(shapData)
        .map(([key, val]) => ({
          key,
          label: FEATURE_LABELS_FR[key] || key,
          value: val as number,
          pct: (val as number) * 100,
        }))
        .filter((item) => Math.abs(item.pct) >= 0.1) // Only show features with visible impact
        .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)) // Sort by absolute impact
    : [];

  // Determine colors based on risk levels
  const isCritical = result.risk_level.css === "critical";
  const isHigh = result.risk_level.css === "high" || isCritical;
  
  const gaugeColor = 
    isCritical ? "#7f1d1d" :
    result.risk_level.css === "high" ? "#c94c4c" :
    result.risk_level.css === "moderate" ? "#c58a2a" :
    "#009b4e";

  const cardStyle = isCritical 
    ? { borderColor: "rgba(127, 29, 29, 0.4)", boxShadow: "0 0 0 3px rgba(127, 29, 29, 0.08)" } 
    : {};

  const chipStyle = isCritical 
    ? { background: "#fef2f2", color: "#7f1d1d", borderColor: "rgba(127, 29, 29, 0.3)", fontWeight: 700 } 
    : {};

  const valueStyle = isCritical 
    ? { color: "#7f1d1d", fontWeight: 800 } 
    : {};

  const recommendationStyle = isCritical 
    ? { background: "linear-gradient(180deg, rgba(127, 29, 29, 0.06), rgba(127, 29, 29, 0.02))", borderColor: "rgba(127, 29, 29, 0.25)", borderLeft: "4px solid #7f1d1d" } 
    : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="btn btn--ghost"
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", alignSelf: "flex-start", marginBottom: "-8px" }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        <span>Retour</span>
      </button>

      {/* 1. Main Risk Card */}
      <article className={`card card--risk-${result.risk_level.css}`} style={cardStyle} aria-labelledby="result-title">
        <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h2 id="result-title" className="card__title">Diagnostic IA #{result.id}</h2>
            <p className="card__subtitle">
              Calculé par le modèle <strong>{result.model_name}</strong> le {new Date(result.created_at).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
            </p>
          </div>
          <span className={`chip chip--${result.risk_level.css}`} style={chipStyle}>{result.risk_level.label}</span>
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
                style={{ 
                  strokeDasharray: `${result.probability_pct_int} 1000`,
                  stroke: gaugeColor
                }}
                pathLength={100}
              />
            </svg>
            <div className="risk-gauge__text">
              <div className="risk-gauge__percent" style={valueStyle}>{Math.round(result.probability_pct)} %</div>
              <div className="risk-gauge__label">Probabilité</div>
            </div>
          </div>

          <div className="risk-summary">
            <div className="risk-summary__line">
              <span className="risk-summary__label">Niveau de risque</span>
              <span className={`risk-summary__value risk-summary__value--${result.risk_level.css}`} style={valueStyle}>
                {result.risk_level.short}
              </span>
            </div>
            <div className="risk-summary__line">
              <span className="risk-summary__label">Probabilité estimée</span>
              <span className="risk-summary__value" style={isCritical ? { fontWeight: 700 } : {}}>{result.probability_pct.toFixed(1).replace(".", ",")} %</span>
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

        <div className={`recommendation ${isHigh ? "recommendation--high" : ""}`} style={{ marginTop: "24px", ...recommendationStyle }}>
          <div className="recommendation__title" style={isCritical ? { color: "#7f1d1d" } : {}}>Recommandation clinique</div>
          <p className="recommendation__text">{result.recommendation}</p>
        </div>
      </article>

      {/* 2. Explainable AI & Risk Factors */}
      <article className="card" aria-labelledby="factors-title">
        <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h2 id="factors-title" className="card__title">Explication médicale (IA explicable - SHAP)</h2>
            <p className="card__subtitle">Contribution et impact clinique de chaque facteur sur l&apos;estimation du risque.</p>
          </div>
          <span className="chip chip--blue">{sortedFeatures.length > 0 ? "Valeurs SHAP" : `${result.factors.length} facteur(s)`}</span>
        </header>

        {sortedFeatures.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
              Les valeurs positives indiquent un facteur aggravant le risque (en rouge), tandis que les valeurs négatives réduisent le risque (en sarcelle).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
              {sortedFeatures.map((item) => {
                const isPositive = item.pct >= 0;
                const formattedPct = `${isPositive ? "+" : ""}${item.pct.toFixed(1).replace(".", ",")} %`;
                const maxPct = Math.max(...sortedFeatures.map(f => Math.abs(f.pct)));
                const relativeWidth = maxPct > 0 ? `${(Math.abs(item.pct) / maxPct) * 100}%` : "0%";

                return (
                  <div key={item.key} style={{ display: "grid", gridTemplateColumns: "220px 1fr 70px", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1e293b" }}>{item.label}</span>
                    <div style={{ background: "#f1f5f9", height: "10px", borderRadius: "5px", position: "relative", overflow: "hidden" }}>
                      <div
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: relativeWidth,
                          left: isPositive ? "0" : "auto",
                          right: isPositive ? "auto" : "0",
                          background: isPositive ? "#ef4444" : "#0d9488",
                          borderRadius: "5px",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 700,
                        textAlign: "right",
                        color: isPositive ? "#ef4444" : "#0d9488",
                      }}
                    >
                      {formattedPct}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
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
          </div>
        )}

        <p className="factor-disclaimer" style={{ marginTop: "16px", color: "#8a8a8a", fontSize: "12.5px" }}>
          {result.factors_note}
        </p>
      </article>

      {/* 3. Recap Patient Data */}
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
          <a
            href={`/api/prediction/detail/${result.id}/pdf`}
            className="btn btn--primary"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <FileText style={{ width: 16, height: 16 }} />
            <span>Exporter le rapport PDF</span>
          </a>
          <button onClick={() => router.push("/historique")} className="btn btn--ghost">
            Retour à l&apos;historique
          </button>
        </div>
      </article>
    </div>
  );
}
