export type SpecialtyInput =
  | string
  | null
  | undefined
  | Array<string | { name?: string | null } | null | undefined>;

const SEPARATORS = /[,;•|]|\r?\n/;

function pushTokens(raw: string, out: string[]) {
  raw
    .split(SEPARATORS)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .forEach((t) => out.push(t));
}

/**
 * Normaliza especialidades/tags para renderização (nunca altera dados no banco).
 * - aceita array de strings, array de `{ name }` ou string legada;
 * - separa entradas legadas por vírgula, ponto e vírgula, bullet, pipe e quebra de linha;
 * - remove vazios e deduplica apenas valores idênticos normalizados, mantendo a ordem original.
 */
export function normalizeSpecialtyTags(input: SpecialtyInput): string[] {
  const tokens: string[] = [];
  if (typeof input === "string") {
    pushTokens(input, tokens);
  } else if (Array.isArray(input)) {
    for (const item of input) {
      if (!item) continue;
      const value = typeof item === "string" ? item : item.name ?? "";
      if (typeof value === "string") pushTokens(value, tokens);
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of tokens) {
    const key = t.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(t);
  }
  return result;
}