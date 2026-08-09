/**
 * Central configuration of the white-label agency home.
 *
 * Everything the agency will be able to enable/hide/reorder in the future lives
 * here (single source of truth), so no section is hardcoded across components.
 * Copy is institutional and never invents agency data (CNPJ, address, prices,
 * testimonials, team names): those only render when the profile provides them.
 */

export type AgencySectionKey =
  | "highlights"
  | "dmc"
  | "destinations"
  | "modules"
  | "offers"
  | "about"
  | "differentials"
  | "concierge"
  | "team"
  | "testimonials"
  | "faq"
  | "newsletter";

export interface AgencySectionConfig {
  key: AgencySectionKey;
  label: string;
  enabled: boolean;
  order: number;
}

/** MVP defaults — optional sections (team, testimonials) stay off until real data exists. */
export const DEFAULT_SECTIONS: AgencySectionConfig[] = [
  // Faixa editorial B2B (DMC): exclusiva/configurável por agência — desativada por padrão.
  { key: "dmc", label: "Seção B2B / DMC", enabled: false, order: 0 },
  { key: "offers", label: "Ofertas em destaque", enabled: true, order: 1 },
  { key: "destinations", label: "Descoberta de destinos", enabled: true, order: 2 },
  { key: "highlights", label: "Destaques", enabled: true, order: 3 },
  { key: "modules", label: "Módulos temáticos", enabled: true, order: 4 },
  { key: "about", label: "Apresentação da agência", enabled: true, order: 5 },
  { key: "differentials", label: "Diferenciais", enabled: true, order: 6 },
  { key: "concierge", label: "Atendimento concierge", enabled: true, order: 7 },
  { key: "team", label: "Equipe e consultores", enabled: false, order: 8 },
  { key: "testimonials", label: "Depoimentos", enabled: false, order: 9 },
  { key: "faq", label: "Perguntas frequentes", enabled: true, order: 10 },
  { key: "newsletter", label: "Newsletter", enabled: true, order: 11 },
];

export function resolveSections(
  overrides?: Partial<Record<AgencySectionKey, boolean>>,
): AgencySectionConfig[] {
  return DEFAULT_SECTIONS.map((section) => ({
    ...section,
    enabled: overrides?.[section.key] ?? section.enabled,
  }))
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);
}

export interface AgencyModule {
  key: string;
  title: string;
  text: string;
  /** Pre-selected service tab of the Central de Solicitações. */
  service: string;
  enabled: boolean;
  order: number;
}

/** Thematic/campaign modules — ready to be enabled, hidden and reordered per agency. */
export const DEFAULT_MODULES: AgencyModule[] = [
  { key: "resorts", title: "Resorts e all inclusive", text: "Estadias com tudo incluído, ideais para descansar sem se preocupar com nada.", service: "hospedagem", enabled: true, order: 1 },
  { key: "cruzeiros", title: "Cruzeiros", text: "Itinerários pelo Caribe, Mediterrâneo, Europa e costa brasileira.", service: "cruzeiros", enabled: true, order: 2 },
  { key: "circuitos", title: "Circuitos e multidestinos", text: "Vários destinos em uma só viagem, com logística resolvida.", service: "pacotes", enabled: true, order: 3 },
  { key: "orlando", title: "Orlando", text: "Parques, ingressos, hotéis e transfers organizados dia a dia.", service: "ingressos", enabled: true, order: 4 },
  { key: "parques", title: "Parques e ingressos", text: "Atrações, shows e experiências com datas e horários conferidos.", service: "ingressos", enabled: true, order: 5 },
  { key: "lua-de-mel", title: "Lua de mel", text: "Roteiros românticos com mimos e detalhes combinados antecipadamente.", service: "pacotes", enabled: true, order: 6 },
  { key: "familia", title: "Viagens em família", text: "Hospedagens e roteiros pensados para crianças e diferentes idades.", service: "pacotes", enabled: true, order: 7 },
  { key: "disney-universal", title: "Disney e Universal", text: "Planejamento completo de parques, filas, refeições e deslocamentos.", service: "ingressos", enabled: true, order: 8 },
  { key: "comandatuba", title: "Comandatuba", text: "Experiência all inclusive no litoral da Bahia, com apoio na programação.", service: "hospedagem", enabled: true, order: 9 },
];

export function resolveModules(overrides?: Partial<Record<string, boolean>>): AgencyModule[] {
  return DEFAULT_MODULES.map((m) => ({ ...m, enabled: overrides?.[m.key] ?? m.enabled }))
    .filter((m) => m.enabled)
    .sort((a, b) => a.order - b.order);
}

export interface AgencyHighlight {
  title: string;
  text: string;
  service: string;
  cta: string;
}

/* ------------------------------- HERO / BANNERS ------------------------------ */

export interface AgencyHeroSlide {
  title: string;
  /** `{agency}` is replaced by the agency display name. */
  subtitle: string;
  order: number;
  enabled: boolean;
}

/** Hard limits of the hero carousel: 1 to 5 banners per agency. */
export const HERO_MIN_SLIDES = 1;
export const HERO_MAX_SLIDES = 5;

/**
 * Default banners of the white-label hero. Kept here (single source of truth) so
 * the home component has no hardcoded copy.
 *
 * KNOWN LIMITATION (MVP): there is no admin panel yet to persist per-agency
 * banners; `resolveHeroSlides` already accepts overrides, so a future settings
 * table/panel only needs to feed them in.
 */
export const DEFAULT_HERO_SLIDES: AgencyHeroSlide[] = [
  {
    title: "Sua próxima viagem começa com quem entende de viagem",
    subtitle: "Planejamento completo, atendimento humano e acompanhamento em cada etapa com a {agency}.",
    order: 1,
    enabled: true,
  },
  {
    title: "Roteiros sob medida, do primeiro voo ao último passeio",
    subtitle: "Aéreo, hospedagem, transfers, ingressos e seguro organizados em um só lugar.",
    order: 2,
    enabled: true,
  },
  {
    title: "Solicite seu atendimento personalizado",
    subtitle: "Conte o que você imagina e receba uma proposta clara, com valores e condições.",
    order: 3,
    enabled: true,
  },
];

export interface ResolvedHeroSlide {
  title: string;
  subtitle: string;
  image?: string | null;
}

/**
 * Resolves the hero slides for one agency: applies optional overrides, keeps the
 * 1–5 range and interpolates the agency name. `coverImageUrl` is the real agency
 * cover when the profile has one (never an invented asset).
 */
export function resolveHeroSlides(
  agencyName: string,
  coverImageUrl?: string | null,
  overrides?: AgencyHeroSlide[],
  fallbackImage?: string | null,
): ResolvedHeroSlide[] {
  const source = (overrides?.length ? overrides : DEFAULT_HERO_SLIDES)
    .filter((s) => s.enabled && s.title.trim())
    .sort((a, b) => a.order - b.order)
    .slice(0, HERO_MAX_SLIDES);

  const list = source.length ? source : DEFAULT_HERO_SLIDES.slice(0, HERO_MIN_SLIDES);

  return list.map((s) => ({
    title: s.title.replace(/\{agency\}/g, agencyName),
    subtitle: s.subtitle.replace(/\{agency\}/g, agencyName),
    image: coverImageUrl ?? fallbackImage ?? null,
  }));
}

export const DEFAULT_HIGHLIGHTS: AgencyHighlight[] = [
  { title: "Roteiro sob medida", text: "Você conta a ideia da viagem e recebe uma proposta desenhada para o seu perfil.", service: "pacotes", cta: "Solicitar roteiro" },
  { title: "Aéreo com estratégia", text: "Comparação de rotas, datas e tarifas para encontrar a melhor combinação.", service: "aereo", cta: "Cotar passagens" },
  { title: "Viagem protegida", text: "Seguro adequado ao destino e à duração, explicado antes de contratar.", service: "seguro", cta: "Cotar seguro" },
];

export const DEFAULT_DIFFERENTIALS = [
  { title: "Atendimento consultivo", text: "Cada proposta nasce do seu perfil, do seu momento e do seu orçamento." },
  { title: "Reservas conferidas", text: "Documentos, prazos e coberturas revisados antes de qualquer confirmação." },
  { title: "Acompanhamento na viagem", text: "Suporte no período da viagem, com todos os dados sempre à mão." },
  { title: "Fornecedores selecionados", text: "Operadoras e serviços escolhidos com critério, não por catálogo." },
];

/* --------------------------- DESTINOS / INSPIRAÇÕES -------------------------- */

export interface AgencyDestination {
  key: string;
  /** Image slot resolved by the presentation layer (no asset imports here). */
  image: "litoral" | "resort" | "cruzeiro" | "europa" | "parques";
  title: string;
  label: string;
  text: string;
  service: string;
  enabled: boolean;
  order: number;
}

/**
 * Editorial inspiration cards (NEVER prices or commercial promises). Used for the
 * discovery section and as an elegant fallback while the agency has no published
 * showcase offers.
 */
export const DEFAULT_DESTINATIONS: AgencyDestination[] = [
  { key: "litoral", image: "litoral", label: "Praias", title: "Litoral brasileiro", text: "Do Nordeste ao Sul, com hospedagens escolhidas a dedo.", service: "pacotes", enabled: true, order: 1 },
  { key: "resorts", image: "resort", label: "All inclusive", title: "Resorts e all inclusive", text: "Descanso com tudo incluído e programação para todas as idades.", service: "hospedagem", enabled: true, order: 2 },
  { key: "cruzeiros", image: "cruzeiro", label: "Cruzeiros", title: "Cruzeiros marítimos", text: "Itinerários, cabines e categorias explicados com clareza.", service: "cruzeiros", enabled: true, order: 3 },
  { key: "europa", image: "europa", label: "Multidestinos", title: "Europa e circuitos", text: "Vários destinos em uma viagem, com logística resolvida.", service: "pacotes", enabled: true, order: 4 },
  { key: "parques", image: "parques", label: "Família", title: "Parques e atrações", text: "Ingressos, filas e deslocamentos organizados dia a dia.", service: "ingressos", enabled: true, order: 5 },
];

export function resolveDestinations(
  overrides?: Partial<Record<string, boolean>>,
): AgencyDestination[] {
  return DEFAULT_DESTINATIONS.map((d) => ({ ...d, enabled: overrides?.[d.key] ?? d.enabled }))
    .filter((d) => d.enabled)
    .sort((a, b) => a.order - b.order);
}

export const DEFAULT_FAQ = [
  {
    q: "Solicitar um orçamento tem algum custo?",
    a: "Não. A solicitação é gratuita e sem compromisso: você conta o que imagina e recebe uma proposta personalizada para avaliar.",
  },
  {
    q: "Em quanto tempo recebo a resposta?",
    a: "O retorno acontece dentro do horário de atendimento, pelo canal que você escolher no formulário. Pedidos mais complexos podem levar um pouco mais para serem montados com calma.",
  },
  {
    q: "Posso pedir mais de um serviço?",
    a: "Sim. Você pode enviar solicitações diferentes (aéreo, hospedagem, transfer, seguro, entre outros) ou pedir um pacote completo em uma única solicitação.",
  },
  {
    q: "Como acompanho a minha viagem depois de fechar?",
    a: "Tudo fica reunido na Área do Cliente: orçamento, roteiro, carteira de viagem com vouchers e faturas, sempre pelos links enviados pelo seu consultor.",
  },
  {
    q: "Meus dados estão protegidos?",
    a: "Sim. Os dados informados são usados apenas para o atendimento da sua solicitação, conforme a Política de Privacidade.",
  },
];
