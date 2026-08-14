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

/**
 * Converte "YYYY-MM-DD" (ou timestamp ISO, usando só a parte da data) e o
 * legado "DD/MM/YYYY" em Date local, rejeitando datas impossíveis.
 *
 * new Date(y, m - 1, d) normaliza silenciosamente (2026-13-40 → 2027-02-09),
 * então validamos round-trip: ano/mês/dia resultantes precisam ser exatamente
 * os informados. Assim 2026-02-29 e 31/02 são rejeitados, e 2028-02-29 passa.
 */
export function parseFriendlyDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let y: number;
  let m: number;
  let d: number;

  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    d = Number(br[1]);
    m = Number(br[2]);
    y = Number(br[3]);
  } else {
    // Data-only ou timestamp ISO: só a parte da data importa.
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (!isoMatch) return null;
    y = Number(isoMatch[1]);
    m = Number(isoMatch[2]);
    d = Number(isoMatch[3]);
  }

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1000 || y > 9999) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return null;
  // Round-trip: rejeita 31/02, 29/02 em ano não bissexto, etc.
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }
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
