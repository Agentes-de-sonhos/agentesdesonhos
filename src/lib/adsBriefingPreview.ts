/**
 * Prévia técnica da fixture ADS "ads-email-test-v1" (agência FICTÍCIA).
 * Conteúdo 100% local: nenhum tenant, conta ou cadastro real é consultado.
 * Servida apenas no host técnico id-preview (e localhost de desenvolvimento).
 */
import type { AgencySiteProfile } from "@/lib/agencySiteProfile";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import logoAsset from "@/assets/ads-preview/ads-email-test-v1-logo.png.asset.json";
import mundoEmCoresLogo from "@/assets/ads-preview/mundo-em-cores-briefing-14-logo.png.asset.json";

export const ADS_PREVIEW_JOB_ID = "ads-email-test-v1";
export const ADS_PREVIEW_PATH = `/ads-briefing-preview/${ADS_PREVIEW_JOB_ID}`;
/** Host sintético: nunca corresponde a um domínio ou tenant real. */
export const ADS_PREVIEW_HOST = "ads-email-test-v1.demo.local";

export function isTechnicalPreviewHost(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return true;
  return h.startsWith("id-preview--") && h.endsWith(".lovable.app");
}

export const ADS_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad50",
  agency_slug: "",
  public_slug: null,
  hostname: ADS_PREVIEW_HOST,
  is_primary: true,
  agency_name: "Agência Teste ADS",
  owner_name: "Responsável de Teste",
  logo_url: logoAsset.url,
  cover_image_url: null,
  primary_color: "#165C70",
  secondary_color: "#E4B965",
  secondary_auto: false,
  tertiary_color: null,
  tertiary_auto: true,
  on_secondary_color: null,
  // Sem telefone: nenhum link de WhatsApp do número fictício é gerado.
  phone: null,
  city: "São Paulo",
  state: "SP",
  bio: null,
  cnpj: null,
  whatsapp_group_url: null,
};

export const ADS_PREVIEW_PROFILE: AgencySiteProfile = {
  key: "adsEmailTestV1",
  sections: {
    dmc: { enabled: false },
    testimonials: { enabled: false },
    team: { enabled: false },
    credentials: { enabled: false },
    modules: { enabled: false },
    highlights: { enabled: false },
    newsletter: { enabled: false },
    offers: { enabled: false },
    signature: { enabled: true, order: 1 },
    destinations: { order: 2 },
    differentials: { order: 3 },
    about: { order: 4 },
    concierge: { order: 5 },
    faq: { order: 6 },
  },
  heroImage: "praia",
  hero: [
    {
      title: "Viagens personalizadas para a sua família",
      subtitle: "Planejamento cuidadoso em cada etapa, com atendimento online antes e durante a viagem.",
      order: 1,
      enabled: true,
    },
    {
      title: "Praias e férias em família pelo Brasil",
      subtitle: "Roteiros pelo Brasil pensados para famílias, planejados com cuidado.",
      order: 2,
      enabled: true,
    },
  ],
  signature: {
    kicker: "AGÊNCIA TESTE ADS",
    title: "Planejamento cuidadoso em cada etapa",
    text: "Viagens personalizadas para famílias, com foco no Brasil: praias e férias em família.",
  },
  destinations: [
    { key: "praias-brasil", image: "litoral", label: "Brasil", title: "Praias no Brasil", text: "Férias de praia pelo Brasil, planejadas para a família.", service: "pacotes", enabled: true, order: 1 },
    { key: "ferias-familia", image: "brasil", label: "Família", title: "Férias em família", text: "Viagens pensadas para quem viaja com a família.", service: "pacotes", enabled: true, order: 2 },
  ],
  differentials: [
    { title: "Atendimento próximo", text: "Atendimento online e próximo, do planejamento à viagem.", icon: "consultivo" },
    { title: "Antes e durante a viagem", text: "Acompanhamento no planejamento e durante a viagem, com contato pelo WhatsApp em caso de imprevisto.", icon: "acompanhamento" },
  ],
  about: {
    kicker: "SOBRE",
    title: "Agência Teste ADS",
    text: "Agência fictícia para validar a automação. Viagens personalizadas para famílias, com foco no Brasil e atendimento online.",
    badge: { value: "Desde 2020" },
    media: "hidden",
    showLocation: true,
    ownerName: "Responsável de Teste",
  },
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa online para entender a viagem da família.",
    "Planejamento cuidadoso de cada etapa.",
    "Acompanhamento antes da viagem.",
    "Suporte durante a viagem pelo WhatsApp.",
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "O atendimento é online, com planejamento cuidadoso antes e durante a viagem." },
    { q: "E se acontecer um imprevisto durante a viagem?", a: "O contato é feito pelo WhatsApp." },
  ],
  copy: {
    destinations: { title: "Destinos e prioridades", subtitle: "Brasil: praias e férias em família." },
    differentials: { title: "Diferenciais", subtitle: "Atendimento próximo em cada etapa." },
    concierge: { kicker: "FORMA DE ATENDIMENTO", title: "Atendimento online, antes e durante a viagem", subtitle: "Planejamento cuidadoso em cada etapa." },
    faq: { title: "Dúvidas frequentes" },
  },
  seo: { title: "Prévia de teste — Agência Teste ADS", description: "Prévia técnica de agência fictícia." },
};

export const MUNDO_EM_CORES_PREVIEW_JOB_ID = "briefing-14-v1";
export const MUNDO_EM_CORES_PREVIEW_PATH = `/ads-briefing-preview/${MUNDO_EM_CORES_PREVIEW_JOB_ID}`;
/** Host sintético local da configuração editorial; não representa o domínio informado. */
export const MUNDO_EM_CORES_PREVIEW_HOST = "briefing-14-v1.preview.local";

export const MUNDO_EM_CORES_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-000000000014",
  agency_slug: "",
  public_slug: null,
  hostname: MUNDO_EM_CORES_PREVIEW_HOST,
  is_primary: false,
  agency_name: "O Mundo em Cores - Studio de Viagens",
  owner_name: "Vanessa Figueiredo",
  logo_url: mundoEmCoresLogo.url,
  cover_image_url: null,
  primary_color: "#245C81",
  secondary_color: "#338FB8",
  secondary_auto: false,
  tertiary_color: null,
  tertiary_auto: true,
  on_secondary_color: null,
  phone: "(11) 99995-4734",
  city: "São Paulo",
  state: "SP",
  bio: null,
  cnpj: null,
  whatsapp_group_url: null,
};

export const MUNDO_EM_CORES_PREVIEW_PROFILE: AgencySiteProfile = {
  key: "mundoEmCoresBriefing14",
  compactSectionSpacing: true,
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#campanhas" },
    { label: "Sobre", to: "/#sobre" },
    { label: "Atendimento", to: "/#atendimento" },
  ],
  sections: {
    dmc: { enabled: false },
    offers: { enabled: false },
    credentials: { enabled: false },
    team: { enabled: false },
    testimonials: { enabled: false },
    avaliacoes: { enabled: false },
    newsletter: { enabled: false },
    authority: { enabled: false },
    highlights: { enabled: false },
    signature: { enabled: true, order: 1 },
    destinations: { enabled: true, order: 2 },
    modules: { enabled: true, order: 3 },
    about: { enabled: true, order: 4 },
    differentials: { enabled: true, order: 5 },
    concierge: { enabled: true, order: 6 },
    faq: { enabled: true, order: 7 },
  },
  heroImage: "europa",
  heroPresentation: { kicker: "VIAGENS PERSONALIZADAS · SÃO PAULO", overlay: "strongLeft" },
  hero: [
    {
      title: "O mundo ganha novas cores quando a viagem tem a sua medida",
      subtitle: "Curadoria de roteiros, hotéis e serviços para viajar com conforto, segurança e tranquilidade.",
      image: "heroVarenna",
      focalPoint: "varenna",
      order: 1,
      enabled: true,
    },
    {
      title: "Memórias em família, do planejamento ao retorno",
      subtitle: "Orlando, parques e experiências para diferentes gerações, com cada etapa organizada com cuidado.",
      image: "orlandoMagicKingdom",
      order: 2,
      enabled: true,
    },
    {
      title: "Cruzeiros e grandes destinos com curadoria especializada",
      subtitle: "Mediterrâneo, Caribe, Europa, Estados Unidos e Canadá em roteiros pensados para o seu perfil.",
      image: "heroSantoriniShip",
      focalPoint: "santoriniShip",
      order: 3,
      enabled: true,
    },
  ],
  signature: {
    kicker: "O MUNDO EM CORES",
    title: "Planejamento completo para viajar com tranquilidade.",
    text: "Sonhos ganham forma em roteiros personalizados, com escolhas cuidadosas e suporte antes, durante e depois da viagem.",
  },
  destinations: [
    { key: "europa", image: "europaCastelo", label: "Europa", title: "Europa", text: "Cidades, paisagens e experiências combinadas em um roteiro com ritmo e personalidade.", service: "pacotes", enabled: true, order: 1 },
    { key: "orlando", image: "orlandoMagicKingdom", label: "Famílias", title: "Orlando e parques", text: "Parques, hospedagem, ingressos e deslocamentos organizados para aproveitar cada dia.", service: "ingressos", enabled: true, order: 2 },
    { key: "cruzeiros", image: "cruzeiro", label: "Mar e descobertas", title: "Cruzeiros", text: "Navios, cabines e itinerários pelo Mediterrâneo e Caribe escolhidos com orientação.", service: "cruzeiros", enabled: true, order: 3 },
    { key: "xcaret", image: "caribeMexico", label: "México", title: "Xcaret", text: "Natureza, cultura e parques em uma experiência planejada para casais, famílias e amigos.", service: "ingressos", enabled: true, order: 4 },
    { key: "eua-canada", image: "grupos", label: "América do Norte", title: "Estados Unidos e Canadá", text: "Roteiros urbanos, natureza e viagens acompanhadas com logística bem estruturada.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "personalizadas", title: "Viagens personalizadas", text: "Roteiros, hotéis e serviços selecionados a partir do perfil de quem viaja.", service: "pacotes", image: "heroAirportTraveler", enabled: true, order: 1 },
    { key: "familias", title: "Famílias e várias gerações", text: "Conforto e experiências pensadas para diferentes idades viajarem bem juntas.", service: "pacotes", image: "parques", enabled: true, order: 2 },
    { key: "grupos", title: "Grupos acompanhados", text: "Planejamento cuidadoso para grupos de amigos e saídas acompanhadas.", service: "pacotes", image: "grupos", enabled: true, order: 3 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Vanessa Figueiredo: experiência para transformar planos em boas memórias.",
    text: "Sócia-proprietária e consultora de viagens, Vanessa reúne 30 anos de experiência no turismo, com atuação anterior em outras agências e criação de experiências personalizadas desde 2012. À frente do atendimento, ela combina conhecimento de destinos, escuta atenta e antecipação de riscos para planejar cada viagem com segurança.",
    badge: { value: "Desde 2017", label: "O Mundo em Cores - Studio de Viagens" },
    facts: ["30 anos de experiência no turismo", "Experiências personalizadas desde 2012"],
    media: "hidden",
    showLocation: true,
    ownerName: "Vanessa Figueiredo",
  },
  differentials: [
    { title: "Curadoria completa", text: "Roteiros, hotéis e serviços escolhidos de acordo com o perfil e o momento de cada viagem.", icon: "consultivo" },
    { title: "Atendimento responsável", text: "A consultora que entende o projeto acompanha as escolhas e orienta cada etapa.", icon: "conferido" },
    { title: "Antecipação de riscos", text: "Detalhes e pontos de atenção são avaliados antes da viagem para decisões mais seguras.", icon: "fornecedores" },
    { title: "Suporte em toda a jornada", text: "Acompanhamento antes, durante e depois, com orientação quando surgem imprevistos.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Uma conversa para entender quem viaja, preferências, ritmo e prioridades.",
    "Curadoria de destinos, roteiros, hotéis e serviços adequados ao perfil.",
    "Apresentação clara das opções e ajustes antes das reservas.",
    "Acompanhamento antes, durante e depois da viagem.",
  ],
  faq: [
    { q: "Como funciona o planejamento da viagem?", a: "O atendimento começa com uma conversa sobre o perfil dos viajantes e o que desejam viver. A partir daí, são selecionados roteiros, hotéis e serviços e as opções são apresentadas para revisão." },
    { q: "Quais viagens são especialidades da agência?", a: "Viagens personalizadas, cruzeiros, viagens em família com parques e grupos acompanhados, com destaque para Europa, Orlando, Mediterrâneo, Caribe e Xcaret." },
    { q: "A agência atende famílias de várias gerações?", a: "Sim. O planejamento considera as necessidades de crianças, adultos e pessoas mais velhas para equilibrar ritmo, conforto e experiências." },
    { q: "Há suporte durante a viagem?", a: "Sim. O acompanhamento acontece antes, durante e depois da viagem, com orientação da consultora responsável quando necessário." },
  ],
  copy: {
    destinations: { title: "Destinos que inspiram novas histórias", subtitle: "Prioridades escolhidas para casais, famílias de várias gerações e grupos de amigos." },
    modules: { title: "Cada viagem começa por quem vai vivê-la", subtitle: "Especialidades com planejamento personalizado e cuidado em cada escolha." },
    differentials: { title: "Cuidado que acompanha cada etapa", subtitle: "Conhecimento, antecipação e suporte para viajar com mais tranquilidade." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa ao retorno", subtitle: "Um processo próximo e profissional, conduzido pela consultora responsável." },
    faq: { title: "Dúvidas frequentes" },
  },
  footer: {
    description: "Viagens personalizadas, cruzeiros e experiências em família com planejamento completo e atendimento próximo.\nVinculação de domínio pendente.",
    whatsapp: "(11) 99995-4734",
    phone: "(11) 99995-4734",
    email: "contato@omundoemcores.com.br",
    instagram: "https://www.instagram.com/omundoemcoresviagens",
    instagramLabel: "@omundoemcoresviagens",
    showLocation: true,
  },
  seo: {
    title: "Prévia para revisão — O Mundo em Cores - Studio de Viagens",
    description: "Prévia técnica revisável do site O Mundo em Cores - Studio de Viagens.",
  },
};

export interface AdsBriefingPreviewFixture {
  jobId: string;
  info: AgencyDomainInfo;
  profile: AgencySiteProfile;
  notice: string;
  documentTitle: string;
  realAgency: boolean;
}

const ADS_PREVIEW_FIXTURES: Record<string, AdsBriefingPreviewFixture> = {
  [ADS_PREVIEW_JOB_ID]: {
    jobId: ADS_PREVIEW_JOB_ID,
    info: ADS_PREVIEW_INFO,
    profile: ADS_PREVIEW_PROFILE,
    notice: "Prévia de teste — agência fictícia · ações desativadas",
    documentTitle: "Prévia de teste — agência fictícia",
    realAgency: false,
  },
  [MUNDO_EM_CORES_PREVIEW_JOB_ID]: {
    jobId: MUNDO_EM_CORES_PREVIEW_JOB_ID,
    info: MUNDO_EM_CORES_PREVIEW_INFO,
    profile: MUNDO_EM_CORES_PREVIEW_PROFILE,
    notice: "Prévia para revisão — sem publicação · ações desativadas",
    documentTitle: "Prévia para revisão — O Mundo em Cores",
    realAgency: true,
  },
};

export function resolveAdsPreviewFixture(jobId?: string): AdsBriefingPreviewFixture | null {
  return jobId ? ADS_PREVIEW_FIXTURES[jobId] ?? null : null;
}
