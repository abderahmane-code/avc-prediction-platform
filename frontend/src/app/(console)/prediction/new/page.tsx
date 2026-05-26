"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "../../../api";
import { Activity, Sparkles, Send, RefreshCw } from "lucide-react";

export default function NewPredictionPage() {
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [bmi, setBmi] = useState("");
  const [hypertension, setHypertension] = useState("0");
  const [heartDisease, setHeartDisease] = useState("0");
  const [everMarried, setEverMarried] = useState("");
  const [workType, setWorkType] = useState("");
  const [residenceType, setResidenceType] = useState("");
  const [avgGlucoseLevel, setAvgGlucoseLevel] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFillDemo = () => {
    setGender("Female");
    setAge("67");
    setBmi("36.6");
    setHypertension("1");
    setHeartDisease("1");
    setEverMarried("Yes");
    setWorkType("Self-employed");
    setResidenceType("Urban");
    setAvgGlucoseLevel("228");
    setSmokingStatus("formerly smoked");
    setDemoLoaded(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple validation
    if (
      !gender ||
      !age ||
      !bmi ||
      !everMarried ||
      !workType ||
      !residenceType ||
      !avgGlucoseLevel ||
      !smokingStatus
    ) {
      setError("Veuillez remplir tous les champs du formulaire.");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi("/api/prediction/new/", {
        method: "POST",
        body: JSON.stringify({
          gender,
          age: parseFloat(age),
          bmi: parseFloat(bmi),
          hypertension: parseInt(hypertension),
          heart_disease: parseInt(heartDisease),
          ever_married: everMarried,
          work_type: workType,
          residence_type: residenceType,
          avg_glucose_level: parseFloat(avgGlucoseLevel),
          smoking_status: smokingStatus,
        }),
      });

      if (data.success) {
        router.push(`/prediction/result/${data.patient_id}`);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="card" aria-labelledby="new-pred-title">
      <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h2 id="new-pred-title" className="card__title">Nouvelle prédiction</h2>
          <p className="card__subtitle">
            Renseignez les caractéristiques cliniques du patient. Les données seront enregistrées et analysées en temps réel par les modèles IA.
          </p>
        </div>
        <span className="chip chip--blue">Saisie clinicien</span>
      </header>

      {/* Demo loader */}
      <div className="form-actions form-actions--start" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={handleFillDemo}
          className="btn btn--ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", alignSelf: "flex-start" }}
        >
          <Sparkles style={{ width: 16, height: 16, color: "#009b4e" }} />
          <span>Remplir avec un exemple</span>
        </button>
        <small className="muted" style={{ color: "#8a8a8a" }}>
          Remplit le formulaire avec un cas patient à haut risque pour la démonstration. Vous pouvez modifier les valeurs.
        </small>
      </div>

      {demoLoaded && (
        <div className="alert alert--success" style={{ padding: "12px", borderRadius: "8px", background: "#eaf7f0", color: "#009b4e", fontSize: "13.5px", marginBottom: "20px" }}>
          Exemple à risque élevé chargé avec succès dans le formulaire.
        </div>
      )}

      {error && (
        <div className="alert alert--error" style={{ padding: "12px", borderRadius: "8px", background: "#f8eaea", color: "#c94c4c", fontSize: "13.5px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="patient-form" noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Form Row 1: Gender, Age, BMI */}
        <div className="form-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Genre *</span>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-control" style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 10px", outline: "none" }} required>
              <option value="">Sélectionner...</option>
              <option value="Male">Homme</option>
              <option value="Female">Femme</option>
              <option value="Other">Autre</option>
            </select>
          </label>

          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Âge (ans) *</span>
            <input
              type="number"
              min="0"
              max="130"
              step="any"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="form-control"
              style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 12px", outline: "none" }}
              required
            />
          </label>

          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Indice de Masse Corporelle (IMC / BMI) *</span>
            <input
              type="number"
              min="10"
              max="80"
              step="any"
              value={bmi}
              onChange={(e) => setBmi(e.target.value)}
              className="form-control"
              style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 12px", outline: "none" }}
              required
            />
          </label>
        </div>

        {/* Form Row 2: Hypertension, Heart Disease, Ever Married */}
        <div className="form-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Hypertension *</span>
            <select value={hypertension} onChange={(e) => setHypertension(e.target.value)} className="form-control" style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 10px", outline: "none" }} required>
              <option value="0">Non</option>
              <option value="1">Oui</option>
            </select>
          </label>

          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Maladie cardiaque *</span>
            <select value={heartDisease} onChange={(e) => setHeartDisease(e.target.value)} className="form-control" style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 10px", outline: "none" }} required>
              <option value="0">Non</option>
              <option value="1">Oui</option>
            </select>
          </label>

          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Marié(e) au moins une fois *</span>
            <select value={everMarried} onChange={(e) => setEverMarried(e.target.value)} className="form-control" style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 10px", outline: "none" }} required>
              <option value="">Sélectionner...</option>
              <option value="Yes">Oui</option>
              <option value="No">Non</option>
            </select>
          </label>
        </div>

        {/* Form Row 3: Work Type, Residence Type, Smoking Status */}
        <div className="form-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Type d&apos;activité *</span>
            <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="form-control" style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 10px", outline: "none" }} required>
              <option value="">Sélectionner...</option>
              <option value="Private">Privé</option>
              <option value="Self-employed">Indépendant</option>
              <option value="Govt_job">Fonctionnaire</option>
              <option value="children">Enfant / Mineur</option>
              <option value="Never_worked">Sans activité</option>
            </select>
          </label>

          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Type de résidence *</span>
            <select value={residenceType} onChange={(e) => setResidenceType(e.target.value)} className="form-control" style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 10px", outline: "none" }} required>
              <option value="">Sélectionner...</option>
              <option value="Urban">Urbain</option>
              <option value="Rural">Rural</option>
            </select>
          </label>

          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Statut tabagique *</span>
            <select value={smokingStatus} onChange={(e) => setSmokingStatus(e.target.value)} className="form-control" style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 10px", outline: "none" }} required>
              <option value="">Sélectionner...</option>
              <option value="never smoked">Jamais fumé</option>
              <option value="formerly smoked">Ancien fumeur</option>
              <option value="smokes">Fumeur</option>
              <option value="Unknown">Inconnu</option>
            </select>
          </label>
        </div>

        {/* Form Row 4: Average Glucose Level (Full-width / wide) */}
        <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
          <label className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span className="form-field__label" style={{ fontWeight: 600 }}>Niveau moyen de glucose (mg/dL) *</span>
            <input
              type="number"
              min="40"
              max="350"
              step="any"
              value={avgGlucoseLevel}
              onChange={(e) => setAvgGlucoseLevel(e.target.value)}
              className="form-control"
              style={{ height: "40px", border: "1px solid #d9e6de", borderRadius: "8px", padding: "0 12px", outline: "none" }}
              required
            />
          </label>
        </div>

        {/* Submit Actions */}
        <div className="form-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
          <button type="button" onClick={() => router.push("/dashboard")} className="btn btn--ghost" style={{ height: "40px", padding: "0 20px" }}>
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn--primary"
            style={{ height: "40px", padding: "0 24px", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" style={{ width: 16, height: 16 }} />
                <span>Calcul en cours...</span>
              </>
            ) : (
              <>
                <Send style={{ width: 16, height: 16 }} />
                <span>Enregistrer et continuer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </article>
  );
}
