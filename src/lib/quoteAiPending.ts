/**
 * Piloto IA: serviços preparados ANTES de existir o orçamento.
 * Guardados por aba (sessionStorage). Só são vinculados a um quote.id depois
 * de "Criar Orçamento" e só entram no orçamento com confirmação explícita no editor.
 * A leitura para aplicar remove o registro antes (evita duplicação).
 */
export const QUOTE_AI_PENDING_KEY = "quote_ai_pending_v1";

export interface PendingService {
  service_type: string;
  service_data: Record<string, unknown>;
  amount: number;
  option_label?: string | null;
  description?: string | null;
}
export interface PendingPlan { quoteId: string | null; services: PendingService[]; createdAt: number }

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const TTL_MS = 6 * 60 * 60 * 1000;

const store = (): Store | null => { try { return window.sessionStorage; } catch { return null; } };

export function readPending(s: Store | null = store(), now = Date.now()): PendingPlan | null {
  if (!s) return null;
  try {
    const p = JSON.parse(s.getItem(QUOTE_AI_PENDING_KEY) || "null") as PendingPlan | null;
    if (!p || !Array.isArray(p.services) || now - p.createdAt > TTL_MS) { s.removeItem(QUOTE_AI_PENDING_KEY); return null; }
    return p;
  } catch { s.removeItem(QUOTE_AI_PENDING_KEY); return null; }
}

/** Substitui qualquer plano anterior (nunca mistura prévias). */
export function savePending(services: PendingService[], s: Store | null = store(), now = Date.now()) {
  if (!s) return;
  if (!services.length) { s.removeItem(QUOTE_AI_PENDING_KEY); return; }
  s.setItem(QUOTE_AI_PENDING_KEY, JSON.stringify({ quoteId: null, services, createdAt: now } satisfies PendingPlan));
}

/** Vincula ao orçamento recém-criado; só um plano sem vínculo pode ser vinculado. */
export function bindPending(quoteId: string, s: Store | null = store()) {
  const p = readPending(s);
  if (!s || !p || p.quoteId) return;
  s.setItem(QUOTE_AI_PENDING_KEY, JSON.stringify({ ...p, quoteId }));
}

export function pendingFor(quoteId: string | undefined, s: Store | null = store()): PendingService[] {
  const p = readPending(s);
  return p && quoteId && p.quoteId === quoteId ? p.services : [];
}

/** Retira os serviços do armazenamento ANTES de aplicar: segunda chamada devolve []. */
export function takePending(quoteId: string, s: Store | null = store()): PendingService[] {
  const list = pendingFor(quoteId, s);
  if (list.length) s?.removeItem(QUOTE_AI_PENDING_KEY);
  return list;
}

export function clearPending(s: Store | null = store()) { s?.removeItem(QUOTE_AI_PENDING_KEY); }
