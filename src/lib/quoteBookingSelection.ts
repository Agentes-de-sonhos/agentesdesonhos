/**
 * Regras puras da seleção de serviços no ORÇAMENTO PÚBLICO (solicitação de reserva).
 *
 * Este módulo não faz I/O e não conhece React: é a fonte única usada pelo painel
 * público e pelos testes. O servidor continua sendo a autoridade final — aqui
 * apenas espelhamos as mesmas regras para dar feedback imediato ao cliente.
 */
import type { QuoteChoiceGroup, QuoteSelectionMode, QuoteService } from "@/types/quote";
import { hidesIndividualAmounts, isPackagePricing } from "@/lib/quotePricing";

export const BOOKING_REQUEST_DISCLAIMER =
  "Esta é uma solicitação de reserva. Serviços, disponibilidade e valores serão reconfirmados pela agência. A reserva somente será efetivada após o retorno da agência e a concordância do viajante.";

export interface BookingSelectionGroup {
  group: QuoteChoiceGroup;
  services: QuoteService[];
}

export interface BookingSelectionModel {
  /** Pacote/valor fechado: conjunto bloqueado, sem retirar itens. */
  packageMode: boolean;
  /** true quando os valores individuais não são exibidos ao cliente. */
  hideAmounts: boolean;
  requiredServices: QuoteService[];
  optionalServices: QuoteService[];
  groups: BookingSelectionGroup[];
  /** Todos os serviços do orçamento, na ordem original. */
  allServices: QuoteService[];
}

const modeOf = (s: QuoteService): QuoteSelectionMode =>
  (s.selection_mode as QuoteSelectionMode) || "optional";

export function buildBookingSelectionModel(
  quote: any,
  services: QuoteService[],
  groups: QuoteChoiceGroup[] = [],
): BookingSelectionModel {
  const list = services || [];
  const packageMode = isPackagePricing(quote);
  const grouped: BookingSelectionGroup[] = (groups || [])
    .map((group) => ({
      group,
      services: list.filter((s) => s.choice_group_id === group.id),
    }))
    .filter((g) => g.services.length > 0);

  const groupedIds = new Set(grouped.flatMap((g) => g.services.map((s) => s.id)));

  return {
    packageMode,
    hideAmounts: hidesIndividualAmounts(quote),
    requiredServices: list.filter((s) => !groupedIds.has(s.id) && modeOf(s) === "required"),
    optionalServices: list.filter((s) => !groupedIds.has(s.id) && modeOf(s) !== "required"),
    groups: grouped,
    allServices: list,
  };
}

/** Seleção inicial: pacote = tudo; caso contrário só os obrigatórios. */
export function initialBookingSelection(model: BookingSelectionModel): string[] {
  if (model.packageMode) return model.allServices.map((s) => s.id);
  return model.requiredServices.map((s) => s.id);
}

/** Alterna um serviço respeitando required (bloqueado) e grupos alternativos (escolha única). */
export function toggleBookingSelection(
  model: BookingSelectionModel,
  selected: string[],
  serviceId: string,
): string[] {
  if (model.packageMode) return selected;
  const service = model.allServices.find((s) => s.id === serviceId);
  if (!service) return selected;
  if (modeOf(service) === "required") return selected;

  const set = new Set(selected);
  const groupEntry = model.groups.find((g) => g.services.some((s) => s.id === serviceId));

  if (groupEntry && groupEntry.group.group_type === "alternative") {
    // Escolha única: seleciona esta e remove as concorrentes do mesmo grupo.
    groupEntry.services.forEach((s) => set.delete(s.id));
    if (!selected.includes(serviceId)) set.add(serviceId);
    return Array.from(set);
  }

  if (set.has(serviceId)) set.delete(serviceId);
  else set.add(serviceId);
  return Array.from(set);
}

/** Retorna a primeira violação amigável, ou null quando a seleção é válida. */
export function validateBookingSelection(
  model: BookingSelectionModel,
  selected: string[],
): string | null {
  if (model.packageMode) {
    return model.allServices.length > 0 ? null : "Selecione pelo menos um serviço.";
  }
  const set = new Set(selected);

  for (const { group, services } of model.groups) {
    const count = services.filter((s) => set.has(s.id)).length;
    if (group.group_type === "alternative") {
      if (count !== 1) return `Escolha exatamente 1 opção em "${group.title}".`;
    } else {
      const min = group.min_select ?? 0;
      if (count < min) return `Escolha pelo menos ${min} opção(ões) em "${group.title}".`;
      if (group.max_select != null && count > group.max_select) {
        return `Escolha no máximo ${group.max_select} opção(ões) em "${group.title}".`;
      }
    }
  }

  const effective = model.allServices.filter(
    (s) => set.has(s.id) || modeOf(s) === "required",
  );
  if (effective.length === 0) return "Selecione pelo menos um serviço.";
  return null;
}

/** IDs efetivamente enviados (required sempre entram; pacote envia tudo). */
export function effectiveSelectionIds(
  model: BookingSelectionModel,
  selected: string[],
): string[] {
  if (model.packageMode) return model.allServices.map((s) => s.id);
  const set = new Set(selected);
  return model.allServices
    .filter((s) => set.has(s.id) || modeOf(s) === "required")
    .map((s) => s.id);
}

/** Texto do botão conforme o contexto do orçamento. */
export function bookingCtaLabel(model: BookingSelectionModel, selectedCount: number): string {
  if (model.packageMode) return "Solicitar reserva deste pacote";
  if (model.allServices.length === 1 || selectedCount === 1) return "Solicitar este serviço";
  return "Solicitar reserva dos serviços selecionados";
}

/**
 * Total apresentado no resumo — sempre o valor que o cliente realmente viu.
 * Nunca distribui nem inventa valores.
 */
export function bookingSelectionTotal(
  quote: any,
  model: BookingSelectionModel,
  selectedIds: string[],
): { total: number | null; label: string } {
  if (model.packageMode) {
    const pkg = Number(quote?.package_total_amount) || Number(quote?.total_amount) || 0;
    return { total: pkg > 0 ? pkg : null, label: "Valor total do pacote" };
  }
  if (model.hideAmounts) return { total: null, label: "Valor total" };
  const ids = new Set(effectiveSelectionIds(model, selectedIds));
  const sum = model.allServices
    .filter((s) => ids.has(s.id))
    .reduce((acc, s) => acc + (Number((s as any).amount) || 0), 0);
  return { total: sum > 0 ? sum : null, label: "Valor dos serviços selecionados" };
}

/** Validação do contato: nome + (WhatsApp OU e-mail). */
export function validateBookingContact(input: {
  name: string;
  whatsapp: string;
  email: string;
  disclaimerAccepted: boolean;
  /** Orçamento nominal: identidade vem do cadastro, sem pedir contato de novo. */
  hasLinkedClient?: boolean;
}): string | null {
  if (input.hasLinkedClient) {
    if (!input.disclaimerAccepted) {
      return "É necessário aceitar o aviso de que o pedido não confirma a reserva.";
    }
    return null;
  }
  if (input.name.trim().length < 2) return "Informe seu nome completo.";
  const digits = input.whatsapp.replace(/\D/g, "");
  const hasWhats = digits.length >= 10 && digits.length <= 15;
  const emailOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(input.email.trim());
  if (input.whatsapp.trim() && !hasWhats) return "Informe um WhatsApp válido com DDD.";
  if (input.email.trim() && !emailOk) return "Informe um e-mail válido.";
  if (!hasWhats && !emailOk) return "Informe WhatsApp ou e-mail para a agência entrar em contato.";
  if (!input.disclaimerAccepted) {
    return "É necessário aceitar o aviso de que o pedido não confirma a reserva.";
  }
  return null;
}

/**
 * true quando o orçamento é nominal (tem cliente cadastrado na agência).
 * O payload público nunca traz o client_id — apenas este sinal.
 */
export function quoteHasLinkedClient(quote: any): boolean {
  return quote?.has_linked_client === true;
}
