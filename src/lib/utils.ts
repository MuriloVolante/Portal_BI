import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fuso fixo do portal. As datas são renderizadas no servidor (UTC na
 * Vercel); sem timeZone explícito o horário sairia 3h adiantado.
 */
export const APP_TIME_ZONE = "America/Sao_Paulo";

/** "10/06/2026, 17:04" no fuso do portal; fallback para valores vazios. */
export function formatDateTimeBR(
  value: string | null | undefined,
  fallback = "Nunca"
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return date.toLocaleString("pt-BR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "10/06/2026" no fuso do portal. */
export function formatDateBR(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { timeZone: APP_TIME_ZONE });
}
