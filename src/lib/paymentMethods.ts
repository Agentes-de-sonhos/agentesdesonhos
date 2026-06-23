/**
 * Helpers para suportar múltiplos meios de pagamento na coluna
 * `quotes.payment_method_label`, mantendo retrocompatibilidade total:
 *
 * - Valor antigo (string única): "Pix"           → ["Pix"]
 * - Valor novo (JSON array):     '["Pix","Boleto"]' → ["Pix","Boleto"]
 * - Vazio/null                   → []
 *
 * Ao salvar:
 * - 0 itens → null
 * - 1 item  → string única (mantém o formato legado)
 * - 2+      → JSON array
 */
export function parsePaymentMethods(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return (raw as unknown[]).map(String).map(s => s.trim()).filter(Boolean);
  if (typeof raw !== "string") return [];
  const s = raw.trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const a = JSON.parse(s);
      if (Array.isArray(a)) return a.map(String).map(x => x.trim()).filter(Boolean);
    } catch { /* fallthrough */ }
  }
  return [s];
}

export function serializePaymentMethods(arr: string[] | null | undefined): string | null {
  const clean = (arr ?? []).map((x) => (x ?? "").trim()).filter(Boolean);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}

/** Junta os meios em uma string curta para uso inline (ex: "Pix • Boleto"). */
export function formatPaymentMethodsInline(raw: unknown, separator = " • "): string {
  return parsePaymentMethods(raw).join(separator);
}