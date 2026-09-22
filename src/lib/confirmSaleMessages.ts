/**
 * Tradução dos códigos internos do fluxo unificado V2 para linguagem humana.
 *
 * Nenhum código técnico (USE_CONFIRM_SALE, SERVICES_PENDING, ...) pode chegar à
 * interface: os códigos continuam apenas na telemetria/log. Este módulo é puro
 * para poder ser testado sem banco nem React.
 */

const HUMAN_MESSAGES: Array<{ code: string; message: string }> = [
  {
    code: "USE_CONFIRM_SALE",
    message:
      'Esta venda é concluída pela confirmação oficial "Confirmar venda e iniciar operação", que cria a operação e o financeiro sem duplicar nada.',
  },
  {
    code: "MULTIPLE_ACTIVE_TRAVEL_FILES",
    message:
      "Esta oportunidade tem mais de um processo de reserva em andamento. Deixe apenas um ativo na Central de Reservas antes de confirmar a venda.",
  },
  {
    code: "WORKFLOW_LINK_CONFLICT",
    message:
      "Este processo já está ligado a outra operação ou venda. Revise os vínculos na Central de Reservas antes de confirmar.",
  },
  {
    code: "LEGACY_AMBIGUOUS_LINK",
    message:
      "Encontramos registros antigos parecidos para esta venda. Revise-os na Central de Reservas para sabermos qual deve ser usado.",
  },
  {
    code: "SERVICES_PENDING",
    message:
      "Ainda há serviços aguardando reconfirmação de valor ou disponibilidade. Reconfirme-os e tente novamente.",
  },
  {
    code: "FILE_NOT_READY",
    message:
      "Este processo ainda não está pronto para virar venda. Revise os itens pendentes listados no processo.",
  },
  {
    code: "STALE_FILE",
    message:
      "Este processo foi alterado enquanto a tela estava aberta. Recarregue o processo e confirme novamente.",
  },
  {
    code: "NOT_AUTHORIZED",
    message: "Você não tem permissão para confirmar a venda deste processo.",
  },
];

const FALLBACK_MESSAGE =
  "Não foi possível confirmar a venda agora. Revise o processo na Central de Reservas e tente novamente.";

/** Código interno encontrado na mensagem (apenas para telemetria). */
export function extractWorkflowCode(raw: unknown): string | null {
  const text = String((raw as { message?: string } | null)?.message ?? raw ?? "");
  const found = HUMAN_MESSAGES.find((entry) => text.includes(entry.code));
  if (found) return found.code;
  const prefix = text.match(/^([A-Z][A-Z0-9_]{3,}):/);
  return prefix ? prefix[1] : null;
}

/**
 * Mensagem pronta para o usuário. Códigos conhecidos viram texto claro;
 * qualquer outro texto perde o prefixo técnico e, se sobrar um código cru,
 * usa a mensagem genérica.
 */
export function humanizeWorkflowError(raw: unknown): string {
  const text = String((raw as { message?: string } | null)?.message ?? raw ?? "").trim();
  if (!text) return FALLBACK_MESSAGE;
  const known = HUMAN_MESSAGES.find((entry) => text.includes(entry.code));
  if (known) return known.message;
  const stripped = text.replace(/^[A-Z][A-Z0-9_]{3,}:\s*/, "").trim();
  if (!stripped) return FALLBACK_MESSAGE;
  // Sobrou algo que ainda parece código interno: não mostrar ao usuário.
  if (/^[A-Z][A-Z0-9_]{3,}$/.test(stripped)) return FALLBACK_MESSAGE;
  return stripped;
}

export const CONFIRM_SALE_FALLBACK_MESSAGE = FALLBACK_MESSAGE;

export interface ActiveFileResolution {
  kind: "none" | "single" | "multiple";
  fileId: string | null;
}

/**
 * Qual processo de reserva ativo responde por esta oportunidade.
 * Mesmo predicado terminal do servidor: cancelado e viagem concluída não
 * contam como ativos (a consulta já filtra, aqui só interpretamos o resultado).
 */
export function resolveActiveTravelFiles(
  rows: Array<{ id: string }> | null | undefined,
): ActiveFileResolution {
  const list = rows ?? [];
  if (list.length === 0) return { kind: "none", fileId: null };
  if (list.length === 1) return { kind: "single", fileId: list[0].id };
  return { kind: "multiple", fileId: list[0].id };
}
