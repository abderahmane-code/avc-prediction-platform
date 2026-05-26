"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../api";

function RegisterFormInner() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  // Redirect if already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await fetchApi("/api/auth/session/");
        if (data.authenticated) {
          router.push(next);
        }
      } catch (err) {
        // Expected
      }
    }
    checkAuth();
  }, [router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !passwordConfirm) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const data = await fetchApi("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password,
          password_confirm: passwordConfirm,
        }),
      });
      if (data.success) {
        router.push(next);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-body">
      <main className="auth-shell">
        <aside className="auth-hero" aria-label="Identité institutionnelle">
          <div className="auth-hero__logos">
            <img
              src="/img/mauritania-emblem.png"
              alt="Emblème de la Mauritanie"
              className="auth-hero__emblem"
            />
            <span className="auth-hero__separator" aria-hidden="true"></span>
            <img
              src="/img/supnum-logo.png"
              alt="SUPNUM"
              className="auth-hero__logo"
            />
          </div>
          <div className="auth-hero__identity">
            <div className="auth-hero__title">AVC Predict</div>
            <div className="auth-hero__sub">Plateforme clinique IA</div>
          </div>
        </aside>

        <section className="auth-card-wrap">
          <article className="card auth-card" role="region" aria-labelledby="auth-title">
            <header className="auth-card__header">
              <h1 id="auth-title" className="auth-card__title">Créer un compte</h1>
            </header>

            {error && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: "16px", padding: "12px", borderRadius: "8px", background: "#f8eaea", color: "#c94c4c", fontSize: "13.5px" }}>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                <span className="form-field__label" style={{ fontWeight: 600, color: "#2b2b2b" }}>Nom d&apos;utilisateur *</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-control"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid #d9e6de",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  required
                />
              </label>

              <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                <span className="form-field__label" style={{ fontWeight: 600, color: "#2b2b2b" }}>Adresse e-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid #d9e6de",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </label>

              <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                <span className="form-field__label" style={{ fontWeight: 600, color: "#2b2b2b" }}>Mot de passe *</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid #d9e6de",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  required
                />
              </label>

              <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
                <span className="form-field__label" style={{ fontWeight: 600, color: "#2b2b2b" }}>Confirmer le mot de passe *</span>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="form-control"
                  style={{
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid #d9e6de",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn btn--primary btn--block"
                style={{ width: "100%", height: "42px", display: "grid", placeItems: "center", fontWeight: 600 }}
              >
                {loading ? "Création du compte..." : "Créer mon compte"}
              </button>
            </form>

            <footer className="auth-card__footer" style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "#6b6b6b" }}>
              <p>
                Déjà un compte ?{" "}
                <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ color: "#009b4e", fontWeight: 600 }}>
                  Se connecter
                </Link>
              </p>
            </footer>
          </article>
        </section>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#8a8a8a" }}>Chargement...</div>}>
      <RegisterFormInner />
    </Suspense>
  );
}
