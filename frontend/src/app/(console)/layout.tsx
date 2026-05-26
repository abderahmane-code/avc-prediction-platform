"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../api";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  TrendingUp,
  BarChart3,
  Settings,
  ShieldCheck,
  Bell,
  LogOut,
  Menu,
  Activity,
} from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await fetchApi("/api/auth/session/");
        if (data.authenticated) {
          setUser(data.user);
          // Fetch notifications count
          const notifData = await fetchApi("/api/notifications/");
          setUnreadCount(notifData.unread_count || 0);
        } else {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
        }
      } catch (err) {
        console.error("Session check failed", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetchApi("/api/auth/logout/", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#f7f8f6" }}>
        <div style={{ textAlign: "center" }}>
          <Activity className="animate-spin" style={{ width: 48, height: 48, color: "#009b4e", margin: "0 auto 16px" }} />
          <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de l&apos;espace clinicien...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.is_staff || user.is_superuser;

  const navItems = [
    { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
    { label: "Nouvelle prédiction", path: "/prediction/new", icon: PlusCircle },
    { label: "Historique", path: "/historique", icon: History },
    { label: "Comparaison des modèles", path: "/modeles/comparaison", icon: TrendingUp },
    { label: "Statistiques", path: "/statistiques", icon: BarChart3 },
    { label: "Paramètres", path: "/parametres", icon: Settings },
  ];

  return (
    <div className="app-shell">
      {/* Sidebar Desktop */}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`} style={{ zIndex: 999 }}>
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">
            <Activity style={{ width: 24, height: 24 }} />
          </div>
          <div>
            <div className="sidebar__brand-title">AVC Predict</div>
            <div className="sidebar__brand-sub">Platforme Clinique</div>
          </div>
        </div>

        <nav className="sidebar__nav" style={{ marginTop: "16px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-item ${isActive ? "nav-item--active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div style={{ padding: "16px 12px 6px", fontSize: "11px", fontWeight: 700, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Administration
              </div>
              <Link
                href="/gestion"
                className={`nav-item ${pathname.startsWith("/gestion") ? "nav-item--active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShieldCheck />
                <span>Gestion plateforme</span>
              </Link>
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__footer-avatar">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar__footer-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.username}
            </div>
            <div className="sidebar__footer-role">
              {isAdmin ? "Administrateur" : "Clinicien"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: "none", border: "none", color: "#c94c4c", padding: "6px", display: "grid", placeItems: "center", borderRadius: "6px" }}
            title="Se déconnecter"
          >
            <LogOut style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="main">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="topbar__menu"
            style={{ display: "block", border: "none", background: "none" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu />
          </button>

          <div className="topbar__titles">
            <h1 className="topbar__title">
              {pathname.startsWith("/dashboard") && "Tableau de Bord Clinique"}
              {pathname.startsWith("/prediction/new") && "Nouveau Diagnostic d'AVC"}
              {pathname.startsWith("/prediction/result") && "Résultat du Diagnostic"}
              {pathname.startsWith("/prediction/detail") && "Rapport Patient"}
              {pathname.startsWith("/historique") && "Historique des Prédictions"}
              {pathname.startsWith("/modeles/comparaison") && "Comparaison Analytique des Modèles"}
              {pathname.startsWith("/modeles/theorie") && "Bases Théoriques des Modèles IA"}
              {pathname.startsWith("/statistiques") && "Mes Statistiques Cliniques"}
              {pathname.startsWith("/parametres") && "Paramètres du Compte"}
              {pathname.startsWith("/notifications") && "Centre de Notifications"}
              {pathname.startsWith("/gestion") && "Supervision de la Plateforme"}
            </h1>
            <p className="topbar__subtitle">
              {pathname.startsWith("/dashboard") && "Suivez votre activité et comparez les modèles d'apprentissage automatique."}
              {pathname.startsWith("/prediction/new") && "Saisissez les données cliniques du patient pour évaluer son risque d'AVC."}
              {pathname.startsWith("/prediction/result") && "Analyse en temps réel de la probabilité de risque calculée par l'IA."}
              {pathname.startsWith("/prediction/detail") && "Consultez et exportez la fiche récapitulative au format PDF standard A4."}
              {pathname.startsWith("/historique") && "Recherchez et filtrez l'historique complet de vos évaluations cliniques."}
              {pathname.startsWith("/modeles/comparaison") && "Visualisez les performances comparées (F1, Rappel, Précision) des 6 modèles d'IA."}
              {pathname.startsWith("/modeles/theorie") && "Découvrez les principes et intérêts médicaux des algorithmes de prédiction."}
              {pathname.startsWith("/statistiques") && "Visualisez l'état global et les répartitions de vos diagnostics d'AVC."}
              {pathname.startsWith("/parametres") && "Consultez les détails de votre profil professionnel."}
              {pathname.startsWith("/notifications") && "Consultez les alertes critiques et messages système de la plateforme."}
              {pathname.startsWith("/gestion") && "Surveillez les comptes cliniciens, les volumes de prédictions et les performances."}
            </p>
          </div>

          <div className="topbar__actions">
            <Link href="/notifications" className="icon-button" style={{ position: "relative" }}>
              <Bell />
              {unreadCount > 0 && <span className="icon-button__dot" />}
            </Link>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="content">
          {children}

          {/* Persistent Academic Warning Footer */}
          <footer
            style={{
              marginTop: "auto",
              paddingTop: "24px",
              borderTop: "1px solid #d9e6de",
              fontSize: "12px",
              color: "#c94c4c",
              textAlign: "center",
              fontWeight: 600,
              lineHeight: 1.6,
            }}
          >
            ⚠️ AVERTISSEMENT MÉDICAL : Cette application est un projet académique et ne remplace pas un diagnostic médical réel. Aucun usage clinique réel n&apos;est recommandé.
          </footer>
        </main>
      </div>

      <style jsx global>{`
        /* Mobile sidebar transition styles */
        @media (max-width: 991px) {
          .sidebar {
            position: fixed;
            left: -264px;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          }
          .sidebar--open {
            left: 0;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
