"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "../../../api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { Trophy, HelpCircle, Activity, Info, BarChart } from "lucide-react";

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ModelPerf {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number | null;
  is_best: boolean;
  confusion_matrix: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  } | null;
  roc_curve: {
    fpr: number[];
    tpr: number[];
  } | null;
}

interface ChartPayload {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
  f1_only: number[];
  best_index: number;
}

export default function ModelComparisonPage() {
  const [rows, setRows] = useState<ModelPerf[]>([]);
  const [bestModel, setBestModel] = useState<ModelPerf | null>(null);
  const [avgPrecision, setAvgPrecision] = useState<number | null>(null);
  const [avgRecall, setAvgRecall] = useState<number | null>(null);
  const [avgF1, setAvgF1] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartPayload | null>(null);
  
  const [selectedMatrixModel, setSelectedMatrixModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchApi("/api/modeles/comparaison/");
        setRows(data.rows || []);
        setBestModel(data.best || null);
        setAvgPrecision(data.avg_precision_pct || null);
        setAvgRecall(data.avg_recall_pct || null);
        setAvgF1(data.avg_f1 || null);
        setChartData(data.chart_payload || null);
        if (data.best) {
          setSelectedMatrixModel(data.best.name);
        } else if (data.rows && data.rows.length > 0) {
          setSelectedMatrixModel(data.rows[0].name);
        }
      } catch (err: any) {
        setError(err.message || "Impossible de charger les statistiques de comparaison des modèles.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "250px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement des données de comparaison...</p>
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

  if (rows.length === 0) {
    return (
      <article className="card">
        <header className="card__header">
          <h2 className="card__title">Comparaison des modèles IA</h2>
          <span className="chip chip--muted">Non entraîné</span>
        </header>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <Activity style={{ width: 48, height: 48, color: "#8a8a8a", margin: "0 auto 16px" }} />
          <p style={{ color: "#6b6b6b", fontWeight: 600 }}>Aucun modèle d&apos;IA entraîné.</p>
          <p style={{ color: "#8a8a8a", fontSize: "13px", marginTop: "4px" }}>
            Veuillez exécuter la commande `python manage.py train_ai_models` sur votre serveur Django pour entraîner et comparer les modèles.
          </p>
        </div>
      </article>
    );
  }

  // Chart 1: Grouped Bar Chart of all metrics
  const groupedChartData = {
    labels: chartData?.labels || [],
    datasets: (chartData?.datasets || []).map((ds, index) => {
      const colors = [
        "rgba(37, 99, 235, 0.75)",  // Blue
        "rgba(13, 148, 136, 0.75)", // Teal
        "rgba(217, 119, 6, 0.75)",   // Amber
        "rgba(220, 38, 38, 0.75)",   // Red
        "rgba(124, 58, 237, 0.75)",  // Purple
      ];
      const borderColors = [
        "rgb(37, 99, 235)",
        "rgb(13, 148, 136)",
        "rgb(217, 119, 6)",
        "rgb(220, 38, 38)",
        "rgb(124, 58, 237)",
      ];
      return {
        ...ds,
        backgroundColor: colors[index % colors.length],
        borderColor: borderColors[index % borderColors.length],
        borderWidth: 1.5,
        borderRadius: 4,
      };
    }),
  };

  const groupedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { font: { family: "Inter" } } },
      tooltip: { padding: 12, bodyFont: { family: "Inter" }, titleFont: { family: "Inter", weight: "bold" as const } },
    },
    scales: {
      y: { min: 0, max: 1, ticks: { font: { family: "Inter" } }, grid: { color: "#eef2f0" } },
      x: { ticks: { font: { family: "Inter", weight: "bold" as const } }, grid: { display: false } },
    },
  };

  // ROC Curve line chart overlay datasets
  const hasRocData = rows.some((r) => r.roc_curve && r.roc_curve.fpr && r.roc_curve.fpr.length > 0);
  
  const colorsList = [
    "rgb(37, 99, 235)",   // Blue
    "rgb(13, 148, 136)",  // Teal
    "rgb(217, 119, 6)",   // Amber
    "rgb(220, 38, 38)",   // Red
    "rgb(124, 58, 237)",  // Purple
    "rgb(71, 85, 105)",   // Slate
  ];

  const rocChartData = {
    datasets: rows
      .filter((r) => r.roc_curve && r.roc_curve.fpr && r.roc_curve.fpr.length > 0)
      .map((r, index) => ({
        label: r.name,
        data: r.roc_curve!.fpr.map((fprVal, idx) => ({
          x: fprVal,
          y: r.roc_curve!.tpr[idx],
        })),
        borderColor: colorsList[index % colorsList.length],
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointRadius: 0,
        showLine: true,
        tension: 0.1,
      })),
  };

  // Add random reference line
  rocChartData.datasets.push({
    label: "Aléatoire (AUC = 0,5)",
    data: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    borderColor: "rgba(148, 163, 184, 0.6)",
    borderDash: [5, 5],
    backgroundColor: "transparent",
    borderWidth: 1.5,
    pointRadius: 0,
    showLine: true,
    tension: 0,
  } as any);

  const rocChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { font: { family: "Inter" } } },
      tooltip: {
        padding: 12,
        bodyFont: { family: "Inter" },
        titleFont: { family: "Inter", weight: "bold" as const },
        callbacks: {
          label: (context: any) => `TPR: ${context.parsed.y.toFixed(3)} (FPR: ${context.parsed.x.toFixed(3)})`,
        },
      },
    },
    scales: {
      y: { min: 0, max: 1, title: { display: true, text: "Taux de Vrais Positifs (TPR / Recall)", font: { family: "Inter", weight: "bold" as const } }, ticks: { font: { family: "Inter" } }, grid: { color: "#eef2f0" } },
      x: { min: 0, max: 1, type: "linear" as const, title: { display: true, text: "Taux de Faux Positifs (FPR)", font: { family: "Inter", weight: "bold" as const } }, ticks: { font: { family: "Inter" } }, grid: { color: "#eef2f0" } },
    },
  };

  // Get selected matrix model details
  const currentMatrixModel = rows.find(r => r.name === selectedMatrixModel) || bestModel || rows[0];
  const matrix = currentMatrixModel?.confusion_matrix;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Overview Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px" }}>
        <article className="stat-card stat-card--teal">
          <div className="stat-card__icon"><Trophy /></div>
          <div className="stat-card__body">
            <span className="stat-card__label">Meilleur modèle IA</span>
            <div className="stat-card__value">{bestModel?.name || "—"}</div>
            <span className="stat-card__delta">
              {bestModel ? `F1-Score optimal : ${bestModel.f1.toFixed(3)}` : "Non entraîné"}
            </span>
          </div>
        </article>

        <article className="stat-card stat-card--blue">
          <div className="stat-card__icon"><Activity /></div>
          <div className="stat-card__body">
            <span className="stat-card__label">Rappel moyen (Recall)</span>
            <div className="stat-card__value">{avgRecall ? `${avgRecall.toFixed(1).replace(".", ",")} %` : "—"}</div>
            <span className="stat-card__delta">Moyenne sur tous les modèles</span>
          </div>
        </article>

        <article className="stat-card stat-card--blue">
          <div className="stat-card__icon"><BarChart /></div>
          <div className="stat-card__body">
            <span className="stat-card__label">F1-score moyen</span>
            <div className="stat-card__value">{avgF1 ? avgF1.toFixed(3).replace(".", ",") : "—"}</div>
            <span className="stat-card__delta">Équilibre global précision/rappel</span>
          </div>
        </article>
      </section>

      {/* Table Card */}
      <article className="card">
        <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="card__title">Tableau comparatif des modèles d&apos;IA</h2>
            <p className="card__subtitle">Évaluation des 6 classifieurs entraînés sur le dataset public.</p>
          </div>
          <Link href="/modeles/theorie" className="btn btn--ghost btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <HelpCircle style={{ width: 16, height: 16 }} />
            <span>Comprendre les modèles</span>
          </Link>
        </header>

        <div className="table-wrap" style={{ overflowX: "auto", marginTop: "16px" }}>
          <table className="models-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #d9e6de", textAlign: "left" }}>
                <th style={{ padding: "12px 8px" }}>Modèle</th>
                <th style={{ padding: "12px 8px" }}>Précision (Accuracy)</th>
                <th style={{ padding: "12px 8px" }}>Précision positive</th>
                <th style={{ padding: "12px 8px" }}>Rappel (Recall)</th>
                <th style={{ padding: "12px 8px" }}>F1-score *</th>
                <th style={{ padding: "12px 8px" }}>ROC-AUC</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Confusion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #d9e6de",
                    background: r.is_best ? "#eaf7f0" : "none",
                    fontWeight: r.is_best ? "600" : "normal",
                  }}
                >
                  <td style={{ padding: "14px 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{r.name}</span>
                    {r.is_best && <Trophy style={{ width: 16, height: 16, color: "#c58a2a" }} />}
                  </td>
                  <td style={{ padding: "14px 8px" }}>{(r.accuracy * 100).toFixed(2).replace(".", ",")} %</td>
                  <td style={{ padding: "14px 8px" }}>{(r.precision * 100).toFixed(2).replace(".", ",")} %</td>
                  <td style={{ padding: "14px 8px" }}>{(r.recall * 100).toFixed(2).replace(".", ",")} %</td>
                  <td style={{ padding: "14px 8px", color: r.is_best ? "#007a3d" : "inherit" }}>
                    {r.f1.toFixed(4).replace(".", ",")}
                  </td>
                  <td style={{ padding: "14px 8px" }}>
                    {r.roc_auc !== null ? r.roc_auc.toFixed(4).replace(".", ",") : "—"}
                  </td>
                  <td style={{ padding: "14px 8px", textAlign: "right" }}>
                    <button
                      onClick={() => setSelectedMatrixModel(r.name)}
                      className={`btn btn--sm ${selectedMatrixModel === r.name ? "btn--primary" : "btn--ghost"}`}
                    >
                      Matrice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: "12px", color: "#8a8a8a", marginTop: "12px" }}>
          * Le F1-score est la métrique de référence utilisée pour désigner automatiquement le meilleur modèle (marqué d&apos;un trophée) car il offre un arbitrage rigoureux entre la précision et le rappel dans un contexte de données fortement déséquilibrées (seulement ~4.9% de cas positifs).
        </p>
      </article>

      {/* Graphics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px" }}>
        {/* Graphic 1: Grouped bar chart */}
        <article className="card" style={{ height: "420px", display: "flex", flexDirection: "column" }}>
          <h3 className="card__title" style={{ marginBottom: "16px" }}>Performance multi-critères des modèles</h3>
          <div style={{ flex: 1, position: "relative" }}>
            <Bar data={groupedChartData} options={groupedChartOptions} />
          </div>
        </article>

        {/* Graphic 2: ROC Curves Line Chart */}
        <article className="card" style={{ height: "420px", display: "flex", flexDirection: "column" }}>
          <h3 className="card__title" style={{ marginBottom: "16px" }}>Courbes ROC comparatives (AUC-ROC)</h3>
          <div style={{ flex: 1, position: "relative" }}>
            {hasRocData ? (
              <Line data={rocChartData} options={rocChartOptions} />
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
                <p style={{ color: "#8a8a8a", fontSize: "14px" }}>Données de courbes ROC indisponibles.</p>
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Confusion Matrix Interactive Block */}
      {matrix && (
        <article className="card">
          <header className="card__header" style={{ marginBottom: "20px" }}>
            <h3 className="card__title">Matrice de Confusion : {currentMatrixModel.name}</h3>
            <p className="card__subtitle">Répartition des classifications positives/négatives réelles et prédites par le modèle sur le jeu de test.</p>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "center" }}>
            {/* Visual 2x2 Matrix grid */}
            <div style={{ display: "grid", gridTemplateRows: "auto 1fr 1fr", gap: "10px", width: "100%", maxWidth: "480px", margin: "0 auto" }}>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "10px", textAlign: "center", fontWeight: "bold", fontSize: "12px", color: "#64748b" }}>
                <div></div>
                <div>Prédit : SAIN</div>
                <div>Prédit : RISQUE</div>
              </div>
              
              {/* Actual Sain row */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "10px", alignItems: "stretch", minHeight: "100px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>Réel : Sain</div>
                <div style={{ background: "#eaf7f0", border: "2px solid #009b4e", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: "#007a3d" }}>{matrix.tn}</span>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#007a3d", textTransform: "uppercase", marginTop: "4px" }}>Vrais Négatifs (TN)</span>
                </div>
                <div style={{ background: "#fff4df", border: "2px solid #f59e0b", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: "#b45309" }}>{matrix.fp}</span>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#b45309", textTransform: "uppercase", marginTop: "4px" }}>Faux Positifs (FP)</span>
                </div>
              </div>

              {/* Actual Risque row */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "10px", alignItems: "stretch", minHeight: "100px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>Réel : Risq</div>
                <div style={{ background: "#fef2f2", border: "2px solid #ef4444", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: "#b91c1c" }}>{matrix.fn}</span>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#b91c1c", textTransform: "uppercase", marginTop: "4px" }}>Faux Négatifs (FN)</span>
                </div>
                <div style={{ background: "#eaf7f0", border: "2px solid #0d9488", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f766e" }}>{matrix.tp}</span>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#0f766e", textTransform: "uppercase", marginTop: "4px" }}>Vrais Positifs (TP)</span>
                </div>
              </div>
            </div>

            {/* Explanation details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px", lineHeight: "1.6" }}>
              <h4 style={{ margin: 0, fontWeight: "bold", color: "#1e293b", fontSize: "16px" }}>Indicateurs cliniques déduits :</h4>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", margin: 0 }}>
                <li>
                  <strong>Taux de Faux Négatifs (danger) :</strong> <span style={{ color: "#ef4444", fontWeight: "bold" }}>{((matrix.fn / (matrix.fn + matrix.tp)) * 100).toFixed(1)}%</span>. Il s&apos;agit des patients malades non détectés. Plus cette valeur est faible, plus le modèle est sûr cliniquement.
                </li>
                <li>
                  <strong>Taux de Vrais Positifs (Recall/Sensibilité) :</strong> <span style={{ color: "#0d9488", fontWeight: "bold" }}>{(currentMatrixModel.recall * 100).toFixed(1)}%</span>. Proportion de cas réels d&apos;AVC détectés avec succès.
                </li>
                <li>
                  <strong>Spécificité (détection des cas sains) :</strong> <span style={{ color: "#009b4e", fontWeight: "bold" }}>{((matrix.tn / (matrix.tn + matrix.fp)) * 100).toFixed(1)}%</span>. Proportion de patients réellement sains correctement classés.
                </li>
              </ul>
            </div>
          </div>
        </article>
      )}

      {/* Pedagogical Explanation Block */}
      <article className="card" style={{ borderLeft: "4px solid #009b4e" }}>
        <h3 className="card__title" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#007a3d" }}>
          <Info />
          <span>Pourquoi le Rappel (Recall) et le F1-score sont cruciaux en médecine ?</span>
        </h3>
        <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: "1.6", color: "#2b2b2b" }}>
          <p style={{ marginBottom: "10px" }}>
            Dans la détection médicale assistée par ordinateur, l&apos;<strong>exactitude globale (Accuracy)</strong> peut être trompeuse. Par exemple, si seulement 5% des patients souffrent d&apos;un AVC, un modèle prédisant bêtement &quot;pas d&apos;AVC&quot; pour tout le monde aura une précision de 95%, tout en étant totalement inutile cliniquement puisqu&apos;il ratera 100% des cas malades !
          </p>
          <p style={{ marginBottom: "10px" }}>
            C&apos;est pourquoi nous ciblons le <strong>Rappel (Recall)</strong>, qui évalue la capacité du modèle à identifier <em>tous</em> les patients réellement à risque (minimisant ainsi les faux négatifs dramatiques), et le <strong>F1-score</strong>, qui combine à la fois précision et rappel en une seule note représentative.
          </p>
        </div>
      </article>
    </div>
  );
}
