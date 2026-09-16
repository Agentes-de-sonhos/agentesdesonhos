/**
 * Etapa 2 — conteúdo do cenário demonstrativo ponta a ponta (Casa Nova Tur).
 *
 * Módulo PURO (sem Deno, sem rede) para ser testado diretamente:
 * define viajantes, os oito serviços aprovados, o roteiro de 8 dias e as regras
 * de pagamento parcial. Todos os dados são obviamente fictícios.
 */

export const TRIP_TITLE = "Orlando — Disney e Universal";
export const TRIP_DESTINATION = "Orlando, EUA";
export const TRIP_TOTAL = 41800;
/** Entrada de 30% já recebida — pagamento parcial, sem cobrança real. */
export const TRIP_PAID = 12540;
export const TRIP_ADULTS = 2;
export const TRIP_CHILDREN = 0;
/** 8 dias / 7 noites. */
export const TRIP_NIGHTS = 7;
export const TRIP_DAYS = TRIP_NIGHTS + 1;

/** Deslocamento em dias a partir de hoje para o início da viagem. */
export const TRIP_START_OFFSET = 140;

export type ServiceKind =
  | "aereo"
  | "hotel"
  | "transfer"
  | "locacao"
  | "ingresso"
  | "seguro";

export type ScenarioService = {
  /** Chave natural estável: garante idempotência sem duplicar serviços. */
  key: string;
  kind: ServiceKind;
  name: string;
  supplier: string;
  amount: number;
  /** Dias após o início da viagem (0 = primeiro dia). */
  dayFrom: number;
  dayTo: number;
  details: Record<string, unknown>;
};

/** Os oito serviços aprovados do cenário. A soma é exatamente TRIP_TOTAL. */
export const SCENARIO_SERVICES: ScenarioService[] = [
  {
    key: "aereo-gru-mco",
    kind: "aereo",
    name: "Aéreo GRU ⇄ MCO — 2 adultos",
    supplier: "Consolidadora Demo Viagens",
    amount: 9800,
    dayFrom: 0,
    dayTo: 7,
    details: {
      companhia: "LATAM (demonstração)",
      classe: "Econômica",
      bagagem: "1 mala de 23kg por passageiro",
      ida: "GRU 22:10 → MCO 06:35 (+1)",
      volta: "MCO 21:40 → GRU 09:15 (+1)",
      localizador: "DEMO-AER-001",
    },
  },
  {
    key: "hotel-orlando",
    kind: "hotel",
    name: "Hotel Demo Lake Resort — 7 noites",
    supplier: "Operadora Demo Receptivo",
    amount: 12400,
    dayFrom: 0,
    dayTo: 7,
    details: {
      categoria: "4 estrelas",
      quarto: "Standard King com vista para o lago",
      regime: "Café da manhã incluído",
      noites: TRIP_NIGHTS,
      localizador: "DEMO-HTL-114",
    },
  },
  {
    key: "transfer-in",
    kind: "transfer",
    name: "Traslado de chegada — aeroporto ⇄ hotel",
    supplier: "Operadora Demo Receptivo",
    amount: 480,
    dayFrom: 0,
    dayTo: 0,
    details: { tipo: "Privativo", veiculo: "Van executiva", localizador: "DEMO-TRF-IN" },
  },
  {
    key: "transfer-out",
    kind: "transfer",
    name: "Traslado de saída — hotel ⇄ aeroporto",
    supplier: "Operadora Demo Receptivo",
    amount: 480,
    dayFrom: 7,
    dayTo: 7,
    details: { tipo: "Privativo", veiculo: "Van executiva", localizador: "DEMO-TRF-OUT" },
  },
  {
    key: "locacao-parcial",
    kind: "locacao",
    name: "Locação de carro — 3 dias (uso parcial)",
    supplier: "Locadora Demo Rent",
    amount: 1640,
    dayFrom: 4,
    dayTo: 6,
    details: {
      categoria: "SUV compacto",
      retirada: "Balcão do hotel",
      protecao: "Cobertura básica incluída",
      observacao: "Locação parcial: apenas os dias livres do roteiro.",
      localizador: "DEMO-CAR-77",
    },
  },
  {
    key: "ingresso-disney",
    kind: "ingresso",
    name: "Disney — 4 dias Park Hopper",
    supplier: "Operadora Demo Tickets",
    amount: 9600,
    dayFrom: 1,
    dayTo: 4,
    details: { dias: 4, parques: "Magic Kingdom, Epcot, Hollywood Studios, Animal Kingdom" },
  },
  {
    key: "ingresso-universal",
    kind: "ingresso",
    name: "Universal Orlando — 2 dias / 2 parques",
    supplier: "Operadora Demo Tickets",
    amount: 6200,
    dayFrom: 5,
    dayTo: 6,
    details: { dias: 2, parques: "Universal Studios, Islands of Adventure" },
  },
  {
    key: "seguro-viagem",
    kind: "seguro",
    name: "Seguro viagem internacional — 2 adultos",
    supplier: "Seguradora Demo Assist",
    amount: 1200,
    dayFrom: 0,
    dayTo: 7,
    details: {
      cobertura_medica: "USD 100.000",
      bagagem: "USD 1.200",
      apolice: "DEMO-SEG-2026",
    },
  },
];

/** Soma dos serviços — usada para validar a consistência do cenário. */
export function servicesTotal(services: ScenarioService[] = SCENARIO_SERVICES): number {
  return services.reduce((sum, s) => sum + s.amount, 0);
}

/** Converte o tipo de serviço para os valores aceitos em sale_products. */
export function saleProductType(kind: ServiceKind): string {
  return kind === "ingresso" ? "atracao" : kind;
}

/**
 * Converte o tipo de serviço para os valores aceitos pela Carteira Digital
 * (`trip_services.service_type`), que usa a taxonomia em inglês da vitrine
 * pública. Sem essa conversão a carteira pública quebra ao montar as cores.
 */
export function walletServiceType(kind: ServiceKind): string {
  const map: Record<string, string> = {
    aereo: "flight",
    hotel: "hotel",
    transfer: "transfer",
    locacao: "car_rental",
    ingresso: "attraction",
    seguro: "insurance",
    cruzeiro: "cruise",
    trem: "train",
  };
  return map[kind] ?? "other";
}

export type ScenarioTraveler = {
  key: string;
  nome_completo: string;
  is_responsavel: boolean;
  data_nascimento: string;
  cpf: string;
  passaporte: string;
  validade_passaporte: string;
  nacionalidade: string;
  observacoes: string;
};

/**
 * Documentos propositalmente fictícios (sequências óbvias, prefixo DEMO), para
 * que nenhum dado possa ser confundido com documento real.
 */
export const SCENARIO_TRAVELERS: ScenarioTraveler[] = [
  {
    key: "ana-martins",
    nome_completo: "Ana Martins",
    is_responsavel: true,
    data_nascimento: "1986-04-12",
    cpf: "000.000.000-00",
    passaporte: "DEMO000001",
    validade_passaporte: "2032-08-30",
    nacionalidade: "Brasileira",
    observacoes:
      "Dados de demonstração. Prefere assento no corredor e café da manhã cedo. Sem restrição alimentar.",
  },
  {
    key: "roberto-martins",
    nome_completo: "Roberto Martins",
    is_responsavel: false,
    data_nascimento: "1984-11-03",
    cpf: "111.111.111-11",
    passaporte: "DEMO000002",
    validade_passaporte: "2031-05-18",
    nacionalidade: "Brasileira",
    observacoes:
      "Dados de demonstração. Prefere assento na janela, intolerante a lactose e gosta de dias livres para caminhadas.",
  },
];

/** Perfil do cliente principal (Ana), amplamente preenchido. */
export const SCENARIO_CLIENT = {
  name: "Ana Martins",
  /** Nome usado nas primeiras versões do cenário — reaproveitado, nunca duplicado. */
  legacyNames: ["Ana e Roberto Martins"],
  email: "ana.martins@demo.casanovatur.com.br",
  phone: "(51) 90000-0001",
  city: "Novo Hamburgo",
  status: "cliente_ativo",
  birthday_day: 12,
  birthday_month: 4,
  birthday_year: 1986,
  travel_preferences:
    "Viagens em casal, hotéis 4 estrelas com café da manhã, voos noturnos na ida, roteiro com dias livres. Orçamento até R$ 45.000.",
  internal_notes:
    "Cliente de demonstração do ambiente de prévia. Acompanhante: Roberto Martins. Nenhum contato real.",
  notes: "Aniversário de 10 anos de casamento comemorado na viagem a Orlando.",
};

export type ScenarioDay = {
  day: number;
  title: string;
  activities: { period: "manha" | "tarde" | "noite"; title: string; description: string }[];
};

/** Roteiro de 8 dias coerente com os serviços (parques, dias livres, traslados). */
export const SCENARIO_ITINERARY: ScenarioDay[] = [
  {
    day: 1,
    title: "Chegada em Orlando",
    activities: [
      { period: "manha", title: "Desembarque em MCO", description: "Chegada e imigração." },
      { period: "tarde", title: "Traslado privativo ao hotel", description: "Check-in e descanso." },
      { period: "noite", title: "Jantar no entorno do hotel", description: "Noite tranquila." },
    ],
  },
  {
    day: 2,
    title: "Magic Kingdom",
    activities: [
      { period: "manha", title: "Abertura do parque", description: "Entrada com o Park Hopper." },
      { period: "tarde", title: "Atrações clássicas", description: "Fila virtual nas principais." },
      { period: "noite", title: "Show de fogos", description: "Encerramento no castelo." },
    ],
  },
  {
    day: 3,
    title: "Epcot",
    activities: [
      { period: "manha", title: "Pavilhões de inovação", description: "Área future world." },
      { period: "tarde", title: "Volta ao mundo gastronômica", description: "Pavilhões dos países." },
      { period: "noite", title: "Espetáculo no lago", description: "Show noturno." },
    ],
  },
  {
    day: 4,
    title: "Hollywood Studios",
    activities: [
      { period: "manha", title: "Área Star Wars", description: "Atrações imersivas." },
      { period: "tarde", title: "Toy Story Land", description: "Ritmo mais leve." },
      { period: "noite", title: "Retorno ao hotel", description: "Descanso." },
    ],
  },
  {
    day: 5,
    title: "Animal Kingdom e retirada do carro",
    activities: [
      { period: "manha", title: "Pandora e safári", description: "Último dia de Disney." },
      { period: "tarde", title: "Retirada do carro alugado", description: "Locação parcial, 3 dias." },
      { period: "noite", title: "Compras rápidas", description: "Outlet próximo." },
    ],
  },
  {
    day: 6,
    title: "Universal Studios",
    activities: [
      { period: "manha", title: "Universal Studios", description: "Entrada com ingresso 2 dias." },
      { period: "tarde", title: "Diagon Alley", description: "Área temática." },
      { period: "noite", title: "Jantar no CityWalk", description: "Área de restaurantes." },
    ],
  },
  {
    day: 7,
    title: "Islands of Adventure e dia livre",
    activities: [
      { period: "manha", title: "Islands of Adventure", description: "Segundo dia Universal." },
      { period: "tarde", title: "Tempo livre com o carro", description: "Passeio pela cidade." },
      { period: "noite", title: "Devolução do carro", description: "Entrega no hotel." },
    ],
  },
  {
    day: 8,
    title: "Retorno ao Brasil",
    activities: [
      { period: "manha", title: "Check-out", description: "Bagagens e últimas compras." },
      { period: "tarde", title: "Traslado ao aeroporto", description: "Transfer privativo de saída." },
      { period: "noite", title: "Voo MCO → GRU", description: "Voo noturno de retorno." },
    ],
  },
];

/**
 * Dados que a Área do Cliente pode exibir: documentos sensíveis (CPF e
 * passaporte) NUNCA são expostos em superfícies do cliente.
 */
export function publicSafeTraveler(t: ScenarioTraveler) {
  return {
    nome_completo: t.nome_completo,
    is_responsavel: t.is_responsavel,
    nacionalidade: t.nacionalidade,
  };
}

/** Situação financeira do cenário: parcial, coerente com o total. */
export function paymentSummary(total = TRIP_TOTAL, paid = TRIP_PAID) {
  const remaining = Math.max(total - paid, 0);
  const status = paid <= 0 ? "pendente" : paid >= total ? "pago" : "parcial";
  return { total, paid, remaining, status };
}

/** Data (YYYY-MM-DD) a partir de um deslocamento em dias sobre `from`. */
export function offsetDate(from: Date, days: number): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
