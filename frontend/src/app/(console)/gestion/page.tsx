"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "../../api";
import { Users, Activity, AlertTriangle, ShieldCheck, Trophy, Target, FileText, ArrowRight } from "lucide-react";

interface AdminStat {
  label: string;
  value: string;
  delta: string;
  icon: string;
  accent: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchApi("/api/gestion/");
        setStats(data.stats || []);
      } catch (err: any) {
        setError(err.message || "Accès refusé ou réservé aux administrateurs.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "users":
        return <Users />;
      case "activity":
        return <Activity />;
      case "alert":
        return <AlertTriangle />;
      case "target":
        return <Target />;
      case "trophy":
        return <Trophy />;
      default:
        return <Activity />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "200px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de l&apos;espace d&apos;administration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <article className="card">
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#c94c4c" }}>
          <AlertTriangle style={{ width: 48, height: 48, margin: "0 auto 16px" }} />
          <h3 style={{ fontWeight: 700, fontSize: "18px" }}>Accès refusé</h3>
          <p style={{ marginTop: "8px", fontSize: "14.5px" }}>{error}</p>
          <Link href="/dashboard" className="btn btn--primary" style={{ marginTop: "20px", display: "inline-flex" }}>
            Retour au tableau de bord
          </Link>
        </div>
      </article>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Overview Stats (8 cards) */}
      <section className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }} aria-label="Statistiques globales de supervision">
        {stats.map((stat, i) => (
          <article key={i} className={`stat-card stat-card--${stat.accent}`}>
            <div className="stat-card__icon">{getIcon(stat.icon)}</div>
            <div className="stat-card__body">
              <span className="stat-card__label">{stat.label}</span>
              <div className="stat-card__value" style={{ fontSize: "20px" }}>{stat.value}</div>
              <span className="stat-card__delta">{stat.delta}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Admin quick links */}
      <article className="card">
        <header className="card__header" style={{ marginBottom: "20px" }}>
          <h3 className="card__title">Raccourcis de supervision</h3>
          <p className="card__subtitle">Gérer et surveiller l&apos;activité globale de l&apos;application.</p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <div style={{ padding: "20px", background: "#f7f8f6", borderRadius: "10px", border: "1px solid #d9e6de", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#007a3d" }}>Utilisateurs cliniciens</h4>
              <p style={{ margin: "8px 0 0", fontSize: "13.5px", color: "#6b6b6b", lineHeight: 1.5 }}>
                Supervisez la liste des cliniciens inscrits, filtrez le personnel d&apos;administration ou les comptes actifs, et consultez leur fiche d&apos;activité personnelle.
              </p>
            </div>
            <Link href="/gestion/utilisateurs" className="btn btn--secondary btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-end", marginTop: "16px" }}>
              <span>Voir les cliniciens</span>
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>

          <div style={{ padding: "20px", background: "#f7f8f6", borderRadius: "10px", border: "1px solid #d9e6de", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#007a3d" }}>Registre des diagnostics</h4>
              <p style={{ margin: "8px 0 0", fontSize: "13.5px", color: "#6b6b6b", lineHeight: 1.5 }}>
                Consultez le journal complet des prédictions d&apos;AVC calculées sur l&apos;ensemble de la plateforme avec un filtrage direct par risque.
              </p>
            </div>
            <Link href="/gestion/predictions" className="btn btn--secondary btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-end", marginTop: "16px" }}>
              <span>Voir tous les diagnostics</span>
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
