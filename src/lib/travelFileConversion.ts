import type { TravelFile, TravelFileService } from "@/types/travelFile";

/**
 * Regras puras do fluxo unificado de venda (Fase 1A / V2).
 *
 * Estas regras espelham a RPC `confirm_travel_file_sale` para orientar a
 * interface ANTES da confirmação. A autoridade final é sempre o servidor:
 * qualquer divergência é resolvida pela resposta da RPC.
 */

/** Situações de serviço que entram na conversão (com preço final). */
export const V2_ELIGIBLE_SERVICE_STATUSES = [
  "available",
  "awaiting_client",
  "booked",
  "paid",
  "issued",
  "delivered",
] as const;

/** Situações que bloqueiam a confirmação da venda. */
export const V2_BLOCKING_SERVICE_STATUSES = [
  "requested",
  "reconfirming",
  "amount_changed",
] as const;

/** Situações que excluem o serviço da conversão quando ele é opcional. */
export const V2_EXCLUDED_WHEN_OPTIONAL_STATUSES = ["unavailable", "cancelled"] as const;

export const V2_ACCEPTANCE_CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "presencial", label: "Presencial" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
] as const;

export type V2AcceptanceChannel = (typeof V2_ACCEPTANCE_CHANNELS)[number]["value"];

/** Valor efetivo do serviço: o último valor combinado prevalece. */
export const effectiveServiceAmount = (
  service: Pick<TravelFileService, "sold_amount" | "reconfirmed_amount" | "requested_amount">,
): number => service.sold_amount ?? service.reconfirmed_amount ?? service.requested_amount ?? 0;

/** Elegível = situação pós-reconfirmação + preço final positivo. */
export const isServiceEligible = (service: TravelFileService): boolean =>
  (V2_ELIGIBLE_SERVICE_STATUSES as readonly string[]).includes(service.status) &&
  effectiveServiceAmount(service) > 0;

/** Pacote fechado (financeiro gera um único produto "Pacote"). */
export const isPackageFile = (file: Pick<TravelFile, "pricing_mode">): boolean =>
  ["package", "pacote"].includes((file.pricing_mode || "").toLowerCase());

/** O processo já foi convertido pelo fluxo unificado. */
export const isConvertedV2 = (
  file: Pick<TravelFile, "workflow_version" | "operation_id" | "status">,
): boolean =>
  (file.workflow_version ?? 1) === 2 && !!file.operation_id;

export interface TravelFileReadiness {
  /** Pronto para confirmar a venda agora. */
  ready: boolean;
  /** Já convertido anteriormente (não confirmar de novo). */
  alreadyConverted: boolean;
  /** Motivos que bloqueiam a confirmação (mensagens em pt-BR). */
  blockers: string[];
  /** Avisos que não bloqueiam (ex.: opcionais excluídos). */
  warnings: string[];
  /** Serviços que entrarão na operação/venda. */
  eligible: TravelFileService[];
  /** Serviços com pendência de fornecedor/regra financeira, por id. */
  pendingServices: TravelFileService[];
  /** Opcionais indisponíveis/cancelados que ficarão de fora. */
  excludedCount: number;
  /** Total final dos serviços elegíveis. */
  total: number;
  /** Moeda única dos elegíveis (vazia quando não há elegíveis). */
  currency: string;
  mixedCurrencies: boolean;
  /** Identificadores de serviço sem fornecedor identificado. */
  missingSupplierIds: string[];
}

/**
 * Avalia a prontidão do processo para "Confirmar venda e iniciar operação".
 * Espelha exatamente as pré-condições da RPC:
 * - file em "Aguardando cliente" (primeira confirmação);
 * - cliente e oportunidade vinculados;
 * - nenhum serviço em reconfirmação; nenhum obrigatório indisponível;
 * - ao menos um elegível com preço final;
 * - moeda única;
 * - regra financeira confirmada (ou não aplicável) em todos os elegíveis;
 * - fornecedor identificado ou exceção justificada.
 */
export function assessTravelFileReadiness(
  file: Pick<
    TravelFile,
    "status" | "client_id" | "opportunity_id" | "pricing_mode" | "workflow_version" | "operation_id"
  >,
  services: TravelFileService[],
  /** Justificativas de exceção de fornecedor por id de serviço (aceite explícito). */
  supplierExceptions: Record<string, string> = {},
): TravelFileReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const alreadyConverted = isConvertedV2(file);

  if (file.status !== "awaiting_client" && !alreadyConverted) {
    blockers.push(
      'O processo precisa estar em "Aguardando cliente" para confirmar a venda.',
    );
  }
  if (!file.client_id) blockers.push("Vincule um cliente ao processo.");
  if (!file.opportunity_id) blockers.push("O processo precisa estar vinculado a uma oportunidade do CRM.");

  const blocking = services.filter((s) =>
    (V2_BLOCKING_SERVICE_STATUSES as readonly string[]).includes(s.status),
  );
  if (blocking.length > 0) {
    blockers.push(
      `${blocking.length} serviço(s) aguardando reconfirmação de preço ou disponibilidade.`,
    );
  }

  const requiredUnavailable = services.filter(
    (s) => s.is_required && s.status === "unavailable",
  );
  if (requiredUnavailable.length > 0) {
    blockers.push(
      `Serviço obrigatório indisponível: ${requiredUnavailable
        .map((s) => s.product_name)
        .join(", ")}. Remova ou reconfirme antes de confirmar.`,
    );
  }

  const eligible = services.filter(isServiceEligible);
  if (eligible.length === 0) {
    blockers.push("Nenhum serviço elegível (disponível/reservado/emitido com preço final).");
  }

  const excludedCount = services.filter(
    (s) =>
      !s.is_required &&
      (V2_EXCLUDED_WHEN_OPTIONAL_STATUSES as readonly string[]).includes(s.status),
  ).length;
  if (excludedCount > 0) {
    warnings.push(
      `${excludedCount} serviço(s) opcional(is) indisponível(is)/cancelado(s) ficarão fora da conversão.`,
    );
  }

  const currencies = [
    ...new Set(eligible.map((s) => (s.currency || "BRL").toUpperCase())),
  ];
  const mixedCurrencies = currencies.length > 1;
  if (mixedCurrencies) {
    blockers.push(
      `Moedas diferentes entre os serviços (${currencies.join(", ")}). Separe a venda por moeda nesta versão.`,
    );
  }

  const pendingRule = eligible.filter(
    (s) => (s.financial_rule_status ?? "pending") === "pending",
  );
  if (pendingRule.length > 0) {
    blockers.push(
      `${pendingRule.length} serviço(s) sem regra financeira confirmada (fornecedor/comissão).`,
    );
  }

  const missingSupplierIds = eligible
    .filter(
      (s) =>
        !s.operator_id &&
        !(s.supplier_name || "").trim() &&
        !(supplierExceptions[s.id] || "").trim(),
    )
    .map((s) => s.id);
  if (missingSupplierIds.length > 0) {
    blockers.push(
      `${missingSupplierIds.length} serviço(s) sem fornecedor identificado (informe o fornecedor ou justifique a exceção).`,
    );
  }

  const total = eligible.reduce((sum, s) => sum + effectiveServiceAmount(s), 0);
  const currency = currencies[0] ?? "";

  return {
    ready: !alreadyConverted && blockers.length === 0,
    alreadyConverted,
    blockers,
    warnings,
    eligible,
    pendingServices: [...pendingRule, ...eligible.filter((s) => missingSupplierIds.includes(s.id))],
    excludedCount,
    total,
    currency,
    mixedCurrencies,
    missingSupplierIds,
  };
}

/** Resumo da comissão do serviço para exibição (nunca inventa valor). */
export function describeServiceCommission(service: TravelFileService): string {
  const status = service.financial_rule_status ?? "pending";
  if (status === "not_applicable") return "Sem comissão (não se aplica)";
  if (status === "pending") return "Regra financeira pendente";
  const type = (service.commission_type || "").toLowerCase();
  if (type === "percentage" || type === "percent") {
    return service.commission_percent != null
      ? `Comissão ${service.commission_percent}%`
      : "Comissão percentual sem valor definido";
  }
  if (type === "fixed") {
    const value = service.commission_fixed ?? service.commission_amount;
    return value != null ? "Comissão fixa definida" : "Comissão fixa sem valor definido";
  }
  if (type === "none") return "Sem comissão";
  return "Comissão não informada";
}
