/**
 * Declarative schemas for the white-label agency site "Central de Solicitações".
 *
 * These are personalized service REQUESTS (leads), never transactional searches.
 * Step 1 collects trip data per service; step 2 collects the shared contact block.
 * The tenant is ALWAYS resolved on the server from the hostname.
 */

export type FieldType = "text" | "number" | "date" | "time" | "select" | "textarea" | "checkbox" | "tags";

/** Tipo de busca estruturada aplicada a um campo de texto de local. */
export type LocationSearchKind = "city" | "airport" | "port";

/**
 * De onde o valor do campo vem na jornada contextual:
 *  - `quick`      : preenchido na primeira dobra (resumo editável, não repetido);
 *  - `standalone` : só é perguntado quando o serviço é o pedido inicial;
 *  - `context`    : derivado do contexto compartilhado (viajantes, idades);
 *  - `always`     : sempre perguntado no formulário focado (padrão).
 */
export type FieldOrigin = "quick" | "standalone" | "context" | "always";

export interface RequestField {
  name: string;
  label: string;
  /**
   * Rótulo curto usado APENAS no bloco inicial compartilhado (linha única do
   * desktop). Quando ausente, o bloco inicial usa `label`. As etapas
   * posteriores da jornada sempre usam `label`.
   */
  shortLabel?: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Grid span on >=sm screens (1 or 2 of 2 columns). */
  span?: 1 | 2;
  min?: number;
  max?: number;
  help?: string;
  origin?: FieldOrigin;
  /** Busca estruturada aplicada ao campo de texto (cidade/aeroporto/porto). */
  search?: LocationSearchKind;
  /** Só renderiza quando o campo indicado estiver marcado (checkbox). */
  visibleWhen?: string;
}

/**
 * Período único do serviço: dois campos de data ("YYYY-MM-DD") apresentados em
 * UM só campo visual com um só calendário de intervalo. Quando `rangeWhen`
 * devolve `false`, o mesmo campo vira data simples (apenas `start`).
 */
export interface ServicePeriod {
  label: string;
  singleLabel?: string;
  start: string;
  end: string;
  rangeWhen?: (values: ServiceValues) => boolean;
  help?: string;
}

export interface RequestService {
  key: string;
  label: string;
  /** Short line shown above the fields. */
  intro: string;
  fields: RequestField[];
  /** Datas inicial/final unificadas em um único campo de período. */
  period?: ServicePeriod;
}

/** Adultos / Crianças / idades: padrão único de viajantes dos oito serviços. */
const PAX_ADULTS: RequestField = { name: "adultos", label: "Adultos", type: "number", required: true, min: 1, max: 30, origin: "quick" };
const PAX_KIDS: RequestField = { name: "criancas", label: "Crianças", type: "number", min: 0, max: 12, origin: "quick" };
const PAX_AGES: RequestField = { name: "idades_criancas", label: "Idades das crianças", type: "text", span: 2, origin: "context" };
const OBS: RequestField = { name: "observacoes", label: "Observações", type: "textarea", span: 2, placeholder: "Conte detalhes que ajudem a montar a melhor opção." };

export const REQUEST_SERVICES: RequestService[] = [
  {
    key: "aereo",
    label: "Aéreo",
    intro: "Confirme quem viaja e as preferências de voo. Buscamos as melhores combinações de rota e tarifa.",
    period: {
      label: "Ida e volta",
      singleLabel: "Data da ida",
      start: "data_ida",
      end: "data_volta",
      rangeWhen: (values) => String(values.tipo_viagem ?? "") !== "Somente ida",
    },
    fields: [
      { name: "tipo_viagem", label: "Tipo da viagem", type: "select", required: true, options: ["Ida e volta", "Somente ida", "Multidestinos"], origin: "quick" },
      { name: "origem", label: "Origem", type: "text", required: true, placeholder: "Cidade, aeroporto ou código IATA", origin: "quick", search: "airport" },
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Cidade, aeroporto ou código IATA", origin: "quick", search: "airport" },
      { name: "data_ida", label: "Data de ida", type: "date", required: true, origin: "quick" },
      { name: "data_volta", label: "Data de volta", type: "date", origin: "quick" },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      // Serialização da rota estruturada montada na primeira dobra (nunca digitada
      // como texto livre): mantida para compatibilidade do payload/CRM.
      { name: "rota_multidestinos", label: "Destinos da viagem", type: "textarea", span: 2, origin: "context" },
      { name: "classe", label: "Classe", type: "select", options: ["Econômica", "Econômica premium", "Executiva", "Primeira classe", "Indiferente"] },
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
    period: {
      label: "Período da hospedagem",
      start: "check_in",
      end: "check_out",
      help: "Check-in e check-out no mesmo calendário.",
    },
    fields: [
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Cidade ou região", origin: "quick", search: "city" },
      { name: "check_in", label: "Check-in", type: "date", required: true, origin: "quick" },
      { name: "check_out", label: "Check-out", type: "date", required: true, origin: "quick" },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      { name: "tipo_hospedagem", label: "Tipo de hospedagem", type: "select", options: ["Hotel", "Resort", "Pousada", "Apart-hotel", "Casa/apartamento", "Indiferente"] },
      { name: "quartos", label: "Quartos", type: "number", required: true, min: 1, max: 15 },
      {
        name: "categoria",
        label: "Categoria",
        type: "select",
        span: 2,
        options: [
          "Econômica — essencial",
          "Conforto — categoria intermediária",
          "Superior — mais estrutura e conforto",
          "Luxo — experiência premium",
          "Indiferente — quero recomendações",
        ],
      },
      { name: "regime", label: "Regime", type: "select", options: ["Sem refeições", "Café da manhã", "Meia pensão", "Pensão completa", "All inclusive", "Indiferente"] },
      { name: "necessidades_especiais", label: "Necessidades especiais", type: "text", placeholder: "Ex.: quarto acessível, andar baixo" },
      OBS,
    ],
  },
  {
    key: "carro",
    label: "Aluguel de Carro",
    intro: "Informe cidade e período para cotarmos com a cobertura adequada. Horários são alinhados depois.",
    period: {
      label: "Período da locação",
      start: "retirada_data",
      end: "devolucao_data",
      help: "Retirada e devolução no mesmo calendário.",
    },
    fields: [
      { name: "retirada_local", label: "Destino ou local de retirada", shortLabel: "Local de retirada", type: "text", required: true, span: 2, placeholder: "Cidade, aeroporto ou código IATA", origin: "quick", search: "airport" },
      { name: "retirada_data", label: "Data da retirada", type: "date", required: true, origin: "quick" },
      { name: "devolucao_data", label: "Data da devolução", type: "date", required: true, origin: "quick" },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      { name: "devolucao_outra_localidade", label: "Devolver em outra localidade", type: "checkbox", span: 2 },
      { name: "devolucao_cidade", label: "Cidade da devolução", type: "text", span: 2, placeholder: "Cidade onde o carro será entregue", visibleWhen: "devolucao_outra_localidade" },
      { name: "categoria_veiculo", label: "Categoria do veículo", type: "select", options: ["Econômico", "Intermediário", "SUV", "Minivan", "Premium", "Indiferente"] },
      OBS,
    ],
  },
  {
    key: "transfer",
    label: "Transfer",
    intro: "Traslados privativos ou compartilhados. O horário exato é confirmado com o consultor.",
    period: {
      label: "Ida e volta",
      singleLabel: "Data do serviço",
      start: "data",
      end: "data_volta",
      rangeWhen: (values) => String(values.sentido ?? "") !== "Somente ida",
    },
    fields: [
      { name: "destino", label: "Destino ou local do serviço", shortLabel: "Local do serviço", type: "text", required: true, span: 2, placeholder: "Cidade, aeroporto ou código IATA", origin: "quick", search: "airport" },
      { name: "sentido", label: "Tipo de transfer", type: "select", required: true, options: ["Ida e volta", "Somente ida"], origin: "quick" },
      { name: "data", label: "Data do serviço", type: "date", required: true, origin: "quick" },
      { name: "data_volta", label: "Data da volta", type: "date", origin: "quick" },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      { name: "modalidade", label: "Modalidade", type: "select", options: ["Privativo", "Compartilhado", "Indiferente"], origin: "quick" },
      { name: "numero_voo", label: "Número do voo (opcional)", type: "text", placeholder: "Ex.: LA3456" },
      OBS,
    ],
  },
  {
    key: "ingressos",
    label: "Ingressos e Atrações",
    intro: "Parques, passeios e experiências com datas organizadas.",
    fields: [
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Cidade ou região", origin: "quick", search: "city" },
      { name: "atracao", label: "Atração desejada", type: "text", required: true, placeholder: "Ex.: Beto Carrero World, Disney, Universal", origin: "quick" },
      { name: "data", label: "Data da visita", type: "date", required: true, origin: "quick" },
      { name: "dias", label: "Quantidade de dias", shortLabel: "Dias", type: "number", min: 1, max: 30, origin: "quick", help: "Dias de utilização ou de visita." },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      OBS,
    ],
  },
  {
    key: "seguro",
    label: "Seguro Viagem",
    intro: "Coberturas adequadas ao destino, à duração e ao perfil dos viajantes.",
    period: {
      label: "Período da viagem",
      start: "inicio",
      end: "fim",
      help: "Início e fim da cobertura no mesmo calendário.",
    },
    fields: [
      { name: "destino", label: "Destino", type: "text", required: true, placeholder: "Cidade ou região", origin: "quick", search: "city" },
      { name: "inicio", label: "Início da viagem", type: "date", required: true, origin: "quick" },
      { name: "fim", label: "Fim da viagem", type: "date", required: true, origin: "quick" },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      { name: "tipo_viagem", label: "Tipo de viagem", type: "select", options: ["Lazer", "Negócios", "Estudos", "Intercâmbio", "Esportes"], origin: "quick" },
      { name: "idades", label: "Idades dos adultos (opcional)", type: "text", span: 2, placeholder: "Ex.: 34 e 36 anos", help: "As idades das crianças já vêm do contexto da viagem." },
      { name: "cobertura", label: "Cobertura de interesse", type: "select", span: 2, options: ["Básica", "Intermediária", "Ampla", "Exigida por visto/consulado", "Não sei, quero orientação"] },
      OBS,
    ],
  },
  {
    key: "cruzeiros",
    label: "Cruzeiros",
    intro: "Itinerários, cabines e categorias explicados com clareza antes de decidir.",
    fields: [
      { name: "destino", label: "Região desejada", type: "text", required: true, placeholder: "Ex.: Caribe", origin: "quick" },
      { name: "data", label: "Data inicial", type: "date", required: true, origin: "quick" },
      { name: "duracao", label: "Duração (noites)", shortLabel: "Noites", type: "number", min: 1, max: 200, origin: "quick" },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      { name: "porto_embarque", label: "Porto de embarque", type: "text", span: 2, placeholder: "Ex.: Santos, Porto de Santos, Miami, Port Canaveral", origin: "quick", search: "port" },
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
      { name: "origem", label: "Origem", type: "text", required: true, placeholder: "Cidade, aeroporto ou código IATA", origin: "quick", search: "airport" },
      { name: "destinos", label: "Destinos", type: "tags", required: true, span: 2, placeholder: "Digite e pressione Enter — ex.: Itália", origin: "quick" },
      { name: "data", label: "Data inicial", type: "date", origin: "quick" },
      { name: "duracao", label: "Duração (dias)", shortLabel: "Dias", type: "number", min: 1, max: 120, origin: "quick" },
      PAX_ADULTS,
      PAX_KIDS,
      PAX_AGES,
      { name: "flexibilidade", label: "Flexibilidade", type: "select", options: ["Datas fixas", "Mês definido", "Semestre definido", "Totalmente flexível"] },
      { name: "estilo", label: "Estilo da viagem", type: "select", options: ["Romântica", "Família", "Amigos", "Aventura", "Cultural", "Relaxamento", "Lua de mel"] },
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

/**
 * Defaults numéricos de NOVOS formulários/itens (nunca aplicados a dados já
 * informados). Adultos começa em 2, crianças em 0 (visível, nunca vazio) e todo
 * campo de UNIDADE obrigatória (quartos, cabines...) começa em 1.
 * Durações (noites/dias) e campos opcionais continuam vazios.
 */
export const QUANTITY_DEFAULTS: Record<string, string> = {
  adultos: "2",
  criancas: "0",
  quartos: "1",
  cabines: "1",
};

/** O campo numérico representa uma unidade obrigatória com mínimo 1? */
export function isUnitQuantityField(field: RequestField): boolean {
  return field.type === "number" && field.name !== "adultos" && field.name !== "criancas"
    && QUANTITY_DEFAULTS[field.name] === "1";
}

export function initialServiceValues(service: RequestService): ServiceValues {
  const out: ServiceValues = {};
  for (const field of service.fields) {
    if (field.type === "checkbox") out[field.name] = false;
    else if (field.type === "select") out[field.name] = field.required ? (field.options?.[0] ?? "") : "";
    else if (field.type === "number") out[field.name] = QUANTITY_DEFAULTS[field.name] ?? "";
    else out[field.name] = "";
  }
  return out;
}

/**
 * Normaliza os campos numéricos antes de validar/enviar: nunca NaN, string
 * vazia, null ou undefined em quantidade obrigatória; crianças aceita 0 e,
 * quando é 0, nenhuma idade residual sobrevive no estado/payload.
 */
export function normalizeServiceQuantities(service: RequestService, values: ServiceValues): ServiceValues {
  const out: ServiceValues = { ...values };
  for (const field of service.fields) {
    if (field.type !== "number") continue;
    const raw = out[field.name];
    const text = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : "";
    const parsed = Math.floor(Number(text));
    const fallback = QUANTITY_DEFAULTS[field.name];
    if (!text || !Number.isFinite(parsed)) {
      if (fallback !== undefined) out[field.name] = fallback;
      continue;
    }
    const min = field.name === "criancas" ? 0 : field.min ?? (fallback === "1" ? 1 : undefined);
    let next = parsed;
    if (min !== undefined && next < min) next = min;
    if (field.max !== undefined && next > field.max) next = field.max;
    out[field.name] = String(next);
  }
  const kids = Math.floor(Number(String(out.criancas ?? "")));
  if (Number.isFinite(kids) && kids <= 0 && "idades_criancas" in out) out.idades_criancas = "";
  return out;
}


/**
 * Essential fields shown in the compact "Cotação rápida" card of the home.
 * Required fields come first (never textareas/checkboxes) and, when the service
 * has fewer than `max` required fields, simple optional fields complete the row.
 * The full form (AgencyRequestCenter) keeps every field — this is presentation only.
 */
export function quickQuoteFields(service: RequestService, max = 4): RequestField[] {
  return initialBlockFields(service).slice(0, max);
}

/**
 * BLOCO INICIAL do serviço (primeira dobra), na ordem declarada e sem limite:
 * é a estrutura única e compartilhada por todos os sites white label.
 */
export function initialBlockFields(service: RequestService): RequestField[] {
  const explicit = service.fields.filter((f) => f.origin === "quick" && f.type !== "textarea");
  if (explicit.length) return explicit;
  const usable = service.fields.filter((f) => f.type !== "textarea" && f.type !== "checkbox");
  const required = usable.filter((f) => f.required);
  const optional = usable.filter((f) => !f.required);
  return [...required, ...optional].slice(0, 4);
}

/**
 * O período do serviço é um intervalo (ida e volta / check-in e check-out) ou
 * uma data simples? `null` quando o serviço não trabalha com período único.
 */
export function periodMode(service: RequestService, values: ServiceValues): "range" | "single" | null {
  if (!service.period) return null;
  const range = service.period.rangeWhen ? service.period.rangeWhen(values) : true;
  return range ? "range" : "single";
}

/** Nomes de campo cobertos pelo campo único de período. */
export function periodFieldNames(service: RequestService): string[] {
  return service.period ? [service.period.start, service.period.end] : [];
}

/** O valor informado para o campo é utilizável? */
export function fieldHasValue(field: RequestField, values: ServiceValues): boolean {
  const raw = values[field.name];
  if (field.type === "checkbox") return raw === true;
  const value = typeof raw === "string" ? raw.trim() : raw ? String(raw) : "";
  if (!value) return false;
  if (field.type === "number" && Number(value) <= 0) return false;
  return true;
}

/**
 * Campos renderizados no formulário FOCADO do modal.
 *
 * Para o serviço PRINCIPAL, esconde apenas os campos da cotação rápida que
 * chegaram REALMENTE preenchidos e válidos (eles aparecem no resumo editável).
 * Qualquer campo inicial ausente ou inválido — típico de um CTA externo que
 * abre a jornada sem passar pela primeira dobra — volta a ser editável aqui.
 * `standalone` sai quando o serviço entrou como complemento (herda do
 * contexto) e `context` nunca é digitado.
 */
/**
 * Campos que um serviço COMPLEMENTAR sempre herda do contexto da viagem
 * (destino e composição de passageiros) — não são pedidos outra vez.
 */
const COMPLEMENT_INHERITED = new Set(["destino", "origem", "adultos", "criancas", "idades_criancas"]);

export function formFields(
  service: RequestService,
  options: { isPrimary?: boolean; isComplement?: boolean; values?: ServiceValues } = {},
): RequestField[] {
  const values = options.values ?? {};
  const quickNames = new Set(initialBlockFields(service).map((f) => f.name));
  const quickErrors = options.isPrimary ? validateQuickStep(service, values) : {};

  return service.fields.filter((field) => {
    if (field.origin === "context") return false;
    if (field.origin === "standalone" && options.isComplement) return false;
    if (options.isComplement && COMPLEMENT_INHERITED.has(field.name)) return false;
    if (options.isPrimary && quickNames.has(field.name)) {
      const satisfied = fieldHasValue(field, values) && !quickErrors[field.name];
      return !satisfied;
    }
    if (field.origin === "quick" && options.isPrimary) return false;
    return true;
  });
}

/** O campo depende de um checkbox marcado? */
export function fieldIsVisible(field: RequestField, values: ServiceValues): boolean {
  if (!field.visibleWhen) return true;
  return values[field.visibleWhen] === true;
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
    // Horários foram removidos do formulário: a regra é só de datas.
    if (pick && drop && drop < pick) {
      errors.devolucao_data = "A devolução deve ser depois da retirada.";
    }
  }

  if (service.key === "seguro") {
    const start = asDate(values, "inicio");
    const end = asDate(values, "fim");
    if (start && end && end < start) {
      errors.fim = "O fim da viagem deve ser depois do início.";
    }
  }

  if (service.key === "transfer") {
    const out = asDate(values, "data");
    const back = asDate(values, "data_volta");
    if (values.sentido === "Ida e volta") {
      if (out && back && back < out) errors.data_volta = "A volta não pode ser antes da ida.";
      if (out && !back) errors.data_volta = "Informe a data da volta.";
    }
  }

  if (service.key === "aereo") {
    const out = asDate(values, "data_ida");
    const back = asDate(values, "data_volta");
    if (out && back && back < out) {
      errors.data_volta = "A volta não pode ser antes da ida.";
    }
    const tipo = typeof values.tipo_viagem === "string" ? values.tipo_viagem : "";
    if (tipo === "Ida e volta" && out && !back) {
      errors.data_volta = "Informe a data de volta.";
    }
    if (tipo === "Multidestinos") {
      const rota = typeof values.rota_multidestinos === "string" ? values.rota_multidestinos.trim() : "";
      if (!rota) errors.rota_multidestinos = "Informe os destinos da viagem.";
    }
  }

  return errors;
}

/** Campos ignorados na validação porque vêm da rota estruturada do multidestinos. */
function skipForMultiRoute(name: string): boolean {
  return name === "destino" || name === "data_ida" || name === "data_volta";
}

export function isMultiRoute(service: RequestService, values: ServiceValues): boolean {
  return service.key === "aereo" && values.tipo_viagem === "Multidestinos";
}

/** Step 1 validation: required fields of the selected service. */
export function validateServiceStep(service: RequestService, values: ServiceValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const multi = isMultiRoute(service, values);
  for (const field of service.fields) {
    if (!field.required) continue;
    if (!fieldIsVisible(field, values)) continue;
    if (multi && skipForMultiRoute(field.name)) continue;
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

/**
 * Validação da COTAÇÃO RÁPIDA (primeira dobra): só os campos daquela área.
 * Para aéreo, respeita o tipo da viagem — "Somente ida" não exige volta e
 * "Multidestinos" exige a rota em vez de destino/datas simples.
 */
export function validateQuickStep(service: RequestService, values: ServiceValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const multi = isMultiRoute(service, values);

  for (const field of initialBlockFields(service)) {
    if (!field.required) continue;
    if (multi && skipForMultiRoute(field.name)) continue;
    const raw = values[field.name];
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (!value) errors[field.name] = "Campo obrigatório.";
  }

  const dateErrors = validateServiceDates(service, values);
  for (const [name, message] of Object.entries(dateErrors)) {
    if (multi && (skipForMultiRoute(name) || name === "rota_multidestinos")) continue;
    errors[name] = message;
  }
  return errors;
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
    const message =
      "Informe um WhatsApp ou e-mail para que a agência possa entrar em contato com você.";
    errors.lead_phone = message;
    errors.lead_email = message;
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
