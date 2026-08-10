/**
 * Tratamento de erros do portal de pagamentos (Edge Function `customer-portal`).
 * Nunca deve vazar "Edge Function returned a non-2xx status code" para o usuário.
 */

export type PortalErrorCode =
  | "not_authenticated"
  | "subscription_not_found"
  | "portal_not_configured"
  | "stripe_error";

export const PORTAL_ERROR_MESSAGES: Record<PortalErrorCode, string> = {
  not_authenticated: "Sua sessão expirou. Entre novamente para acessar pagamentos e faturas.",
  subscription_not_found:
    "Não localizamos seus dados de cobrança. Fale com o suporte informando o e-mail usado no pagamento.",
  portal_not_configured:
    "O portal de pagamentos ainda não está disponível. Já avisamos o suporte — tente novamente mais tarde.",
  stripe_error: "O provedor de pagamento não respondeu. Tente novamente em alguns minutos.",
};

const GENERIC_PORTAL_MESSAGE = "Não foi possível abrir o portal de pagamentos. Tente novamente.";

function fromBody(body: unknown): string | null {
  const parsed = body as { code?: PortalErrorCode; error?: string } | null | undefined;
  if (parsed?.code && PORTAL_ERROR_MESSAGES[parsed.code]) return PORTAL_ERROR_MESSAGES[parsed.code];
  if (typeof parsed?.error === "string" && parsed.error.trim()) return parsed.error.trim();
  return null;
}

export async function parsePortalError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;

  if (context && typeof (context as Response).clone === "function") {
    const response = context as Response;
    try {
      const mapped = fromBody(await response.clone().json());
      if (mapped) return mapped;
    } catch (_) {
      try {
        const text = await response.clone().text();
        if (text && text.trim() && !text.trim().startsWith("<")) return text.trim();
      } catch (_) {
        // cai no fallback
      }
    }
  }

  const mapped = fromBody(context);
  if (mapped) return mapped;

  const direct = fromBody(error);
  if (direct) return direct;

  const message = (error as { message?: string })?.message;
  if (message && !/non-2xx status code/i.test(message)) return message;
  return GENERIC_PORTAL_MESSAGE;
}
