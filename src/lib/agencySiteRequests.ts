/**
 * Declarative schemas for the white-label agency site "Central de Solicitações".
 *
 * These are personalized service REQUESTS (leads), never transactional searches.
 * Step 1 collects trip data per service; step 2 collects the shared contact block.
 * The tenant is ALWAYS resolved on the server from the hostname.
 */

export type FieldType = "text" | "number" | "date" | "time" | "select" | "textarea" | "checkbox";

export interface RequestField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Grid span on >=sm screens (1 or 2 of 2 columns). */
  span?: 1 | 2;
  min?: number;
  max?: number;
  help?: string;
}

export interface RequestService {
  key: string;
  label: string;
  /** Short line shown above the fields. */
  intro: string;
  fields: RequestField[];
}

const PAX_ADULTS: RequestField = { name: "adultos", label: "Adultos", type: "number", required: true, min: 1, max: 30 };
const PAX_KIDS: RequestField = { name: "criancas", label: "Crianças", type: "number", min: 0, max: 20 };
const OBS: RequestField = { name: "observacoes", label: "Observações", type: "textarea", span: 2, placeholder: "Conte detalhes que ajudem a montar a melhor opção." };

export const REQUEST_SERVICES: RequestService[] = [
  {
    key: "aereo",
    label: "Aéreo",
    intro: "Informe os trechos desejados e quem viaja. Buscamos as melhores combinações de rota e tarifa.",
    fields: [
      { name: "tipo_viagem", label: "Tipo da viagem", type: "select", required: true, options: ["Ida e volta", "Somente ida", "Multidestinos"] },
      { name: "classe", label: "Classe", type: "select", options: ["Econômica", "Econômica premium", "Executiva", "Primeira classe", "Indiferente"] },
      { name: "origem", label: "Origem", type: "text", required: true, placeholder: "Cidade ou aeroporto de saída" },
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Cidade ou aeroporto de chegada" },
      { name: "data_ida", label: "Data de ida", type: "date", required: true },
      { name: "data_volta", label: "Data de volta", type: "date" },
      { name: "trechos_adicionais", label: "Trechos adicionais (multidestinos)", type: "textarea", span: 2, placeholder: "Ex.: Lisboa → Madri em 12/10; Madri → São Paulo em 18/10" },
      PAX_ADULTS,
      PAX_KIDS,
      { name: "bebes", label: "Bebês (colo)", type: "number", min: 0, max: 10 },
      { name: "flexibilidade", label: "Flexibilidade de datas", type: "select", options: ["Datas fixas", "Até 2 dias", "Até 1 semana", "Totalmente flexível"] },
      { name: "bagagem", label: "Bagagem", type: "select", options: ["Somente de mão", "1 bagagem despachada", "2 ou mais despachadas", "Indiferente"] },
      { name: "voo_direto", label: "Prefiro voo direto", type: "checkbox", span: 2 },
      OBS,
    ],
  },
  {
    key: "hospedagem",
    label: "Hospedagem",
    intro: "Conte o destino e o perfil da estadia para selecionarmos as melhores opções.",
    fields: [
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Cidade, região ou hotel desejado" },
      { name: "tipo_hospedagem", label: "Tipo de hospedagem", type: "select", options: ["Hotel", "Resort", "Pousada", "Apart-hotel", "Casa/apartamento", "Indiferente"] },
      { name: "check_in", label: "Check-in", type: "date", required: true },
      { name: "check_out", label: "Check-out", type: "date", required: true },
      { name: "quartos", label: "Quartos", type: "number", required: true, min: 1, max: 15 },
      { name: "categoria", label: "Categoria", type: "select", options: ["Econômica", "Turística", "Superior", "Luxo", "Indiferente"] },
      PAX_ADULTS,
      PAX_KIDS,
      { name: "idades_criancas", label: "Idades das crianças", type: "text", span: 2, placeholder: "Ex.: 4, 9 e 12 anos" },
      { name: "regime", label: "Regime", type: "select", options: ["Sem refeições", "Café da manhã", "Meia pensão", "Pensão completa", "All inclusive", "Indiferente"] },
      { name: "necessidades_especiais", label: "Necessidades especiais", type: "text", placeholder: "Ex.: quarto acessível, andar baixo" },
      OBS,
    ],
  },
  {
    key: "carro",
    label: "Aluguel de Carro",
    intro: "Informe retirada e devolução para cotarmos com cobertura adequada.",
    fields: [
      { name: "retirada_local", label: "Local da retirada", type: "text", required: true, span: 2, placeholder: "Aeroporto, cidade ou endereço" },
      { name: "retirada_data", label: "Data da retirada", type: "date", required: true },
      { name: "retirada_hora", label: "Hora da retirada", type: "time" },
      { name: "devolucao_local", label: "Local da devolução", type: "text", span: 2, placeholder: "Se diferente da retirada" },
      { name: "devolucao_data", label: "Data da devolução", type: "date", required: true },
      { name: "devolucao_hora", label: "Hora da devolução", type: "time" },
      { name: "devolucao_outra_localidade", label: "Devolução em outra localidade", type: "checkbox", span: 2 },
      { name: "passageiros", label: "Passageiros", type: "number", required: true, min: 1, max: 15 },
      { name: "categoria_veiculo", label: "Categoria do veículo", type: "select", options: ["Econômico", "Intermediário", "SUV", "Minivan", "Premium", "Indiferente"] },
      OBS,
    ],
  },
  {
    key: "transfer",
    label: "Transfer",
    intro: "Traslados privativos ou compartilhados, com horário conferido.",
    fields: [
      { name: "origem", label: "Origem", type: "text", required: true, placeholder: "Aeroporto, hotel ou endereço" },
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Aeroporto, hotel ou endereço" },
      { name: "data", label: "Data", type: "date", required: true },
      { name: "hora", label: "Hora", type: "time" },
      { name: "numero_voo", label: "Número do voo (opcional)", type: "text", placeholder: "Ex.: LA3456" },
      { name: "passageiros", label: "Passageiros", type: "number", required: true, min: 1, max: 60 },
      { name: "sentido", label: "Sentido", type: "select", required: true, options: ["Somente ida", "Ida e volta"] },
      { name: "modalidade", label: "Modalidade", type: "select", options: ["Privativo", "Compartilhado", "Indiferente"] },
      OBS,
    ],
  },
  {
    key: "ingressos",
    label: "Ingressos e Atrações",
    intro: "Parques, passeios e experiências com datas organizadas.",
    fields: [
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Cidade ou região" },
      { name: "atracao", label: "Atração desejada", type: "text", required: true, placeholder: "Parque, show, passeio ou experiência" },
      { name: "data", label: "Data ou início do período", type: "date", required: true },
      { name: "dias", label: "Quantidade de dias", type: "number", min: 1, max: 30 },
      PAX_ADULTS,
      PAX_KIDS,
      OBS,
    ],
  },
  {
    key: "seguro",
    label: "Seguro Viagem",
    intro: "Coberturas adequadas ao destino, à duração e ao perfil dos viajantes.",
    fields: [
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "País ou região" },
      { name: "tipo_viagem", label: "Tipo de viagem", type: "select", options: ["Lazer", "Negócios", "Estudos", "Intercâmbio", "Esportes"] },
      { name: "inicio", label: "Início da viagem", type: "date", required: true },
      { name: "fim", label: "Fim da viagem", type: "date", required: true },
      { name: "viajantes", label: "Quantidade de viajantes", type: "number", required: true, min: 1, max: 30 },
      { name: "idades", label: "Idades dos viajantes", type: "text", placeholder: "Ex.: 34, 36 e 8 anos" },
      { name: "cobertura", label: "Cobertura de interesse", type: "select", span: 2, options: ["Básica", "Intermediária", "Ampla", "Exigida por visto/consulado", "Não sei, quero orientação"] },
      OBS,
    ],
  },
  {
    key: "cruzeiros",
    label: "Cruzeiros",
    intro: "Itinerários, cabines e categorias explicados com clareza antes de decidir.",
    fields: [
      { name: "destino", label: "Destino ou região", type: "text", required: true, placeholder: "Ex.: Caribe, Mediterrâneo, Costa brasileira" },
      { name: "porto_embarque", label: "Porto de embarque (opcional)", type: "text" },
      { name: "data", label: "Data ou início do período", type: "date", required: true },
      { name: "duracao", label: "Duração (noites)", type: "number", min: 1, max: 200 },
      PAX_ADULTS,
      PAX_KIDS,
      { name: "cabines", label: "Quantidade de cabines", type: "number", min: 1, max: 20 },
      { name: "preferencia_cabine", label: "Preferência de cabine", type: "select", options: ["Interna", "Externa", "Varanda", "Suíte", "Indiferente"] },
      { name: "companhia_navio", label: "Companhia ou navio (opcional)", type: "text", span: 2 },
      OBS,
    ],
  },
  {
    key: "pacotes",
    label: "Pacotes e Circuitos",
    intro: "Roteiros completos, sob medida ou prontos, com apoio do início ao fim.",
    fields: [
      { name: "origem", label: "Origem", type: "text", required: true, placeholder: "Cidade de saída" },
      { name: "destinos", label: "Destino(s)", type: "text", required: true, span: 2, placeholder: "Ex.: Itália e Grécia" },
      { name: "data", label: "Data ou início do período", type: "date" },
      { name: "flexibilidade", label: "Flexibilidade", type: "select", options: ["Datas fixas", "Mês definido", "Semestre definido", "Totalmente flexível"] },
      { name: "duracao", label: "Duração (dias)", type: "number", min: 1, max: 120 },
      { name: "estilo", label: "Estilo da viagem", type: "select", options: ["Romântica", "Família", "Amigos", "Aventura", "Cultural", "Relaxamento", "Lua de mel"] },
      PAX_ADULTS,
      PAX_KIDS,
      { name: "servicos_desejados", label: "Serviços desejados", type: "text", span: 2, placeholder: "Ex.: aéreo, hotéis, transfers, passeios, seguro" },
      { name: "faixa_investimento", label: "Faixa de investimento (opcional)", type: "text", span: 2, placeholder: "Ex.: até R$ 20.000 no total" },
      OBS,
    ],
  },
];

export const CONTACT_CHANNELS = ["WhatsApp", "Ligação", "E-mail"] as const;
export const CONTACT_TIMES = ["Manhã", "Tarde", "Noite", "Qualquer horário"] as const;

export interface ContactValues {
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  preferred_channel: string;
  best_time: string;
  notes: string;
  consent: boolean;
}

export const EMPTY_CONTACT: ContactValues = {
  lead_name: "",
  lead_phone: "",
  lead_email: "",
  preferred_channel: "WhatsApp",
  best_time: "Qualquer horário",
  notes: "",
  consent: false,
};

export type ServiceValues = Record<string, string | boolean>;

export function serviceByKey(key: string): RequestService {
  return REQUEST_SERVICES.find((s) => s.key === key) ?? REQUEST_SERVICES[0];
}

export function initialServiceValues(service: RequestService): ServiceValues {
  const out: ServiceValues = {};
  for (const field of service.fields) {
    if (field.type === "checkbox") out[field.name] = false;
    else if (field.type === "select") out[field.name] = field.required ? (field.options?.[0] ?? "") : "";
    else if (field.type === "number") out[field.name] = field.name === "adultos" ? "2" : "";
    else out[field.name] = "";
  }
  return out;
}

/**
 * Essential fields shown in the compact "Cotação rápida" card of the home.
 * Required fields come first (never textareas/checkboxes) and, when the service
 * has fewer than `max` required fields, simple optional fields complete the row.
 * The full form (AgencyRequestCenter) keeps every field — this is presentation only.
 */
export function quickQuoteFields(service: RequestService, max = 4): RequestField[] {
  const usable = service.fields.filter((f) => f.type !== "textarea" && f.type !== "checkbox");
  const required = usable.filter((f) => f.required);
  const optional = usable.filter((f) => !f.required);
  return [...required, ...optional].slice(0, max);
}

/** Merges a partial prefill (from the quick card) into a full service value bag. */
export function mergeServiceValues(
  service: RequestService,
  prefill?: ServiceValues | null,
): ServiceValues {
  const base = initialServiceValues(service);
  if (!prefill) return base;
  for (const field of service.fields) {
    const value = prefill[field.name];
    if (value === undefined) continue;
    if (field.type === "checkbox") base[field.name] = value === true;
    else if (typeof value === "string" && value.trim()) base[field.name] = value;
  }
  return base;
}

const digits = (value: string) => value.replace(/\D/g, "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valid service keys — mirrors the server-side (Edge) and SQL allowlists. */
export const ALLOWED_SERVICE_KEYS = [
  "aereo",
  "hospedagem",
  "carro",
  "transfer",
  "ingressos",
  "seguro",
  "cruzeiros",
  "pacotes",
] as const;

export function isAllowedServiceKey(key: string): boolean {
  return (ALLOWED_SERVICE_KEYS as readonly string[]).includes(key);
}

const asDate = (values: ServiceValues, name: string): string => {
  const raw = values[name];
  return typeof raw === "string" ? raw.trim() : "";
};

/**
 * Cross-field date coherence, mirroring the essential server expectations:
 * check-out after check-in, drop-off after pick-up, insurance end after start,
 * and return flight not before departure when informed.
 */
export function validateServiceDates(service: RequestService, values: ServiceValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (service.key === "hospedagem") {
    const inDate = asDate(values, "check_in");
    const outDate = asDate(values, "check_out");
    if (inDate && outDate && outDate <= inDate) {
      errors.check_out = "O check-out deve ser depois do check-in.";
    }
  }

  if (service.key === "carro") {
    const pick = asDate(values, "retirada_data");
    const drop = asDate(values, "devolucao_data");
    if (pick && drop) {
      if (drop < pick) {
        errors.devolucao_data = "A devolução deve ser depois da retirada.";
      } else if (drop === pick) {
        const pickTime = asDate(values, "retirada_hora");
        const dropTime = asDate(values, "devolucao_hora");
        if (pickTime && dropTime && dropTime <= pickTime) {
          errors.devolucao_hora = "No mesmo dia, a devolução deve ser depois da retirada.";
        }
      }
    }
  }

  if (service.key === "seguro") {
    const start = asDate(values, "inicio");
    const end = asDate(values, "fim");
    if (start && end && end < start) {
      errors.fim = "O fim da viagem deve ser depois do início.";
    }
  }

  if (service.key === "aereo") {
    const out = asDate(values, "data_ida");
    const back = asDate(values, "data_volta");
    if (out && back && back < out) {
      errors.data_volta = "A volta não pode ser antes da ida.";
    }
  }

  return errors;
}

/** Step 1 validation: required fields of the selected service. */
export function validateServiceStep(service: RequestService, values: ServiceValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of service.fields) {
    if (!field.required) continue;
    const raw = values[field.name];
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (field.type === "checkbox") continue;
    if (!value) {
      errors[field.name] = "Campo obrigatório.";
      continue;
    }
    if (field.type === "number" && Number(value) <= 0) {
      errors[field.name] = "Informe um número válido.";
    }
  }
  return { ...errors, ...validateServiceDates(service, values) };
}

/** Step 2 validation: shared contact block. WhatsApp OR e-mail is enough. */
export function validateContactStep(contact: ContactValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (contact.lead_name.trim().length < 2) errors.lead_name = "Informe seu nome completo.";

  const phone = digits(contact.lead_phone);
  const email = contact.lead_email.trim();

  if (phone && (phone.length < 10 || phone.length > 15)) {
    errors.lead_phone = "Informe um WhatsApp válido com DDD.";
  }
  if (email && !EMAIL_RE.test(email)) errors.lead_email = "Informe um e-mail válido.";
  if (!phone && !email) {
    errors.lead_phone = "Informe seu WhatsApp ou e-mail.";
    errors.lead_email = "Informe seu WhatsApp ou e-mail.";
  }
  if (!contact.consent) errors.consent = "É necessário aceitar o uso dos seus dados para contato.";
  return errors;
}

/** Human-readable answers list, used for the review step and for the CRM note. */
export function describeServiceValues(service: RequestService, values: ServiceValues): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const field of service.fields) {
    const raw = values[field.name];
    if (field.type === "checkbox") {
      if (raw === true) out.push({ label: field.label, value: "Sim" });
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    out.push({ label: field.label, value });
  }
  return out;
}

export function buildRequestSummary(service: RequestService, values: ServiceValues): string {
  const parts = describeServiceValues(service, values).map((i) => `${i.label}: ${i.value}`);
  return [`Serviço: ${service.label}`, ...parts].join(" | ").slice(0, 2000);
}

/** Best-effort destination for the CRM opportunity. */
export function resolveDestination(values: ServiceValues): string {
  for (const key of ["destino", "destinos", "atracao", "retirada_local"]) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Flat string map sent to the server (details jsonb). */
export function buildDetailsPayload(service: RequestService, values: ServiceValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of service.fields) {
    const raw = values[field.name];
    if (field.type === "checkbox") {
      if (raw === true) out[field.name] = "true";
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) out[field.name] = value.slice(0, 400);
  }
  return out;
}
