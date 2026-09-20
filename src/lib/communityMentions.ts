/**
 * Marcações @ no texto de publicações e comentários da Comunidade.
 * Formato estável armazenado no texto: `@[Nome](user_id)` — a referência é o
 * user_id, nunca apenas o nome digitado.
 */
export const MAX_MENTIONS_PER_CONTENT = 10;
export const MENTION_MIN_QUERY = 1;

const MENTION_TOKEN = /@\[([^\]\n]{1,80})\]\(([0-9a-fA-F-]{36})\)/g;

export type MentionSegment =
  | { type: "text"; text: string }
  | { type: "mention"; name: string; userId: string };

/** Quebra o texto em trechos comuns e marcações, preservando a ordem. */
export function parseMentionSegments(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  MENTION_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_TOKEN.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "mention", name: match[1], userId: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }
  return segments;
}

/** IDs mencionados, sem repetição e respeitando o limite por conteúdo. */
export function extractMentionUserIds(text: string): string[] {
  const ids = parseMentionSegments(text)
    .filter((s): s is { type: "mention"; name: string; userId: string } => s.type === "mention")
    .map((s) => s.userId);
  return [...new Set(ids)].slice(0, MAX_MENTIONS_PER_CONTENT);
}

/** Texto exibido quando não há renderização rica (ex.: prévia/trecho). */
export function mentionPlainText(text: string): string {
  return parseMentionSegments(text)
    .map((s) => (s.type === "mention" ? `@${s.name}` : s.text))
    .join("");
}

export type ActiveMentionQuery = { start: number; query: string };

/**
 * Detecta se o cursor está escrevendo uma marcação (`@algo`) para abrir as
 * sugestões. Retorna null quando não há marcação em digitação.
 */
export function findActiveMentionQuery(
  text: string,
  caret: number,
): ActiveMentionQuery | null {
  const upToCaret = text.slice(0, caret);
  const at = upToCaret.lastIndexOf("@");
  if (at < 0) return null;
  const before = at === 0 ? "" : upToCaret[at - 1];
  if (before && !/[\s(]/.test(before)) return null;
  const query = upToCaret.slice(at + 1);
  if (!query.length) return { start: at, query: "" };
  if (/[\n\]]/.test(query)) return null;
  if (query.length > 40) return null;
  return { start: at, query };
}

/** Substitui a marcação em digitação pelo token estável e devolve o novo caret. */
export function applyMentionSelection(
  text: string,
  active: ActiveMentionQuery,
  person: { user_id: string; name: string },
): { text: string; caret: number } {
  const token = `@[${person.name.replace(/[[\]()]/g, "").trim()}](${person.user_id})`;
  const after = text.slice(active.start + 1 + active.query.length);
  const next = `${text.slice(0, active.start)}${token} ${after.replace(/^\s/, "")}`;
  return { text: next, caret: active.start + token.length + 1 };
}

/** Só conexões aceitas podem ser marcadas. */
export function filterMentionCandidates<T extends { user_id: string; name?: string | null }>(
  connections: T[],
  query: string,
  limit = 6,
): T[] {
  const term = query.trim().toLowerCase();
  const list = term
    ? connections.filter((c) => (c.name ?? "").toLowerCase().includes(term))
    : connections;
  return list.slice(0, limit);
}
