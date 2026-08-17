/**
 * Máquina de estados e simplificação de campos da jornada de cotação
 * White Label (etapa 2 da simplificação).
 *
 * A primeira dobra (ServiceInitialFields) permanece intacta: aqui só decidimos
 * o que ainda falta perguntar DEPOIS do clique em "Solicitar cotação" e como o
 * pop-up navega entre complemento, seleção de serviços, serviços adicionais,
 * contato e revisão opcional — sempre na mesma janela.
 */
import {
  fieldHasValue,
  fieldIsVisible,
  formFields,
  type RequestField,
  type RequestService,
  type ServiceValues,
} from "@/lib/agencySiteRequests";

/** Etapas da jornada — uma única instância do modal percorre todas. */
export type JourneyStage = "primary" | "pick" | "additional" | "contact" | "review";

/** Campos de viajantes: renderizados pelo componente compartilhado. */
export const TRAVELER_FIELDS = ["adultos", "criancas", "idades_criancas"] as const;

export function isTravelerField(name: string): boolean {
  return (TRAVELER_FIELDS as readonly string[]).includes(name);
}

/**
 * Campos COMPLEMENTARES essenciais por serviço, na ordem de apresentação.
 * Tudo que o agente pode confirmar depois (bagagem, voo direto, regimes,
 * coberturas detalhadas, faixas de investimento) sai do primeiro contato,
 * mas continua existindo no schema/payload quando já tiver valor.
 */
const ESSENTIAL_FIELDS: Record<string, string[]> = {
  aereo: ["adultos", "criancas", "idades_criancas", "flexibilidade", "classe", "observacoes"],
  hospedagem: ["adultos", "criancas", "idades_criancas", "quartos", "tipo_hospedagem", "observacoes"],
  carro: ["adultos", "criancas", "idades_criancas", "categoria_veiculo", "observacoes"],
  transfer: ["adultos", "criancas", "idades_criancas", "modalidade", "observacoes"],
  ingressos: ["adultos", "criancas", "idades_criancas", "observacoes"],
  seguro: ["adultos", "criancas", "idades_criancas", "observacoes"],
  cruzeiros: ["adultos", "criancas", "idades_criancas", "cabines", "preferencia_cabine", "observacoes"],
  pacotes: ["adultos", "criancas", "idades_criancas", "estilo", "observacoes"],
};

/** Campos que passam a ser obrigatórios nesta etapa (independente do schema). */
const REQUIRED_IN_STEP: Record<string, string[]> = {
  aereo: ["flexibilidade"],
};

export function essentialFieldNames(serviceKey: string): string[] {
  return ESSENTIAL_FIELDS[serviceKey] ?? ["adultos", "criancas", "idades_criancas", "observacoes"];
}

function withStepRequired(serviceKey: string, field: RequestField): RequestField {
  const required = (REQUIRED_IN_STEP[serviceKey] ?? []).includes(field.name);
  return required && !field.required ? { ...field, required: true } : field;
}

/**
 * Campos renderizados na etapa do serviço.
 *  - `primary`   : complemento do serviço escolhido na primeira dobra;
 *  - `additional`: serviço adicional, que herda todo o contexto da viagem.
 *
 * Em ambos os casos entram, antes dos essenciais, os campos obrigatórios que
 * realmente chegaram vazios (ex.: CTA externo sem primeira dobra, ou a atração
 * de um serviço de ingressos incluído depois).
 */
export function stepFields(
  service: RequestService,
  options: { role: "primary" | "additional"; values: ServiceValues },
): RequestField[] {
  const { role, values } = options;
  const byName = new Map(service.fields.map((field) => [field.name, field]));
  const out: RequestField[] = [];
  const seen = new Set<string>();

  const missing = formFields(
    service,
    role === "primary" ? { isPrimary: true, values } : { isComplement: true, values },
  ).filter((field) => field.required && !isTravelerField(field.name) && !fieldHasValue(field, values));

  for (const field of missing) {
    if (seen.has(field.name)) continue;
    seen.add(field.name);
    out.push(withStepRequired(service.key, field));
  }

  for (const name of essentialFieldNames(service.key)) {
    if (seen.has(name)) continue;
    // Viajantes/idades só são confirmados no complemento do serviço inicial.
    if (role === "additional" && isTravelerField(name)) continue;
    const field = byName.get(name);
    if (!field) continue;
    seen.add(name);
    out.push(withStepRequired(service.key, field));
  }

  return out.filter((field) => fieldIsVisible(field, values));
}

/** Onde o botão "Voltar" da etapa de contato deve cair. */
export function backFromContact(queue: readonly string[], hasComplements: boolean): JourneyStage {
  if (queue.length) return "additional";
  return hasComplements ? "pick" : "primary";
}

/** Rótulo "Serviço 2 de 3" da etapa de serviços adicionais. */
export function additionalProgressLabel(index: number, total: number): string {
  return `Serviço ${Math.min(index + 1, total)} de ${total}`;
}

/** Alterna a seleção múltipla de cards de serviços complementares. */
export function toggleSelection(selection: readonly string[], key: string): string[] {
  return selection.includes(key) ? selection.filter((item) => item !== key) : [...selection, key];
}