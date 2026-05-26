"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "../../api";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Activity, AlertTriangle, CheckCircle, Target, Award, ArrowRight, PlusCircle } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

interface StatCard {
  label: string;
  value: string;
  delta: string;
  icon: string;
  accent: string;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [hasPredictions, setHasPredictions] = useState(false);
  const [highCount, setHighCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [bestModelName, setBestModelName] = useState<string | null>(null);
  const [bestModelF1, setBestModelF1] = useState<number | null>(null);
  const [trainedModelsCount, setTrainedModelsCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchApi("/api/statistiques/");
        setStats(data.stats || []);
        setHasPredictions(data.has_predictions || false);
        setHighCount(data.high_count || 0);
        setLowCount(data.low_count || 0);
        setBestModelName(data.best_model_name || null);
        setBestModelF1(data.best_model_f1 || null);
        setTrainedModelsCount(data.trained_models_count || 0);
      } catch (err: any) {
        setError(err.message || "Impossible de charger les statistiques.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "activity":
        return <Activity />;
      case "alert":
        return <AlertTriangle />;
      case "trophy":
        return <Award />;
      case "target":
        return <Target />;
      default:
        return <Activity />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "250px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de vos statistiques cliniques...</p>
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

  // Doughnut Chart Data: High Risk vs Low Risk distribution
  const doughnutData = {
    labels: ["Risque faible", "Risque élevé"],
    datasets: [
      {
        data: [lowCount, highCount],
        backgroundColor: [
          "rgba(13, 148, 136, 0.8)", // Teal-cyan for low risk
          "rgba(220, 38, 38, 0.8)",   // Red for high risk
        ],
        borderColor: [
          "rgb(13, 148, 136)",
          "rgb(220, 38, 38)",
        ],
        borderWidth: 1.5,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: { family: "Inter", size: 13, weight: "bold" as const },
          padding: 20,
        },
      },
      tooltip: {
        padding: 12,
        bodyFont: { family: "Inter" },
        titleFont: { family: "Inter", weight: "bold" as const },
      },
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 4 Stats Cards */}
      <section className="stat-grid" aria-label="Mes statistiques personnelles">
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

      {hasPredictions ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px" }}>
          {/* Doughnut Chart Card */}
          <div style={{ gridColumn: "span 12", md: "span 6" } as React.CSSProperties}>
            <article className="card" style={{ height: "420px", display: "flex", flexDirection: "column" }}>
              <h3 className="card__title" style={{ marginBottom: "16px" }}>Répartition du niveau de risque d&apos;AVC</h3>
              <div style={{ flex: 1, position: "relative", minHeight: "280px" }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </article>
          </div>

          {/* Model AI Summary Card */}
          <div style={{ gridColumn: "span 12", md: "span 6" } as React.CSSProperties}>
            <article className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
              <header className="card__header" style={{ marginBottom: "16px" }}>
                <h3 className="card__title">Modèles IA actifs de la plateforme</h3>
                <p className="card__subtitle">Informations sur l&apos;entraînement de la plateforme.</p>
              </header>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
                <div style={{ padding: "16px", background: "#f7f8f6", borderRadius: "10px", border: "1px solid #d9e6de" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#007a3d", fontSize: "14px" }}>
                    <Award style={{ width: 18, height: 18 }} />
                    <span>Meilleur modèle configuré</span>
                  </div>
                  <p style={{ marginTop: "8px", fontSize: "15px", fontWeight: 700 }}>{bestModelName || "—"}</p>
                  <p style={{ fontSize: "13px", color: "#6b6b6b", marginTop: "2px" }}>
                    {bestModelF1 ? `F1-score lors de l'apprentissage : ${bestModelF1.toFixed(3)}` : "Non entraîné"}
                  </p>
                </div>

                <div style={{ padding: "16px", background: "#f7f8f6", borderRadius: "10px", border: "1px solid #d9e6de" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#009b4e", fontSize: "14px" }}>
                    <Activity style={{ width: 18, height: 18 }} />
                    <span>Nombre de modèles étalonnés</span>
                  </div>
                  <p style={{ marginTop: "8px", fontSize: "15px", fontWeight: 700 }}>{trainedModelsCount} modèles d&apos;IA</p>
                  <p style={{ fontSize: "13px", color: "#6b6b6b", marginTop: "2px" }}>
                    Chaque patient fait l&apos;objet d&apos;une prédiction croisée.
                  </p>
                </div>
              </div>

              <footer style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <Link href="/modeles/comparaison" className="btn btn--secondary btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>Comparer les performances</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
              </footer>
            </article>
          </div>
        </div>
      ) : (
        <article className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Activity style={{ width: 64, height: 64, color: "#8a8a8a", margin: "0 auto 20px" }} />
          <h3 className="card__title" style={{ fontSize: "18px" }}>Aucune prédiction enregistrée</h3>
          <p style={{ color: "#6b6b6b", fontSize: "14px", marginTop: "8px", maxWidth: "450px", margin: "8px auto 20px" }}>
            Pour afficher des analyses graphiques de répartition et des courbes, vous devez d&apos;abord enregistrer au moins un cas patient dans la base de données.
          </p>
          <Link href="/prediction/new" className="btn btn--primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <PlusCircle style={{ width: 18, height: 18 }} />
            <span>Nouveau diagnostic</span>
          </Link>
        </article>
      )}
    </div>
  );
}
