"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Layers, CheckCircle2, AlertOctagon } from "lucide-react";

export default function ModelTheoryPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Header Card */}
      <section className="card" aria-labelledby="theory-title">
        <header className="card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 id="theory-title" className="card__title">Théorie des modèles d&apos;IA</h2>
            <p className="card__subtitle">
              Cette page présente les bases théoriques des principaux modèles de Machine Learning utilisés pour la prédiction du risque d’AVC.
            </p>
          </div>
          <span className="chip chip--blue">Repères académiques</span>
        </header>
        <div style={{ marginTop: "16px" }}>
          <Link href="/modeles/comparaison" className="btn btn--secondary btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span>Retour à la comparaison</span>
          </Link>
        </div>
      </section>

      {/* 2. Priority Models Explainer */}
      <section className="card" aria-labelledby="models-theory-title">
        <header className="card__header" style={{ marginBottom: "24px" }}>
          <div>
            <h2 id="models-theory-title" className="card__title">Modèles prioritaires</h2>
            <p className="card__subtitle">Principes, intérêt médical, avantages et limites.</p>
          </div>
          <span className="chip chip--teal">3 modèles</span>
        </header>

        <div className="explainer__grid" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <article className="explainer__item" style={{ borderBottom: "1px solid #d9e6de", paddingBottom: "20px" }}>
            <h3 className="explainer__title" style={{ fontSize: "16px", fontWeight: 700, color: "#007a3d", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <BookOpen style={{ width: 18, height: 18 }} />
              <span>Régression logistique (Logistic Regression)</span>
            </h3>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Principe.</strong> La régression logistique estime la probabilité qu’un patient présente un risque d’AVC à partir de variables cliniques comme l’âge, la glycémie, l’hypertension, les maladies cardiaques et l’IMC.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Pourquoi l’utiliser pour la prédiction de l’AVC ?</strong> Elle sert de modèle de référence clair et rapide. Elle permet d’étudier l’association globale entre les facteurs cliniques et le risque estimé.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Avantages.</strong> Elle est lisible, stable et peu coûteuse à entraîner. Son interprétation reste accessible dans un cadre académique.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Limites.</strong> Elle modélise surtout des relations linéaires. Elle peut donc manquer des interactions complexes entre plusieurs facteurs médicaux.</p>
          </article>

          <article className="explainer__item" style={{ borderBottom: "1px solid #d9e6de", paddingBottom: "20px" }}>
            <h3 className="explainer__title" style={{ fontSize: "16px", fontWeight: 700, color: "#007a3d", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Layers style={{ width: 18, height: 18 }} />
              <span>Arbre de décision (Decision Tree)</span>
            </h3>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Principe.</strong> L’arbre de décision classe les patients à l’aide d’une suite de règles. Chaque règle sépare les données selon une variable, par exemple l’âge, la glycémie ou l’hypertension.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Pourquoi l’utiliser pour la prédiction de l’AVC ?</strong> Sa structure est proche d’un raisonnement par étapes. Elle aide à visualiser comment certains profils cliniques peuvent conduire à un risque plus élevé.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Avantages.</strong> Il est très interprétable. Il peut représenter des relations non linéaires et des interactions simples entre variables.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Limites.</strong> Un arbre isolé peut surapprendre les données d’entraînement. Il peut aussi devenir instable si de petites variations modifient ses règles.</p>
          </article>

          <article className="explainer__item">
            <h3 className="explainer__title" style={{ fontSize: "16px", fontWeight: 700, color: "#007a3d", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 style={{ width: 18, height: 18 }} />
              <span>Forêt aléatoire (Random Forest)</span>
            </h3>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Principe.</strong> La forêt aléatoire combine plusieurs arbres de décision. Chaque arbre apprend sur une partie des données, puis l’ensemble des arbres vote pour produire une prédiction plus stable.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Pourquoi l’utiliser pour la prédiction de l’AVC ?</strong> Elle est adaptée aux données cliniques tabulaires. Elle peut prendre en compte des relations complexes entre les facteurs de risque.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Avantages.</strong> Elle est robuste et souvent performante. Elle réduit le surapprentissage par rapport à un arbre de décision unique.</p>
            <p style={{ margin: "10px 0", lineHeight: 1.6 }}><strong>Limites.</strong> Elle est moins directement interprétable. Son fonctionnement global est plus difficile à expliquer qu’un modèle simple ou qu’un arbre isolé.</p>
          </article>
        </div>
      </section>

      {/* 3. Synthesis Table Card */}
      <section className="card" aria-labelledby="theory-comparison-title">
        <header className="card__header" style={{ marginBottom: "20px" }}>
          <div>
            <h2 id="theory-comparison-title" className="card__title">Comparaison théorique</h2>
            <p className="card__subtitle">Lecture synthétique des forces et limites de chaque approche.</p>
          </div>
          <span className="chip chip--blue">Synthèse</span>
        </header>
        
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table className="models-table" style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Comparaison théorique des modèles">
            <thead>
              <tr style={{ borderBottom: "2px solid #d9e6de", textAlign: "left" }}>
                <th style={{ padding: "12px 8px" }}>Modèle</th>
                <th style={{ padding: "12px 8px" }}>Interprétabilité</th>
                <th style={{ padding: "12px 8px" }}>Robustesse</th>
                <th style={{ padding: "12px 8px" }}>Avantage principal</th>
                <th style={{ padding: "12px 8px" }}>Limite principale</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #d9e6de" }}>
                <th scope="row" style={{ padding: "14px 8px", textAlign: "left" }}>Régression logistique</th>
                <td style={{ padding: "14px 8px" }}>Élevée</td>
                <td style={{ padding: "14px 8px" }}>Moyenne</td>
                <td style={{ padding: "14px 8px", color: "#007a3d", fontWeight: 600 }}>Lecture claire des facteurs</td>
                <td style={{ padding: "14px 8px", color: "#c94c4c" }}>Relations surtout linéaires</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #d9e6de" }}>
                <th scope="row" style={{ padding: "14px 8px", textAlign: "left" }}>Arbre de décision</th>
                <td style={{ padding: "14px 8px" }}>Élevée</td>
                <td style={{ padding: "14px 8px" }}>Moyenne</td>
                <td style={{ padding: "14px 8px", color: "#007a3d", fontWeight: 600 }}>Règles faciles à expliquer</td>
                <td style={{ padding: "14px 8px", color: "#c94c4c" }}>Risque de surapprentissage</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #d9e6de" }}>
                <th scope="row" style={{ padding: "14px 8px", textAlign: "left" }}>Forêt aléatoire</th>
                <td style={{ padding: "14px 8px" }}>Moyenne</td>
                <td style={{ padding: "14px 8px" }}>Élevée</td>
                <td style={{ padding: "14px 8px", color: "#007a3d", fontWeight: 600 }}>Bonne performance tabulaire</td>
                <td style={{ padding: "14px 8px", color: "#c94c4c" }}>Explication moins directe</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Academic Note */}
      <section className="card" style={{ borderLeft: "4px solid #0d9488" }}>
        <h3 className="card__title" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#0d9488" }}>
          <AlertOctagon style={{ width: 20, height: 20 }} />
          <span>Note académique importante</span>
        </h3>
        <p style={{ marginTop: "12px", fontSize: "14px", lineHeight: "1.6", color: "#c94c4c", fontWeight: 600 }}>
          ⚠️ Dans un contexte médical, le rappel (Recall) et le F1-score sont particulièrement vitaux. En raison du déséquilibre des classes cliniques (la majorité des patients diagnostiqués n&apos;ayant pas subi d&apos;AVC), optimiser uniquement la précision classique (Accuracy) masquerait les faux négatifs, ce qui peut se révéler grave lors de l&apos;élaboration de diagnostics d&apos;aide à la décision médicale.
        </p>
      </section>
    </div>
  );
}
