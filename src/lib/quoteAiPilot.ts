/** Piloto "Montar orçamento com IA": somente admin + chave local de teste. */
export const QUOTE_AI_PILOT_KEY = "quote_ai_pilot";

export function isQuoteAiPilotEnabled(isAdmin: boolean, flag: string | null): boolean {
  return isAdmin === true && flag === "on";
}

export function readQuoteAiPilotFlag(): string | null {
  try { return window.localStorage.getItem(QUOTE_AI_PILOT_KEY); } catch { return null; }
}
