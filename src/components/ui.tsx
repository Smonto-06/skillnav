"use client";
// Pequeños componentes de UI reutilizables (DRY) para formularios y avisos.
import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function Alert({ message, tone = "error" }: { message?: string; tone?: "error" | "ok" }) {
  if (!message) return null;
  const styles =
    tone === "ok"
      ? "border-green-300 bg-green-50 text-green-800"
      : "border-red-300 bg-red-50 text-red-800";
  return (
    <div className={`rounded-md border px-4 py-2 text-sm ${styles}`}>{message}</div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Guardando..." : children}
    </button>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      {children}
    </section>
  );
}
