/**
 * Helpers do importador de PACOTE COMPLETO (PDF/imagem/texto) dos orçamentos.
 *
 * Objetivos:
 * - Decidir se o PDF precisa ser enviado em base64 ao modelo (fallback) ou se o
 *   texto extraído no cliente (pdf.js) já é suficiente. Isso elimina o envio
 *   duplicado do documento e reduz drasticamente a latência da IA.
 * - Converter arquivos em base64 de forma assíncrona, sem congelar a interface.
 * - Centralizar timeouts e mensagens do fluxo.
 */

/** Mínimo de caracteres úteis para dispensar o PDF binário. */
export const MIN_USEFUL_TEXT_CHARS = 800;

/** Timeout total do frontend para a importação. */
export const IMPORT_CLIENT_TIMEOUT_MS = 90_000;

/** A partir daqui avisamos que está demorando mais que o normal. */
export const IMPORT_SLOW_NOTICE_MS = 20_000;

export const IMPORT_MESSAGES = {
  timeout: "A análise ultrapassou o tempo esperado. Tente novamente ou use um PDF menor.",
  canceled: "Importação cancelada. Você pode tentar novamente quando quiser.",
  generic: "Não foi possível analisar o pacote. Tente novamente.",
  slow: "A análise está demorando um pouco mais que o normal. Você pode aguardar ou cancelar e tentar novamente.",
} as const;

/**
 * Conta caracteres realmente úteis do texto extraído, ignorando marcadores de
 * página gerados pelo extrator e espaços em excesso.
 */
export function usefulTextLength(text: string | null | undefined): number {
  if (!text) return 0;
  return text
    .replace(/---\s*Página\s*\d+\s*---/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/**
 * `true` quando o texto extraído é suficiente: enviamos SOMENTE texto.
 */
export function hasSufficientText(text: string | null | undefined): boolean {
  return usefulTextLength(text) >= MIN_USEFUL_TEXT_CHARS;
}

/**
 * Decide se o binário (base64) deve acompanhar a requisição.
 * - Imagens sempre precisam do binário (não há extração textual).
 * - PDFs só precisam quando a extração textual foi insuficiente (digitalizado).
 * - Sem arquivo, nunca.
 */
export function shouldSendFileBase64(input: {
  hasFile: boolean;
  mimeType?: string | null;
  extractedText?: string | null;
}): boolean {
  if (!input.hasFile) return false;
  const isPdf = (input.mimeType || "").toLowerCase() === "application/pdf";
  if (!isPdf) return true;
  return !hasSufficientText(input.extractedText);
}

/**
 * Base64 assíncrono via FileReader (não bloqueia a main thread).
 */
export function fileToBase64Async(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export type ImportFailureKind = "canceled" | "timeout" | "error";

/** Classifica a falha para diferenciar cancelamento, timeout e erro real. */
export function classifyImportFailure(err: unknown, canceledByUser: boolean): ImportFailureKind {
  if (canceledByUser) return "canceled";
  const name = (err as { name?: string } | null)?.name;
  const message = String((err as { message?: string } | null)?.message || "");
  if (name === "TimeoutError") return "timeout";
  if (name === "AbortError" || /abort/i.test(message)) return "timeout";
  return "error";
}
