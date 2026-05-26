"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../api";
import { User, Mail, Shield, ShieldCheck, Heart } from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await fetchApi("/api/auth/session/");
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "200px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de vos paramètres...</p>
      </div>
    );
  }

  if (!user) return null;

  const accountType = user.is_staff || user.is_superuser ? "Administrateur" : "Utilisateur Standard (Clinicien)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Profile overview */}
      <article className="card" style={{ borderLeft: "4px solid #009b4e" }}>
        <header className="card__header" style={{ marginBottom: "20px" }}>
          <h2 className="card__title" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#007a3d" }}>
            <User />
            <span>Mon Profil Clinicien</span>
          </h2>
          <span className="chip chip--blue">{user.username}</span>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14.5px" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #d9e6de", paddingBottom: "12px", alignItems: "center", gap: "12px" }}>
            <User style={{ width: 18, height: 18, color: "#8a8a8a" }} />
            <div>
              <div style={{ fontWeight: 600, color: "#6b6b6b", fontSize: "12.5px", textTransform: "uppercase" }}>Nom d&apos;utilisateur</div>
              <div style={{ fontSize: "15px", fontWeight: 700, marginTop: "2px" }}>{user.username}</div>
            </div>
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid #d9e6de", paddingBottom: "12px", alignItems: "center", gap: "12px" }}>
            <Mail style={{ width: 18, height: 18, color: "#8a8a8a" }} />
            <div>
              <div style={{ fontWeight: 600, color: "#6b6b6b", fontSize: "12.5px", textTransform: "uppercase" }}>Adresse e-mail</div>
              <div style={{ fontSize: "15px", fontWeight: 700, marginTop: "2px" }}>{user.email || "Non renseignée"}</div>
            </div>
          </div>

          <div style={{ display: "flex", paddingBottom: "4px", alignItems: "center", gap: "12px" }}>
            <Shield style={{ width: 18, height: 18, color: "#8a8a8a" }} />
            <div>
              <div style={{ fontWeight: 600, color: "#6b6b6b", fontSize: "12.5px", textTransform: "uppercase" }}>Type de compte</div>
              <div style={{ fontSize: "15px", fontWeight: 700, marginTop: "2px" }}>{accountType}</div>
            </div>
          </div>
        </div>
      </article>

      {/* 2. Preferences & advanced options mockups */}
      <article className="card">
        <header className="card__header" style={{ marginBottom: "20px" }}>
          <div>
            <h3 className="card__title">Préférences globales</h3>
            <p className="card__subtitle">Options d&apos;affichage de la plateforme clinique.</p>
          </div>
          <span className="chip chip--teal">Lecture seule</span>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#6b6b6b", fontSize: "14px" }}>
          <div style={{ background: "#f8eaea", padding: "16px", borderRadius: "10px", border: "1px solid #c94c4c", color: "#c94c4c", display: "flex", alignItems: "center", gap: "12px" }}>
            <ShieldCheck style={{ width: 22, height: 22, flexShrink: 0 }} />
            <p style={{ fontWeight: 600 }}>
              Cette section est actuellement configurée en lecture seule. Les modifications de mot de passe et de permissions s&apos;effectuent via l&apos;administration Django.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eef2f0" }}>
              <span style={{ fontWeight: 600, color: "#2b2b2b" }}>Langue de la plateforme</span>
              <span style={{ fontWeight: 700 }}>Français (Mauritanie)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eef2f0" }}>
              <span style={{ fontWeight: 600, color: "#2b2b2b" }}>Format d&apos;exportation par défaut</span>
              <span style={{ fontWeight: 700 }}>Rapport PDF A4 standard ReportLab</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontWeight: 600, color: "#2b2b2b" }}>Seuil d&apos;alerte de risque élevé d&apos;AVC</span>
              <span style={{ fontWeight: 700 }}>60.0% (Configuré par l&apos;Institut)</span>
            </div>
          </div>
        </div>
      </article>

      {/* 3. Academic Note */}
      <article className="card" style={{ textAlign: "center", padding: "24px" }}>
        <p style={{ color: "#8a8a8a", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Heart style={{ width: 14, height: 14, color: "#c94c4c" }} />
          <span>Plateforme AVC Predict développée dans un cadre académique SUPNUM.</span>
        </p>
      </article>
    </div>
  );
}
