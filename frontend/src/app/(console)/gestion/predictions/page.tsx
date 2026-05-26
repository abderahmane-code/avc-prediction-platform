"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "../../../api";
import { ArrowLeft, Eye, FileText, ShieldAlert } from "lucide-react";

interface AdminPrediction {
  id: number;
  created_at: string;
  username: string;
  age: number;
  is_high: boolean;
  risk_label: string;
  probability_pct: number;
  model_name: string;
  risk_level: {
    key: string;
    label: string;
    description: string;
    accent: string;
    css: string;
  };
}

export default function AdminPredictionsListPage() {
  const [predictions, setPredictions] = useState<AdminPrediction[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPredictions = async (selectedFilter = filter) => {
    setLoading(true);
    try {
      const data = await fetchApi(`/api/gestion/predictions/?filter=${selectedFilter}`);
      setPredictions(data.predictions || []);
    } catch (err: any) {
      setError(err.message || "Impossible de charger le registre des diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const handleFilterChange = (selectedFilter: string) => {
    setFilter(selectedFilter);
    loadPredictions(selectedFilter);
  };

  if (loading && predictions.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "200px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement du registre global des diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <article className="card">
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#c94c4c" }}>
          <ShieldAlert style={{ width: 48, height: 48, margin: "0 auto 16px" }} />
          <h3 style={{ fontWeight: 700 }}>Accès refusé</h3>
          <p style={{ marginTop: "8px" }}>{error}</p>
        </div>
      </article>
    );
  }

  const filters = [
    { value: "all", label: "Toutes les prédictions" },
    { value: "high", label: "Risque élevé uniquement" },
    { value: "low", label: "Risque faible uniquement" },
  ];

  return (
    <article className="card" aria-labelledby="preds-list-title">
      <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <button
            onClick={() => window.history.back()}
            className="btn btn--ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", alignSelf: "flex-start", marginBottom: "12px", padding: 0 }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span>Retour</span>
          </button>
          <h2 id="preds-list-title" className="card__title">Registre Global des Diagnostics</h2>
          <p className="card__subtitle">Supervision de l&apos;ensemble des prédictions d&apos;AVC calculées.</p>
        </div>
        <span className="chip chip--blue">{predictions.length} diagnostic{predictions.length > 1 ? "s" : ""}</span>
      </header>

      {/* Filters */}
      <div className="filter-form" style={{ background: "#f7f8f6", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d9e6de", marginBottom: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`btn ${filter === f.value ? "btn--primary" : "btn--ghost"} btn--sm`}
              style={{ padding: "6px 12px", height: "auto" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Predictions table */}
      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="models-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #d9e6de", textAlign: "left" }}>
              <th style={{ padding: "12px 8px" }}>ID</th>
              <th style={{ padding: "12px 8px" }}>Date</th>
              <th style={{ padding: "12px 8px" }}>Clinicien référent</th>
              <th style={{ padding: "12px 8px" }}>Âge</th>
              <th style={{ padding: "12px 8px" }}>Modèle utilisé</th>
              <th style={{ padding: "12px 8px" }}>Niveau de risque</th>
              <th style={{ padding: "12px 8px" }}>Probabilité</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #d9e6de" }}>
                <td style={{ padding: "14px 8px", fontWeight: 700 }}>#{p.id}</td>
                <td style={{ padding: "14px 8px" }}>
                  {new Date(p.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td style={{ padding: "14px 8px", fontWeight: 600 }}>{p.username}</td>
                <td style={{ padding: "14px 8px" }}>{Math.round(p.age)} ans</td>
                <td style={{ padding: "14px 8px", color: "#6b6b6b" }}>{p.model_name}</td>
                <td style={{ padding: "14px 8px" }}>
                  <span
                    className="badge"
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: p.risk_level.accent === "red" ? "#f8eaea" : p.risk_level.accent === "amber" ? "#fff4df" : "#eaf7f0",
                      color: p.risk_level.accent === "red" ? "#c94c4c" : p.risk_level.accent === "amber" ? "#c58a2a" : "#009b4e",
                    }}
                  >
                    {p.risk_level.label}
                  </span>
                </td>
                <td style={{ padding: "14px 8px", fontWeight: 600 }}>{p.probability_pct.toFixed(1).replace(".", ",")} %</td>
                <td style={{ padding: "14px 8px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                    <Link href={`/prediction/detail/${p.id}`} className="btn btn--ghost btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <Eye style={{ width: 14, height: 14 }} />
                      <span>Détails</span>
                    </Link>
                    <a
                      href={`/prediction/detail/${p.id}/pdf`}
                      className="btn btn--secondary btn--sm"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <FileText style={{ width: 14, height: 14 }} />
                      <span>PDF</span>
                    </a>
                  </div>
                </td>
              </tr>
            ))}

            {predictions.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "#6b6b6b" }}>
                  Aucun diagnostic d&apos;AVC enregistré dans cette catégorie.
                  <button onClick={() => handleFilterChange("all")} style={{ background: "none", border: "none", color: "#009b4e", fontWeight: 600, cursor: "pointer", paddingLeft: "4px" }}>
                    Réinitialiser le filtre
                  </button>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
