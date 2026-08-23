/**
 * Ocorrências múltiplas na jornada de solicitação White Label.
 *
 * Um mesmo serviço pode ser pedido mais de uma vez ("Hospedagem 1",
 * "Hospedagem 2"): aqui ficam as funções puras que decidem QUAIS campos cada
 * ocorrência mostra e COMO ela é validada, para que o modal só cuide da
 * apresentação e o payload continue compatível com o fluxo atual.
 */
import {
  fieldIsVisible,
  initialServiceValues,
  isMultiRoute,
  periodFieldNames,
  periodMode,
  validateServiceStep,
  type RequestField,
  type RequestService,
  type ServiceValues,
} from "@/lib/agencySiteRequests";
import { isTravelerField, stepFields } from "@/lib/agencyJourneyFlow";
import {
  applyContextToService,
  formatChildAges,
  validateRouteLegs,
  type RouteLeg,
  type TripContext,
} from "@/lib/agencyQuoteJourney";

export type OccurrenceRole = "primary" | "additional";

export interface Occurrence {
  id: string;
  values: ServiceValues;
  legs: RouteLeg[];
}

export interface ServiceGroup {
  key: string;
  items: Occurrence[];
}

let seq = 0;
export function newOccurrenceId(prefix = "occ"): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/** Rótulo discreto de ocorrência: só numera quando existe mais de uma. */
export function occurrenceLabel(serviceLabel: string, index: number, total: number): string {
  return total > 1 ? `${serviceLabel} ${index + 1}` : serviceLabel;
}

export interface OccurrencePlan {
  fields: RequestField[];
  multiRoute: boolean;
  periodNames: string[];
  period: { mode: "single" | "range"; label: string; start: string; end: string } | null;
}

/** Campos efetivamente renderizados por uma ocorrência. */
export function occurrencePlan(
  service: RequestService,
  values: ServiceValues,
  role: OccurrenceRole,
): OccurrencePlan {
  const all = stepFields(service, { role, values }).filter((f) => fieldIsVisible(f, values));
  const multiRoute = service.key === "aereo" && isMultiRoute(service, values);
  const periodNames = periodFieldNames(service);
  const mode = !multiRoute && service.period ? periodMode(service, values) : null;
  const showPeriod = !!mode && all.some((f) => periodNames.includes(f.name));

  const fields = all
    .filter((f) => !isTravelerField(f.name))
    .filter((f) =>
      multiRoute
        ? f.name !== "destino" && f.name !== "data_ida" && f.name !== "data_volta"
        : showPeriod
        ? !periodNames.includes(f.name)
        : true,
    );

  return {
    fields,
    multiRoute,
    periodNames,
    period:
      showPeriod && service.period
        ? {
            mode: mode!,
            label:
              mode === "single"
                ? service.period.singleLabel ?? service.period.label
                : service.period.label,
            start: service.period.start,
            end: service.period.end,
          }
        : null,
  };
}

/** Validação de UMA ocorrência, considerando apenas o que está na tela. */
export function validateOccurrence(
  service: RequestService,
  occurrence: Occurrence,
  options: { role: OccurrenceRole; childAges: string[]; childCount: number },
): Record<string, string> {
  const { values, legs } = occurrence;
  const plan = occurrencePlan(service, values, options.role);
  const found = validateServiceStep(service, values);
  const renderable = new Set(plan.fields.map((f) => f.name));
  const errors: Record<string, string> = {};

  for (const [name, message] of Object.entries(found)) {
    if (renderable.has(name)) errors[name] = message;
  }

  for (const field of plan.fields) {
    if (!field.required) continue;
    const raw = values[field.name];
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (field.type !== "checkbox" && !value) errors[field.name] = "Campo obrigatório.";
  }

  if (plan.multiRoute) {
    Object.assign(errors, validateRouteLegs(String(values.origem ?? ""), legs));
  } else if (plan.period) {
    const { start, end } = plan.period;
    delete errors[start];
    delete errors[end];
    if (found[start]) errors.periodo = "Selecione a data inicial.";
    else if (found[end]) errors.periodo = found[end];
  }

  // Viajantes (adultos, crianças e idades) já foram informados e validados na
  // primeira etapa: não são exibidos no modal, logo não são validados de novo.



  return errors;
}

/**
 * Nova ocorrência EXTRA de um serviço: herda somente os viajantes.
 * Origem, destino e datas são pedidos de novo porque o trecho pode ser outro.
 */
export function extraOccurrence(service: RequestService, context: TripContext): Occurrence {
  // Item NOVO e independente: defaults numéricos coerentes (quartos/cabines = 1,
  // crianças = 0) e nenhum resíduo de outra ocorrência.
  const base = initialServiceValues(service);
  const values: ServiceValues = { ...base };
  const travelers: Record<string, string> = {
    adultos: String(Math.max(1, context.adultos || 1)),
    criancas: String(Math.max(0, context.criancas || 0)),
    idades_criancas: formatChildAges(context.idades_criancas),
    passageiros: String(Math.max(1, context.adultos + context.criancas)),
    viajantes: String(Math.max(1, context.adultos + context.criancas)),
  };
  for (const field of service.fields) {
    const inherited = travelers[field.name];
    if (inherited !== undefined) values[field.name] = inherited;
  }
  return { id: newOccurrenceId(service.key), values, legs: [] };
}


/** Primeira ocorrência de um serviço adicional: herda todo o contexto da viagem. */
export function inheritedOccurrence(service: RequestService, context: TripContext): Occurrence {
  return {
    id: newOccurrenceId(service.key),
    values: applyContextToService(service, initialServiceValues(service), context),
    legs: [],
  };
}
