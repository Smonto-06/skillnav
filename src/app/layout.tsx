import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased`}>
        <Header />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between">
            <p>
              <span className="font-semibold text-slate-900">
                Skill<span className="text-acento-texto">Nav</span>
              </span>{" "}
              · Perfilamiento y recomendación de oportunidades laborales
            </p>
            <p>Reto Magneto · Universidad EAFIT 2026-2</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
