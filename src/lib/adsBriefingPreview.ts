/**
 * Prévia técnica da fixture ADS "ads-email-test-v1" (agência FICTÍCIA).
 * Conteúdo 100% local: nenhum tenant, conta ou cadastro real é consultado.
 * Servida apenas no host técnico id-preview (e localhost de desenvolvimento).
 */
import { buildGoldStandardProfile } from "@/lib/goldStandardSiteTemplate";
import { EDITORIAL_ROSE } from "@/lib/agencyReferenceProfiles";
import bardelliLogo from "@/assets/whitelabel/logo-bardelli-viagens.png.asset.json";
import bardelliNewsletterPhoto from "@/assets/whitelabel/hero-praia.jpg";
import type { AgencySiteProfile } from "@/lib/agencySiteProfile";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { XCARET_IMAGES, type XcaretImage } from "@/components/landing/xcaret/content";

type XcaretMediaSlots = Record<"portraitJuliana" | "trainingPhoto" | "julianaExtra" | "expertBadge" | "julianaAtDestination", XcaretImage | null>;

/** Fotos temporárias (acervo oficial Xcaret) no lugar das fotos da Juliana. Usado pela Bardelli. */
export const GENERIC_XCARET_SLOTS: XcaretMediaSlots = {
  portraitJuliana: XCARET_IMAGES.xcaret,
  trainingPhoto: XCARET_IMAGES.xelHa,
  julianaExtra: XCARET_IMAGES.xplor,
  expertBadge: null,
  julianaAtDestination: XCARET_IMAGES.hotelMexico,
};

/**
 * O Mundo em Cores: fotos originais da Vanessa (Drive da cliente, pasta
 * "Fotos da Vanessa em Xcaret"), cada uma no MESMO parque da foto que substitui,
 * identificado pela placa visível. Hotel Xcaret México preservado (sem foto
 * comprovada do mesmo hotel).
 */
export const MUNDO_EM_CORES_XCARET_SLOTS: XcaretMediaSlots = {
  portraitJuliana: { src: mundoXcaretParque.url, alt: "Vanessa Figueiredo no parque Xcaret, junto à placa Xcaret México", source: "Acervo pessoal de Vanessa Figueiredo (IMG_1656)" },
  trainingPhoto: { src: mundoXcaretXplor.url, alt: "Vanessa Figueiredo na caverna do parque Xplor, junto à pedra Xplor por Xcaret", source: "Acervo pessoal de Vanessa Figueiredo (IMG_0921)" },
  julianaExtra: { src: mundoXcaretXelha.url, alt: "Vanessa Figueiredo no letreiro do parque Xel-Há", source: "Acervo pessoal de Vanessa Figueiredo (IMG_0749)" },
  expertBadge: { src: xpertsXcaretBadge.url, alt: "Selo Xperts Xcaret", source: "Selo Xperts Xcaret" },
  julianaAtDestination: { src: mundoXcaretFechamento.url, alt: "Vanessa Figueiredo no letreiro Xcaret México 35 anos", source: "Acervo pessoal de Vanessa Figueiredo (IMG_1646)" },
};
import mundoXcaretGal0749 from "@/assets/ads-preview/mundo-xcaret-galeria-0749.webp.asset.json";
import mundoXcaretGal0921 from "@/assets/ads-preview/mundo-xcaret-galeria-0921.webp.asset.json";
import mundoXcaretGal1179 from "@/assets/ads-preview/mundo-xcaret-galeria-1179.webp.asset.json";
import mundoXcaretGal1646 from "@/assets/ads-preview/mundo-xcaret-galeria-1646.webp.asset.json";
import mundoXcaretGal1655 from "@/assets/ads-preview/mundo-xcaret-galeria-1655.webp.asset.json";
import mundoXcaretGal1656 from "@/assets/ads-preview/mundo-xcaret-galeria-1656.webp.asset.json";
import mundoXcaretGal1824 from "@/assets/ads-preview/mundo-xcaret-galeria-1824.webp.asset.json";
import mundoXcaretGal1977 from "@/assets/ads-preview/mundo-xcaret-galeria-1977.webp.asset.json";
import mundoXcaretGal2031 from "@/assets/ads-preview/mundo-xcaret-galeria-2031.webp.asset.json";
import mundoXcaretGal2070 from "@/assets/ads-preview/mundo-xcaret-galeria-2070.webp.asset.json";
import mundoXcaretGalDFF0 from "@/assets/ads-preview/mundo-xcaret-galeria-DFF0.webp.asset.json";
import mundoXcaretGalF103 from "@/assets/ads-preview/mundo-xcaret-galeria-F103.webp.asset.json";
import xpertsXcaretBadge from "@/assets/whitelabel/xcaret/xperts-xcaret-badge.webp.asset.json";
import mundoXcaretFechamento from "@/assets/ads-preview/mundo-xcaret-vanessa-35anos.webp.asset.json";
import mundoXcaretParque from "@/assets/ads-preview/mundo-xcaret-vanessa-parque.webp.asset.json";
import mundoXcaretXelha from "@/assets/ads-preview/mundo-xcaret-vanessa-xelha.webp.asset.json";
import mundoXcaretXplor from "@/assets/ads-preview/mundo-xcaret-vanessa-xplor.webp.asset.json";
import logoAsset from "@/assets/ads-preview/ads-email-test-v1-logo.png.asset.json";
import mundoEmCoresLogo from "@/assets/ads-preview/mundo-em-cores-briefing-14-logo.png.asset.json";
// Real personal photographs from https://omundoemcores.com.br/wp-content/uploads/2024/07/Vanessa.png
import mundoEmCoresVanessa from "@/assets/ads-preview/mundo-em-cores-vanessa-oficial.png.asset.json";
import mundoEmCoresVanessaMural from "@/assets/ads-preview/mundo-em-cores-vanessa-mural.png.asset.json";
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
  // Cruzeiros: estrutura da Destinos com a Ju (vídeos + companhias), texto neutro sem fatos pessoais.
  authority: {
    sectionLabel: "Cruzeiros",
    companies: {
      title: "Sua próxima viagem de cruzeiro começa aqui! Na O Mundo em Cores,\nvocê encontra as principais companhias de cruzeiros do mundo.",
      items: EDITORIAL_ROSE.authority?.companies?.items ?? [],
    },
    kicker: "ESCOLHAS PARA A SUA VIAGEM",
    title: "Cruzeiros para diferentes formas de viajar",
    paragraphs: [
      "Comparamos navios, itinerários, cabines e experiências a bordo para indicar o cruzeiro que combina com o seu perfil, seja em família, a dois ou com amigos.",
      "Do Caribe ao Mediterrâneo, cuidamos da escolha da companhia, das datas e dos detalhes de embarque para que você aproveite cada dia no mar com tranquilidade.",
    ],
    cta: "Quero planejar meu cruzeiro", service: "cruzeiros", image: "cruzeiro", video: "disneyWishCruise",
    videos: EDITORIAL_ROSE.authority?.videos,
  },
  key: "mundoEmCoresBriefing14",
  compactSectionSpacing: true,
  alternateSurfaces: true,
  campaignCardPresentation: "photoAbove",
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Xcaret", to: "/xcaret" },
    { label: "Ingressos", to: "/ingressos-orlando" },
    { label: "Resorts", to: "/resorts-brasil" },
    { label: "Cruzeiros", to: "/#autoridade" },
    { label: "Sobre", to: "/#sobre" },
    { label: "Atendimento", to: "/#atendimento" },
  ],
  sections: {
    dmc: { enabled: false },
    offers: { enabled: false },
    credentials: { enabled: false },
    team: { enabled: false },
    avaliacoes: { enabled: false },
    authority: { enabled: true, order: 4.5 },
    highlights: { enabled: false },
    signature: { enabled: false },
    destinations: { enabled: true, order: 2 },
    modules: { enabled: true, order: 1 },
    orlando: { enabled: true, order: 3 },
    resorts: { enabled: true, order: 4 },
    about: { enabled: true, order: 5 },
    differentials: { enabled: true, order: 6 },
    concierge: { enabled: true, order: 7 },
    testimonials: { enabled: true, order: 8 },
    faq: { enabled: true, order: 9 },
    newsletter: { enabled: true, order: 10 },
  },
  heroImage: "europa",
  heroPresentation: { kicker: "VIAGEM DESENHADA PARA VOCÊ", overlay: "strongLeft", actionsPlacement: "right" },
  requestCenter: { title: "Por onde você quer começar?", titlePlacement: "above-card" },
  resortsMap: { enabled: true },
  featuredExperience: {
    enabled: true,
    id: "experiencia-xcaret",
    kicker: "ESPECIALISTA XPERTS XCARET",
    title: "Vanessa esteve no Xcaret e voltou especialista no destino",
    description: "A Vanessa visitou recentemente os parques e hotéis Xcaret na Riviera Maya, fez a capacitação oficial e recebeu o selo Xperts Xcaret. Agora usa essa vivência para ajudar você a escolher os parques, hotéis e experiências que combinam com a sua viagem.",
    mainImage: { src: XCARET_IMAGES.xcaret.src, alt: XCARET_IMAGES.xcaret.alt, position: "center" },
    gallery: [
      { src: mundoXcaretGalF103.url, alt: "Vanessa Figueiredo em hotel Xcaret com o selo Xperts Xcaret 2026" },
      { src: mundoXcaretGal1646.url, alt: "Vanessa Figueiredo no letreiro Xcaret México 35 anos" },
      { src: mundoXcaretGal1655.url, alt: "Vanessa Figueiredo junto aos flamingos do parque Xcaret" },
      { src: mundoXcaretGal0921.url, alt: "Vanessa Figueiredo na caverna do Xplor por Xcaret" },
      { src: mundoXcaretGal2070.url, alt: "Vanessa Figueiredo no parque Xel-Há, com o rio de águas cristalinas" },
      { src: mundoXcaretGal1179.url, alt: "Vanessa Figueiredo diante da piscina com vista para o mar do Caribe" },
      { src: mundoXcaretGal1656.url, alt: "Vanessa Figueiredo junto à placa Xcaret México" },
      { src: mundoXcaretGal1824.url, alt: "Vanessa Figueiredo junto à placa La Casa de la Playa" },
      { src: mundoXcaretGal1977.url, alt: "Vanessa Figueiredo na adega de vinhos do complexo Xcaret" },
      { src: mundoXcaretGal0749.url, alt: "Vanessa Figueiredo no letreiro do parque Xel-Há" },
      { src: mundoXcaretGal2031.url, alt: "Vanessa Figueiredo junto à pedra Xcaret México" },
      { src: mundoXcaretGalDFF0.url, alt: "Vanessa Figueiredo com drinque e vista para o mar do Caribe" },
    ],
    galleryIntervalMs: 6000,
    consultantImage: null,
    badge: { src: xpertsXcaretBadge.url, alt: "Selo Xperts Xcaret" },
    highlights: ["Visita recente ao destino", "Selo Xperts Xcaret", "Parques e hotéis Xcaret", "Planejamento personalizado"],
    ctaLabel: "Saiba mais sobre este destino",
    ctaHref: "/xcaret",
  },
  hero: [
    { title: "Viagem desenhada para você.", subtitle: "Roteiros sob medida, criados a partir do seu jeito de viajar, com acompanhamento antes, durante e depois.", image: "heroVarenna", order: 1, enabled: true },
    { title: "Existe uma Europa para cada pessoa.", subtitle: "Desenhamos a sua, no seu ritmo, para você viver a sua própria história.", image: "europa", order: 2, enabled: true },
    { title: "Viajar em boa companhia.", subtitle: "Grupos acompanhados para quem quer descobrir o mundo com segurança e novas amizades.", image: "heroSantoriniShip", order: 3, enabled: true },
  ],
  signature: {
    kicker: "O MUNDO EM CORES",
    title: "Uma viagem com a sua personalidade.",
    text: "Tudo começa com uma conversa sobre suas preferências, seu ritmo e o que você deseja viver. Juntos, planejamos roteiro, hospedagem e experiências, com orientação e suporte em cada etapa.",
  },
  destinations: [
    { key: "europa", image: "heroVarenna", label: "Itália e Europa", title: "Existe uma Europa para cada pessoa", text: "Da Itália a outros cantos da Europa, desenhamos um roteiro com a sua cara: no seu ritmo, com liberdade ou em circuito, para viver a sua própria história.", service: "pacotes", enabled: true, order: 1 },
    { key: "grecia-grupo", image: "heroSantoriniShip", label: "Grupo acompanhado", title: "Grécia em Boa Companhia", text: "Saída em grupo de 20 a 28 de junho, com acompanhamento da Vanessa. Programa completo em breve; peça já as informações.", service: "pacotes", enabled: true, order: 2 },
    { key: "orlando-grupo", image: "orlandoMagicKingdom", label: "Grupo acompanhado", title: "Orlando em grupo", text: "Parques em boa companhia, com organização de ingressos, hospedagem e deslocamentos. Datas em confirmação.", service: "ingressos", enabled: true, order: 3 },
    { key: "cruzeiros", image: "cruzeiro", label: "Destaque NCL", title: "Cruzeiros com a NCL", text: "Navios da Norwegian Cruise Line e de outras companhias pelo Caribe, Mediterrâneo e muito mais, escolhidos para o seu perfil.", service: "cruzeiros", enabled: true, order: 4 },
    { key: "club-med", image: "resort", label: "Resorts internacionais", title: "Club Med pelo mundo", text: "Resorts all inclusive de praia e de neve, com estrutura para famílias, casais e amigos.", service: "hospedagem", enabled: true, order: 5 },
    { key: "resorts-nacionais", image: "iberostarPraiaDoForte", label: "Resorts nacionais", title: "Hotéis Iberostar no Brasil", text: "Resorts all inclusive à beira-mar no Brasil, com gastronomia, lazer e conforto para famílias e casais.", service: "hospedagem", enabled: true, order: 6 },
  ],
  modules: [
    { key: "personalizadas", title: "Viagens personalizadas", text: "Roteiros, hotéis e serviços selecionados a partir do perfil de quem viaja.", service: "pacotes", image: "europa", enabled: true, order: 1 },
    { key: "familias", title: "Famílias e várias gerações", text: "Conforto e experiências pensadas para diferentes idades viajarem bem juntas.", service: "pacotes", image: "parques", enabled: true, order: 2 },
    { key: "grupos", title: "Pequenos grupos", text: "Planejamento cuidadoso para compartilhar descobertas com amigos e pequenos grupos, respeitando o ritmo de quem viaja.", service: "pacotes", image: "grupos", enabled: true, order: 3 },
    { key: "elas-viajam", title: "Elas Viajam", text: "Experiências de viagem para mulheres. Converse com a Vanessa sobre propostas e próximas saídas.", service: "pacotes", image: "litoral", enabled: true, order: 4 },
  ],
  about: {
    kicker: "CONHEÇA VANESSA FIGUEIREDO",
    title: "Viagens planejadas para o seu jeito de viver o mundo.",
    text: "Olá, eu sou a Vanessa Figueiredo.\n\nHá 29 anos entrego sonhos em forma de viagens, sendo os últimos 16 anos à frente da minha agência, a O Mundo em Cores · Studio de Viagens.\n\nVivo em constante aprendizado sobre destinos, passeios e novidades para construir roteiros personalizados, sempre com dicas e sugestões que fazem toda a diferença para cada viajante. É a profissão que escolhi, e que sinto que me escolheu, para levar às pessoas, com muito amor, experiências, vivências e realizações.\n\nA cada embarque, eu cuido, planejo, vibro, sonho e viajo junto. Este é o meu verdadeiro propósito: desenhar cada viagem com cuidado nos detalhes, como se fosse para mim. E, na verdade, sempre é!\n\nA realização de cada cliente é uma enorme satisfação pessoal e profissional, aquele sentimento bom que volta pra gente quando fazemos alguém feliz. Acredito que as pessoas são únicas, com suas preferências e gostos, e assim também devem ser suas viagens.\n\nSeja bem-vindo(a) à O Mundo em Cores.",
    badge: { value: "29 anos", label: "de experiência no turismo" },
    images: [{ src: mundoEmCoresVanessa.url, alt: "Vanessa Figueiredo em fotografias pessoais de suas viagens, publicadas em seu site oficial", aspect: "square" }],
    mural: { src: mundoEmCoresVanessaMural.url, alt: "Mural de fotos de viagens da Vanessa Figueiredo" },
    visitedDestinations: { title: "Destinos que já conheci", names: ["Brasil", "Estados Unidos", "Canadá", "México", "Itália", "Suíça", "Espanha", "Portugal", "Inglaterra", "Montenegro", "Croácia", "França", "Argentina", "Chile", "Paraguai", "Bahamas", "República Dominicana", "Colômbia", "Indonésia", "Vaticano"], presentation: "flags" },

    showLocation: true,
    ownerName: "Vanessa Figueiredo",
  },
  differentials: [
    { title: "Escolhas que combinam com você", text: "Roteiro, hotéis e experiências escolhidos conforme suas preferências.", icon: "consultivo" },
    { title: "Conversa próxima, orientação clara", text: "Atendimento com a Vanessa e decisões explicadas para você escolher com confiança.", icon: "conferido" },
    { title: "Atenção aos detalhes antes de embarcar", text: "Orientações sobre documentos, reservas e programação antes da partida.", icon: "fornecedores" },
    { title: "Acompanhamento em cada etapa", text: "Suporte antes, durante e depois da viagem, conforme o serviço contratado.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Uma conversa para entender quem viaja, preferências, ritmo e prioridades.",
    "Escolha de destinos, roteiros, hotéis e serviços que combinam com você.",
    "Apresentação clara das opções e ajustes antes das reservas.",
    "Acompanhamento antes, durante e depois da viagem.",
  ],
  faq: [
    { q: "Como funciona o planejamento da viagem?", a: "O atendimento começa com uma conversa sobre o perfil dos viajantes e o que desejam viver. A partir daí, são selecionados roteiros, hotéis e serviços e as opções são apresentadas para revisão." },
    { q: "Quais viagens são especialidades da agência?", a: "Viagens personalizadas, famílias e várias gerações, pequenos grupos e experiências para mulheres com o Elas Viajam. Também planejamos cruzeiros, parques e roteiros com destaque para Europa, Orlando, Mediterrâneo, Caribe e Xcaret." },
    { q: "A agência atende famílias de várias gerações?", a: "Sim. O planejamento considera as necessidades de crianças, adultos e pessoas mais velhas para equilibrar ritmo, conforto e experiências." },
    { q: "Há suporte durante a viagem?", a: "O suporte antes, durante e depois da viagem é combinado conforme o serviço contratado. Converse com a Vanessa para entender como funciona na sua viagem." },
  ],
  copy: {
    destinations: { title: "Destinos que inspiram novas histórias", subtitle: "Prioridades escolhidas para casais, famílias de várias gerações e grupos de amigos." },
    modules: { title: "Cada viagem começa por quem vai vivê-la", subtitle: "Especialidades com planejamento personalizado e cuidado em cada escolha.", cta: "Conversar com a Vanessa" },
    differentials: { title: "Cuidado que acompanha cada etapa", subtitle: "Escolhas cuidadosas, orientação clara e suporte para viajar com mais tranquilidade." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa ao retorno", subtitle: "Você conversa com a Vanessa, conhece as opções e ajusta os detalhes antes de reservar.", cta: "Conversar com a Vanessa" },
    testimonials: { title: "Histórias de quem já viajou com a Vanessa" },
    faq: { title: "Dúvidas frequentes" },
    newsletter: {
      kicker: "GRUPO DE NOVIDADES NO WHATSAPP",
      title: "Receba novidades e oportunidades",
      subtitle: "Informe seu nome, WhatsApp e e-mail para receber novidades e oportunidades de viagem compartilhadas pela Vanessa.",
      cta: "Quero entrar no grupo",
    },
  },
  inspirationDialog: {
    groupUrl: "https://chat.whatsapp.com/BsNGH7VRiILHfPqZhoASUu?mode=gi_t",
    title: "Entre no grupo de novidades",
    description: "Preencha seus dados para receber novidades e oportunidades de viagem da O Mundo em Cores.",
    submitLabel: "Confirmar",
    notice: "Ao confirmar, você autoriza o contato da agência.",
  },
  socialStrip: {
    title: "Siga-nos nas redes",
    links: [{ network: "instagram", url: "https://www.instagram.com/omundoemcoresviagens/" }],
  },
  footer: {
    description: "Viagens personalizadas, cruzeiros, experiências em família e pequenos grupos. Planejamento cuidadoso e uma conversa próxima com a Vanessa, do primeiro contato ao retorno.",
    whatsapp: "(11) 99995-4734",
    phone: "(11) 99995-4734",
    email: "contato@omundoemcores.com.br",
    instagram: "https://www.instagram.com/omundoemcoresviagens",
    instagramLabel: "@omundoemcoresviagens",
    legalName: "V Figueiredo Viagens e Turismo Ltda",
    cnpj: "27.702.093/0001-52",
    showLocation: false,
  },
  testimonials: [
    { key: "thais-rosa", author: "Thaís Rosa", quote: "competência, carinho, personalização, amor, dedicação" },
    { key: "lucia-quintas", author: "Lucia Quintas", quote: "sempre priorizando nossos desejos e conforto" },
    { key: "raquel-macario", author: "Raquel Macario", quote: "minhas viagens sejam leves, agradáveis, com excelentes escolhas" },
  ],
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

/**
 * Landing Xcaret na prévia O Mundo em Cores: sem fotos ou selos da Juliana
 * (fotos oficiais dos parques como temporárias) e sem alegações de visita
 * ou certificação que a Vanessa não confirmou.
 */
export const MUNDO_EM_CORES_XCARET_REWRITES: [string, string][] = [
  ["Eu fui conhecer o Xcaret para planejar a sua viagem com ainda mais cuidado.", "Eu fui conhecer o Xcaret para planejar a sua viagem com ainda mais cuidado."],
  ["Sou a Juliana, da Destinos com a Ju. Estive no Xcaret para conhecer o destino de perto e participar de uma capacitação especializada.", "Sou a Vanessa Figueiredo, da O Mundo em Cores. Estive no Xcaret para conhecer o destino de perto e participar de uma capacitação especializada."],
  ["Voltei com o selo Expert e ainda mais preparada para ajudar você a escolher a hospedagem, os parques e as experiências que combinam com o seu jeito de viajar.", "Voltei com o selo Xperts e ainda mais preparada para ajudar você a escolher a hospedagem, os parques e as experiências que combinam com o seu jeito de viajar."],
  ["Destinos com a Ju", "O Mundo em Cores"],
  ["Juliana", "Vanessa"],
  ["Oi, Ju!", "Oi, Vanessa!"],
  ["à Ju", "à Vanessa"],
  ["a Ju", "a Vanessa"],
  ["A Ju", "A Vanessa"],
];


export const BARDELLI_PRESENTATION_JOB_ID = "bardelli-completa-v1";
export const BARDELLI_PRESENTATION_HOST = "bardelli-presentation.preview.local";
/** Complete presentation allowlist; does not change the global preview helper. */
export function isCompletePresentationHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app"].includes(hostname);
}
export const BARDELLI_PRESENTATION_INFO: AgencyDomainInfo = {
  ...ADS_PREVIEW_INFO, user_id: "00000000-0000-0000-0000-00000000ba01", hostname: BARDELLI_PRESENTATION_HOST,
  agency_name: "Bardelli Viagens", owner_name: "Bárbara Bardelli", logo_url: bardelliLogo.url,
  primary_color: "#D71920", secondary_color: "#181818", phone: null,
  cnpj: "09.475.657/0001-80", city: "São Paulo", state: "SP",
};
export const BARDELLI_PRESENTATION_PROFILE = buildGoldStandardProfile("bardelliPresentation", {
  navDensity: "compact",
  footer: { description: "Consultoria de viagem e roteiros personalizados.", whatsapp: "(11) 97576-7319", phone: "(11) 97576-7319", email: "barbara@bardelliviagens.com.br", instagram: "https://www.instagram.com/bardelliviagens/", instagramLabel: "@bardelliviagens", address: "Rua Cabiúna, 42 — Apto 93 A — Vila Mascote — São Paulo/SP", legalName: "JP Serviços de Informação e Asse em Turismo Ltda", cnpj: "09.475.657/0001-80" },
}, "Bardelli Viagens");
if (BARDELLI_PRESENTATION_PROFILE.about) {
  BARDELLI_PRESENTATION_PROFILE.about.title = "Uma viagem com a sua identidade, planejada com cuidado";
  BARDELLI_PRESENTATION_PROFILE.about.ownerName = "Bárbara Bardelli";
}
BARDELLI_PRESENTATION_PROFILE.signature = { ...BARDELLI_PRESENTATION_PROFILE.signature, kicker: "O JEITO BARDELLI DE PLANEJAR", title: "Uma viagem bem planejada começa por uma boa conversa.", text: "Antes de sugerir destinos, hotéis ou experiências, queremos entender quem vai viajar, o que espera viver e quais detalhes são realmente importantes. É assim que cada viagem ganha personalidade, tranquilidade e significado." };
BARDELLI_PRESENTATION_PROFILE.copy = { ...BARDELLI_PRESENTATION_PROFILE.copy, differentials: { title: "O que você encontra na Bardelli Viagens", subtitle: "Planejamento e atenção aos detalhes da sua viagem." } };
BARDELLI_PRESENTATION_PROFILE.seo = { title: "Apresentação — Bardelli Viagens", description: "Apresentação completa para revisão da Bardelli Viagens." };
BARDELLI_PRESENTATION_PROFILE.socialStrip = { title: "Siga-nos nas redes", links: [{ network: "instagram", url: "https://www.instagram.com/bardelliviagens/" }] };
BARDELLI_PRESENTATION_PROFILE.copy = {
  ...BARDELLI_PRESENTATION_PROFILE.copy,
  newsletter: {
    kicker: "GRUPO DE NOVIDADES NO WHATSAPP",
    title: "Receba novidades e oportunidades",
    subtitle: "Informe seu nome, WhatsApp e e-mail. Depois de enviar, você será direcionado para o grupo de WhatsApp da Bardelli Viagens, onde compartilhamos novidades e oportunidades de viagem.",
    cta: "Quero entrar no grupo",
  },
};
BARDELLI_PRESENTATION_PROFILE.inspirationDialog = {
  title: "Entre no grupo de novidades",
  description: "Preencha seus dados. Ao confirmar, você será direcionado para o grupo de WhatsApp da Bardelli Viagens.",
  submitLabel: "Confirmar e entrar no grupo",
  notice: "Ao confirmar, você autoriza o contato da agência e será levado ao grupo de WhatsApp.",
};
BARDELLI_PRESENTATION_PROFILE.newsletterMedia = { src: bardelliNewsletterPhoto, alt: "Praia de águas claras — foto ilustrativa" };
export const BARDELLI_XCARET_REWRITES: [string, string][] = [
  ["Eu fui conhecer o Xcaret para planejar a sua viagem com ainda mais cuidado.", "Xcaret: possibilidades para uma viagem com a sua cara."],
  ["Sou a Juliana, da Destinos com a Ju. Estive no Xcaret para conhecer o destino de perto e participar de uma capacitação especializada.", "A Bardelli Viagens convida você a descobrir o universo Xcaret, com parques, hotéis e experiências na Riviera Maya."],
  ["Voltei com o selo Expert e ainda mais preparada para ajudar você a escolher a hospedagem, os parques e as experiências que combinam com o seu jeito de viajar.", "Nesta apresentação, reunimos inspirações para comparar hospedagens, parques e experiências de acordo com o perfil de quem vai viajar."],
  ["Quero ouvir o que você imagina para essas férias", "Queremos ouvir o que você imagina para essas férias"],
  ["Destinos com a Ju", "Bardelli Viagens"], ["Juliana", "Equipe Bardelli"], ["Oi, Ju!", "Olá, Bardelli!"], ["da Ju", "da equipe"], ["à Ju", "à equipe"], ["a Ju", "a equipe"], ["A Ju", "A equipe"], ["com a Ju", "com a Bardelli"],
];

export const DRICA_PRESENTATION_JOB_ID = "drica-completa-v1";
export const DRICA_PRESENTATION_HOST = "drica-presentation.preview.local";
export const DRICA_PRESENTATION_INFO: AgencyDomainInfo = {
  ...DRICA_VIAGENS_PREVIEW_INFO, hostname: DRICA_PRESENTATION_HOST,
  user_id: "00000000-0000-0000-0000-00000000dc01", cnpj: "11.636.130/0001-31",
};
const dricaBaseline = buildGoldStandardProfile("dricaPresentation", {}, "Drica Viagens");
const DRICA_PRESENTATION_NAV = (dricaBaseline.nav ?? [])
  .filter((l) => l.to !== "/visto-americano" && l.to !== "/dmc-portugal")
  .map((l) => l.children ? { ...l, children: l.children.filter((c) => c.to !== "/xcaret") } : l);
export const DRICA_PRESENTATION_PROFILE: AgencySiteProfile = {
  ...dricaBaseline, navDensity: "compact", randomizeDestinations: false,
  visaHome: false, featuredExperience: undefined,
  sections: { ...dricaBaseline.sections, dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false } },
  nav: DRICA_PRESENTATION_NAV,
  heroPresentation: { ...dricaBaseline.heroPresentation, kicker: "DRICA VIAGENS · ONLINE, DO RIO DE JANEIRO · DESDE 2010" },
  hero: [
    { title: "Seu próximo destino pode ser o melhor capítulo da sua história", subtitle: "Roteiros personalizados, pacotes, cruzeiros, seguros e ingressos, com segurança e suporte antes, durante e depois da viagem.", image: "orlandoMagicKingdom", order: 1, enabled: true },
    { title: "Orlando completo: parques, shows e grupos", subtitle: "Ingressos para Disney, Universal, SeaWorld e Broadway, além de viagens em grupo para Orlando planejadas em cada detalhe.", image: "cruzeiroDisneyWish", order: 2, enabled: true },
    { title: "Você já imaginou onde os seus sonhos podem te levar?", subtitle: "De Londres ao Japão, da Itália à África do Sul e Namíbia: experiências únicas para colecionar momentos e memórias.", image: "dricaJapan", order: 3, enabled: true },
  ],
  signature: { kicker: "NÓS ACREDITAMOS EM MÁGICA", title: "E em fazer mágica, unindo paixões e misturando possibilidades.", text: "De um lado, o esporte; de outro, a felicidade. Criamos experiências únicas e encantadoras para que você colecione momentos e memórias. Afinal, a vida deve ser vivida e vista de forma mágica. E aí, está pronto para o seu próximo cartão de embarque?" },
  modules: [
    { key: "roteiros", title: "Roteiros personalizados", text: "Viagens desenhadas a partir dos seus sonhos, do seu ritmo e de quem vai ao seu lado.", service: "pacotes", image: "heroVarenna", enabled: true, order: 1 },
    { key: "ingressos", title: "Ingressos para parques e shows", text: "Disney, Universal, SeaWorld, Broadway e outras atrações, com orientação para escolher os melhores dias.", service: "ingressos", image: "orlandoMagicKingdom", enabled: true, order: 2 },
    { key: "grupos", title: "Grupos para Orlando", text: "Viagens em grupo com programação organizada para aproveitar a magia dos parques em boa companhia.", service: "pacotes", image: "grupos", enabled: true, order: 3 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Da Disney Cruise Line a outros itinerários: navio, cabine e roteiro escolhidos com cuidado.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 4 },
    { key: "pacotes", title: "Pacotes, passagens e seguros", text: "Passagens aéreas, pacotes turísticos e seguro viagem reunidos em um planejamento completo.", service: "pacotes", image: "dricaJapan", enabled: true, order: 5 },
    { key: "esportivo", title: "Turismo esportivo", text: "Seu esporte também pode inspirar a próxima viagem: datas, hospedagem e deslocamentos pensados em conjunto.", service: "pacotes", image: "dricaLondon", enabled: true, order: 6 },
  ],
  destinations: [
    { key: "orlando", image: "orlandoMagicKingdom", label: "Famílias e parques", title: "Orlando completo", text: "Disney, Universal, SeaWorld e muito mais, com ingressos, hospedagem e grupos organizados.", service: "ingressos", enabled: true, order: 1 },
    { key: "londres-paris", image: "dricaLondon", label: "Clássicos", title: "Londres e Paris", text: "Clássicos londrinos e o charme parisiense em um roteiro no seu ritmo — inspiração para 2027.", service: "pacotes", enabled: true, order: 2 },
    { key: "italia", image: "heroVarenna", label: "Itália Bella", title: "Itália Bella", text: "Toscana, Costa Amalfitana e lagos italianos para viver a Itália com calma e sabor.", service: "pacotes", enabled: true, order: 3 },
    { key: "leste-europeu", image: "dricaPrague", label: "História", title: "Berlim e Leste Europeu", text: "Cidades históricas, arte e cultura conectadas por uma logística bem planejada.", service: "pacotes", enabled: true, order: 4 },
    { key: "africa-sul-namibia", image: "safari", label: "Aventura", title: "África do Sul e Namíbia", text: "Safáris, desertos e paisagens extraordinárias em uma viagem que fica para sempre.", service: "pacotes", enabled: true, order: 5 },
  ],
  about: { ...DRICA_VIAGENS_PREVIEW_PROFILE.about,
    title: "Desde 2010 realizando sonhos",
    image: "dricaLondon", media: undefined,
    text: [
      DRICA_VIAGENS_PREVIEW_PROFILE.about?.text ?? "",
      "Online e baseada no Rio de Janeiro, a Drica cuida de roteiros personalizados, pacotes turísticos, passagens, cruzeiros, seguros de viagem e ingressos para parques e espetáculos como Disney, Universal, SeaWorld e Broadway. Entre as inspirações estão Orlando, Londres e Paris, Itália, Berlim e Leste Europeu, Japão, Chile, Xcaret, África do Sul e Namíbia, Aurora Boreal e os encantos do Brasil, como os Lençóis Maranhenses.",
      "O capricho aparece antes mesmo do embarque: cada viajante recebe um kit montado com carinho em uma caixinha especial, com nécessaire, tag de mala e pequenos presentes. O atendimento é feito pela proprietária por WhatsApp, telefone, e-mail ou videochamada. Em incidentes, o suporte direto cabe ao fornecedor responsável; a Drica acompanha e auxilia na comunicação e nos encaminhamentos.",
    ].join("\n\n"),
  },
  differentials: [
    { title: "Atendimento pessoal", text: "Adriana conduz cada viagem de perto, do primeiro sonho ao retorno para casa.", icon: "consultivo" },
    { title: "Kit de viagem caprichado", text: "Nécessaire, tag de mala e mimos entregues em uma caixinha montada com carinho.", icon: "conferido" },
    { title: "Tudo em um só lugar", text: "Roteiro, passagens, cruzeiros, seguros e ingressos organizados em um único planejamento.", icon: "fornecedores" },
    { title: "Segurança e suporte", text: "Acompanhamento antes, durante e depois, com auxílio junto ao fornecedor em imprevistos.", icon: "acompanhamento" },
  ],
  conciergePoints: [
    { key: "escuta", title: "1. Uma conversa sobre seus sonhos", text: "WhatsApp, telefone, e-mail ou videochamada para conhecer seus planos, viajantes e necessidades." },
    { key: "curadoria", title: "2. Curadoria e proposta", text: "Hotéis, serviços, ingressos e experiências comparados com critério, conforme o perfil e o investimento desejado." },
    { key: "preparacao", title: "3. Seu cartão de embarque", text: "Conferência das escolhas, orientações finais e o kit de viagem preparado com carinho." },
    { key: "acompanhamento", title: "4. Acompanhamento até o retorno", text: "Em incidentes, o fornecedor presta o suporte direto. A Drica acompanha e auxilia na comunicação e nos encaminhamentos." },
  ],
  faq: [...(DRICA_VIAGENS_PREVIEW_PROFILE.faq ?? []).slice(0, 4),
    { q: "A Drica vende ingressos para parques e shows?", a: "Sim. A Drica trabalha com ingressos para parques temáticos e espetáculos como Disney, Universal, SeaWorld e Broadway, entre outros, com orientação para montar o calendário." },
    { q: "Posso contratar passagens e seguro viagem com a Drica?", a: "Sim. Passagens aéreas, pacotes turísticos e seguro de viagem podem fazer parte do mesmo planejamento." },
    { q: "O atendimento é presencial?", a: "A Drica é uma agência online, baseada no Rio de Janeiro, e atende por WhatsApp, telefone, e-mail ou videochamada." },
  ],
  copy: { ...dricaBaseline.copy, ...DRICA_VIAGENS_PREVIEW_PROFILE.copy,
    destinations: { title: "Destaques da Drica", subtitle: "Seu próximo destino pode ser o melhor capítulo da sua história." },
    modules: { title: "Tudo para a sua viagem", subtitle: "Roteiros, pacotes, cruzeiros, seguros e ingressos para parques temáticos." },
    differentials: { title: "O capricho de cada detalhe", subtitle: "Experiências únicas e encantadoras para colecionar momentos e memórias." },
    newsletter: { kicker: "NOVIDADES DRICA VIAGENS", title: "Está pronto para o seu próximo cartão de embarque?", subtitle: "Destinos em alta como Japão, Marrocos, Albânia, Vietnã e Nordeste do Brasil. Formulário de demonstração: nenhum dado é enviado ou cadastrado.", cta: "Conhecer novidades" },
    avaliacoes: { kicker: "AVALIAÇÕES NO GOOGLE", title: "O que dizem os clientes da Drica", subtitle: "Avaliações reais publicadas no perfil da Drica Viagens no Google." },
  },
  footer: DRICA_VIAGENS_PREVIEW_PROFILE.footer,
  newsletterMedia: { src: bardelliNewsletterPhoto, alt: "Praia de águas claras — imagem ilustrativa de viagem" },
  socialStrip: { title: "Encontre a Drica no Instagram", links: [{ network: "instagram", url: "https://www.instagram.com/dricaviagens" }] },
  seo: { title: "Apresentação completa — Drica Viagens", description: "Drica Viagens: viagens sob medida com Adriana Martins. Apresentação técnica sem envios." },
};
// Seções retiradas a pedido (15/10/2026): Xcaret, Visto americano, Portugal,
// Credenciais e conexões e Equipe e consultores.
delete DRICA_PRESENTATION_PROFILE.dmc;
delete DRICA_PRESENTATION_PROFILE.credentials;
delete DRICA_PRESENTATION_PROFILE.team;

/* ------------------------------------------------------------------ */
/* Bardelli Viagens — perfil OFICIAL (bardelliviagens.com.br).          */
/* Dados do briefing 18. Sem endereço residencial, CPF ou contrato.     */
/* O status "em construção" do domínio é controlado em agencySiteStatus. */
/* ------------------------------------------------------------------ */
export const BARDELLI_OFFICIAL_PROFILE: AgencySiteProfile = buildGoldStandardProfile("bardelliCurated", {
  navDensity: "compact",
  footer: {
    description: "Viagens de lazer personalizadas para famílias, casais e grupos de amigos. Planejamento antes e durante a viagem, com suporte por WhatsApp.",
    whatsapp: "(11) 97576-7319",
    phone: "(11) 97576-7319",
    email: "barbara@bardelliviagens.com.br",
    instagram: "https://www.instagram.com/bardelliviagens/",
    instagramLabel: "@bardelliviagens",
    legalName: "JP Serviços de Informação e Assessoramento em Turismo Ltda",
    cnpj: "09.475.657/0001-80",
  },
}, "Bardelli Viagens");
if (BARDELLI_OFFICIAL_PROFILE.about) {
  BARDELLI_OFFICIAL_PROFILE.about.title = "Uma viagem com a sua identidade, planejada com cuidado";
  BARDELLI_OFFICIAL_PROFILE.about.ownerName = "Barbara Bardelli";
  BARDELLI_OFFICIAL_PROFILE.about.text = [
    "A Bardelli Viagens nasceu em 2008 com um propósito claro: planejar viagens de lazer personalizadas para famílias, casais e grupos de amigos. À frente da agência, Barbara Bardelli reúne 33 anos de experiência no turismo.",
    "Cada roteiro começa por uma conversa: quem vai viajar, o ritmo desejado e o que tornaria essa viagem inesquecível. Estados Unidos e Canadá, parques temáticos como Walt Disney World e Universal, resorts e all-inclusive, Europa, Brasil, Ásia, Caribe e cruzeiros fazem parte das especialidades.",
    "O atendimento acompanha você antes e durante a viagem, com suporte pelo WhatsApp para que cada detalhe esteja resolvido e você aproveite com tranquilidade.",
  ].join("\n\n");
}
BARDELLI_OFFICIAL_PROFILE.signature = { ...BARDELLI_PRESENTATION_PROFILE.signature! };
BARDELLI_OFFICIAL_PROFILE.copy = { ...BARDELLI_PRESENTATION_PROFILE.copy };
BARDELLI_OFFICIAL_PROFILE.inspirationDialog = BARDELLI_PRESENTATION_PROFILE.inspirationDialog;
BARDELLI_OFFICIAL_PROFILE.newsletterMedia = BARDELLI_PRESENTATION_PROFILE.newsletterMedia;
BARDELLI_OFFICIAL_PROFILE.socialStrip = { title: "Siga-nos nas redes", links: [{ network: "instagram", url: "https://www.instagram.com/bardelliviagens/" }] };
// Site oficial: sem modo apresentação (formulários reais) e sem blocos que
// dependem de confirmação da agência (Portugal, equipe, pontos do concierge).
BARDELLI_OFFICIAL_PROFILE.presentation = false;
BARDELLI_OFFICIAL_PROFILE.demo = false;
delete BARDELLI_OFFICIAL_PROFILE.dmc;
delete BARDELLI_OFFICIAL_PROFILE.team;
delete BARDELLI_OFFICIAL_PROFILE.testimonials;
delete BARDELLI_OFFICIAL_PROFILE.conciergePoints;
BARDELLI_OFFICIAL_PROFILE.sections = { ...BARDELLI_OFFICIAL_PROFILE.sections, dmc: { enabled: false }, team: { enabled: false }, testimonials: { enabled: false } };
BARDELLI_OFFICIAL_PROFILE.nav = (BARDELLI_OFFICIAL_PROFILE.nav ?? []).filter((n) => n.to !== "/dmc-portugal");
BARDELLI_OFFICIAL_PROFILE.seo = { title: "Bardelli Viagens — viagens de lazer personalizadas", description: "Viagens personalizadas para famílias, casais e grupos de amigos: Disney, Universal, Xcaret, resorts, cruzeiros e Europa. Desde 2008." };

export interface AdsBriefingPreviewFixture {
  jobId: string;
  info: AgencyDomainInfo;
  profile: AgencySiteProfile;
  notice: string;
  documentTitle: string;
  realAgency: boolean;
  /** Páginas internas opcionais da prévia (off por padrão). */
  pages?: {
    xcaret?: { slots: XcaretMediaSlots; textRewrites?: [string, string][] };
    resorts?: { title?: string };
    orlandoTickets?: boolean;
    visa?: boolean;
    dmc?: boolean;
    editorial?: boolean;
  };
}

const ADS_PREVIEW_FIXTURES: Record<string, AdsBriefingPreviewFixture> = {
  [DRICA_PRESENTATION_JOB_ID]: {
    jobId: DRICA_PRESENTATION_JOB_ID, info: DRICA_PRESENTATION_INFO, profile: DRICA_PRESENTATION_PROFILE,
    notice: "Drica Viagens · apresentação completa para revisão · conteúdo ilustrativo identificado · sem envios ou publicação",
    documentTitle: "Apresentação completa — Drica Viagens", realAgency: true,
    pages: { resorts: { title: "Explore os resorts do Brasil" }, orlandoTickets: true, editorial: true },
  },
  [BARDELLI_PRESENTATION_JOB_ID]: {
    jobId: BARDELLI_PRESENTATION_JOB_ID, info: BARDELLI_PRESENTATION_INFO, profile: BARDELLI_PRESENTATION_PROFILE,
    notice: "Bardelli Viagens · apresentação para revisão · textos e serviços ilustrativos a confirmar · nenhum envio real",
    documentTitle: "Apresentação completa — Bardelli Viagens", realAgency: true,
    pages: { xcaret: { slots: GENERIC_XCARET_SLOTS, textRewrites: BARDELLI_XCARET_REWRITES }, resorts: { title: "Explore os resorts do Brasil com a Bardelli Viagens" }, orlandoTickets: true, visa: true, dmc: true, editorial: true },
  },
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
    pages: {
      xcaret: { slots: MUNDO_EM_CORES_XCARET_SLOTS, textRewrites: MUNDO_EM_CORES_XCARET_REWRITES },
      resorts: { title: "Explore os resorts do Brasil com a O Mundo em Cores" },
      orlandoTickets: true,
    },
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
