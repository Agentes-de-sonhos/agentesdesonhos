/**
 * Camada central de idioma dos MATERIAIS PÚBLICOS (cliente final).
 *
 * Regras do produto:
 * - O idioma é definido pela AGÊNCIA (campo `profiles.public_content_locale`).
 * - Não existe seletor público de idioma.
 * - A área interna/autenticada do agente permanece SEMPRE em português.
 * - Conteúdo livre digitado pelo agente NUNCA é traduzido.
 */

export const PUBLIC_LOCALES = ["pt-BR", "it-IT"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

/** Fallback seguro para agências sem configuração. */
export const DEFAULT_PUBLIC_LOCALE: PublicLocale = "pt-BR";

/** Aceita qualquer entrada (null/undefined/valor desconhecido) e devolve um locale válido. */
export function normalizePublicLocale(value: unknown): PublicLocale {
  if (typeof value !== "string") return DEFAULT_PUBLIC_LOCALE;
  const raw = value.trim();
  if (!raw) return DEFAULT_PUBLIC_LOCALE;
  const exact = PUBLIC_LOCALES.find((l) => l.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const lang = raw.toLowerCase().split(/[-_]/)[0];
  if (lang === "it") return "it-IT";
  if (lang === "pt") return "pt-BR";
  return DEFAULT_PUBLIC_LOCALE;
}

/** Extrai o locale público a partir do perfil público já carregado (sem autenticação). */
export function resolvePublicLocale(
  profile: { public_content_locale?: string | null } | null | undefined
): PublicLocale {
  return normalizePublicLocale(profile?.public_content_locale ?? null);
}

/* ------------------------------------------------------------------ */
/* Dicionários tipados (solução pequena, sem dependência externa)      */
/* ------------------------------------------------------------------ */

/** pt-BR define as chaves; os outros idiomas só precisam cobrir as mesmas chaves. */
export type LocaleDictionary<T extends Record<string, string>> = {
  "pt-BR": T;
} & { [L in Exclude<PublicLocale, "pt-BR">]: Record<keyof T, string> };

/**
 * Cria um tradutor tipado a partir de um dicionário por idioma.
 * `t("chave", { nome: "X" })` interpola `{nome}`.
 */
export function createTranslator<T extends Record<string, string>>(
  dict: LocaleDictionary<T>
) {
  return function translator(locale: PublicLocale | string | null | undefined) {
    const resolved = normalizePublicLocale(locale);
    const table = (dict[resolved] ?? dict[DEFAULT_PUBLIC_LOCALE]) as Record<keyof T, string>;
    const fallback = dict[DEFAULT_PUBLIC_LOCALE] as Record<keyof T, string>;
    return function t(key: keyof T, vars?: Record<string, string | number>): string {
      const template = (table[key] ?? fallback[key] ?? String(key)) as string;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
      );
    };
  };
}


export type Translator<T extends Record<string, string>> = ReturnType<
  ReturnType<typeof createTranslator<T>>
>;

/* ------------------------------------------------------------------ */
/* Datas, números e plurais                                            */
/* ------------------------------------------------------------------ */

/**
 * Converte "YYYY-MM-DD" (ou Date/ISO) para Date no fuso LOCAL,
 * seguindo o padrão de datas do projeto.
 */
export function parseLocalDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatPublicDate(
  value: string | Date | null | undefined,
  locale: PublicLocale | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }
): string {
  const date = parseLocalDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(normalizePublicLocale(locale), options).format(date);
}

/** Data curta numérica: 08/09/2026 (pt-BR) · 08/09/2026 (it-IT). */
export function formatPublicShortDate(
  value: string | Date | null | undefined,
  locale: PublicLocale | string | null | undefined
): string {
  return formatPublicDate(value, locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Data longa: "8 de setembro de 2026" · "8 settembre 2026". */
export function formatPublicLongDate(
  value: string | Date | null | undefined,
  locale: PublicLocale | string | null | undefined
): string {
  return formatPublicDate(value, locale, { day: "numeric", month: "long", year: "numeric" });
}

export function formatPublicWeekday(
  value: string | Date | null | undefined,
  locale: PublicLocale | string | null | undefined,
  weekday: "long" | "short" = "long"
): string {
  return formatPublicDate(value, locale, { weekday });
}

/** Plural simples (as duas línguas usam one/other). */
export function pluralize(
  locale: PublicLocale | string | null | undefined,
  count: number,
  forms: { one: string; other: string }
): string {
  const rule = new Intl.PluralRules(normalizePublicLocale(locale)).select(count);
  return rule === "one" ? forms.one : forms.other;
}

/**
 * Formata número no locale público.
 * ATENÇÃO: valores e moedas do documento NÃO são convertidos — apenas formatados
 * quando a moeda já está definida no próprio documento.
 */
export function formatPublicNumber(
  value: number,
  locale: PublicLocale | string | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(normalizePublicLocale(locale), options).format(value);
}
