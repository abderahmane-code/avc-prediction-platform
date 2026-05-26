"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "../../api";
import { Activity, AlertTriangle, Trophy, Target, ArrowRight, Eye, PlusCircle } from "lucide-react";

interface Stat {
  label: string;
  value: string;
  delta: string;
  icon: string;
  accent: string;
}

interface Prediction {
  id: number;
  created_at: string;
  age: number;
  gender: string;
  is_high: boolean;
  risk_label: string;
  probability: number;
  probability_pct: number;
  probability_pct_int: number;
  model_name: string;
  risk_level: {
    key: string;
    label: string;
    description: string;
    accent: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentPredictions, setRecentPredictions] = useState<Prediction[]>([]);
  const [hasModels, setHasModels] = useState(false);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchApi("/api/dashboard/");
        setStats(data.stats || []);
        setRecentPredictions(data.recent_predictions || []);
        setHasModels(data.has_models || false);
        setTotalPredictions(data.total_predictions || 0);
      } catch (err: any) {
        setError(err.message || "Impossible de charger les données du tableau de bord.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "activity":
        return <Activity />;
      case "alert":
        return <AlertTriangle />;
      case "trophy":
        return <Trophy />;
      case "target":
        return <Target />;
      default:
        return <Activity />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "200px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert--error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 4 Stat Cards */}
      <section className="stat-grid" aria-label="Statistiques de la plateforme">
        {stats.map((stat, i) => (
          <article key={i} className={`stat-card stat-card--${stat.accent}`}>
            <div className="stat-card__icon">{getIcon(stat.icon)}</div>
            <div className="stat-card__body">
              <span className="stat-card__label">{stat.label}</span>
              <div className="stat-card__value">{stat.value}</div>
              <span className="stat-card__delta">{stat.delta}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Main Grid: Recent predictions and Model warning banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px" }}>
        {/* Left Column: Recent Predictions */}
        <div style={{ gridColumn: "span 12" }}>
          <article className="card">
            <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="card__title">Prédictions récentes</h2>
                <p className="card__subtitle">Les 5 dernières prédictions d&apos;AVC enregistrées.</p>
              </div>
              <Link href="/prediction/new" className="btn btn--primary btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <PlusCircle style={{ width: 16, height: 16 }} />
                <span>Nouveau diagnostic</span>
              </Link>
            </header>

            {recentPredictions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <Activity style={{ width: 48, height: 48, color: "#8a8a8a", margin: "0 auto 16px" }} />
                <p style={{ color: "#6b6b6b", fontWeight: 600 }}>Aucune prédiction enregistrée pour le moment.</p>
                <p style={{ color: "#8a8a8a", fontSize: "13px", marginTop: "4px" }}>Lancer un nouveau diagnostic pour commencer.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #d9e6de", textAlign: "left" }}>
                      <th style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>ID</th>
                      <th style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Âge</th>
                      <th style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Modèle IA</th>
                      <th style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Probabilité</th>
                      <th style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Niveau de risque</th>
                      <th style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPredictions.map((pred) => (
                      <tr key={pred.id} style={{ borderBottom: "1px solid #d9e6de" }}>
                        <td style={{ padding: "14px 8px", fontWeight: 700 }}>#{pred.id}</td>
                        <td style={{ padding: "14px 8px", color: "#6b6b6b" }}>
                          {new Date(pred.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td style={{ padding: "14px 8px" }}>{pred.age} ans</td>
                        <td style={{ padding: "14px 8px", color: "#6b6b6b" }}>{pred.model_name}</td>
                        <td style={{ padding: "14px 8px" }}>
                          <span style={{ fontWeight: 600, color: pred.is_high ? "#c94c4c" : "#009b4e" }}>
                            {pred.probability_pct_int}%
                          </span>
                        </td>
                        <td style={{ padding: "14px 8px" }}>
                          <span
                            className="badge"
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: pred.risk_level.accent === "red" ? "#f8eaea" : pred.risk_level.accent === "amber" ? "#fff4df" : "#eaf7f0",
                              color: pred.risk_level.accent === "red" ? "#c94c4c" : pred.risk_level.accent === "amber" ? "#c58a2a" : "#009b4e",
                            }}
                          >
                            {pred.risk_level.label}
                          </span>
                        </td>
                        <td style={{ padding: "14px 8px", textAlign: "right" }}>
                          <Link href={`/prediction/detail/${pred.id}`} className="btn btn--ghost btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Eye style={{ width: 14, height: 14 }} />
                            <span>Détails</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {recentPredictions.length > 0 && (
              <footer style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <Link href="/historique" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#009b4e", fontWeight: 600, fontSize: "14px" }}>
                  <span>Consulter tout l&apos;historique</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
              </footer>
            )}
          </article>
        </div>
      </div>
      
      {!hasModels && (
        <div className="alert alert--warning" style={{ display: "flex", gap: "12px", alignItems: "center", borderRadius: "10px", padding: "16px", background: "#fff4df", border: "1px solid #c58a2a", color: "#c58a2a" }}>
          <AlertTriangle />
          <div>
            <p style={{ fontWeight: 600 }}>Modèles IA non entraînés</p>
            <p style={{ fontSize: "13px" }}>Veuillez lancer la commande de génération de modèle `python manage.py train_ai_models` sur votre serveur pour calibrer la prédiction.</p>
          </div>
        </div>
      )}
    </div>
  );
}
