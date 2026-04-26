"""ReportLab-based PDF rendering for prediction reports.

Used by the ``/prediction/detail/<id>/pdf/`` view (Step 14).

Public API: :func:`render_prediction_report` returns the PDF as ``bytes``.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from .risk import (
    FACTORS_NOTE,
    NO_FACTOR_MESSAGE,
    RISK_LEVEL_NOTE,
    compute_factors,
    compute_risk_level,
)


# Brand palette (matches the web UI tokens).
COLOR_PRIMARY = colors.HexColor("#2563eb")
COLOR_PRIMARY_STRONG = colors.HexColor("#1d4ed8")
COLOR_TEAL = colors.HexColor("#0d9488")
COLOR_TEAL_SOFT = colors.HexColor("#ccfbf1")
COLOR_RED = colors.HexColor("#ef4444")
COLOR_RED_SOFT = colors.HexColor("#fee2e2")
COLOR_AMBER = colors.HexColor("#f59e0b")
COLOR_AMBER_SOFT_RISK = colors.HexColor("#fef3c7")
COLOR_TEXT = colors.HexColor("#0f172a")
COLOR_TEXT_MUTED = colors.HexColor("#64748b")
COLOR_BORDER = colors.HexColor("#e2e8f0")
COLOR_SURFACE_MUTED = colors.HexColor("#f8fafc")
COLOR_AMBER_SOFT = colors.HexColor("#fef3c7")
COLOR_AMBER_DARK = colors.HexColor("#78350f")


PROJECT_NAME = "Plateforme intelligente de prédiction du risque d'AVC"
REPORT_TITLE = "Rapport de prédiction AVC"
DISCLAIMER = (
    "Cette application est un projet académique et ne remplace pas un "
    "diagnostic médical."
)


def _build_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=COLOR_TEXT,
            spaceAfter=4,
        ),
        "eyebrow": ParagraphStyle(
            "eyebrow",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=COLOR_PRIMARY,
            spaceAfter=2,
        ),
        "lead": ParagraphStyle(
            "lead",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            textColor=COLOR_TEXT_MUTED,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=18,
            textColor=COLOR_TEXT,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            textColor=COLOR_TEXT,
        ),
        "disclaimer": ParagraphStyle(
            "disclaimer",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            leading=13,
            textColor=COLOR_AMBER_DARK,
        ),
        "recommendation": ParagraphStyle(
            "recommendation",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=COLOR_TEXT,
        ),
        "disclaimer_muted": ParagraphStyle(
            "disclaimer_muted",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=11.5,
            textColor=COLOR_TEXT_MUTED,
        ),
    }


def _patient_table(patient_rows: list[tuple[str, str]]) -> Table:
    data = [["Donnée patient", "Valeur"]]
    for label, value in patient_rows:
        data.append([label, value])

    table = Table(data, colWidths=[70 * mm, 100 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("LEADING", (0, 0), (-1, -1), 13),
                ("ALIGN", (0, 0), (-1, 0), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_SURFACE_MUTED]),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, COLOR_BORDER),
                ("BOX", (0, 0), (-1, -1), 0.6, COLOR_BORDER),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 1), (0, -1), COLOR_TEXT),
                ("TEXTCOLOR", (1, 1), (1, -1), COLOR_TEXT),
            ]
        )
    )
    return table


_LEVEL_ACCENT = {
    "low": (COLOR_TEAL, COLOR_TEAL_SOFT),
    "medium": (COLOR_AMBER, COLOR_AMBER_SOFT_RISK),
    "high": (COLOR_RED, COLOR_RED_SOFT),
}


def _result_table(rows: list[tuple[str, str]], level_key: str) -> Table:
    accent, accent_soft = _LEVEL_ACCENT.get(level_key, (COLOR_TEAL, COLOR_TEAL_SOFT))

    data = [[row[0], row[1]] for row in rows]
    table = Table(data, colWidths=[70 * mm, 100 * mm])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10.5),
                ("LEADING", (0, 0), (-1, -1), 14),
                ("TEXTCOLOR", (0, 0), (-1, -1), COLOR_TEXT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                # First row = "Niveau de risque" — coloured by risk.
                ("BACKGROUND", (0, 0), (-1, 0), accent_soft),
                ("TEXTCOLOR", (1, 0), (1, 0), accent),
                ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, COLOR_BORDER),
                ("BOX", (0, 0), (-1, -1), 0.6, COLOR_BORDER),
            ]
        )
    )
    return table


def _draw_header_footer(canv: canvas.Canvas, doc) -> None:
    """Painter for every page: brand bar at the top + disclaimer at the bottom."""
    width, height = A4

    # Top brand bar.
    canv.saveState()
    canv.setFillColor(COLOR_PRIMARY)
    canv.rect(0, height - 14 * mm, width, 14 * mm, fill=1, stroke=0)
    canv.setFillColor(COLOR_TEAL)
    canv.rect(0, height - 14 * mm, 6 * mm, 14 * mm, fill=1, stroke=0)
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 10.5)
    canv.drawString(12 * mm, height - 9.5 * mm, "AVC Predict")
    canv.setFont("Helvetica", 8.5)
    canv.drawString(40 * mm, height - 9.5 * mm, "Plateforme clinique IA")
    canv.setFont("Helvetica", 8.5)
    canv.drawRightString(width - 18 * mm, height - 9.5 * mm, REPORT_TITLE)
    canv.restoreState()

    # Bottom footer.
    canv.saveState()
    canv.setStrokeColor(COLOR_BORDER)
    canv.setLineWidth(0.4)
    canv.line(18 * mm, 16 * mm, width - 18 * mm, 16 * mm)
    canv.setFillColor(COLOR_TEXT_MUTED)
    canv.setFont("Helvetica", 8.5)
    canv.drawString(18 * mm, 11 * mm, DISCLAIMER)
    canv.drawRightString(
        width - 18 * mm,
        11 * mm,
        f"Page {doc.page}",
    )
    canv.restoreState()


def render_prediction_report(*, prediction, patient, fr_labels: dict) -> bytes:
    """Render the prediction PDF report as bytes.

    Parameters mirror the ``detail`` view's payload — the caller passes the
    already-resolved French labels for the categorical patient fields so the
    PDF stays in sync with the UI.
    """
    buffer = BytesIO()
    width, height = A4
    margin_x = 18 * mm
    margin_top = 22 * mm
    margin_bottom = 22 * mm

    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin_x,
        rightMargin=margin_x,
        topMargin=margin_top,
        bottomMargin=margin_bottom,
        title=f"{REPORT_TITLE} #{prediction.pk}",
        author="AVC Predict",
        subject="Rapport de prédiction du risque d'AVC",
    )
    frame = Frame(
        margin_x,
        margin_bottom,
        width - 2 * margin_x,
        height - margin_top - margin_bottom,
        showBoundary=0,
    )
    doc.addPageTemplates(
        [PageTemplate(id="report", frames=frame, onPage=_draw_header_footer)]
    )

    styles = _build_styles()
    story: list = []

    # Title block.
    story.append(Paragraph("RAPPORT CLINIQUE", styles["eyebrow"]))
    story.append(Paragraph(REPORT_TITLE, styles["h1"]))
    story.append(Paragraph(PROJECT_NAME, styles["lead"]))

    created = prediction.created_at
    if isinstance(created, datetime):
        created_str = created.strftime("%d/%m/%Y à %H:%M")
    else:
        created_str = str(created)
    user = getattr(prediction, "user", None)
    user_str = user.username if user is not None else "—"
    story.append(
        Paragraph(
            f"<b>Identifiant :</b> #{prediction.pk}"
            f" &nbsp;·&nbsp; <b>Date :</b> {created_str}"
            f" &nbsp;·&nbsp; <b>Clinicien :</b> {user_str}",
            styles["body"],
        )
    )
    story.append(Spacer(1, 3 * mm))

    # Patient input table.
    story.append(Paragraph("Données du patient", styles["section"]))
    patient_rows = [
        ("Genre", fr_labels.get("gender", patient.gender)),
        ("Âge", f"{patient.age} ans"),
        ("Hypertension", "Oui" if patient.hypertension else "Non"),
        ("Maladie cardiaque", "Oui" if patient.heart_disease else "Non"),
        ("Déjà marié(e)", "Oui" if patient.ever_married else "Non"),
        ("Type d'emploi", fr_labels.get("work_type", patient.work_type)),
        ("Zone de résidence", fr_labels.get("residence_type", patient.residence_type)),
        (
            "Glycémie moyenne",
            f"{patient.avg_glucose_level:.1f} mg/dL",
        ),
        ("IMC", f"{patient.bmi:.1f}"),
        ("Statut tabagique", fr_labels.get("smoking_status", patient.smoking_status)),
    ]
    story.append(_patient_table(patient_rows))
    story.append(Spacer(1, 3 * mm))

    # Prediction result — 3-level interpretation (Step 17).
    story.append(Paragraph("Résultat de la prédiction", styles["section"]))
    risk_level = compute_risk_level(prediction.risk_probability)
    result_rows = [
        ("Niveau de risque", risk_level["short"]),
        ("Probabilité estimée", f"{risk_level['probability_pct']:.1f} %"),
        ("Modèle utilisé", prediction.model_name or "—"),
    ]
    story.append(_result_table(result_rows, risk_level["key"]))
    story.append(Spacer(1, 1 * mm))
    story.append(Paragraph(RISK_LEVEL_NOTE, styles["disclaimer_muted"]))
    story.append(Spacer(1, 3 * mm))

    # Recommendation.
    story.append(Paragraph("Recommandation clinique", styles["section"]))
    story.append(
        Paragraph(
            prediction.recommendation
            or "Aucune recommandation disponible pour cette prédiction.",
            styles["recommendation"],
        )
    )
    story.append(Spacer(1, 3 * mm))

    # Factors (Step 17) — rule-based, transparent helper.
    story.append(Paragraph("Facteurs influençant la prédiction", styles["section"]))
    factors = compute_factors(patient)
    if factors:
        # Render 2 factors per line in a compact table so high-risk
        # reports with 6 factors still fit on one page.
        factor_paragraphs = [Paragraph(f"•&nbsp; {f}", styles["body"]) for f in factors]
        rows = []
        for i in range(0, len(factor_paragraphs), 2):
            left = factor_paragraphs[i]
            right = factor_paragraphs[i + 1] if i + 1 < len(factor_paragraphs) else ""
            rows.append([left, right])
        factor_table = Table(rows, colWidths=[(width - 2 * margin_x) / 2] * 2)
        factor_table.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(factor_table)
    else:
        story.append(Paragraph(NO_FACTOR_MESSAGE, styles["body"]))
    story.append(Spacer(1, 1 * mm))
    story.append(Paragraph(FACTORS_NOTE, styles["disclaimer_muted"]))
    story.append(Spacer(1, 3 * mm))

    # Compact disclaimer band — Step 17 added the factors section, so the
    # original framed Avertissement médical card no longer fits on one
    # page with 6 factors. The page footer already shows the canonical
    # disclaimer string on every page; this slim band keeps the visual
    # cue without forcing a second page.
    disclaimer_table = Table(
        [[Paragraph(f"<b>Avertissement médical —</b> {DISCLAIMER}", styles["disclaimer"])]],
        colWidths=[width - 2 * margin_x],
    )
    disclaimer_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_AMBER_SOFT),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#fde68a")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(KeepTogether([disclaimer_table]))

    doc.build(story)
    return buffer.getvalue()
