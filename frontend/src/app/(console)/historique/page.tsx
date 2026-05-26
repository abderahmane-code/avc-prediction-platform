"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchApi } from "../../api";
import { Search, RotateCcw, Eye, FileText, PlusCircle, Activity } from "lucide-react";

interface Prediction {
  id: number;
  created_at: string;
  age: number;
  gender: string;
  model_name: string;
  is_high: boolean;
  risk_label: string;
  probability_pct: number;
  risk_level: {
    key: string;
    label: string;
    description: string;
    accent: string;
    css: string;
    short: string;
  };
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Prediction[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  
  // Filter States
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all");
  const [model, setModel] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [probaMin, setProbaMin] = useState("");
  const [probaMax, setProbaMax] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isReset = false) => {
    setLoading(true);
    try {
      let query = "";
      if (!isReset) {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (risk !== "all") params.set("risk", risk);
        if (model !== "all") params.set("model", model);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        if (probaMin) params.set("proba_min", probaMin);
        if (probaMax) params.set("proba_max", probaMax);
        query = `?${params.toString()}`;
      }

      const data = await fetchApi(`/api/historique/${query}`);
      setRows(data.rows || []);
      setAvailableModels(data.available_models || []);
      setTotalAll(data.total_all || 0);
      setTotalFiltered(data.total_filtered || 0);
    } catch (err: any) {
      setError(err.message || "Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, [q, risk, model, dateFrom, dateTo, probaMin, probaMax]);

  useEffect(() => {
    loadHistory();
  }, []);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  const handleResetFilters = () => {
    setQ("");
    setRisk("all");
    setModel("all");
    setDateFrom("");
    setDateTo("");
    setProbaMin("");
    setProbaMax("");
    
    // Pass isReset=true to fetch history without parameters instantly
    loadHistory(true);
  };

  const hasActiveFilters = Boolean(
    q ||
    risk !== "all" ||
    model !== "all" ||
    dateFrom ||
    dateTo ||
    probaMin ||
    probaMax
  );

  if (loading && rows.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "250px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de l&apos;historique...</p>
      </div>
    );
  }

  return (
    <article className="card" aria-labelledby="history-title">
      <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h2 id="history-title" className="card__title">Historique des prédictions</h2>
          <p className="card__subtitle">
            {totalAll === 0
              ? "Aucune prédiction enregistrée pour le moment."
              : `${totalAll} prédiction${totalAll > 1 ? "s" : ""} enregistrée${totalAll > 1 ? "s" : ""} dans la base.`}
          </p>
        </div>
        {totalAll > 0 ? (
          <span className="chip chip--blue">{totalFiltered} affichée{totalFiltered > 1 ? "s" : ""}</span>
        ) : (
          <span className="chip chip--muted">Vide</span>
        )}
      </header>

      {/* Multi-Filters Panel */}
      {totalAll > 0 && (
        <form onSubmit={handleApplyFilters} className="filter-form" style={{ background: "#f7f8f6", padding: "18px", borderRadius: "10px", border: "1px solid #d9e6de", marginBottom: "24px" }}>
          <div className="filter-form__grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            
            <label className="filter-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Recherche libre</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher par modèle, âge..."
                style={{ height: "38px", border: "1px solid #d9e6de", borderRadius: "6px", padding: "0 10px", fontSize: "13.5px", outline: "none" }}
              />
            </label>

            <label className="filter-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Niveau de risque</span>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                style={{ height: "38px", border: "1px solid #d9e6de", borderRadius: "6px", padding: "0 10px", fontSize: "13.5px", outline: "none" }}
              >
                <option value="all">Tous</option>
                <option value="low">Risque faible</option>
                <option value="medium">Risque moyen</option>
                <option value="high">Risque élevé</option>
              </select>
            </label>

            <label className="filter-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Modèle IA</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ height: "38px", border: "1px solid #d9e6de", borderRadius: "6px", padding: "0 10px", fontSize: "13.5px", outline: "none" }}
              >
                <option value="all">Tous les modèles</option>
                {availableModels.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="filter-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Date début</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ height: "38px", border: "1px solid #d9e6de", borderRadius: "6px", padding: "0 10px", fontSize: "13.5px", outline: "none" }}
              />
            </label>

            <label className="filter-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Date fin</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ height: "38px", border: "1px solid #d9e6de", borderRadius: "6px", padding: "0 10px", fontSize: "13.5px", outline: "none" }}
              />
            </label>

            <label className="filter-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Probabilité min (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={probaMin}
                onChange={(e) => setProbaMin(e.target.value)}
                placeholder="0"
                style={{ height: "38px", border: "1px solid #d9e6de", borderRadius: "6px", padding: "0 10px", fontSize: "13.5px", outline: "none" }}
              />
            </label>

            <label className="filter-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Probabilité max (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={probaMax}
                onChange={(e) => setProbaMax(e.target.value)}
                placeholder="100"
                style={{ height: "38px", border: "1px solid #d9e6de", borderRadius: "6px", padding: "0 10px", fontSize: "13.5px", outline: "none" }}
              />
            </label>
          </div>

          <div className="filter-form__actions" style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button type="submit" className="btn btn--primary btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Search style={{ width: 14, height: 14 }} />
              <span>Appliquer les filtres</span>
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn--ghost btn--sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <RotateCcw style={{ width: 14, height: 14 }} />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* History table */}
      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="models-table" style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Historique des prédictions">
          <thead>
            <tr style={{ borderBottom: "2px solid #d9e6de", textAlign: "left" }}>
              <th scope="col" style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Date</th>
              <th scope="col" style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Âge</th>
              <th scope="col" style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Genre</th>
              <th scope="col" style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Modèle utilisé</th>
              <th scope="col" style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Niveau de risque</th>
              <th scope="col" style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600 }}>Probabilité</th>
              <th scope="col" style={{ padding: "12px 8px", color: "#6b6b6b", fontWeight: 600, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #d9e6de" }}>
                <td style={{ padding: "14px 8px" }}>
                  {new Date(r.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={{ padding: "14px 8px" }}>{Math.round(r.age)} ans</td>
                <td style={{ padding: "14px 8px" }}>{r.gender}</td>
                <td style={{ padding: "14px 8px", color: "#6b6b6b" }}>{r.model_name}</td>
                <td style={{ padding: "14px 8px" }}>
                  <span
                    className="badge"
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: r.risk_level.accent === "red" ? "#f8eaea" : r.risk_level.accent === "amber" ? "#fff4df" : "#eaf7f0",
                      color: r.risk_level.accent === "red" ? "#c94c4c" : r.risk_level.accent === "amber" ? "#c58a2a" : "#009b4e",
                    }}
                  >
                    {r.risk_level.label}
                  </span>
                </td>
                <td style={{ padding: "14px 8px", fontWeight: 600 }}>{r.probability_pct.toFixed(1).replace(".", ",")} %</td>
                <td style={{ padding: "14px 8px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                    <Link href={`/prediction/detail/${r.id}`} className="btn btn--ghost btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <Eye style={{ width: 14, height: 14 }} />
                      <span>Détails</span>
                    </Link>
                    <a
                      href={`/prediction/detail/${r.id}/pdf`}
                      className="btn btn--secondary btn--sm"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Exporter le rapport PDF"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <FileText style={{ width: 14, height: 14 }} />
                      <span>PDF</span>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#6b6b6b" }}>
                  {totalAll === 0 ? (
                    "Aucune prédiction enregistrée pour le moment."
                  ) : (
                    <div>
                      <span>Aucune prédiction ne correspond aux filtres sélectionnés. </span>
                      <button onClick={handleResetFilters} style={{ background: "none", border: "none", color: "#009b4e", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                        Réinitialiser les filtres
                      </button>
                      <span>.</span>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="medical-disclaimer" style={{ marginTop: "20px", fontSize: "12px", color: "#8a8a8a", borderTop: "1px solid #d9e6de", paddingTop: "14px" }}>
        Cette application ne remplace pas un diagnostic médical.
      </p>

      <div className="form-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
        <Link href="/dashboard" className="btn btn--ghost">
          Retour au tableau de bord
        </Link>
        <Link href="/prediction/new" className="btn btn--primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <PlusCircle style={{ width: 16, height: 16 }} />
          <span>Nouvelle prédiction</span>
        </Link>
      </div>
    </article>
  );
}
