/**
 * Prévia técnica da fixture ADS "ads-email-test-v1" (agência FICTÍCIA).
 * Conteúdo 100% local: nenhum tenant, conta ou cadastro real é consultado.
 * Servida apenas no host técnico id-preview (e localhost de desenvolvimento).
 */
import type { AgencySiteProfile } from "@/lib/agencySiteProfile";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import logoAsset from "@/assets/ads-preview/ads-email-test-v1-logo.png.asset.json";
import mundoEmCoresLogo from "@/assets/ads-preview/mundo-em-cores-briefing-14-logo.png.asset.json";
import dricaViagensLogo from "@/assets/ads-preview/briefing-16-v1-logo.png.asset.json";
import viajarTirismoLogo from "@/assets/ads-preview/briefing-17-v1-logo.png.asset.json";

export const ADS_PREVIEW_JOB_ID = "ads-email-test-v1";
export const ADS_PREVIEW_PATH = `/ads-briefing-preview/${ADS_PREVIEW_JOB_ID}`;
/** Host sintético: nunca corresponde a um domínio ou tenant real. */
export const ADS_PREVIEW_HOST = "ads-email-test-v1.demo.local";

/**
 * Hosts técnicos da prévia: mesma verificação usada pelo restante do sistema
 * (agencyDomains.ts) — localhost e hosts técnicos do Lovable. Prévia ADS só
 * existe nesses hosts; domínios reais de agências nunca a servem.
 */
export { isTechnicalPreviewHost } from "@/lib/agencyDomains";

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
  // O número autorizado aparece somente como texto no rodapé; sem link/CTA comercial.
  phone: null,
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
      image: "europa",
      order: 1,
      enabled: true,
    },
    {
      title: "Memórias em família, do planejamento ao retorno",
      subtitle: "Orlando, parques e experiências para diferentes gerações, com cada etapa organizada com cuidado.",
      image: "parques",
      order: 2,
      enabled: true,
    },
    {
      title: "Cruzeiros e grandes destinos com curadoria especializada",
      subtitle: "Mediterrâneo, Caribe, Europa, Estados Unidos e Canadá em roteiros pensados para o seu perfil.",
      image: "cruzeiro",
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
    { key: "europa", image: "europa", label: "Europa", title: "Europa", text: "Cidades, paisagens e experiências combinadas em um roteiro com ritmo e personalidade.", service: "pacotes", enabled: true, order: 1 },
    { key: "orlando", image: "parques", label: "Famílias", title: "Orlando e parques", text: "Parques, hospedagem, ingressos e deslocamentos organizados para aproveitar cada dia.", service: "ingressos", enabled: true, order: 2 },
    { key: "cruzeiros", image: "cruzeiro", label: "Mar e descobertas", title: "Cruzeiros", text: "Navios, cabines e itinerários pelo Mediterrâneo e Caribe escolhidos com orientação.", service: "cruzeiros", enabled: true, order: 3 },
    { key: "xcaret", image: "litoral", label: "México", title: "Xcaret", text: "Natureza, cultura e parques em uma experiência planejada para casais, famílias e amigos.", service: "ingressos", enabled: true, order: 4 },
    { key: "eua-canada", image: "grupos", label: "América do Norte", title: "Estados Unidos e Canadá", text: "Roteiros urbanos, natureza e viagens acompanhadas com logística bem estruturada.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "personalizadas", title: "Viagens personalizadas", text: "Roteiros, hotéis e serviços selecionados a partir do perfil de quem viaja.", service: "pacotes", image: "europa", enabled: true, order: 1 },
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

export const DRICA_VIAGENS_PREVIEW_JOB_ID = "briefing-16-v1";
export const DRICA_VIAGENS_PREVIEW_PATH = `/ads-briefing-preview/${DRICA_VIAGENS_PREVIEW_JOB_ID}`;
/** Host sintético exclusivo: não representa nem vincula o domínio informado. */
export const DRICA_VIAGENS_PREVIEW_HOST = "briefing-16-v1.preview.local";

export const DRICA_VIAGENS_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-000000000016",
  agency_slug: "",
  public_slug: null,
  hostname: DRICA_VIAGENS_PREVIEW_HOST,
  is_primary: false,
  agency_name: "Drica Viagens",
  owner_name: "Adriana Martins",
  logo_url: dricaViagensLogo.url,
  cover_image_url: null,
  primary_color: "#990033",
  secondary_color: "#336687",
  secondary_auto: false,
  tertiary_color: null,
  tertiary_auto: true,
  on_secondary_color: null,
  // Canais aparecem somente como informação editorial; CTAs permanecem bloqueados.
  phone: null,
  city: "Rio de Janeiro",
  state: "RJ",
  bio: null,
  cnpj: null,
  whatsapp_group_url: null,
};

export const DRICA_VIAGENS_PREVIEW_PROFILE: AgencySiteProfile = {
  key: "dricaViagensBriefing16",
  compactSectionSpacing: true,
  nav: [
    { label: "Início", to: "/" },
    { label: "Inspirações", to: "/#destinos" },
    { label: "Viagens", to: "/#campanhas" },
    { label: "Sobre", to: "/#sobre" },
    { label: "Atendimento", to: "/#atendimento" },
    { label: "Dúvidas", to: "/#faq" },
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
  heroPresentation: {
    kicker: "VIAGENS SOB MEDIDA · RIO DE JANEIRO",
    overlay: "strongLeft",
  },
  hero: [
    {
      title: "Sua viagem, planejada com escuta e cuidado",
      subtitle: "Consultoria completa e atendimento pessoal com Adriana Martins, do primeiro plano ao retorno.",
      image: "heroVarenna",
      order: 1,
      enabled: true,
    },
    {
      title: "Famílias, parques e experiências para todas as gerações",
      subtitle: "Orlando e roteiros em família organizados com atenção ao ritmo, ao conforto e às escolhas de cada viajante.",
      image: "orlandoMagicKingdom",
      order: 2,
      enabled: true,
    },
    {
      title: "Do Japão à Europa, cada detalhe faz parte da jornada",
      subtitle: "Destinos, hotéis e serviços selecionados com critério para uma experiência segura e verdadeiramente pessoal.",
      image: "europaCastelo",
      order: 3,
      enabled: true,
    },
  ],
  signature: {
    kicker: "DRICA VIAGENS",
    title: "Consultoria próxima para viagens que combinam com você.",
    text: "Cada roteiro nasce da escuta, ganha forma com uma curadoria criteriosa e segue acompanhado antes, durante e depois da viagem.",
  },
  destinations: [
    { key: "orlando", image: "orlandoMagicKingdom", label: "Famílias e parques", title: "Orlando", text: "Parques, hospedagem e deslocamentos combinados para diferentes idades aproveitarem bem cada dia.", service: "ingressos", enabled: true, order: 1 },
    { key: "londres-europa", image: "heroVarenna", label: "Europa", title: "Londres e Europa", text: "Cidades clássicas e novas descobertas em roteiros organizados no ritmo de cada viajante.", service: "pacotes", enabled: true, order: 2 },
    { key: "leste-europeu", image: "europaCastelo", label: "Circuitos", title: "Leste Europeu", text: "História, cultura e paisagens conectadas por uma logística cuidadosamente planejada.", service: "pacotes", enabled: true, order: 3 },
    { key: "disney-cruise", image: "cruzeiroDisneyWish", label: "Cruzeiros", title: "Disney Cruise Line", text: "Navios, cabines e itinerários avaliados para uma experiência em família no mar.", service: "cruzeiros", enabled: true, order: 4 },
    { key: "japao", image: "escandinavia", label: "Ásia", title: "Japão", text: "Tradição, cidades contemporâneas e experiências culturais em uma jornada bem conectada.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "eua-canada", title: "Estados Unidos e Canadá", text: "Roteiros urbanos, parques e natureza com serviços selecionados para o perfil da viagem.", service: "pacotes", image: "grupos", enabled: true, order: 1 },
    { key: "europa", title: "Europa", text: "Viagens personalizadas, circuitos e grupos acompanhados com cada etapa bem organizada.", service: "pacotes", image: "europa", enabled: true, order: 2 },
    { key: "grupos", title: "Grupos acompanhados", text: "Experiências compartilhadas com programação e logística planejadas com cuidado.", service: "pacotes", image: "grupos", enabled: true, order: 3 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Orientação para escolher itinerário, navio, cabine e serviços adequados ao seu jeito de viajar.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 4 },
    { key: "asia-oceania", title: "Ásia e Oceania", text: "Destinos distantes transformados em roteiros claros, conectados e personalizados.", service: "pacotes", image: "escandinavia", enabled: true, order: 5 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Adriana Martins, atendimento pessoal do início ao retorno.",
    text: "Proprietária e consultora da Drica Viagens, Adriana Martins conduz pessoalmente o atendimento. Desde 2010, a agência cria viagens sob medida com escuta atenta, conhecimento dos destinos e curadoria criteriosa de hotéis e serviços. O planejamento acolhe viajantes solo, famílias multigeracionais e pessoas 60+ com clareza e cuidado em cada escolha.",
    badge: { value: "Desde 2010", label: "Drica Viagens" },
    media: "hidden",
    showLocation: true,
    ownerName: "Adriana Martins",
  },
  differentials: [
    { title: "Escuta de verdade", text: "Preferências, necessidades e expectativas orientam cada decisão do planejamento.", icon: "consultivo" },
    { title: "Curadoria criteriosa", text: "Hotéis e serviços são avaliados com atenção ao perfil e ao contexto da viagem.", icon: "conferido" },
    { title: "Conhecimento dos destinos", text: "Experiência e repertório ajudam a construir roteiros coerentes e bem conectados.", icon: "fornecedores" },
    { title: "Acompanhamento próximo", text: "A agência orienta antes, durante e depois e auxilia no contato com o fornecedor quando há imprevistos.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa por WhatsApp, telefone, e-mail ou videochamada para entender quem vai viajar.",
    "Curadoria de destinos, hotéis e serviços alinhados ao perfil e às prioridades da viagem.",
    "Apresentação das opções, esclarecimento de dúvidas e ajustes antes das reservas.",
    "Orientação antes, durante e depois, com auxílio no acompanhamento junto ao fornecedor em caso de imprevisto.",
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "O atendimento é feito pessoalmente por Adriana Martins, por WhatsApp, telefone, e-mail ou videochamada. A conversa inicial orienta a criação de uma proposta sob medida." },
    { q: "A Drica Viagens atende famílias e pessoas 60+?", a: "Sim. O planejamento considera diferentes gerações, necessidades de mobilidade, ritmo, conforto e interesses de cada viajante." },
    { q: "Quais são as principais especialidades?", a: "Estados Unidos e Canadá, Europa, grupos acompanhados, cruzeiros, Ásia e Oceania, com atenção especial a famílias, parques e turismo esportivo." },
    { q: "Há apoio durante a viagem?", a: "Em caso de imprevisto, o suporte direto é prestado pelo fornecedor responsável. A Drica Viagens auxilia o cliente no acompanhamento e na comunicação durante o processo." },
    { q: "É possível planejar uma viagem para uma pessoa só?", a: "Sim. A consultoria também atende viajantes solo, construindo o roteiro conforme preferências, ritmo e necessidades individuais." },
  ],
  copy: {
    destinations: { title: "Inspirações para a sua próxima viagem", subtitle: "Destinos que ganham forma em roteiros personalizados para você e para quem viaja ao seu lado." },
    modules: { title: "Viagens para diferentes momentos", subtitle: "Consultoria completa para destinos, estilos e perfis diversos." },
    differentials: { title: "Cuidado presente em cada escolha", subtitle: "Atendimento pessoal, conhecimento e curadoria para viajar com mais segurança." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa ao retorno", subtitle: "Um processo próximo e profissional, conduzido pela proprietária." },
    faq: { title: "Dúvidas frequentes" },
  },
  footer: {
    description: "Viagens sob medida, famílias e parques, turismo esportivo, grupos acompanhados e grandes destinos pelo mundo.",
    whatsapp: "+55 21 98790-7853",
    phone: "+55 21 98790-7853",
    email: "faleconosco@dricaviagens.rio",
    instagram: "https://www.instagram.com/dricaviagens",
    instagramLabel: "@dricaviagens",
    legalName: "Maralba Viagens e Turismo Ltda",
    cnpj: "11.636.130/0001-31",
    showLocation: true,
  },
  seo: {
    title: "Prévia para revisão — Drica Viagens",
    description: "Prévia técnica revisável do site Drica Viagens.",
  },
};

export const VIAJAR_TIRISMO_PREVIEW_JOB_ID = "briefing-17-v1";
export const VIAJAR_TIRISMO_PREVIEW_PATH = `/ads-briefing-preview/${VIAJAR_TIRISMO_PREVIEW_JOB_ID}`;
/**
 * Host sintético exclusivo. O cadastro real existe mas não tem domínio público
 * ativo: a vinculação futura fica PENDENTE e nada da conta real é usado aqui.
 */
export const VIAJAR_TIRISMO_PREVIEW_HOST = "briefing-17-v1.preview.local";

export const VIAJAR_TIRISMO_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-000000000017",
  agency_slug: "",
  public_slug: null,
  hostname: VIAJAR_TIRISMO_PREVIEW_HOST,
  is_primary: false,
  agency_name: "Viajar Tirismo",
  owner_name: "Paula Gasparini",
  logo_url: viajarTirismoLogo.url,
  cover_image_url: null,
  primary_color: "#164f76",
  secondary_color: "#00a1d8",
  secondary_auto: false,
  tertiary_color: null,
  tertiary_auto: true,
  on_secondary_color: null,
  phone: null,
  city: "Vila Velha",
  state: "ES",
  bio: null,
  cnpj: null,
  whatsapp_group_url: null,
};

export const VIAJAR_TIRISMO_PREVIEW_PROFILE: AgencySiteProfile = {
  key: "viajarTirismoBriefing17",
  compactSectionSpacing: true,
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#campanhas" },
    { label: "Sobre", to: "/#sobre" },
    { label: "Atendimento", to: "/#atendimento" },
    { label: "Dúvidas", to: "/#faq" },
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
  heroImage: "cruzeiro",
  heroPresentation: {
    kicker: "CONSULTORIA DE VIAGENS · VILA VELHA, ES",
    overlay: "strongLeft",
  },
  hero: [
    { title: "Segurança e suporte antes, durante e depois da viagem", subtitle: "Consultoria completa com atendimento direto de Paula Gasparini, da inspiração ao pós-viagem.", image: "heroSantoriniShip", order: 1, enabled: true },
    { title: "Cruzeiros planejados em cada detalhe", subtitle: "Navio, cabine, itinerário e serviços escolhidos com orientação próxima para viajar com tranquilidade.", image: "cruzeiro", order: 2, enabled: true },
    { title: "Viagens sob medida pelo mundo", subtitle: "Europa, Caribe, Ásia, destinos exóticos, neve e resorts em roteiros feitos para o seu momento.", image: "europaCastelo", order: 3, enabled: true },
  ],
  signature: {
    kicker: "VIAJAR TIRISMO",
    title: "Consultoria completa para diferentes viagens.",
    text: "Planejamento detalhado e suporte em toda a jornada, para que cada viajante — de famílias multigeracionais a quem tem 60+ — viaje com segurança.",
  },
  destinations: [
    { key: "europa", image: "europa", label: "Cultura", title: "Europa", text: "Cidades históricas, paisagens e gastronomia em roteiros no ritmo de cada viajante.", service: "pacotes", enabled: true, order: 1 },
    { key: "cruzeiros", image: "cruzeiro", label: "No mar", title: "Cruzeiros", text: "Itinerários, navios e cabines avaliados com cuidado para cada perfil.", service: "cruzeiros", enabled: true, order: 2 },
    { key: "caribe-mexico", image: "caribeMexico", label: "Sol e mar", title: "Caribe e México", text: "Praias, resorts e experiências combinados com conforto e praticidade.", service: "pacotes", enabled: true, order: 3 },
    { key: "asia-oceania", image: "escandinavia", label: "Longas distâncias", title: "Ásia e Oceania", text: "Destinos distantes transformados em roteiros claros e bem conectados.", service: "pacotes", enabled: true, order: 4 },
    { key: "america-do-sul", image: "brasil", label: "Perto de casa", title: "América do Sul", text: "Paisagens, cultura e neve a poucas horas, com logística bem planejada.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "cruzeiros", title: "Cruzeiros", text: "Orientação completa para escolher navio, cabine, itinerário e serviços.", service: "cruzeiros", image: "cruzeiroDisneyWish", enabled: true, order: 1 },
    { key: "sob-medida", title: "Viagens sob medida", text: "Roteiros criados a partir das preferências, do ritmo e das necessidades de cada viajante.", service: "pacotes", image: "heroVarenna", enabled: true, order: 2 },
    { key: "internacionais", title: "Destinos internacionais", text: "Planejamento detalhado para viagens pelo mundo, do embarque ao retorno.", service: "pacotes", image: "heroAirportTraveler", enabled: true, order: 3 },
    { key: "exoticos", title: "Destinos exóticos", text: "Lugares surpreendentes com logística cuidadosa e suporte em toda a jornada.", service: "pacotes", image: "safari", enabled: true, order: 4 },
    { key: "neve", title: "Neve", text: "Destinos de inverno escolhidos com atenção ao clima, ao conforto e às atividades.", service: "pacotes", image: "escandinavia", enabled: true, order: 5 },
    { key: "resorts", title: "Resorts", text: "Hospedagens selecionadas para descansar com a família e aproveitar cada momento.", service: "hospedagem", image: "resort", enabled: true, order: 6 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Paula Gasparini, atendimento direto em toda a jornada.",
    text: "A paixão por viagens e a experiência organizando viagens de familiares e amigos levaram Paula Gasparini a se profissionalizar. Desde 2019, a Viajar Tirismo oferece consultoria completa, com planejamento detalhado e suporte antes, durante e depois da viagem. Em um cruzeiro no exterior, Paula intermediou a hospitalização e o desembarque de um viajante na Arábia Saudita, acompanhando o caso até o retorno para casa.",
    badge: { value: "Desde 2019", label: "Viajar Tirismo" },
    media: "hidden",
    showLocation: true,
    ownerName: "Paula Gasparini",
  },
  differentials: [
    { title: "Atendimento direto", text: "A própria proprietária conduz cada atendimento, do primeiro contato ao retorno.", icon: "consultivo" },
    { title: "Especialização", text: "Conhecimento em cruzeiros, viagens sob medida e destinos internacionais.", icon: "fornecedores" },
    { title: "Planejamento detalhado", text: "Cada etapa é organizada com atenção ao perfil e às necessidades de quem viaja.", icon: "conferido" },
    { title: "Suporte em toda a jornada", text: "Acompanhamento antes, durante e depois da viagem, inclusive em imprevistos.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa por WhatsApp, telefone, videochamada ou e-mail para entender a inspiração da viagem.",
    "Planejamento detalhado de destinos, hospedagens e serviços conforme o perfil de cada viajante.",
    "Apresentação das opções, ajustes e organização de todos os detalhes antes do embarque.",
    "Acompanhamento durante a viagem e no pós-viagem, com suporte em toda a jornada.",
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "O atendimento é feito diretamente por Paula Gasparini, por WhatsApp, telefone, videochamada ou e-mail, da inspiração ao pós-viagem." },
    { q: "A Viajar Tirismo atende pessoas 60+ e famílias?", a: "Sim. O planejamento atende públicos diversos, com atenção especial a viajantes 60+ e famílias multigeracionais." },
    { q: "Quais são as especialidades?", a: "Cruzeiros, viagens sob medida e destinos internacionais, como Europa, Caribe e México, Ásia e Oceania e América do Sul, além de destinos exóticos, neve e resorts." },
    { q: "Há suporte durante a viagem?", a: "Sim. O acompanhamento continua durante a viagem e após o retorno, com apoio em imprevistos." },
  ],
  copy: {
    destinations: { title: "Destinos para a sua próxima viagem", subtitle: "Algumas das regiões que a Viajar Tirismo planeja com cuidado e detalhe." },
    modules: { title: "Especialidades", subtitle: "Consultoria completa para diferentes estilos de viagem." },
    differentials: { title: "Por que viajar com a Viajar Tirismo", subtitle: "Segurança e suporte em cada etapa da jornada." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da inspiração ao pós-viagem", subtitle: "Acompanhamento próximo, conduzido pela proprietária." },
    faq: { title: "Dúvidas frequentes" },
  },
  footer: {
    description: "Cruzeiros, viagens sob medida e destinos internacionais, com suporte antes, durante e depois da viagem.",
    whatsapp: "+55 27 99241-9444",
    phone: "+55 27 99241-9444",
    email: "viajarturismoes@gmail.com",
    instagram: "https://www.instagram.com/_viajarturismo",
    instagramLabel: "@_viajarturismo",
    showLocation: true,
  },
  seo: {
    title: "Prévia para revisão — Viajar Tirismo",
    description: "Prévia técnica revisável do site Viajar Tirismo.",
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
  [DRICA_VIAGENS_PREVIEW_JOB_ID]: {
    jobId: DRICA_VIAGENS_PREVIEW_JOB_ID,
    info: DRICA_VIAGENS_PREVIEW_INFO,
    profile: DRICA_VIAGENS_PREVIEW_PROFILE,
    notice: "Prévia para revisão — sem publicação · ações desativadas",
    documentTitle: "Prévia para revisão — Drica Viagens",
    realAgency: true,
  },
  [VIAJAR_TIRISMO_PREVIEW_JOB_ID]: {
    jobId: VIAJAR_TIRISMO_PREVIEW_JOB_ID,
    info: VIAJAR_TIRISMO_PREVIEW_INFO,
    profile: VIAJAR_TIRISMO_PREVIEW_PROFILE,
    notice: "Prévia para revisão — sem publicação · ações desativadas",
    documentTitle: "Prévia para revisão — Viajar Tirismo",
    realAgency: true,
  },
};

export function resolveAdsPreviewFixture(jobId?: string): AdsBriefingPreviewFixture | null {
  return jobId ? ADS_PREVIEW_FIXTURES[jobId] ?? null : null;
}
