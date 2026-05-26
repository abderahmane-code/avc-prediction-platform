"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "../../../api";
import { ArrowLeft, User, Eye, ShieldAlert } from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  date_joined: string;
  last_login: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  prediction_count: number;
}

export default function AdminUsersListPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async (selectedFilter = filter) => {
    setLoading(true);
    try {
      const data = await fetchApi(`/api/gestion/utilisateurs/?filter=${selectedFilter}`);
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Impossible de charger la liste des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleFilterChange = (selectedFilter: string) => {
    setFilter(selectedFilter);
    loadUsers(selectedFilter);
  };

  if (loading && users.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "200px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de la liste des utilisateurs...</p>
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
    { value: "all", label: "Tous les utilisateurs" },
    { value: "staff", label: "Staff uniquement" },
    { value: "users", label: "Utilisateurs normaux" },
    { value: "active", label: "Actifs uniquement" },
  ];

  return (
    <article className="card" aria-labelledby="users-list-title">
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
          <h2 id="users-list-title" className="card__title">Liste des Cliniciens</h2>
          <p className="card__subtitle">Superviser les comptes enregistrés sur la plateforme.</p>
        </div>
        <span className="chip chip--blue">{users.length} compte{users.length > 1 ? "s" : ""}</span>
      </header>

      {/* Filter Options */}
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

      {/* Users table */}
      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="models-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #d9e6de", textAlign: "left" }}>
              <th style={{ padding: "12px 8px" }}>Nom d&apos;utilisateur</th>
              <th style={{ padding: "12px 8px" }}>Adresse e-mail</th>
              <th style={{ padding: "12px 8px" }}>Inscription</th>
              <th style={{ padding: "12px 8px" }}>Dernière connexion</th>
              <th style={{ padding: "12px 8px" }}>Statut</th>
              <th style={{ padding: "12px 8px" }}>Diagnostics d&apos;AVC</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #d9e6de" }}>
                <td style={{ padding: "14px 8px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <User style={{ width: 16, height: 16, color: "#8a8a8a" }} />
                  <span>{u.username}</span>
                </td>
                <td style={{ padding: "14px 8px", color: "#6b6b6b" }}>{u.email || "—"}</td>
                <td style={{ padding: "14px 8px" }}>
                  {new Date(u.date_joined).toLocaleDateString("fr-FR")}
                </td>
                <td style={{ padding: "14px 8px", color: "#6b6b6b" }}>
                  {u.last_login
                    ? new Date(u.last_login).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <span
                    className="badge"
                    style={{
                      padding: "3px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: u.is_staff ? "#eaf2ff" : "#eaf7f0",
                      color: u.is_staff ? "#2563eb" : "#009b4e",
                      marginRight: "4px",
                    }}
                  >
                    {u.is_staff ? "Staff" : "Clinicien"}
                  </span>
                  {!u.is_active && (
                    <span className="badge badge--red" style={{ padding: "3px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                      Inactif
                    </span>
                  )}
                </td>
                <td style={{ padding: "14px 8px", fontWeight: 600 }}>{u.prediction_count}</td>
                <td style={{ padding: "14px 8px", textAlign: "right" }}>
                  <Link href={`/gestion/utilisateurs/${u.id}`} className="btn btn--ghost btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Eye style={{ width: 14, height: 14 }} />
                    <span>Fiche</span>
                  </Link>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#6b6b6b" }}>
                  Aucun clinicien inscrit ne correspond à ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
