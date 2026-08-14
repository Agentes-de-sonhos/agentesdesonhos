import { parseLocalDateSafe } from "@/lib/dateParsing";

/**
 * Datas amigáveis em pt-BR para os cards recolhidos da Carteira Digital.
 *
 * Regras (nunca usar hífen cru "17/08/2026 - 22/08/2026"):
 *  - uma data ................ "17 de agosto de 2026"
 *  - mesmo mês e ano ......... "17 a 22 de agosto de 2026"
 *  - meses diferentes ........ "28 de agosto a 3 de setembro de 2026"
 *  - anos diferentes ......... "28 de dezembro de 2026 a 3 de janeiro de 2027"
 *  - inválida/ausente ........ null (não renderizar)
 *
 * Datas "YYYY-MM-DD" são interpretadas em horário local (sem deslocamento de
 * timezone) via parseLocalDateSafe.
 */

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function parseFriendlyDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Aceita "DD/MM/YYYY" legado convertendo para ISO antes do parse local.
  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : trimmed;
  const parsed = parseLocalDateSafe(iso);
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** "17 de agosto de 2026" — null quando a data é inválida/ausente. */
export function formatFriendlyDate(value: unknown): string | null {
  const d = parseFriendlyDate(value);
  if (!d) return null;
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Período amigável entre duas datas. Aceita apenas uma delas (retorna a data
 * simples) e devolve null quando nenhuma é válida.
 */
export function formatFriendlyDateRange(
  start: unknown,
  end?: unknown,
): string | null {
  let a = parseFriendlyDate(start);
  let b = parseFriendlyDate(end);

  if (!a && !b) return null;
  if (!a || !b) return formatFriendlyDate(a ?? b);

  // Ordena para nunca exibir período invertido.
  if (b.getTime() < a.getTime()) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const sameDay =
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay) return formatFriendlyDate(a);

  if (a.getFullYear() !== b.getFullYear()) {
    return `${formatFriendlyDate(a)} a ${formatFriendlyDate(b)}`;
  }

  if (a.getMonth() !== b.getMonth()) {
    return `${a.getDate()} de ${MONTHS_PT[a.getMonth()]} a ${b.getDate()} de ${MONTHS_PT[b.getMonth()]} de ${b.getFullYear()}`;
  }

  return `${a.getDate()} a ${b.getDate()} de ${MONTHS_PT[a.getMonth()]} de ${a.getFullYear()}`;
}

/** Normaliza horários "HH:MM(:SS)" → "HH:MM"; null quando não há dado útil. */
export function formatFriendlyTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Junta partes não vazias com separador, ou null quando não sobra nada. */
export function joinDetail(parts: Array<string | null | undefined>, sep = " · "): string | null {
  const clean = parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  if (clean.length === 0) return null;
  return clean.join(sep);
}
