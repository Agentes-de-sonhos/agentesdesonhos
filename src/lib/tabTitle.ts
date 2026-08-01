/**
 * Centralized normalization for internal workspace tab titles.
 *
 * Rules:
 * - Title Case: each significant word starts uppercase, remaining letters lowercase.
 * - Short Portuguese prepositions/articles stay lowercase unless first word.
 * - Known brands/acronyms keep their canonical casing (CRM, IA, PDF, WhatsApp...).
 */

const LOWERCASE_WORDS = new Set([
  "do", "da", "de", "dos", "das", "e", "em", "no", "na", "nos", "nas",
  "o", "a", "os", "as", "ao", "aos", "à", "às", "com", "por", "para", "sem", "um", "uma",
]);

/** Canonical brands / acronyms — matched case-insensitively. */
export const TAB_TITLE_BRANDS = [
  "CRM", "IA", "PDF", "AI", "API", "SEO", "QR", "CNPJ", "CPF", "LGPD",
  "B2B", "B2C", "WhatsApp", "EducaTravel", "TravelMeet", "Raio-X",
  "FAQ", "RD", "URL", "KPI", "NPS", "PIX",
];

const BRAND_MAP = new Map(TAB_TITLE_BRANDS.map((b) => [b.toLowerCase(), b]));

function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1).toLocaleLowerCase("pt-BR");
}

function normalizeWord(word: string, index: number): string {
  if (!word) return word;

  const brand = BRAND_MAP.get(word.toLowerCase());
  if (brand) return brand;

  // Handle hyphenated compounds (ex.: "raio-x", "pos-venda")
  if (word.includes("-")) {
    return word
      .split("-")
      .map((part, i) => normalizeWord(part, index + i))
      .join("-");
  }

  if (!/[a-zA-ZÀ-ÿ]/.test(word)) return word;

  const lower = word.toLocaleLowerCase("pt-BR");
  if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower;

  return capitalize(word);
}

/** Normalizes a tab label to the system's Title Case standard. */
export function toTabTitleCase(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  let significantIndex = 0;
  return trimmed
    .split(" ")
    .map((word) => {
      const hasLetters = /[a-zA-ZÀ-ÿ]/.test(word);
      const idx = hasLetters ? significantIndex++ : significantIndex;
      return normalizeWord(word, idx);
    })
    .join(" ");
}
