import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillNav",
  description:
    "Plataforma inteligente de perfilamiento y recomendación de oportunidades laborales",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
