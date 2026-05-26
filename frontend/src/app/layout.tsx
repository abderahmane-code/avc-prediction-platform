import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plateforme Intelligente de Prédiction d'AVC",
  description: "Prediction clinique du risque d'accident vasculaire cerebral assistee par IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
