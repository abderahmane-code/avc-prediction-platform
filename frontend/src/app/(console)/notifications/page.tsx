"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../api";
import { Bell, CheckSquare, Trash, Check, AlertTriangle, AlertCircle, Info, RefreshCw } from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      const data = await fetchApi("/api/notifications/");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetchApi(`/api/notifications/${id}/read/`, { method: "POST" });
      
      // Optimitic update
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || "Erreur lors du marquage comme lu.");
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    try {
      await fetchApi("/api/notifications/read-all/", { method: "POST" });
      
      // Optimistic update
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || "Erreur lors du marquage global.");
    } finally {
      setActionLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "danger":
        return <AlertCircle style={{ color: "#c94c4c" }} />;
      case "warning":
        return <AlertTriangle style={{ color: "#c58a2a" }} />;
      case "success":
        return <Check style={{ color: "#009b4e" }} />;
      case "info":
      default:
        return <Info style={{ color: "#2563eb" }} />;
    }
  };

  const getAlertBg = (type: string, isRead: boolean) => {
    if (isRead) return "#ffffff";
    switch (type) {
      case "danger":
        return "#f8eaea";
      case "warning":
        return "#fff4df";
      case "success":
        return "#eaf7f0";
      case "info":
      default:
        return "#eaf2ff";
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "250px" }}>
        <p style={{ color: "#6b6b6b", fontWeight: 500 }}>Chargement de vos alertes...</p>
      </div>
    );
  }

  return (
    <article className="card" aria-labelledby="notif-title">
      <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 id="notif-title" className="card__title">Centre de Notifications</h2>
          <p className="card__subtitle">Alertes cliniques critiques et notifications systèmes.</p>
        </div>
        {unreadCount > 0 ? (
          <span className="chip chip--red" style={{ background: "#f8eaea", color: "#c94c4c", fontWeight: 700 }}>
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="chip chip--teal" style={{ background: "#eaf7f0", color: "#009b4e", fontWeight: 700 }}>Tout lu</span>
        )}
      </header>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: "16px", padding: "12px", borderRadius: "8px", background: "#f8eaea", color: "#c94c4c" }}>
          {error}
        </div>
      )}

      {unreadCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <button
            onClick={handleMarkAllAsRead}
            disabled={actionLoading}
            className="btn btn--secondary btn--sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            {actionLoading ? (
              <RefreshCw className="animate-spin" style={{ width: 14, height: 14 }} />
            ) : (
              <CheckSquare style={{ width: 14, height: 14 }} />
            )}
            <span>Tout marquer comme lu</span>
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <Bell style={{ width: 48, height: 48, color: "#8a8a8a", margin: "0 auto 16px" }} />
          <p style={{ color: "#6b6b6b", fontWeight: 600 }}>Aucune notification pour le moment.</p>
          <p style={{ color: "#8a8a8a", fontSize: "13px", marginTop: "4px" }}>
            Les alertes d&apos;inférence à haut risque s&apos;afficheront ici.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                gap: "16px",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid #d9e6de",
                background: getAlertBg(n.type, n.is_read),
                alignItems: "flex-start",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                opacity: n.is_read ? 0.75 : 1,
                transition: "opacity 0.2s ease, background-color 0.2s ease",
              }}
            >
              <div style={{ padding: "4px", borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                {getAlertIcon(n.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, fontWeight: 700, fontSize: "14.5px", color: "#2b2b2b" }}>
                  {n.title}
                </h4>
                <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#6b6b6b", lineHeight: 1.5 }}>
                  {n.message}
                </p>
                <span style={{ display: "inline-block", fontSize: "11px", color: "#8a8a8a", marginTop: "8px" }}>
                  {new Date(n.created_at).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              
              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  style={{
                    background: "#fff",
                    border: "1px solid #d9e6de",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#009b4e",
                  }}
                  title="Marquer comme lu"
                >
                  <Check style={{ width: 14, height: 14 }} />
                  <span>Marquer lu</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
