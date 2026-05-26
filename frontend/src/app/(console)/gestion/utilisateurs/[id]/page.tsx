"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../../api";
import { ArrowLeft, User, Eye, FileText, Activity, AlertTriangle, ShieldAlert } from "lucide-react";

interface AdminUserDetail {
  user: {
    id: number;
    username: string;
    email: string;
    date_joined: string;
    last_login: string | null;
    is_staff: boolean;
    is_superuser: boolean;
  };
  stats: {
    total: number;
    high: number;
    low: number;
  };
  recent: {
    id: number;
    created_at: string;
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
  }[];
}

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUserDetail() {
      try {
        const res = await fetchApi(`/api/gestion/utilisateurs/${id}/`);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Impossible de charger les détails de l'utilisateur.");
      } finally {
        setLoading(false);
      }
    }
    loadUserDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "200px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de la fiche d&apos;activité...</p>
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
          <button onClick={() => router.push("/gestion/utilisateurs")} className="btn btn--primary" style={{ marginTop: "20px" }}>
            Retour à la liste
          </button>
        </div>
      </article>
    );
  }

  if (!data) return null;

  const { user, stats, recent } = data;
  const highRiskPct = stats.total > 0 ? (stats.high / stats.total) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header and Back */}
      <button
        onClick={() => router.push("/gestion/utilisateurs")}
        className="btn btn--ghost"
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", alignSelf: "flex-start", marginBottom: "-8px", padding: 0 }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        <span>Retour à la liste</span>
      </button>

      {/* Grid: Clinician Profile & Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "24px" }}>
        {/* Profile Info */}
        <div style={{ gridColumn: "span 12", md: "span 6" } as React.CSSProperties}>
          <article className="card" style={{ height: "100%" }}>
            <header className="card__header" style={{ marginBottom: "20px" }}>
              <h3 className="card__title" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <User style={{ color: "#009b4e" }} />
                <span>Identité Clinicien</span>
              </h3>
              <span className="chip chip--blue">{user.username}</span>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #d9e6de", paddingBottom: "10px", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: "#6b6b6b" }}>Nom d&apos;utilisateur</span>
                <span style={{ fontWeight: 700 }}>{user.username}</span>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #d9e6de", paddingBottom: "10px", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: "#6b6b6b" }}>Adresse e-mail</span>
                <span style={{ fontWeight: 700 }}>{user.email || "Non renseignée"}</span>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #d9e6de", paddingBottom: "10px", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: "#6b6b6b" }}>Date d&apos;inscription</span>
                <span style={{ fontWeight: 700 }}>{new Date(user.date_joined).toLocaleDateString("fr-FR")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: "#6b6b6b" }}>Dernière connexion</span>
                <span style={{ fontWeight: 700 }}>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "Jamais connecté"}
                </span>
              </div>
            </div>
          </article>
        </div>

        {/* Activity Stats */}
        <div style={{ gridColumn: "span 12", md: "span 6" } as React.CSSProperties}>
          <article className="card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <header className="card__header" style={{ marginBottom: "16px" }}>
              <h3 className="card__title">Statistiques d&apos;activité</h3>
              <p className="card__subtitle">Bilan quantitatif des diagnostics posés.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", flex: 1, alignItems: "center" }}>
              <div style={{ textAlign: "center", padding: "12px", background: "#f7f8f6", borderRadius: "8px", border: "1px solid #d9e6de" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b6b6b" }}>Total</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#2563eb", marginTop: "4px" }}>{stats.total}</div>
              </div>

              <div style={{ textAlign: "center", padding: "12px", background: "#f8eaea", borderRadius: "8px", border: "1px solid #d9e6de" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#c94c4c" }}>Risque Élevé</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#c94c4c", marginTop: "4px" }}>{stats.high}</div>
              </div>

              <div style={{ textAlign: "center", padding: "12px", background: "#eaf7f0", borderRadius: "8px", border: "1px solid #d9e6de" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#009b4e" }}>Risque Faible</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#009b4e", marginTop: "4px" }}>{stats.low}</div>
              </div>
            </div>
            
            <p className="muted" style={{ fontSize: "12.5px", color: "#8a8a8a", marginTop: "16px" }}>
              {stats.total > 0
                ? `${highRiskPct.toFixed(1).replace(".", ",")} % de ses diagnostics indiquent un risque élevé.`
                : "Aucune prédiction enregistrée."}
            </p>
          </article>
        </div>
      </div>

      {/* Recent Predictions table */}
      <article className="card">
        <header className="card__header" style={{ marginBottom: "20px" }}>
          <h3 className="card__title">10 dernières prédictions</h3>
          <p className="card__subtitle">Diagnostics d&apos;AVC récemment enregistrés par ce clinicien.</p>
        </header>

        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table className="models-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #d9e6de", textAlign: "left" }}>
                <th style={{ padding: "12px 8px" }}>ID</th>
                <th style={{ padding: "12px 8px" }}>Date</th>
                <th style={{ padding: "12px 8px" }}>Âge</th>
                <th style={{ padding: "12px 8px" }}>Modèle IA</th>
                <th style={{ padding: "12px 8px" }}>Niveau de risque</th>
                <th style={{ padding: "12px 8px" }}>Probabilité</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #d9e6de" }}>
                  <td style={{ padding: "14px 8px", fontWeight: 700 }}>#{r.id}</td>
                  <td style={{ padding: "14px 8px" }}>
                    {new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "14px 8px" }}>{Math.round(r.age)} ans</td>
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
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <FileText style={{ width: 14, height: 14 }} />
                        <span>PDF</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}

              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#6b6b6b" }}>
                    Aucune prédiction enregistrée par ce clinicien.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
