/**
 * Utilitários do fluxo de cancelamento de assinatura.
 * Mantidos fora do componente para permitir teste unitário.
 */

export type CancelErrorCode =
  | "not_authenticated"
  | "subscription_not_found"
  | "stripe_error"
  | "invalid_payload";

export const CANCEL_ERROR_MESSAGES: Record<CancelErrorCode, string> = {
  not_authenticated: "Sua sessão expirou. Entre novamente e tente cancelar.",
  subscription_not_found:
    "Não localizamos uma assinatura ativa vinculada à sua conta. Fale com o suporte informando o e-mail usado no pagamento.",
  stripe_error: "O provedor de pagamento não respondeu. Tente novamente em alguns minutos.",
  invalid_payload: "Não foi possível enviar sua solicitação. Recarregue a página e tente novamente.",
};

const GENERIC_MESSAGE = "Não foi possível cancelar a assinatura. Tente novamente.";

/**
 * Lê o corpo real do erro de uma Edge Function.
 * No supabase-js v2, `error.context` é um `Response` — o JSON precisa ser lido
 * explicitamente, senão sobra apenas o texto genérico do SDK.
 */
export async function parseFunctionsError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;

  if (context && typeof (context as Response).clone === "function") {
    const response = context as Response;
    try {
      const body = await response.clone().json();
      const code = body?.code as CancelErrorCode | undefined;
      if (code && CANCEL_ERROR_MESSAGES[code]) return CANCEL_ERROR_MESSAGES[code];
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
    } catch (_) {
      try {
        const text = await response.clone().text();
        if (text && text.trim() && !text.trim().startsWith("<")) return text.trim();
      } catch (_) {
        // ignora e cai no fallback
      }
    }
  }

  // Objeto simples já desserializado (ex.: data.error de uma resposta 200)
  const plain = context as { code?: CancelErrorCode; error?: string } | undefined;
  if (plain?.code && CANCEL_ERROR_MESSAGES[plain.code]) return CANCEL_ERROR_MESSAGES[plain.code];
  if (typeof plain?.error === "string" && plain.error.trim()) return plain.error;

  const message = (error as { message?: string })?.message;
  if (message && !/non-2xx status code/i.test(message)) return message;
  return GENERIC_MESSAGE;
}

/** Formata o epoch (segundos) devolvido pela função em data pt-BR. */
export function formatCancelDate(cancelAt: unknown): string | null {
  if (typeof cancelAt !== "number" || !Number.isFinite(cancelAt) || cancelAt <= 0) return null;
  const date = new Date(cancelAt * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}
