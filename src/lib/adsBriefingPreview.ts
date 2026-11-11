/**
 * Prévia técnica da fixture ADS "ads-email-test-v1" (agência FICTÍCIA).
 * Conteúdo 100% local: nenhum tenant, conta ou cadastro real é consultado.
 * Servida apenas no host técnico id-preview (e localhost de desenvolvimento).
 */
import { buildGoldStandardProfile } from "@/lib/goldStandardSiteTemplate";
import { EDITORIAL_ROSE } from "@/lib/agencyReferenceProfiles";
import bardelliLogo from "@/assets/whitelabel/logo-bardelli-viagens.png.asset.json";
import bardelliNewsletterPhoto from "@/assets/whitelabel/hero-praia.jpg";
import dricaNewsletterLondon from "@/assets/presentation/drica/london-newsletter.jpg";
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
 * A foto do monumento "Xcaret México 35 anos" (IMG_1646) aparece de propósito em
 * dois pontos da mesma página — a foto inferior da galeria de "Atendimento
 * pessoal" e o fechamento — escolha de Fernando em 22/10/2026. A foto anterior
 * da galeria (letreiro do Xel-Há, IMG_0749) continua importada para reversão.
 */
export const MUNDO_EM_CORES_XCARET_SLOTS: XcaretMediaSlots = {
  portraitJuliana: { src: mundoXcaretParque.url, alt: "Vanessa Figueiredo no parque Xcaret, junto à placa Xcaret México", source: "Acervo pessoal de Vanessa Figueiredo (IMG_1656)" },
  trainingPhoto: { src: mundoXcaretDrink.url, alt: "Vanessa Figueiredo brindando com um drinque diante do mar do Caribe", source: "Acervo pessoal de Vanessa Figueiredo" },
  julianaExtra: { src: mundoXcaretFechamento.url, alt: "Vanessa Figueiredo atrás do monumento Xcaret México 35 anos, sob o arco de borboletas", source: "Acervo pessoal de Vanessa Figueiredo (IMG_1646)" },
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
import mundoXcaretCardNatureza from "@/assets/ads-preview/mundo-xcaret-card-natureza.webp.asset.json";
import mundoXcaretCardCaribe from "@/assets/ads-preview/mundo-xcaret-card-caribe.webp.asset.json";
import mundoXcaretCardChichen from "@/assets/ads-preview/mundo-xcaret-card-chichen.webp.asset.json";
import mundoXcaretCardMexico from "@/assets/ads-preview/mundo-xcaret-card-mexico.webp.asset.json";
import mundoXcaretRoteiro from "@/assets/ads-preview/mundo-xcaret-roteiro.webp.asset.json";
import mundoXcaretCardXelha from "@/assets/ads-preview/mundo-xcaret-card-xelha.webp.asset.json";
import mundoXcaretXelha from "@/assets/ads-preview/mundo-xcaret-vanessa-xelha.webp.asset.json";
import mundoXcaretXplor from "@/assets/ads-preview/mundo-xcaret-vanessa-xplor.webp.asset.json";
import mundoXcaretDrink from "@/assets/ads-preview/mundo-xcaret-drink.webp.asset.json";
import mundoXcaretMontagem from "@/assets/ads-preview/mundo-xcaret-montagem-home.png.asset.json";

/**
 * Modelo salvo: galeria estilo Stories do Instagram (tracinhos de progresso,
 * 5 s por foto). Para reutilizar em outra seção/agência, use em
 * featuredExperience: `gallery`, `galleryStyle: "stories"`, `galleryIntervalMs`.
 * Componente: src/components/whitelabel/AgencyStoriesGallery.tsx.
 */
export const MUNDO_EM_CORES_XCARET_STORIES_GALLERY = {
  gallery: [
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
    { src: mundoXcaretGalF103.url, alt: "Vanessa Figueiredo em hotel Xcaret com o selo Xperts Xcaret 2026" },
  ],
  galleryStyle: "stories" as const,
  galleryIntervalMs: 5000,
  badge: { src: xpertsXcaretBadge.url, alt: "Selo Xperts Xcaret" },
};
import logoAsset from "@/assets/ads-preview/ads-email-test-v1-logo.png.asset.json";
import mundoEmCoresLogo from "@/assets/ads-preview/mundo-em-cores-briefing-14-logo.png.asset.json";
// Real personal photographs from https://omundoemcores.com.br/wp-content/uploads/2024/07/Vanessa.png
import mundoEmCoresVanessa from "@/assets/ads-preview/mundo-em-cores-vanessa-oficial.png.asset.json";
import mundoEmCoresVanessaMural from "@/assets/ads-preview/mundo-em-cores-vanessa-mural.png.asset.json";
import dricaViagensLogo from "@/assets/ads-preview/briefing-16-v1-logo.png.asset.json";
import viajarTirismoLogo from "@/assets/ads-preview/briefing-17-v1-logo.png.asset.json";
import bagagemNaMaoLogo from "@/assets/ads-preview/briefing-19-v1-logo.png.asset.json";
import curtiViagensLogo from "@/assets/ads-preview/briefing-20-v1-logo.png.asset.json";
import curtiRicardoMural from "@/assets/whitelabel/curti/curti-ricardo-mural-v2.jpg.asset.json";
import curtiRicardoAvatar from "@/assets/whitelabel/curti/curti-ricardo-avatar.png.asset.json";
import curtiCert01 from "@/assets/whitelabel/curti/curti-certificado-01.jpg.asset.json";
import curtiCert02 from "@/assets/whitelabel/curti/curti-certificado-02.jpg.asset.json";
import curtiCert03 from "@/assets/whitelabel/curti/curti-certificado-03.jpg.asset.json";
import curtiCert04 from "@/assets/whitelabel/curti/curti-certificado-04.jpg.asset.json";
import curtiCert05 from "@/assets/whitelabel/curti/curti-certificado-05.jpg.asset.json";
import curtiCert06 from "@/assets/whitelabel/curti/curti-certificado-06.jpg.asset.json";
import curtiCert07 from "@/assets/whitelabel/curti/curti-certificado-07.jpg.asset.json";
import curtiCert08 from "@/assets/whitelabel/curti/curti-certificado-08.jpg.asset.json";
import curtiCert09 from "@/assets/whitelabel/curti/curti-certificado-09.jpg.asset.json";
import curtiCert10 from "@/assets/whitelabel/curti/curti-certificado-10.jpg.asset.json";
import curtiCert11 from "@/assets/whitelabel/curti/curti-certificado-11.jpg.asset.json";
import curtiCert12 from "@/assets/whitelabel/curti/curti-certificado-12.jpg.asset.json";
import curtiCert13 from "@/assets/whitelabel/curti/curti-certificado-13.jpg.asset.json";
import curtiCert14 from "@/assets/whitelabel/curti/curti-certificado-14.jpg.asset.json";
import curtiRicardoEpcot from "@/assets/whitelabel/curti/curti-ricardo-epcot.png.asset.json";
import essyaTurLogo from "@/assets/whitelabel/logo-essya-tur.png.asset.json";
import essyaCristiane from "@/assets/whitelabel/essya/essya-cristiane.png.asset.json";
const karibuLogo = { url: "/karibu-logo.png" };
import arenaLogo from "@/assets/ads-preview/briefing-23-v1-logo.jpeg.asset.json";
import innovatiLogo from "@/assets/ads-preview/briefing-24-v1-logo.png.asset.json";
import { deriveTertiaryColor } from "@/lib/brandTheme";

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
      title: "Na Mundo em Cores, você encontra as principais companhias de cruzeiros do mundo.",
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
    { label: "Oportunidades de Novembro", to: "/oportunidades-novembro" },
    { label: "Especialidades", to: "/#campanhas", children: [
      { label: "Disney", to: "/disney" },
      { label: "Universal Orlando", to: "/universal" },
      { label: "Xcaret", to: "/xcaret" },
      { label: "Resorts no Brasil", to: "/resorts-brasil" },
      { label: "Cruzeiros 26 e 27", to: "/cruzeiros/temporada-brasileira-2026-2027" },
    ] },
    { label: "Destinos", to: "/#destinos" },
    { label: "Sobre", to: "/#sobre", children: [
      { label: "Quem somos", to: "/#sobre" },
      { label: "Avaliações do Google", to: "/#avaliacoes" },
      { label: "Dúvidas frequentes", to: "/#faq" },
    ] },
  ],
  sections: {
    dmc: { enabled: false },
    offers: { enabled: false },
    credentials: { enabled: false },
    team: { enabled: false },
    avaliacoes: { enabled: true, order: 8 },
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
    testimonials: { enabled: false },
    faq: { enabled: true, order: 9 },
    newsletter: { enabled: true, order: 10 },
  },
  heroImage: "europa",
  heroPresentation: { kicker: "VIAGEM DESENHADA PARA VOCÊ", overlay: "none", actionsPlacement: "right", titleWeight: "regular" },
  requestCenter: { title: "Por onde você quer começar?", titlePlacement: "above-card" },
  resortsMap: { enabled: true },
  featuredExperience: {
    enabled: true,
    id: "experiencia-xcaret",
    kicker: "ESPECIALISTA XPERTS XCARET",
    // Texto enviado pela agência em 22/10/2026 (usado na íntegra).
    title: "Sou uma agente especialista Xcaret",
    description:
      "Em set/2026, Vanessa foi convidada a integrar o programa Xperts, que seleciona agentes de viagens de todo o Brasil para se tornarem especialistas no destino. Ela passou por uma imersão na Riviera Maya, vivenciou os parques e hotéis do Grupo Xcaret, concluiu a capacitação e recebeu o selo Xperts Xcaret.\n\nHoje ela usa essa experiência para desenhar viagens que combinem com o seu ritmo, seja em família, entre amigos, a dois ou para celebrar uma data especial.",
    // Montagem enviada pela agência (21/10/2026), com o selo já na arte.
    // A galeria Stories anterior está salva em MUNDO_EM_CORES_XCARET_STORIES_GALLERY.
    mainImage: { src: mundoXcaretMontagem.url, alt: "Montagem: Vanessa Figueiredo no letreiro Xcaret México 35 anos, selo Xperts Xcaret 2026 e fotos no Xplor, Xel-Há, nas águas do parque e com vista para o mar do Caribe", fit: "contain" },
    consultantImage: null,
    highlights: ["Visita recente ao destino", "Selo Xperts Xcaret", "Parques e hotéis Xcaret", "Planejamento personalizado"],
    ctaLabel: "Saiba mais sobre este destino",
    ctaHref: "/xcaret",
    // Fernando (11/11/2026): no celular, a montagem vem entre o título e os parágrafos.
    mobileGalleryAboveText: true,
  },
  hero: [
    { title: "Viagem desenhada para você.", subtitle: "Roteiros sob medida, criados a partir do seu jeito de viajar, com acompanhamento antes, durante e depois.", image: "heroMundoPlacasFoto", focalPoint: "mundoPlacas", order: 1, enabled: true },
    { title: "Existe uma Europa para cada pessoa.", subtitle: "Desenhamos a sua, no seu ritmo, para você viver a sua própria história.", image: "heroMundoEuropaFoto", order: 2, enabled: true },
    { title: "Viajar em boa companhia.", subtitle: "Grupos acompanhados para quem quer descobrir o mundo com segurança e novas amizades.", image: "heroMundoGrupoFoto", focalPoint: "mundoGrupoFaces", order: 3, enabled: true },
  ],
  signature: {
    kicker: "O MUNDO EM CORES",
    title: "Uma viagem com a sua personalidade.",
    text: "Tudo começa com uma conversa sobre suas preferências, seu ritmo e o que você deseja viver. Juntos, planejamos roteiro, hospedagem e experiências, com orientação e suporte em cada etapa.",
  },
  destinations: [
    { key: "europa", image: "heroVarenna", label: "Itália e Europa", title: "Existe uma Europa para cada pessoa", text: "Da Itália a outros cantos da Europa, desenhamos um roteiro com a sua cara: no seu ritmo, com liberdade ou em circuito, para viver a sua própria história.", service: "pacotes", enabled: true, order: 1 },
    { key: "grecia-grupo", image: "mundoGreciaVanessa", label: "Grupo acompanhado", title: "Grécia em Boa Companhia", text: "Saída em grupo de 20 a 28 de junho, com acompanhamento da Vanessa. Programa completo em breve; peça já as informações.", service: "pacotes", enabled: true, order: 2 },
    { key: "orlando-grupo", image: "orlandoMagicKingdom", label: "Grupo acompanhado", title: "Orlando em grupo", text: "Parques em boa companhia, com organização de ingressos, hospedagem e deslocamentos. Datas em confirmação.", service: "ingressos", enabled: true, order: 3 },
    { key: "cruzeiros", image: "mundoNclDestaque", label: "Destaque NCL", title: "Cruzeiros com a NCL", text: "Navios da Norwegian Cruise Line e de outras companhias pelo Caribe, Mediterrâneo e muito mais, escolhidos para o seu perfil.", service: "cruzeiros", enabled: true, order: 4 },
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
    // Texto enviado pela agência em 22/10/2026 (usado na íntegra).
    text: "Olá, eu sou a Vanessa Figueiredo.\n\nHá 29 anos transformo sonhos em viagens. Nos últimos 14, faço isso à frente da minha agência, a O Mundo em Cores · Studio de Viagens.\n\nNesse caminho, aprendi que conhecimento não se acumula: se renova. Vivo em constante aprendizado sobre destinos, passeios e novidades, e conquistei certificações como Xcaret Expert, Disney, Universal e de companhias de cruzeiros, entre outras.\n\nTambém visito pessoalmente muitos dos hotéis que indico, para conhecer de perto cada quarto, cada detalhe e cada experiência. É essa curadoria atenta que me permite ir além do óbvio e construir roteiros sob medida, com as dicas e sugestões que fazem toda a diferença na viagem de cada pessoa.\n\nTurismo é a profissão que escolhi, e que sinto que também me escolheu. A cada embarque, eu cuido, planejo, vibro, sonho e viajo junto.\n\nCada cliente que volta com os olhos brilhando, cada família que vive um momento inesquecível, cada “foi a viagem da minha vida”... tudo isso volta para mim em bênçãos e alegria. O que eu faço não é só trabalho: é parte de quem eu sou.\n\nAcredito que cada pessoa é única, com seus gostos e seu jeito de viver o mundo. Assim também devem ser as suas viagens.\n\nSeja bem-vindo(a) à O Mundo em Cores.",
    tagline: "Consultoria exclusiva · Experiências sob medida",
    badge: { value: "29 anos", label: "de experiência no turismo" },
    images: [{ src: mundoEmCoresVanessa.url, alt: "Vanessa Figueiredo em fotografias pessoais de suas viagens, publicadas em seu site oficial", aspect: "square" }],
    mural: { src: mundoEmCoresVanessaMural.url, alt: "Mural de fotos de viagens da Vanessa Figueiredo" },
    visitedDestinations: { title: "Destinos que já conheci", names: ["Brasil", "Estados Unidos", "Canadá", "México", "Itália", "Suíça", "Espanha", "Portugal", "Inglaterra", "Montenegro", "Croácia", "França", "Argentina", "Chile", "Paraguai", "Bahamas", "República Dominicana", "Colômbia", "Vaticano", "Eslovênia", "Ilhas Virgens Britânicas"], presentation: "flags" },

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
    avaliacoes: { kicker: "EXPERIÊNCIAS REAIS", title: "O que os clientes dizem sobre viajar conosco", subtitle: "Avaliações reais de clientes que confiaram à Vanessa o planejamento das suas viagens." },
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
    hours: "Horário de atendimento:\nSegunda a sexta: 09:00–18:30\nSábado e domingo: fechado",
    description: "Viagens personalizadas, cruzeiros, experiências em família e pequenos grupos. Planejamento cuidadoso e uma conversa próxima com a Vanessa, do primeiro contato ao retorno.",
    descriptionHidden: true,
    whatsapp: "(11) 99995-4734",
    // O número não aparece mais no rodapé (pedido do Fernando em 22/10/2026): só o link "WhatsApp".
    // Número para retorno telefônico: (11) 99995-4734
    whatsappLabel: "WhatsApp",
    phoneHidden: true,
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
    hours: "Segunda a sexta, das 9h às 18h",
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

export const BAGAGEM_NA_MAO_PREVIEW_JOB_ID = "briefing-19-v1";
export const BAGAGEM_NA_MAO_PREVIEW_PATH = `/ads-briefing-preview/${BAGAGEM_NA_MAO_PREVIEW_JOB_ID}`;
/**
 * Host sintético exclusivo. A agência real foi localizada no cadastro
 * (public_slug bagagem-na-mao-viagens), mas NÃO tem agency_public_domains:
 * esta fixture não usa o user_id real e não cria domínio, conta ou vínculo.
 */
export const BAGAGEM_NA_MAO_PREVIEW_HOST = "briefing-19-v1.preview.local";

export const BAGAGEM_NA_MAO_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-000000000019",
  agency_slug: "",
  public_slug: null,
  hostname: BAGAGEM_NA_MAO_PREVIEW_HOST,
  is_primary: false,
  agency_name: "Bagagem na Mão Viagens",
  owner_name: "Márcia Baccarini",
  logo_url: bagagemNaMaoLogo.url,
  cover_image_url: null,
  primary_color: "#27C7C3",
  secondary_color: "#FF9418",
  secondary_auto: false,
  // Terciária suave explícita: com secundária manual, o modo automático do
  // brandTheme usaria a secundária cheia (#FF9418) como fundo — forte demais.
  // Valor = deriveTertiaryColor(#27C7C3): primária a ~12% sobre branco.
  tertiary_color: "#E5F8F8",
  tertiary_auto: false,
  on_secondary_color: null,
  // Contatos aparecem somente como texto no rodapé; CTAs ficam bloqueados.
  phone: null,
  city: "Rio de Janeiro",
  state: "RJ",
  bio: null,
  cnpj: "64.731.514/0001-08",
  whatsapp_group_url: null,
};

const bagagemNaMaoBaseline = buildGoldStandardProfile("bagagemNaMaoBriefing19", {
  navDensity: "compact",
  // Sem página de visto americano nesta prévia.
  visaHome: false,
  // Sem dados confirmados de Xcaret: a seção editorial Xcaret não entra.
  featuredExperience: undefined,
  nav: [
    { label: "Início", to: "/" },
    { label: "Especialidades", to: "/#assinatura", children: [
      { label: "Orlando e parques", to: "/ingressos-orlando" },
      { label: "Resorts no Brasil", to: "/resorts-brasil" },
      { label: "Cruzeiros", to: "/#autoridade" },
    ] },
    { label: "Destinos", to: "/#destinos" },
    { label: "Sobre", to: "/#sobre" },
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
  },
  heroPresentation: {
    kicker: "UM JEITO NOVO DE VIAJAR · RIO DE JANEIRO · DESDE 2014",
    overlay: "strongLeft",
  },
  hero: [
    { title: "Seu jeito novo de viajar começa aqui", subtitle: "Viagens sob medida planejadas com escuta e cuidado, do primeiro contato ao retorno.", image: "heroAirportTraveler", order: 1, enabled: true },
    { title: "Orlando e parques em cada detalhe", subtitle: "Parques, hospedagem e deslocamentos organizados para a família aproveitar cada dia.", image: "orlandoMagicKingdom", order: 2, enabled: true },
    { title: "Europa e cruzeiros do seu jeito", subtitle: "Roteiros pela Europa e cruzeiros — incluindo Disney Cruise Line — escolhidos para o seu perfil.", image: "heroVarenna", order: 3, enabled: true },
  ],
  signature: {
    kicker: "UM JEITO NOVO DE VIAJAR",
    title: "Viagens sob medida, planejadas com escuta e cuidado.",
    text: "Desde 2014, a Bagagem na Mão Viagens desenha roteiros a partir do perfil de quem viaja: famílias e parques, viagens internacionais, resorts e cruzeiros, com atenção a cada detalhe.",
  },
  destinations: [
    { key: "eua-canada", image: "orlandoMagicKingdom", label: "América do Norte", title: "Estados Unidos e Canadá", text: "Parques, cidades e natureza em roteiros organizados para o ritmo da sua família.", service: "pacotes", enabled: true, order: 1 },
    { key: "europa", image: "heroVarenna", label: "Europa", title: "Europa do seu jeito", text: "Cidades clássicas e novas descobertas em viagens planejadas no seu ritmo.", service: "pacotes", enabled: true, order: 2 },
    { key: "resorts-all-inclusive", image: "resort", label: "Resorts", title: "Resorts e all-inclusive", text: "Hospedagens com estrutura completa para descansar e aproveitar sem preocupação.", service: "hospedagem", enabled: true, order: 3 },
    { key: "parques", image: "parques", label: "Parques e entretenimento", title: "Orlando e parques", text: "Disney, Universal e outras experiências com ingressos, hospedagem e logística combinados.", service: "ingressos", enabled: true, order: 4 },
    { key: "cruzeiros", image: "cruzeiroDisneyWish", label: "Cruzeiros", title: "Cruzeiros e Disney Cruise Line", text: "Navios, cabines e itinerários comparados para uma viagem no mar do seu jeito.", service: "cruzeiros", enabled: true, order: 5 },
  ],
  modules: [
    { key: "sob-medida", title: "Viagens sob medida", text: "Roteiros criados a partir das preferências, do ritmo e das prioridades de quem viaja.", service: "pacotes", image: "heroVarenna", enabled: true, order: 1 },
    { key: "familias-parques", title: "Famílias e parques", text: "Orlando e outras experiências em família, com cada dia pensado para todas as idades.", service: "ingressos", image: "orlandoMagicKingdom", enabled: true, order: 2 },
    { key: "internacionais", title: "Viagens internacionais", text: "Estados Unidos, Canadá, Europa e outros destinos com planejamento completo.", service: "pacotes", image: "europa", enabled: true, order: 3 },
    { key: "resorts", title: "Resorts e all-inclusive", text: "Hospedagens selecionadas para descansar com conforto e aproveitar cada momento.", service: "hospedagem", image: "resort", enabled: true, order: 4 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Orientação para escolher navio, cabine e itinerário, da Disney Cruise Line a outras companhias.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 5 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Márcia Baccarini, fundadora e CEO da Bagagem na Mão Viagens.",
    text: "A Bagagem na Mão Viagens nasceu em 2014 com uma proposta clara: um jeito novo de viajar, com planejamento sob medida e atendimento próximo. À frente da agência, a fundadora e CEO Márcia Baccarini conduz cada viagem com escuta e cuidado.\n\nO atendimento é dedicado a viagens sob medida, famílias e parques e viagens internacionais, com prioridades em Estados Unidos e Canadá, Europa, resorts e all-inclusive, parques e entretenimento e cruzeiros.\n\nDa primeira conversa ao retorno, cada roteiro é desenhado a partir do perfil de quem viaja, com orientação clara em cada escolha.",
    badge: { value: "Desde 2014", label: "Bagagem na Mão Viagens" },
    media: "hidden",
    showLocation: true,
    ownerName: "Márcia Baccarini",
  },
  differentials: [
    { title: "Escuta de verdade", text: "Cada roteiro começa por uma conversa sobre quem viaja, o ritmo e as prioridades da viagem.", icon: "consultivo" },
    { title: "Planejamento sob medida", text: "Destinos, hotéis e serviços escolhidos conforme o perfil e o investimento desejado.", icon: "conferido" },
    { title: "Especialidades claras", text: "Estados Unidos e Canadá, Europa, resorts, parques e cruzeiros com orientação dedicada.", icon: "fornecedores" },
    { title: "Acompanhamento próximo", text: "Suporte antes, durante e depois da viagem, combinado conforme o serviço contratado.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Uma conversa para entender quem vai viajar, as preferências e o ritmo desejado.",
    "Curadoria de destinos, hospedagens e serviços alinhados ao perfil da viagem.",
    "Apresentação clara das opções e ajustes antes das reservas.",
    "Acompanhamento antes, durante e depois da viagem.",
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "O atendimento começa por uma conversa sobre o perfil dos viajantes, as datas e o que desejam viver. A partir daí, a proposta é montada sob medida." },
    { q: "Quais são as especialidades da agência?", a: "Viagens sob medida, famílias e parques e viagens internacionais, com prioridades em Estados Unidos e Canadá, Europa, resorts e all-inclusive, parques e entretenimento e cruzeiros." },
    { q: "A agência planeja viagens para Orlando e parques?", a: "Sim. Parques e entretenimento são uma das ênfases da agência, com organização de ingressos, hospedagem e deslocamentos conforme o ritmo da família." },
    { q: "Há acompanhamento durante a viagem?", a: "O suporte antes, durante e depois da viagem é combinado conforme o serviço contratado. Converse com a agência para entender como funciona na sua viagem." },
    { q: "Onde a agência atende?", a: "A Bagagem na Mão Viagens fica na Rua Conde de Bonfim, 211, sala 412, na Tijuca, Rio de Janeiro/RJ, e também atende pelos canais digitais." },
  ],
  copy: {
    destinations: { title: "Destinos para a sua próxima viagem", subtitle: "Estados Unidos e Canadá, Europa, resorts, parques e cruzeiros planejados para o seu perfil." },
    modules: { title: "Especialidades", subtitle: "Viagens sob medida, famílias e parques, viagens internacionais, resorts e cruzeiros." },
    differentials: { title: "Um jeito novo de viajar", subtitle: "Escuta, planejamento sob medida e acompanhamento em cada etapa." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa ao retorno", subtitle: "Um processo próximo e claro, conduzido pela agência." },
    faq: { title: "Dúvidas frequentes" },
  },
  socialStrip: {
    title: "Siga-nos nas redes",
    links: [{ network: "instagram", url: "https://www.instagram.com/bagagemnamaoviagens/" }],
  },
  footer: {
    description: "Viagens sob medida, famílias e parques e viagens internacionais. Um jeito novo de viajar, desde 2014.",
    whatsapp: "(21) 98855-9515",
    phone: "(21) 98855-9515",
    email: "bagagemnamaoviagens@gmail.com",
    instagram: "https://www.instagram.com/bagagemnamaoviagens/",
    instagramLabel: "@bagagemnamaoviagens",
    address: "Rua Conde de Bonfim, 211 — Sala 412 — Tijuca — Rio de Janeiro/RJ",
    legalName: "Bagagem na Mão Viagens Ltda",
    cnpj: "64.731.514/0001-08",
    showLocation: true,
  },
  seo: {
    title: "Prévia para revisão — Bagagem na Mão Viagens",
    description: "Prévia técnica revisável do site Bagagem na Mão Viagens.",
  },
}, "Bagagem na Mão Viagens");
// Sem páginas especiais Xcaret, DMC Portugal ou Visto nesta prévia.
delete bagagemNaMaoBaseline.dmc;
delete bagagemNaMaoBaseline.credentials;
delete bagagemNaMaoBaseline.team;
/** Isolated review copy: source imagery stays provisional with original attribution. */
const bagagemMundoSource: AgencySiteProfile = JSON.parse(JSON.stringify(MUNDO_EM_CORES_PREVIEW_PROFILE));
export const BAGAGEM_NA_MAO_PREVIEW_PROFILE: AgencySiteProfile = {
  ...bagagemMundoSource, key: "bagagemNaMaoBriefing19",
  nav: bagagemMundoSource.nav?.filter(item => item.to !== "/oportunidades-novembro"),
  heroPresentation: { ...bagagemMundoSource.heroPresentation, kicker: "BAGAGEM NA MÃO · UM JEITO NOVO DE VIAJAR" },
  hero: bagagemMundoSource.hero?.map((slide, index) => ({
    ...slide, title: bagagemNaMaoBaseline.hero?.[index]?.title ?? slide.title,
    subtitle: bagagemNaMaoBaseline.hero?.[index]?.subtitle ?? slide.subtitle,
  })),
  signature: bagagemNaMaoBaseline.signature,
  modules: bagagemMundoSource.modules?.map((item, index) => ({
    ...item, title: bagagemNaMaoBaseline.modules?.[index]?.title ?? item.title,
    text: bagagemNaMaoBaseline.modules?.[index]?.text ?? item.text,
    service: bagagemNaMaoBaseline.modules?.[index]?.service ?? item.service,
  })),
  destinations: bagagemMundoSource.destinations?.map((item, index) => {
    const content = bagagemNaMaoBaseline.destinations?.[index];
    return { ...item, ...(content ?? { key: "resorts-brasil", label: "Brasil", title: "Resorts no Brasil",
      text: "Hospedagens para descansar e aproveitar no seu ritmo, com orientação da Bagagem na Mão.", service: "hospedagem" }),
      image: item.image, order: item.order };
  }),
  about: { ...bagagemMundoSource.about, ...bagagemNaMaoBaseline.about, media: undefined,
    images: bagagemMundoSource.about?.images, mural: bagagemMundoSource.about?.mural,
    visitedDestinations: undefined, tagline: "Viagens sob medida · Escuta e cuidado" },
  featuredExperience: bagagemMundoSource.featuredExperience ? { ...bagagemMundoSource.featuredExperience,
    kicker: "DESCUBRA A RIVIERA MAYA", title: "Parques e hotéis Xcaret para a sua próxima viagem",
    description: "Converse com a Bagagem na Mão para conhecer as possibilidades de parques, hotéis e experiências Xcaret e planejar uma viagem de acordo com suas preferências.",
    highlights: ["Parques e hotéis", "Viagens em família", "Planejamento sob medida"] } : undefined,
  authority: bagagemMundoSource.authority ? { ...bagagemMundoSource.authority,
    companies: bagagemMundoSource.authority.companies ? { ...bagagemMundoSource.authority.companies,
      title: "Planeje seu próximo cruzeiro com a Bagagem na Mão Viagens." } : undefined } : undefined,
  differentials: bagagemNaMaoBaseline.differentials, conciergeSteps: bagagemNaMaoBaseline.conciergeSteps,
  faq: bagagemNaMaoBaseline.faq,
  copy: { ...bagagemMundoSource.copy, ...bagagemNaMaoBaseline.copy,
    modules: { ...bagagemNaMaoBaseline.copy?.modules, cta: "Conversar com a Márcia" },
    concierge: { ...bagagemNaMaoBaseline.copy?.concierge, cta: "Conversar com a Márcia" },
    avaliacoes: { title: "Experiências de quem viaja com a Bagagem na Mão" },
    testimonials: undefined,
    newsletter: { title: "Novidades da Bagagem na Mão", subtitle: "Converse com a Márcia sobre destinos e possibilidades para sua próxima viagem.", cta: "Quero saber mais" },
  },
  footer: bagagemNaMaoBaseline.footer, socialStrip: bagagemNaMaoBaseline.socialStrip,
  testimonials: undefined, inspirationDialog: undefined, seo: bagagemNaMaoBaseline.seo,
};

export const CURTI_VIAGENS_PREVIEW_JOB_ID = "briefing-20-v1";
export const CURTI_VIAGENS_PREVIEW_PATH = `/ads-briefing-preview/${CURTI_VIAGENS_PREVIEW_JOB_ID}`;
/**
 * Host sintético exclusivo. A continuidade com o cadastro real foi confirmada
 * apenas por CNPJ exato (35.133.431/0001-00) + nome CURTI VIAGENS; a fixture
 * não usa o user_id real e não cria domínio, conta ou vínculo.
 */
export const CURTI_VIAGENS_PREVIEW_HOST = "briefing-20-v1.preview.local";

export const CURTI_VIAGENS_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-000000000020",
  agency_slug: "",
  public_slug: null,
  hostname: CURTI_VIAGENS_PREVIEW_HOST,
  is_primary: false,
  agency_name: "Curti Viagens",
  owner_name: "Ricardo Curti",
  logo_url: curtiViagensLogo.url,
  cover_image_url: null,
  primary_color: "#2502FF",
  secondary_color: "#639682",
  secondary_auto: false,
  // Terciária suave: primária a ~12% sobre branco.
  tertiary_color: "#E5E1FF",
  tertiary_auto: false,
  on_secondary_color: null,
  phone: null,
  city: "Holambra",
  state: "SP",
  bio: null,
  cnpj: "35.133.431/0001-00",
  whatsapp_group_url: null,
};

const curtiViagensBaseline = buildGoldStandardProfile("curtiViagensBriefing20", {
  navDensity: "compact",
  visaHome: false,
  featuredExperience: undefined,
  nav: [
    { label: "Início", to: "/" },
    { label: "Sobre", to: "/#sobre" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Parques Orlando", to: "/ingressos-orlando" },
    { label: "Cruzeiros", to: "/#autoridade" },
    { label: "Resorts Brasil", to: "/#resorts" },
    { label: "Blog", to: "/blog" },
  ],
  sections: {
    // Ordem pedida por Fernando (02/11/2026).
    signature: { enabled: true, order: 1 },
    blog: { enabled: true, order: 2 },
    destinations: { enabled: true, order: 3 },
    modules: { enabled: false },
    orlando: { enabled: true, order: 4 },
    highlights: { enabled: false },
    resorts: { enabled: true, order: 6 },
    authority: { enabled: true, order: 5 },
    about: { enabled: true, order: 7 },
    differentials: { enabled: true, order: 8 },
    concierge: { enabled: true, order: 10 },
    faq: { enabled: true, order: 11 },
    avaliacoes: { enabled: true, order: 12 },
    newsletter: { enabled: true, order: 13 },
    dmc: { enabled: false },
    offers: { enabled: false },
    credentials: { enabled: false },
    team: { enabled: false },
    testimonials: { enabled: false },
    sports: { enabled: false },
  },
  heroPresentation: {
    kicker: "HOLAMBRA · SP · DESDE 2013",
    overlay: "strongLeft",
    titleWeight: "regular",
  },
  hero: [
    { title: "Viaje com tranquilidade, nós cuidamos de cada detalhe", subtitle: "Planejamento completo e personalizado para você viver a viagem sem preocupações.", image: "curtiHolambra", order: 1, enabled: true },
    { title: "Memórias em família, de Orlando ao mundo", subtitle: "Roteiro dia a dia para Orlando e orientação próxima para viajar com as crianças.", image: "orlandoMagicKingdom", order: 2, enabled: true },
    { title: "Europa, resorts e cruzeiros sob medida", subtitle: "Viagens desenhadas para o seu perfil, com suporte durante toda a viagem.", image: "heroVarenna", order: 3, enabled: true },
  ],
  signature: {
    kicker: "CONSULTORIA COMPLETA DE VIAGENS",
    title: "Planejamento completo para você viajar com tranquilidade.",
    text: "A Curti Viagens oferece consultoria completa para diferentes viagens: destinos nacionais, internacionais e roteiros sob medida para casais, famílias com crianças e viajantes de alto padrão, com atendimento próximo e orientação especializada.",
  },
  destinations: [
    { key: "brasil", image: "curtiBrasil", label: "Brasil", title: "Viagens de norte ao sul", text: "Destinos nacionais e resorts escolhidos para o seu estilo de viagem.", service: "pacotes", enabled: true, order: 1 },
    { key: "caribe-mexico", image: "curtiCaribe", label: "Caribe", title: "Caribe", text: "Praias, resorts e all inclusive para descansar com conforto.", service: "hospedagem", enabled: true, order: 2 },
    { key: "eua-canada", image: "orlandoMagicKingdom", label: "Estados Unidos • Florida", title: "Orlando e Miami", text: "Parques, compras e praias da Flórida com planejamento detalhado.", service: "pacotes", enabled: true, order: 3 },
    { key: "europa", image: "heroVarenna", label: "Europa", title: "Europa", text: "Cidades e paisagens em roteiros personalizados no seu ritmo.", service: "pacotes", enabled: true, order: 4 },
    { key: "cruzeiros", image: "curtiCruzeiros", label: "Cruzeiros", title: "Cruzeiros", text: "Navio, cabine e itinerário escolhidos para o perfil de quem viaja.", service: "cruzeiros", enabled: true, order: 5 },
  ],
  modules: [
    { key: "orlando", title: "Orlando em família", text: "Roteiro dia a dia para aproveitar os parques com tranquilidade e todas as idades.", service: "ingressos", image: "orlandoMagicKingdom", enabled: true, order: 1 },
    { key: "nova-iorque", title: "Nova Iorque", text: "Uma das ênfases da agência, com planejamento completo da viagem.", service: "pacotes", image: "europa", enabled: true, order: 2 },
    { key: "resorts", title: "Resorts e all inclusive", text: "Hospedagens selecionadas no Brasil, Caribe e México.", service: "hospedagem", image: "resort", enabled: true, order: 3 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Orientação para escolher navio, cabine e itinerário.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 4 },
    { key: "europa", title: "Europa", text: "Roteiros realmente personalizados pela Europa.", service: "pacotes", image: "heroVarenna", enabled: true, order: 5 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Ricardo Curti, diretor da Curti Viagens.",
    text: "A Curti Viagens começou em 2013 organizando grupos para Orlando e, com o tempo, ampliou a atuação para outros destinos no Brasil e no mundo.\n\nSediada em Holambra (SP), a agência atende casais, famílias com crianças e clientes de alto padrão, com consultoria completa para destinos nacionais, internacionais e viagens sob medida.\n\nO atendimento é feito pelo próprio proprietário e especialista, com planejamento detalhado e suporte durante toda a viagem.",
    badge: { value: "Desde 2013", label: "Curti Viagens" },
    media: "default",
    images: [{ src: curtiRicardoEpcot.url, alt: "Ricardo Curti, diretor da Curti Viagens, no Epcot em Orlando" }],
    mural: { src: curtiRicardoMural.url, alt: "Mural de fotos de viagens do Ricardo Curti em Orlando" },
    showLocation: true,
    ownerName: "Ricardo Curti",
  },
  differentials: [
    {
      title: "Atendimento direto com Ricardo Curti",
      text: "Atendimento pessoal do proprietário e especialista em Orlando e viagens sob medida, do primeiro contato ao retorno.",
      icon: "consultivo",
      avatar: { src: curtiRicardoAvatar.url, alt: "Ricardo Curti, proprietário da Curti Viagens" },
      gallery: { label: "Ver certificados e experiência", items: [
        { src: curtiCert01.url, alt: "Certificado de Ricardo Curti Alves — Los Angeles University" },
        { src: curtiCert02.url, alt: "Certificado de Ricardo Curti Alves — Visit Orlando" },
        { src: curtiCert03.url, alt: "Certificado de Ricardo Curti Alves — Walt Disney World — visão geral" },
        { src: curtiCert04.url, alt: "Certificado de Ricardo Curti Alves — Disney — hotéis resort" },
        { src: curtiCert05.url, alt: "Certificado de Ricardo Curti Alves — Disney — parques temáticos" },
        { src: curtiCert06.url, alt: "Certificado de Ricardo Curti Alves — Disney — programa de especialista" },
        { src: curtiCert07.url, alt: "Certificado de Ricardo Curti Alves — Universal Orlando Resort — especialista" },
        { src: curtiCert08.url, alt: "Certificado de Ricardo Curti Alves — Orlando — certificado de conclusão" },
        { src: curtiCert09.url, alt: "Certificado de Ricardo Curti Alves — Academia — especialista" },
        { src: curtiCert10.url, alt: "Certificado de Ricardo Curti Alves — Academia RCA — participação" },
        { src: curtiCert11.url, alt: "Certificado de Ricardo Curti Alves — Academia RCA — especialista" },
        { src: curtiCert12.url, alt: "Certificado de Ricardo Curti Alves — Academia RCA — especialista" },
        { src: curtiCert13.url, alt: "Certificado de Ricardo Curti Alves — Academia — especialista" },
        { src: curtiCert14.url, alt: "Certificado de Ricardo Curti Alves — Sentire Educação" },
      ] },
    },
    { title: "Roteiros realmente personalizados", text: "Cada viagem é desenhada a partir do perfil, do ritmo e das prioridades de quem viaja.", icon: "conferido" },
    { title: "Planejamento que antecipa riscos", text: "Detalhes pensados com antecedência, incluindo roteiro dia a dia para Orlando.", icon: "fornecedores" },
    { title: "Suporte durante toda a viagem", text: "Acompanhamento em viagem, inclusive 24h quando necessário.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeNumberedCards: true,
  conciergeSteps: [
    "Inspiração e definição da viagem a partir do seu perfil.",
    "Planejamento, orçamento e reservas.",
    "Orientações pré-embarque para viajar tranquilo.",
    "Acompanhamento durante a viagem e contato após o retorno.",
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "Começa por uma conversa para entender quem vai viajar e o que deseja viver. Depois vêm o planejamento, o orçamento, as reservas e as orientações antes do embarque." },
    { q: "Quais destinos a agência atende?", a: "Destinos nacionais, internacionais e viagens sob medida, com prioridade para Brasil, Caribe e México, Estados Unidos e Canadá, Europa, resorts e cruzeiros." },
    { q: "A agência organiza viagens para Orlando?", a: "Sim. A Curti Viagens começou em 2013 com grupos para Orlando e prepara roteiro dia a dia para a viagem." },
    { q: "Há suporte durante a viagem?", a: "Sim. Há suporte durante toda a viagem e acompanhamento 24h quando necessário." },
    { q: "Onde fica a agência?", a: "A Curti Viagens fica em Holambra (SP) e atende também pelos canais digitais." },
  ],
  copy: {
    destinations: { title: "Destinos para a sua próxima viagem", subtitle: "Brasil, Caribe, Orlando e Miami, Europa, resorts e cruzeiros." },
    modules: { title: "Especialidades", subtitle: "Orlando, Nova Iorque, resorts, cruzeiros e Europa." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da inspiração ao retorno", subtitle: "Uma jornada acompanhada em cada etapa." },
    faq: { kicker: "ANTES DE SOLICITAR", title: "Dúvidas frequentes" },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Por que viajar com a Curti Viagens", subtitle: "Atendimento próximo, planejamento detalhado e suporte do início ao fim." },
    avaliacoes: { kicker: "EXPERIÊNCIAS REAIS", title: "O que dizem nossos viajantes" },
    newsletter: {
      kicker: "GRUPO DE NOVIDADES NO WHATSAPP",
      title: "Receba novidades e oportunidades",
      subtitle: "Informe seu nome, WhatsApp e e-mail. Depois de enviar, você será direcionado para o grupo de WhatsApp da Curti Viagens, onde o Ricardo compartilha novidades, oportunidades e dicas de viagem.",
      cta: "Quero entrar no grupo",
    },
  },
  inspirationDialog: {
    title: "Entre no grupo de novidades",
    description: "Preencha seus dados. Ao confirmar, você será direcionado automaticamente para o grupo de WhatsApp da Curti Viagens.",
    submitLabel: "Confirmar e entrar no grupo",
    notice: "Ao confirmar, você autoriza o contato da agência e será levado ao grupo de WhatsApp.",
  },
  socialStrip: {
    title: "Siga-nos nas redes",
    links: [{ network: "instagram", url: "https://www.instagram.com/curtiviagens/" }, { network: "facebook", url: "https://www.facebook.com/curtiviagens/" }],
  },
  footer: {
    description: "Consultoria completa de viagens, desde 2013, em Holambra (SP).",
    whatsapp: "(11) 99250-6672",
    whatsappHidden: true,
    phone: "(11) 99250-6672",
    phoneHidden: true,
    email: "vendas@curtiviagens.com.br",
    instagram: "https://www.instagram.com/curtiviagens/",
    instagramLabel: "@curtiviagens",
    address: "Holambra/SP",
    legalName: "Ricardo Curti Alves",
    cnpj: "35.133.431/0001-00",
    showLocation: true,
  },
  seo: {
    title: "Prévia para revisão — Curti Viagens",
    description: "Prévia técnica revisável do site Curti Viagens.",
  },
}, "Curti Viagens");
delete curtiViagensBaseline.dmc;
delete curtiViagensBaseline.credentials;
delete curtiViagensBaseline.team;
export const CURTI_VIAGENS_PREVIEW_PROFILE: AgencySiteProfile = curtiViagensBaseline;

export const KARIBU_PREVIEW_JOB_ID = "briefing-21-v1";
export const KARIBU_PREVIEW_PATH = `/ads-briefing-preview/${KARIBU_PREVIEW_JOB_ID}`;
/**
 * Host sintético exclusivo. A busca exata por CNPJ feita pela automação não
 * encontrou perfil cadastrado: nenhuma associação por nome, nenhum user_id
 * real, domínio, conta ou tenant. Vinculação futura ao cadastro real PENDENTE.
 */
export const KARIBU_PREVIEW_HOST = "briefing-21-v1.preview.local";

export const KARIBU_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-000000000021",
  agency_slug: "",
  public_slug: null,
  hostname: KARIBU_PREVIEW_HOST,
  is_primary: false,
  agency_name: "Karibu Viagens e Turismo",
  owner_name: "Roseli Monteiro da Silva",
  logo_url: karibuLogo.url,
  cover_image_url: null,
  primary_color: "#394F76",
  secondary_color: "#39C2D4",
  secondary_auto: false,
  // Terciária suave derivada da primária pelo helper compartilhado.
  tertiary_color: deriveTertiaryColor("#394F76"),
  tertiary_auto: false,
  on_secondary_color: null,
  phone: null,
  city: "Guarulhos",
  state: "SP",
  bio: null,
  cnpj: null,
  whatsapp_group_url: null,
};

const karibuBaseline = buildGoldStandardProfile("karibuBriefing21", {
  navDensity: "compact",
  visaHome: false,
  featuredExperience: undefined,
  nav: [
    { label: "Início", to: "/" },
    { label: "Especialidades", to: "/#assinatura" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Sobre", to: "/#sobre" },
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
  },
  heroPresentation: {
    kicker: "GUARULHOS · SP · DESDE 2011",
    overlay: "strongLeft",
  },
  hero: [
    { title: "Segurança e suporte antes, durante e depois da viagem", subtitle: "Planejamento detalhado e acompanhamento próximo em cada etapa.", image: "heroAirportTraveler", order: 1, enabled: true },
    { title: "Cruzeiros escolhidos com cuidado", subtitle: "Orientação para navio, cabine e itinerário de acordo com quem viaja.", image: "cruzeiro", order: 2, enabled: true },
    { title: "Do Nordeste à Europa, passando por Orlando", subtitle: "Destinos nacionais e internacionais com atendimento pela proprietária.", image: "heroVarenna", order: 3, enabled: true },
  ],
  signature: {
    kicker: "CRUZEIROS · INTERNACIONAIS · NACIONAIS",
    title: "Segurança e suporte antes, durante e depois da viagem.",
    text: "A Karibu Viagens e Turismo atende públicos diversos em cruzeiros, destinos internacionais e destinos nacionais, com planejamento detalhado, suporte durante a viagem e acompanhamento pós-venda.",
  },
  destinations: [
    { key: "brasil", image: "resort", label: "Brasil", title: "Brasil e Nordeste", text: "Destinos nacionais, com atenção especial ao Nordeste.", service: "pacotes", enabled: true, order: 1 },
    { key: "europa", image: "heroVarenna", label: "Europa", title: "Europa", text: "Roteiros planejados em detalhe para conhecer a Europa.", service: "pacotes", enabled: true, order: 2 },
    { key: "cruzeiros", image: "cruzeiro", label: "Cruzeiros", title: "Cruzeiros", text: "Navio, cabine e itinerário escolhidos para o perfil de quem viaja.", service: "cruzeiros", enabled: true, order: 3 },
    { key: "america-do-sul", image: "europa", label: "América do Sul", title: "América do Sul", text: "Destinos sul-americanos com planejamento e suporte.", service: "pacotes", enabled: true, order: 4 },
    { key: "eua-canada", image: "orlandoMagicKingdom", label: "América do Norte", title: "Estados Unidos e Canadá", text: "Orlando e outros destinos norte-americanos com planejamento detalhado.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "cruzeiros", title: "Cruzeiros", text: "Uma das especialidades da agência, com orientação em cada escolha.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 1 },
    { key: "orlando", title: "Orlando", text: "Planejamento da viagem aos parques com suporte antes e durante a viagem.", service: "ingressos", image: "orlandoMagicKingdom", enabled: true, order: 2 },
    { key: "nordeste", title: "Nordeste", text: "Destinos nacionais com atendimento próximo.", service: "pacotes", image: "resort", enabled: true, order: 3 },
    { key: "europa", title: "Europa", text: "Destinos internacionais com planejamento detalhado.", service: "pacotes", image: "heroVarenna", enabled: true, order: 4 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Roseli Monteiro da Silva, diretora da Karibu Viagens.",
    text: "A Karibu Viagens e Turismo atua desde 2011 em Guarulhos (SP), com cruzeiros, destinos internacionais e destinos nacionais.\n\nO atendimento é feito pela própria diretora e proprietária, de forma mista conforme a viagem: por WhatsApp, por e-mail ou presencialmente.\n\nQuando surge algum imprevisto, a agência acompanha a situação junto aos fornecedores envolvidos e mantém o viajante informado, antes, durante e depois da viagem.",
    badge: { value: "Desde 2011", label: "Karibu Viagens" },
    media: "hidden",
    showLocation: true,
    ownerName: "Roseli Monteiro da Silva",
  },
  differentials: [
    { title: "Atendimento pela proprietária", text: "Você é atendido pela diretora e especialista da agência.", icon: "consultivo" },
    { title: "Planejamento detalhado", text: "Cada etapa da viagem é organizada com antecedência.", icon: "conferido" },
    { title: "Suporte durante a viagem", text: "Acompanhamento junto aos fornecedores enquanto você viaja.", icon: "acompanhamento" },
    { title: "Acompanhamento pós-venda", text: "O contato continua depois do retorno.", icon: "fornecedores" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa inicial por WhatsApp, e-mail ou presencialmente.",
    "Planejamento detalhado, orçamento e reservas.",
    "Suporte durante a viagem, com acompanhamento junto aos fornecedores.",
    "Acompanhamento pós-venda após o retorno.",
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "O atendimento é misto, conforme a viagem: por WhatsApp, por e-mail ou presencialmente, feito pela diretora e proprietária." },
    { q: "Quais destinos a agência atende?", a: "Cruzeiros, destinos internacionais e nacionais, com prioridade para Brasil, Europa, América do Sul, Estados Unidos e Canadá." },
    { q: "Há suporte durante a viagem?", a: "Sim. A agência oferece suporte durante a viagem e acompanha a situação junto aos fornecedores quando necessário." },
    { q: "E depois que eu voltar?", a: "A Karibu faz acompanhamento pós-venda após o retorno." },
    { q: "Onde fica a agência?", a: "A Karibu Viagens fica em Guarulhos (SP) e atende também pelos canais digitais." },
  ],
  copy: {
    destinations: { title: "Destinos para a sua próxima viagem", subtitle: "Brasil, Europa, cruzeiros, América do Sul, Estados Unidos e Canadá." },
    modules: { title: "Especialidades", subtitle: "Cruzeiros, Orlando, Nordeste e Europa." },
    differentials: { title: "Por que viajar com a Karibu", subtitle: "Segurança e suporte antes, durante e depois da viagem." },
    concierge: { kicker: "COMO FUNCIONA", title: "Do primeiro contato ao pós-venda", subtitle: "Uma jornada acompanhada em cada etapa." },
    faq: { title: "Dúvidas frequentes" },
  },
  // Instagram informado só pelo nome ("Karibu Viagens"), sem @ confirmado: sem link.
  footer: {
    description: "Cruzeiros, destinos internacionais e nacionais, desde 2011, em Guarulhos (SP).",
    whatsapp: "(11) 94757-7307",
    phone: "(11) 94757-7307",
    email: "roseli_mtbr@hotmail.com",
    instagramLabel: "Karibu Viagens",
    address: "Guarulhos/SP",
    showLocation: true,
  },
  seo: {
    title: "Prévia para revisão — Karibu Viagens e Turismo",
    description: "Prévia técnica revisável do site Karibu Viagens e Turismo.",
  },
}, "Karibu Viagens e Turismo");
delete karibuBaseline.dmc;
delete karibuBaseline.credentials;
delete karibuBaseline.team;
/** Independent snapshot of the approved source; later edits never mutate Mundo. */
export const KARIBU_MUNDO_SOURCE_PROFILE: AgencySiteProfile = JSON.parse(
  JSON.stringify(MUNDO_EM_CORES_PREVIEW_PROFILE),
);

export const KARIBU_PREVIEW_PROFILE: AgencySiteProfile = {
  ...KARIBU_MUNDO_SOURCE_PROFILE,
  key: "karibuBriefing21",
  // Keep the source imagery and presentation while replacing agency-specific claims.
  hero: KARIBU_MUNDO_SOURCE_PROFILE.hero?.map((slide, index) => ({
    ...slide,
    title: karibuBaseline.hero?.[index]?.title ?? slide.title,
    subtitle: karibuBaseline.hero?.[index]?.subtitle ?? slide.subtitle,
  })),
  signature: karibuBaseline.signature,
  modules: KARIBU_MUNDO_SOURCE_PROFILE.modules?.map((item, index) => ({
    ...item,
    title: karibuBaseline.modules?.[index]?.title ?? item.title,
    text: karibuBaseline.modules?.[index]?.text ?? item.text,
    service: karibuBaseline.modules?.[index]?.service ?? item.service,
  })),
  destinations: KARIBU_MUNDO_SOURCE_PROFILE.destinations?.map((item, index) => ({
    ...item,
    ...(karibuBaseline.destinations?.[index] ?? {
      title: "Resorts no Brasil", label: "Brasil", text: "Hospedagens com planejamento e acompanhamento da Karibu.",
    }),
    image: item.image,
    order: item.order,
  })),
  about: {
    ...KARIBU_MUNDO_SOURCE_PROFILE.about,
    ...karibuBaseline.about,
    media: undefined,
    images: KARIBU_MUNDO_SOURCE_PROFILE.about?.images,
    mural: KARIBU_MUNDO_SOURCE_PROFILE.about?.mural,
    visitedDestinations: undefined,
  },
  featuredExperience: KARIBU_MUNDO_SOURCE_PROFILE.featuredExperience ? {
    ...KARIBU_MUNDO_SOURCE_PROFILE.featuredExperience,
    kicker: "DESCUBRA A RIVIERA MAYA",
    title: "Parques e hotéis Xcaret para a sua próxima viagem",
    description: "Conheça as possibilidades de parques e hotéis Xcaret e converse com a Karibu para planejar uma viagem de acordo com suas preferências.",
    highlights: ["Parques e hotéis", "Planejamento personalizado", "Atendimento próximo"],
  } : undefined,
  authority: KARIBU_MUNDO_SOURCE_PROFILE.authority ? {
    ...KARIBU_MUNDO_SOURCE_PROFILE.authority,
    companies: KARIBU_MUNDO_SOURCE_PROFILE.authority.companies ? {
      ...KARIBU_MUNDO_SOURCE_PROFILE.authority.companies,
      title: "Encontre seu próximo cruzeiro com a Karibu Viagens.",
    } : undefined,
  } : undefined,
  differentials: karibuBaseline.differentials,
  conciergeSteps: karibuBaseline.conciergeSteps,
  faq: karibuBaseline.faq,
  copy: {
    ...KARIBU_MUNDO_SOURCE_PROFILE.copy,
    ...karibuBaseline.copy,
    modules: { ...karibuBaseline.copy?.modules, cta: "Conversar com a Roseli" },
    newsletter: { title: "Novidades da Karibu", subtitle: "Converse com a Roseli sobre destinos e oportunidades de viagem.", cta: "Quero saber mais" },
    avaliacoes: { title: "Experiências de quem viaja com a Karibu" },
  },
  footer: { ...karibuBaseline.footer, address: "Avenida Caetano Zamataro, 228, Ponte Grande, Guarulhos/SP", legalName: "Karibu Viagens e Turismo Ltda", cnpj: "13.687.335/0001-71" },
  // The source's customer reviews, social account and invitation belong to Mundo.
  testimonials: undefined,
  socialStrip: undefined,
  inspirationDialog: undefined,
  seo: karibuBaseline.seo,
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
// Menu pedido por Fernando (29/10/2026): Sobre | Destaques | Orlando | Cruzeiros | Resorts.
const DRICA_PRESENTATION_NAV = [
  { label: "Sobre", to: "/#sobre" },
  { label: "Destaques", to: "/#destinos" },
  { label: "Orlando", to: "/#ingressos-orlando" },
  { label: "Cruzeiros", to: "/#autoridade" },
  { label: "Eventos Esportivos", to: "/#esportes" },
  { label: "Resorts", to: "/#resorts" },
];
export const DRICA_PRESENTATION_PROFILE: AgencySiteProfile = {
  ...dricaBaseline, navDensity: "compact", randomizeDestinations: false,
  visaHome: false, featuredExperience: undefined,
  // Ordem pedida por Fernando (29/10/2026); "Tudo para a sua viagem" desativada.
  sections: { ...dricaBaseline.sections, dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    signature: { enabled: true, order: 1 }, destinations: { enabled: true, order: 2 }, highlights: { enabled: true, order: 3 },
    orlando: { enabled: true, order: 4 }, authority: { enabled: true, order: 5 }, sports: { enabled: true, order: 5.5 }, resorts: { enabled: true, order: 6 },
    modules: { enabled: false } },
  hideConciergeActions: true,
  nav: DRICA_PRESENTATION_NAV,
  heroPresentation: { ...dricaBaseline.heroPresentation, kicker: "DRICA VIAGENS · ONLINE, DO RIO DE JANEIRO · DESDE 2010" },
  hero: [
    { title: "Seu próximo destino pode ser o melhor capítulo da sua história", subtitle: "Roteiros personalizados, pacotes, cruzeiros, seguros e ingressos, com segurança e suporte antes, durante e depois da viagem.", image: "heroVarenna", order: 1, enabled: true },
    { title: "Orlando completo: parques, shows e grupos", subtitle: "Ingressos para Disney, Universal, SeaWorld e Broadway, além de viagens em grupo para Orlando planejadas em cada detalhe.", image: "orlandoMagicKingdom", order: 2, enabled: true },
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
    { key: "capitais-da-italia", image: "capitaisItalia", label: "Circuito pela Europa", title: "Capitais da Itália", text: "Roma, Florença e Veneza em uma semana, com passagem por Rávena e Assis.", service: "pacotes", href: "/circuitos/capitais-da-italia", enabled: true, order: 3 },
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
    destinations: { title: "Destaques da Drica Viagens", subtitle: "Seu próximo destino pode ser o melhor capítulo da sua história." },
    modules: { title: "Tudo para a sua viagem", subtitle: "Roteiros, pacotes, cruzeiros, seguros e ingressos para parques temáticos." },
    differentials: { title: "O capricho de cada detalhe", subtitle: "Experiências únicas e encantadoras para colecionar momentos e memórias." },
    newsletter: { kicker: "NOVIDADES DRICA VIAGENS", title: "Está pronto para o seu próximo cartão de embarque?", subtitle: "Receba novidades, oportunidades e roteiros exclusivos da Drica Viagens diretamente no seu WhatsApp ou e-mail.", cta: "Quero receber novidades" },
    avaliacoes: { kicker: "AVALIAÇÕES NO GOOGLE", title: "O que dizem os clientes da Drica", subtitle: "Avaliações reais publicadas no perfil da Drica Viagens no Google." },
  },
  // Rodapé enxuto pedido por Fernando (29/10/2026): sem descrição, horário, cidade e telefone.
  footer: { ...DRICA_VIAGENS_PREVIEW_PROFILE.footer, descriptionHidden: true, hours: undefined, showLocation: false, phoneHidden: true, whatsappLabel: "Fale Conosco" },
  newsletterMedia: { src: dricaNewsletterLondon, alt: "Tower Bridge iluminada ao entardecer em Londres" },
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
  [BAGAGEM_NA_MAO_PREVIEW_JOB_ID]: {
    jobId: BAGAGEM_NA_MAO_PREVIEW_JOB_ID,
    info: BAGAGEM_NA_MAO_PREVIEW_INFO,
    profile: BAGAGEM_NA_MAO_PREVIEW_PROFILE,
    notice: "Prévia para revisão — sem publicação · ações desativadas",
    documentTitle: "Prévia para revisão — Bagagem na Mão Viagens",
    realAgency: true,
    pages: { resorts: { title: "Explore os resorts do Brasil com a Bagagem na Mão Viagens" }, orlandoTickets: true },
  },
  [CURTI_VIAGENS_PREVIEW_JOB_ID]: {
    jobId: CURTI_VIAGENS_PREVIEW_JOB_ID,
    info: CURTI_VIAGENS_PREVIEW_INFO,
    profile: CURTI_VIAGENS_PREVIEW_PROFILE,
    notice: "Prévia para revisão — sem publicação · ações desativadas",
    documentTitle: "Prévia para revisão — Curti Viagens",
    realAgency: true,
  },
  [KARIBU_PREVIEW_JOB_ID]: {
    jobId: KARIBU_PREVIEW_JOB_ID,
    info: KARIBU_PREVIEW_INFO,
    profile: KARIBU_PREVIEW_PROFILE,
    notice: "Prévia para revisão — sem publicação · ações desativadas",
    documentTitle: "Prévia para revisão — Karibu Viagens e Turismo",
    realAgency: true,
  },
};

export function resolveAdsPreviewFixture(jobId?: string): AdsBriefingPreviewFixture | null {
  return jobId ? ADS_PREVIEW_FIXTURES[jobId] ?? null : null;
}

/** O Mundo em Cores: fotos próprias nos cards "Natureza que surpreende" e "Tempo para curtir o Caribe". */
export const MUNDO_EM_CORES_XCARET_CARDS = {
  "Natureza que surpreende": { image: { src: mundoXcaretCardNatureza.url, alt: "Vanessa Figueiredo acenando diante das águas cristalinas do parque", source: "Acervo pessoal de Vanessa Figueiredo (IMG_2071)" }, position: "object-[center_52%]" },
  "Tempo para curtir o Caribe": { image: { src: mundoXcaretCardCaribe.url, alt: "Vista aérea do Hotel Xcaret e do mar do Caribe", source: "Acervo de Vanessa Figueiredo (IMG_2903)" }, position: "object-[center_45%]" },
  "Cultura maia: histórias para descobrir": { image: { src: mundoXcaretCardChichen.url, alt: "Selfie em Chichén Itzá diante de El Castillo", source: "Acervo pessoal de Vanessa Figueiredo" }, position: "object-center" },
  "Um México que emociona": { image: { src: mundoXcaretCardMexico.url, alt: "Mariachis se apresentando no espetáculo noturno do Xcaret", source: "Acervo de Vanessa Figueiredo" }, position: "object-center" },
  "Dias dentro d'água": { image: { src: mundoXcaretCardXelha.url, alt: "Vanessa Figueiredo diante das águas cristalinas do Xel-Há", source: "Acervo pessoal de Vanessa Figueiredo" }, position: "object-center" },
  "__roteiro": { image: { src: mundoXcaretRoteiro.url, alt: "Dias dentro d'água no Xcaret", source: "Acervo pessoal de Vanessa Figueiredo" }, position: "object-center" },
};

/* ------------------------------------------------------------------ */
/* Drica Viagens — perfil OFICIAL (dricaviagens.com.br).               */
/* Aprovado por Fernando (28/10/2026): igual à apresentação completa,  */
/* sem modo apresentação e sem avisos de demonstração.                 */
/* ------------------------------------------------------------------ */
export const DRICA_OFFICIAL_PROFILE: AgencySiteProfile = {
  ...DRICA_PRESENTATION_PROFILE,
  key: "dricaOfficial",
  presentation: false,
  copy: {
    ...DRICA_PRESENTATION_PROFILE.copy,
    newsletter: {
      ...(DRICA_PRESENTATION_PROFILE.copy?.newsletter ?? { kicker: "", title: "", subtitle: "", cta: "" }),
    },
  } as AgencySiteProfile["copy"],
  seo: { title: "Drica Viagens", description: "Drica Viagens: viagens sob medida com Adriana Martins." },
};

/* Curti Viagens — perfil OFICIAL (curtiviagens.com.br). Aprovado por Fernando (02/11/2026). */
export const CURTI_VIAGENS_OFFICIAL_PROFILE: AgencySiteProfile = {
  ...CURTI_VIAGENS_PREVIEW_PROFILE,
  key: "curtiViagensOfficial",
  presentation: false,
  destinations: CURTI_VIAGENS_PREVIEW_PROFILE.destinations?.map((destination) =>
    destination.key === "eua-canada"
      ? { ...destination, key: "nova-york", image: "curtiNovaYork", label: "Estados Unidos", title: "Nova York", text: "Descubra o melhor dos Estados Unidos com roteiros sob medida, entre cidades vibrantes, praias e experiências inesquecíveis." }
      : destination,
  ),
  copy: {
    ...CURTI_VIAGENS_PREVIEW_PROFILE.copy,
    destinations: { ...CURTI_VIAGENS_PREVIEW_PROFILE.copy?.destinations, title: "Destinos para a sua próxima viagem", subtitle: "Brasil, Caribe, Nova York, Europa, resorts e cruzeiros." },
  },
  seo: { title: "Curti Viagens", description: "Curti Viagens: consultoria completa de viagens em Holambra (SP), desde 2013." },
};

/* ------------------------------------------------------------------ */
/* Essya Tur — prévia "estrutura Curti" (Fernando, 02/11/2026).        */
/* Cópia integral da estrutura/fotos da Curti Viagens; troca apenas    */
/* logo, cores (azul #164F76 + amarelo #FDC700), contatos e os textos  */
/* que já existiam no perfil da Essyatur. Host sintético: o site real  */
/* essyatur.com.br não muda.                                           */
/* ------------------------------------------------------------------ */
export const ESSYA_CURTI_PREVIEW_JOB_ID = "essya-curti-v1";
export const ESSYA_CURTI_PREVIEW_HOST = "essya-curti-v1.preview.local";

export const ESSYA_CURTI_PREVIEW_INFO: AgencyDomainInfo = {
  ...CURTI_VIAGENS_PREVIEW_INFO,
  user_id: "00000000-0000-0000-0000-000000000022",
  hostname: ESSYA_CURTI_PREVIEW_HOST,
  agency_name: "Essyatur",
  owner_name: "Cristiane Serro Azul",
  logo_url: essyaTurLogo.url,
  primary_color: "#164F76",
  secondary_color: "#FDC700",
  tertiary_color: "#E3EDF4",
  city: "São Paulo",
  state: "SP",
  cnpj: "63.501.397/0001-15",
  whatsapp_group_url: null,
};

export const ESSYA_CURTI_PREVIEW_PROFILE: AgencySiteProfile = {
  ...CURTI_VIAGENS_PREVIEW_PROFILE,
  key: "essyaCurtiPreview",
  sections: {
    ...CURTI_VIAGENS_PREVIEW_PROFILE.sections,
    // Avaliações da Curti não podem aparecer como sendo da Essyatur.
    avaliacoes: { enabled: false },
  },
  heroPresentation: { ...CURTI_VIAGENS_PREVIEW_PROFILE.heroPresentation, kicker: "SÃO PAULO · SP · +10 ANOS DE EXPERIÊNCIA" },
  hero: [
    { title: "Viaje com segurança e um roteiro feito para você", subtitle: "Atendimento próximo e personalizado, com suporte antes, durante e depois da viagem.", image: "essyaMural", order: 1, enabled: true },
    { title: "Orlando, cruzeiros e experiências para toda a família", subtitle: "Planejamento cuidadoso para famílias com crianças, famílias multigeracionais e casais.", image: "orlandoMagicKingdom", order: 2, enabled: true },
    { title: "Viagens sob medida, do primeiro contato ao retorno", subtitle: "Você fala direto com quem planeja a sua viagem, pelo WhatsApp.", image: "heroVarenna", order: 3, enabled: true },
  ],
  signature: {
    kicker: "ESSYATUR",
    title: "Atendimento próximo para viagens realmente personalizadas.",
    text: "Cada viagem começa por uma conversa: quem viaja, o que desejam viver e o equilíbrio certo entre qualidade e investimento. A partir daí, a Essyatur desenha o roteiro e acompanha cada etapa.",
  },
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Consultoria pessoal e bagagem de quem já conheceu 18 países",
    text: "À frente da Essyatur desde 2025, Cristiane reúne mais de uma década de experiência no turismo e conduz sua própria agência com um propósito claro: oferecer uma consultoria de viagens próxima, atenta e personalizada.\n\nCom 18 países visitados pelas Américas, pelo Caribe e pela Europa, ela planeja roteiros com base no que conhece na prática: deslocamentos, conexões e hospedagens. Assim, cada viagem é pensada com atenção aos detalhes e ao perfil de quem viaja.\n\nDa criação do roteiro ao embarque e ao retorno, Cristiane acompanha cada etapa e fica disponível pelo WhatsApp para orientar você, inclusive diante de imprevistos.",
    badge: { value: "+10 ANOS", label: "de experiência no turismo" },
    media: "default",
    mediaAlign: "title",
    image: "resort",
    images: [{ src: essyaCristiane.url, alt: "Cristiane Serro Azul, sócia administradora da Essyatur", position: "center 45%" }],
    visitedDestinations: { title: "Países que eu conheci", names: ["Argentina", "Chile", "Estados Unidos", "Inglaterra", "México", "República Dominicana", "Jamaica", "Cuba", "Aruba", "Espanha", "Itália", "França", "Holanda", "Suécia", "Finlândia", "Uruguai", "Costa Rica", "Paraguai"], presentation: "flags" },
    showLocation: true,
    ownerName: "Cristiane Serro Azul",
  },
  differentials: [
    { title: "Consultoria direta e pessoal", text: "Você fala pessoalmente com a Cristiane, que desenha a sua viagem do início ao fim, sem intermediários.", icon: "consultivo" },
    { title: "Roteiros realmente personalizados", text: "Cada roteiro nasce do perfil de quem viaja, nunca de um pacote pronto.", icon: "fornecedores" },
    { title: "Curadoria criteriosa", text: "Hotéis, serviços e experiências escolhidos com critério e vivência nos destinos.", icon: "conferido" },
    { title: "Suporte durante toda a viagem", text: "Antes, durante e depois: imprevistos acompanhados até a solução.", icon: "acompanhamento" },
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "O atendimento é conduzido pessoalmente pela Cristiane Serro Azul, fundadora da Essyatur, pelo WhatsApp. Ela entende o seu perfil, apresenta uma proposta personalizada e acompanha toda a viagem." },
    { q: "Vocês planejam viagens para famílias com crianças?", a: "Sim. Famílias com crianças e famílias multigeracionais estão entre as especialidades da Essyatur, incluindo Orlando e parques." },
    { q: "E se acontecer um imprevisto durante a viagem?", a: "A Cristiane acompanha o caso pessoalmente até a solução. O suporte vale antes, durante e depois da viagem." },
    { q: "Quais destinos vocês atendem?", a: "Orlando, cruzeiros, Europa, América do Sul, Caribe e México, além de Brasil, Estados Unidos e Canadá." },
    { q: "Como começo a planejar?", a: "Envie uma solicitação pelo formulário do site ou fale pelo WhatsApp contando a ideia inicial da viagem." },
  ],
  copy: {
    ...CURTI_VIAGENS_PREVIEW_PROFILE.copy,
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Por que viajar com a Essyatur", subtitle: "Segurança e suporte em cada etapa." },
    newsletter: {
      kicker: "GRUPO DE NOVIDADES NO WHATSAPP",
      title: "Receba novidades e oportunidades",
      subtitle: "Informe seu nome, WhatsApp e e-mail. Depois de enviar, você será direcionado para o grupo de WhatsApp da Essyatur, com novidades, oportunidades e dicas de viagem.",
      cta: "Quero entrar no grupo",
    },
  } as AgencySiteProfile["copy"],
  inspirationDialog: {
    ...CURTI_VIAGENS_PREVIEW_PROFILE.inspirationDialog,
    description: "Preencha seus dados. Ao confirmar, você será direcionado automaticamente para o grupo de WhatsApp da Essyatur.",
  } as AgencySiteProfile["inspirationDialog"],
  socialStrip: {
    title: "Siga-nos nas redes",
    links: [{ network: "instagram", url: "https://www.instagram.com/essyatur" }],
  },
  footer: {
    description: "Mais de 10 anos de experiência em viagens e agência própria desde 2025, em São Paulo (SP).",
    whatsapp: "(11) 96494-2210",
    whatsappLabel: "Falar no WhatsApp",
    phone: "(11) 96494-2210",
    phoneHidden: true,
    email: "contato@essyatur.com.br",
    instagram: "https://www.instagram.com/essyatur",
    instagramLabel: "@essyatur",
    address: "Vila Leopoldina, São Paulo, SP",
    legalLinksDisabled: true,
    legalName: "Essya Viagens e Turismo Ltda",
    cnpj: "63.501.397/0001-15",
    showLocation: true,
  },
  seo: { title: "Prévia para revisão — Essyatur", description: "Prévia técnica do site Essyatur na estrutura da Curti Viagens." },
};

ADS_PREVIEW_FIXTURES[ESSYA_CURTI_PREVIEW_JOB_ID] = {
  jobId: ESSYA_CURTI_PREVIEW_JOB_ID,
  info: ESSYA_CURTI_PREVIEW_INFO,
  profile: ESSYA_CURTI_PREVIEW_PROFILE,
  notice: "Prévia para revisão — sem publicação · ações desativadas",
  documentTitle: "Prévia para revisão — Essyatur",
  realAgency: true,
};

/* ------------------------------------------------------------------ */
/* Essyatur — perfil OFICIAL (essyatur.com.br). Aprovado por Fernando  */
/* (02/11/2026): mesma estrutura/fotos da prévia "Curti"; rodapé sem   */
/* número de telefone, endereço enxuto (bairro/cidade/UF) e links de   */
/* Política de Privacidade/Termos de Uso visíveis, mas sem clique.     */
/* Sem grupo de WhatsApp cadastrado: o formulário grava o lead e       */
/* confirma o contato, sem prometer redirecionamento.                  */
/* ------------------------------------------------------------------ */
export const ESSYA_OFFICIAL_PROFILE: AgencySiteProfile = {
  ...ESSYA_CURTI_PREVIEW_PROFILE,
  key: "essyaOfficial",
  presentation: false,
  copy: {
    ...ESSYA_CURTI_PREVIEW_PROFILE.copy,
    newsletter: {
      ...ESSYA_CURTI_PREVIEW_PROFILE.copy.newsletter,
      subtitle: "Informe seu nome, WhatsApp e e-mail. Depois de enviar, nossa equipe confirma o seu contato pelo WhatsApp.",
    },
  } as AgencySiteProfile["copy"],
  inspirationDialog: {
    ...ESSYA_CURTI_PREVIEW_PROFILE.inspirationDialog,
    description: "Preencha seus dados. Ao confirmar, nossa equipe entra em contato pelo WhatsApp.",
  } as AgencySiteProfile["inspirationDialog"],
  seo: { title: "Essyatur", description: "Essyatur: consultoria de viagens sob medida em São Paulo (SP), com mais de 10 anos de experiência." },
};

/* Pristur: local-only fixture. The authenticated briefing matched a profile
 * without a public domain; no identifier or association is imported here. */
export const PRISTUR_PREVIEW_JOB_ID = "briefing-22-v1";
export const PRISTUR_PREVIEW_HOST = "briefing-22-v1.preview.local";
export const PRISTUR_PREVIEW_PATH = `/ads-briefing-preview/${PRISTUR_PREVIEW_JOB_ID}`;
export const PRISTUR_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad22",
  agency_slug: "", public_slug: null, is_primary: false,
  hostname: PRISTUR_PREVIEW_HOST,
  agency_name: "Pristur Viagens", owner_name: "Priscila Vasconcelos",
  logo_url: null, cover_image_url: null,
  // Shared wl-site-base neutral fallbacks (222 47% 11%, 240 12% 97%),
  // not an official palette. Explicit values prevent platform-blue fallback.
  primary_color: "#0F1729", secondary_color: "#0F1729",
  tertiary_color: "#F6F6F8", secondary_auto: false, tertiary_auto: false,
  on_secondary_color: null, phone: null, city: "São Paulo", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
export const PRISTUR_PREVIEW_PROFILE = buildGoldStandardProfile("pristurBriefing22", {
  textualWordmark: true,
  navDensity: "compact", visaHome: false, featuredExperience: undefined,
  dmc: undefined, credentials: undefined, team: undefined,
  authority: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    testimonials: { enabled: false }, avaliacoes: { enabled: false }, offers: { enabled: false },
    newsletter: { enabled: false }, authority: { enabled: false },
  },
  nav: [
    { label: "Início", to: "/" }, { label: "Especialidades", to: "/#assinatura" },
    { label: "Destinos", to: "/#destinos" }, { label: "Parques Orlando", to: "/#ingressos-orlando" },
    { label: "Resorts", to: "/#resorts" }, { label: "Sobre", to: "/#sobre" }, { label: "Dúvidas", to: "/#faq" },
  ],
  heroPresentation: { kicker: "SÃO PAULO · SP · DESDE 2009", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "Pristur Viagens", subtitle: "Consultoria completa e planejamento para você viajar tranquilo, no Brasil e pelo mundo.", image: "parques", order: 1, enabled: true },
    { title: "Orlando e parques em família", subtitle: "Parques e entretenimento entre as prioridades para a sua próxima viagem.", image: "parques", order: 2, enabled: true },
    { title: "Brasil, resorts e all-inclusive", subtitle: "Inspirações de descanso e destinos nacionais com planejamento para quem vai viajar.", image: "resort", order: 3, enabled: true },
  ],
  signature: {
    kicker: "FAMÍLIAS · PARQUES · NACIONAIS · INTERNACIONAIS",
    title: "Consultoria completa para diferentes tipos de viagem",
    text: "Desde 2009, a Pristur Viagens reúne consultoria e planejamento para o cliente viajar tranquilo. Famílias e parques, viagens nacionais e internacionais orientam as escolhas de destinos e experiências.",
  },
  destinations: [
    { key: "eua-canada", image: "parques", label: "América do Norte", title: "Estados Unidos e Canadá", text: "Destinos prioritários para viagens internacionais, com destaque para Orlando e parques.", service: "pacotes", enabled: true, order: 1 },
    { key: "brasil", image: "brasil", label: "Brasil", title: "Destinos nacionais", text: "Diferentes formas de conhecer o Brasil com consultoria e planejamento.", service: "pacotes", enabled: true, order: 2 },
    { key: "resorts", image: "resort", label: "Resorts e all-inclusive", title: "Resorts no Brasil", text: "Hospedagens e experiências de descanso entre os destaques da Pristur.", service: "hospedagem", enabled: true, order: 3 },
    { key: "gramado", image: "brasil", label: "Serra Gaúcha", title: "Gramado", text: "Gramado está entre os destaques para a próxima viagem nacional. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 4 },
    { key: "caribe", image: "litoral", label: "Caribe", title: "Caribe", text: "Destinos caribenhos e possibilidades de all-inclusive. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "orlando", title: "Orlando e parques", text: "Parques e entretenimento para viagens em família.", image: "parques", service: "ingressos", enabled: true, order: 1 },
    { key: "resorts", title: "Resorts no Brasil", text: "Descanso e all-inclusive entre as prioridades da viagem.", image: "resort", service: "hospedagem", enabled: true, order: 2 },
    { key: "gramado", title: "Gramado", text: "Um dos destaques nacionais da Pristur. Imagem genérica de inspiração.", image: "brasil", service: "pacotes", enabled: true, order: 3 },
    { key: "caribe", title: "Caribe", text: "Inspirações de destinos internacionais e all-inclusive. Imagem genérica.", image: "litoral", service: "pacotes", enabled: true, order: 4 },
    { key: "brasil", title: "Viagens nacionais", text: "Consultoria completa para conhecer diferentes destinos no Brasil.", image: "litoral", service: "pacotes", enabled: true, order: 5 },
    { key: "internacionais", title: "Estados Unidos e Canadá", text: "Prioridades internacionais no planejamento da sua viagem.", image: "parques", service: "pacotes", enabled: true, order: 6 },
  ],
  highlights: [
    { title: "Viagens em família", text: "Famílias e parques estão entre as especialidades da Pristur.", service: "pacotes", cta: "Planejar em família" },
    { title: "Descanso em resorts", text: "Resorts no Brasil e all-inclusive entre os destaques para viajar.", service: "hospedagem", cta: "Planejar meu descanso" },
    { title: "Parques e entretenimento", text: "Orlando e parques como inspiração para a próxima viagem.", service: "ingressos", cta: "Planejar os parques" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "Priscila Vasconcelos, fundadora e consultora",
    text: "A Pristur Viagens atua desde 2009 com consultoria completa para diferentes tipos de viagem. Priscila Vasconcelos é a fundadora e consultora, responsável por um posicionamento voltado ao planejamento para o cliente viajar tranquilo.\n\nFamílias e parques, viagens nacionais e internacionais compõem as especialidades da agência. Estados Unidos e Canadá, Brasil, resorts e all-inclusive, parques e entretenimento estão entre as prioridades.\n\nOrlando e parques, resorts no Brasil, Gramado, Caribe e destinos nacionais são destaques para inspirar a próxima viagem. Em São Paulo (SP), a Pristur apresenta seus canais de atendimento pelo WhatsApp e por e-mail.",
    badge: { value: "Desde 2009", label: "Pristur Viagens" }, media: "hidden", showLocation: true, ownerName: "Priscila Vasconcelos",
  },
  differentials: [
    { title: "Consultoria completa", text: "Planejamento para diferentes tipos de viagem.", icon: "consultivo" },
    { title: "Famílias e parques", text: "Uma das especialidades que orientam a escolha de destinos e entretenimento.", icon: "conferido" },
    { title: "Brasil e mundo", text: "Viagens nacionais e internacionais, com prioridade para Brasil, Estados Unidos e Canadá.", icon: "fornecedores" },
    { title: "Planejar para viajar tranquilo", text: "Um posicionamento centrado no planejamento da viagem do cliente.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa sobre o tipo de viagem e as prioridades do cliente.",
    "Consultoria sobre destinos nacionais, internacionais, parques ou resorts.",
    "Planejamento das escolhas para a viagem.",
    "Organização do planejamento para o cliente viajar tranquilo.",
  ],
  faq: [
    { q: "Quem é responsável pela Pristur?", a: "Priscila Vasconcelos é a fundadora e consultora da Pristur Viagens." },
    { q: "Desde quando a agência atua?", a: "A Pristur Viagens atua desde 2009." },
    { q: "Quais são as especialidades?", a: "Famílias e parques, viagens nacionais e internacionais." },
    { q: "Quais são os destinos prioritários?", a: "Estados Unidos e Canadá, Brasil, resorts e all-inclusive, parques e entretenimento." },
    { q: "Orlando e Gramado fazem parte dos destaques?", a: "Sim. Orlando e parques, resorts no Brasil, Gramado, Caribe e destinos nacionais são os destaques informados pela Pristur." },
    { q: "Como funciona a consultoria?", a: "A proposta é oferecer consultoria completa para diferentes tipos de viagem, com planejamento para o cliente viajar tranquilo." },
    { q: "Quais são os canais de atendimento?", a: "WhatsApp 11 98301-7038 e e-mail consultoriapristurviagens@gmail.com. A agência está em São Paulo/SP e no Instagram como @priturismo." },
  ],
  copy: {
    modules: { kicker: "ESPECIALIDADES", title: "Destaques da Pristur Viagens", subtitle: "Orlando, resorts, Gramado, Caribe e destinos nacionais." },
    destinations: { kicker: "DESTINOS", title: "Destinos para a sua próxima viagem", subtitle: "Brasil, Estados Unidos e Canadá, Caribe, parques e all-inclusive." },
    highlights: { kicker: "INSPIRAÇÕES", title: "Diferentes formas de viajar", subtitle: "Família, descanso e entretenimento no seu planejamento." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "O jeito Pristur de planejar", subtitle: "Consultoria completa para o cliente viajar tranquilo." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da ideia ao planejamento", subtitle: "Uma conversa sobre a viagem e suas prioridades." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Sobre a Pristur e suas viagens" },
  },
  footer: {
    description: "Consultoria completa de viagens desde 2009. Planejamento para viajar tranquilo.",
    phone: "WhatsApp 11 98301-7038", email: "consultoriapristurviagens@gmail.com",
    instagram: "https://www.instagram.com/priturismo/", instagramLabel: "@priturismo",
    address: "São Paulo/SP", showLocation: true, legalLinksDisabled: true,
  },
  seo: { title: "Prévia para revisão — Pristur Viagens", description: "Prévia técnica da Pristur Viagens. Marca e paleta pendentes; sem envios ou publicação." },
}, "Pristur Viagens");
ADS_PREVIEW_FIXTURES[PRISTUR_PREVIEW_JOB_ID] = {
  jobId: PRISTUR_PREVIEW_JOB_ID, info: PRISTUR_PREVIEW_INFO, profile: PRISTUR_PREVIEW_PROFILE,
  notice: "Pristur Viagens · prévia técnica · marca e paleta pendentes · imagens genéricas · vinculação pendente · sem envios ou publicação",
  documentTitle: "Prévia para revisão — Pristur Viagens", realAgency: true,
};

/* Arena Travel Group: local-only fixture (briefing-23-v1). No unambiguous
 * account match; synthetic identity, no tenant/domain/permission link. */
export const ARENA_PREVIEW_JOB_ID = "briefing-23-v1";
export const ARENA_PREVIEW_HOST = "briefing-23-v1.preview.local";
export const ARENA_PREVIEW_PATH = `/ads-briefing-preview/${ARENA_PREVIEW_JOB_ID}`;
export const ARENA_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad23",
  agency_slug: "", public_slug: null, is_primary: false,
  hostname: ARENA_PREVIEW_HOST,
  agency_name: "ARENA TRAVEL GROUP", owner_name: "Rafael Souza",
  logo_url: arenaLogo.url, cover_image_url: null,
  // Paleta informada: preto e branco; terciário neutro claro derivado só para legibilidade.
  primary_color: "#000000", secondary_color: "#000000",
  tertiary_color: "#F4F4F4", secondary_auto: false, tertiary_auto: false,
  on_secondary_color: "#FFFFFF", phone: null, city: "Florianópolis", state: "SC",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
const arenaBaseline = buildGoldStandardProfile("arenaBriefing23", {
  navDensity: "compact", visaHome: false, featuredExperience: undefined,
  dmc: undefined, credentials: undefined, team: undefined,
  authority: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    testimonials: { enabled: false }, avaliacoes: { enabled: false }, offers: { enabled: false },
    newsletter: { enabled: false }, authority: { enabled: false },
  },
  nav: [
    { label: "Início", to: "/" }, { label: "Especialidades", to: "/#assinatura" },
    { label: "Destinos", to: "/#destinos" }, { label: "Resorts", to: "/#resorts" },
    { label: "Sobre", to: "/#sobre" }, { label: "Dúvidas", to: "/#faq" },
  ],
  heroPresentation: { kicker: "FLORIANÓPOLIS · SC · DESDE 2024", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "ARENA TRAVEL GROUP", subtitle: "Consultoria completa para diferentes viagens, com atendimento e suporte do início ao fim.", image: "europa", order: 1, enabled: true },
    { title: "Grupos e viagens acompanhadas", subtitle: "Para grupos de amigos e famílias com crianças. Imagem genérica de inspiração.", image: "grupos", order: 2, enabled: true },
    { title: "Resorts e all-inclusive", subtitle: "Descanso planejado com orientação em cada etapa. Imagem genérica de inspiração.", image: "resort", order: 3, enabled: true },
  ],
  signature: {
    kicker: "GRUPOS · INTERNACIONAIS · SOB MEDIDA",
    title: "Consultoria completa para diferentes viagens",
    text: "Conhecimento profundo de destinos e produtos, com atendimento e suporte do início ao fim. Grupos e viagens acompanhadas, destinos internacionais e viagens sob medida orientam o trabalho da ARENA TRAVEL GROUP.",
  },
  destinations: [
    { key: "resorts", image: "resort", label: "Resorts e all-inclusive", title: "Resorts e all-inclusive", text: "Uma das prioridades da agência para famílias e grupos. Imagem genérica de inspiração.", service: "hospedagem", enabled: true, order: 1 },
    { key: "europa", image: "europa", label: "Europa", title: "Europa", text: "Destinos internacionais planejados sob medida. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 2 },
    { key: "ski", image: "escandinavia", label: "Neve", title: "Viagens de ski", text: "Viagens de ski entre as prioridades da agência. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 3 },
    { key: "grupos", image: "grupos", label: "Grupos", title: "Grupos e viagens acompanhadas", text: "Para grupos de amigos e famílias com crianças. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 4 },
  ],
  modules: [
    { key: "resorts", title: "Resorts e all-inclusive", text: "Descanso com planejamento e suporte.", image: "resort", service: "hospedagem", enabled: true, order: 1 },
    { key: "europa", title: "Europa", text: "Roteiros internacionais sob medida. Imagem genérica.", image: "europa", service: "pacotes", enabled: true, order: 2 },
    { key: "ski", title: "Viagens de ski", text: "Destinos de neve para grupos e famílias. Imagem genérica.", image: "escandinavia", service: "pacotes", enabled: true, order: 3 },
    { key: "grupos", title: "Grupos e viagens acompanhadas", text: "Grupos de amigos e famílias com crianças. Imagem genérica.", image: "grupos", service: "pacotes", enabled: true, order: 4 },
  ],
  highlights: [
    { title: "Grupos de amigos", text: "Viagens em grupo e acompanhadas estão entre as especialidades da agência.", service: "pacotes", cta: "Planejar em grupo" },
    { title: "Famílias com crianças", text: "Planejamento para famílias, com orientação do início ao fim.", service: "pacotes", cta: "Planejar em família" },
    { title: "Viagens sob medida", text: "Destinos internacionais pensados para cada perfil de viajante.", service: "pacotes", cta: "Planejar minha viagem" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "Rafael Souza, sócio proprietário",
    text: "Após a carreira profissional no futebol e experiências de morar e viajar pelo mundo, Rafael Souza passou a ajudar amigos e familiares a planejar suas viagens.\n\nDessa vivência nasceu, em 2024, a ARENA TRAVEL GROUP, em Florianópolis (SC), para oferecer orientação e suporte em cada etapa da viagem.\n\nA agência reúne vivência frequente em destinos, conhecimento local, capacitações e parcerias com fornecedores, com foco em grupos e viagens acompanhadas, destinos internacionais e viagens sob medida.",
    badge: { value: "Desde 2024", label: "ARENA TRAVEL GROUP" }, media: "hidden", showLocation: true, ownerName: "Rafael Souza",
  },
  differentials: [
    { title: "Conhecimento de destinos", text: "Vivência frequente em destinos e conhecimento local.", icon: "conferido" },
    { title: "Capacitações e fornecedores", text: "Capacitações e parcerias com fornecedores para orientar as escolhas.", icon: "fornecedores" },
    { title: "Consultoria completa", text: "Planejamento, orçamento e reservas para diferentes viagens.", icon: "consultivo" },
    { title: "Suporte do início ao fim", text: "Orientação pré-embarque, acompanhamento durante a viagem e pós-retorno.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa pelo WhatsApp, e-mail ou telefone sobre a viagem.",
    "Planejamento, orçamento e reservas.",
    "Orientação pré-embarque.",
    "Acompanhamento durante a viagem e pós-retorno.",
  ],
  faq: [
    { q: "Quem é responsável pela agência?", a: "Rafael Souza, sócio proprietário da ARENA TRAVEL GROUP." },
    { q: "Desde quando a agência atua?", a: "A ARENA TRAVEL GROUP iniciou suas atividades em 2024, em Florianópolis (SC)." },
    { q: "Quais são as especialidades?", a: "Grupos e viagens acompanhadas, destinos internacionais e viagens sob medida." },
    { q: "Para quem são as viagens?", a: "Principalmente grupos de amigos e famílias com crianças." },
    { q: "Quais são os destinos prioritários?", a: "Resorts e all-inclusive, Europa e viagens de ski." },
    { q: "Como funciona o atendimento?", a: "Pelo WhatsApp, e-mail e telefone, com planejamento, orçamento e reservas, orientação pré-embarque, acompanhamento durante a viagem e pós-retorno." },
    { q: "Quais são os canais de contato?", a: "WhatsApp 47 99269-0807, e-mail arenatravel@arenatravelgroup.com.br e Instagram @arenatravelgroup." },
  ],
  copy: {
    modules: { kicker: "PRIORIDADES", title: "Destaques da ARENA TRAVEL GROUP", subtitle: "Resorts e all-inclusive, Europa, ski e grupos." },
    destinations: { kicker: "DESTINOS", title: "Destinos para a sua próxima viagem", subtitle: "Imagens genéricas de inspiração." },
    highlights: { kicker: "PERFIS", title: "Viagens para cada grupo", subtitle: "Grupos de amigos, famílias com crianças e viagens sob medida." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Orientação e suporte em cada etapa", subtitle: "Conhecimento de destinos e produtos." },
    concierge: { kicker: "COMO FUNCIONA", title: "Do planejamento ao retorno", subtitle: "Atendimento pelo WhatsApp, e-mail e telefone." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Sobre a ARENA TRAVEL GROUP" },
  },
  footer: {
    description: "Consultoria completa de viagens em Florianópolis (SC), desde 2024. Atendimento e suporte do início ao fim.",
    phone: "WhatsApp 47 99269-0807", email: "arenatravel@arenatravelgroup.com.br",
    instagram: "https://www.instagram.com/arenatravelgroup/", instagramLabel: "@arenatravelgroup",
    address: "Florianópolis/SC", showLocation: true, legalLinksDisabled: true,
  },
  seo: { title: "Prévia para revisão — ARENA TRAVEL GROUP", description: "Prévia técnica da ARENA TRAVEL GROUP; sem envios ou publicação." },
}, "ARENA TRAVEL GROUP");
/** Source imagery is temporary and remains attributed to its original owner. */
const arenaMundoSource: AgencySiteProfile = JSON.parse(JSON.stringify(MUNDO_EM_CORES_PREVIEW_PROFILE));
export const ARENA_PREVIEW_PROFILE: AgencySiteProfile = {
  ...arenaMundoSource,
  key: "arenaBriefing23",
  heroPresentation: { ...arenaMundoSource.heroPresentation, kicker: "ARENA TRAVEL GROUP · VIAGENS SOB MEDIDA" },
  hero: arenaMundoSource.hero?.map((slide, index) => ({
    ...slide,
    title: arenaBaseline.hero?.[index]?.title ?? slide.title,
    subtitle: (arenaBaseline.hero?.[index]?.subtitle ?? slide.subtitle).replace(/ Imagem genérica de inspiração\./g, ""),
  })),
  signature: arenaBaseline.signature,
  modules: arenaMundoSource.modules?.map((item, index) => ({
    ...item,
    title: arenaBaseline.modules?.[index]?.title ?? item.title,
    text: (arenaBaseline.modules?.[index]?.text ?? item.text).replace(/ Imagem genérica\./g, ""),
    service: arenaBaseline.modules?.[index]?.service ?? item.service,
  })),
  destinations: arenaMundoSource.destinations?.map((item, index) => {
    const content = arenaBaseline.destinations?.[index % (arenaBaseline.destinations?.length || 1)];
    return { ...item, ...content, key: item.key, image: item.image, order: item.order,
      text: (content?.text ?? item.text).replace(/ Imagem genérica de inspiração\./g, "") };
  }),
  about: { ...arenaMundoSource.about, ...arenaBaseline.about, media: undefined,
    images: arenaMundoSource.about?.images, mural: arenaMundoSource.about?.mural,
    visitedDestinations: undefined },
  featuredExperience: arenaMundoSource.featuredExperience ? {
    ...arenaMundoSource.featuredExperience, kicker: "DESCUBRA A RIVIERA MAYA",
    title: "Parques e hotéis Xcaret para conhecer em boa companhia",
    description: "Converse com a Arena Travel Group para planejar parques, hotéis e experiências de acordo com o perfil da sua família ou grupo.",
    highlights: ["Parques e hotéis", "Famílias e grupos", "Planejamento sob medida"],
  } : undefined,
  authority: arenaMundoSource.authority ? { ...arenaMundoSource.authority,
    companies: arenaMundoSource.authority.companies ? { ...arenaMundoSource.authority.companies,
      title: "Planeje seu próximo cruzeiro com a Arena Travel Group." } : undefined } : undefined,
  differentials: arenaBaseline.differentials, conciergeSteps: arenaBaseline.conciergeSteps,
  faq: arenaBaseline.faq,
  copy: { ...arenaMundoSource.copy, ...arenaBaseline.copy,
    destinations: { ...arenaBaseline.copy?.destinations, subtitle: "Resorts, Europa, neve e viagens em grupo, com orientação em cada etapa." },
    modules: { ...arenaBaseline.copy?.modules, cta: "Conversar com a Arena" },
    avaliacoes: { title: "Experiências de quem viaja com a Arena" },
    newsletter: { title: "Novidades da Arena Travel Group", subtitle: "Converse com a equipe sobre destinos e possibilidades para sua próxima viagem.", cta: "Quero saber mais" },
  },
  footer: { ...arenaBaseline.footer, whatsapp: "(47) 99269-0807", phone: "(47) 99269-0807" },
  socialStrip: { title: "Siga-nos nas redes", links: [{ network: "instagram", url: "https://www.instagram.com/arenatravelgroup/" }] },
  inspirationDialog: undefined, testimonials: undefined, seo: arenaBaseline.seo,
};
ADS_PREVIEW_FIXTURES[ARENA_PREVIEW_JOB_ID] = {
  jobId: ARENA_PREVIEW_JOB_ID, info: ARENA_PREVIEW_INFO, profile: ARENA_PREVIEW_PROFILE,
  notice: "prévia técnica para revisão · vinculação de conta pendente · sem envios ou publicação",
  documentTitle: "Prévia para revisão — ARENA TRAVEL GROUP", realAgency: true,
};

/* Innovati Travel: local-only fixture (briefing-24-v1). A CNPJ match exists
 * (public_slug innovati-travel) but no active public domain; nothing is linked
 * here — synthetic identity, no tenant/domain/permission/database write. */
export const INNOVATI_PREVIEW_JOB_ID = "briefing-24-v1";
export const INNOVATI_PREVIEW_HOST = "briefing-24-v1.preview.local";
export const INNOVATI_PREVIEW_PATH = `/ads-briefing-preview/${INNOVATI_PREVIEW_JOB_ID}`;
export const INNOVATI_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad24",
  agency_slug: "", public_slug: null, is_primary: false,
  hostname: INNOVATI_PREVIEW_HOST,
  agency_name: "Innovati Travel", owner_name: "Jussara Beraldes",
  logo_url: innovatiLogo.url, cover_image_url: null,
  // Paleta informada: azul #254F86 e laranja #F98D0D; terciário claro derivado do azul.
  primary_color: "#254F86", secondary_color: "#F98D0D",
  tertiary_color: "#EEF3F9", secondary_auto: false, tertiary_auto: false,
  on_secondary_color: "#1A1A1A", phone: null, city: "Franco da Rocha", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
const INSP = "Imagem genérica de inspiração.";
const innovatiBaseline = buildGoldStandardProfile("innovatiBriefing24", {
  navDensity: "compact", visaHome: false, featuredExperience: undefined,
  dmc: undefined, credentials: undefined, team: undefined,
  authority: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    testimonials: { enabled: false }, avaliacoes: { enabled: false }, offers: { enabled: false },
    newsletter: { enabled: false }, authority: { enabled: false },
  },
  nav: [
    { label: "Início", to: "/" }, { label: "Especialidades", to: "/#assinatura" },
    { label: "Destinos", to: "/#destinos" }, { label: "Resorts", to: "/#resorts" },
    { label: "Sobre", to: "/#sobre" }, { label: "Dúvidas", to: "/#faq" },
  ],
  heroPresentation: { kicker: "FRANCO DA ROCHA · SP · DESDE 2023", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "Innovati Travel", subtitle: "Consultoria personalizada, roteiros sob medida e acompanhamento próximo.", image: "parques", order: 1, enabled: true },
    { title: "Cruzeiros", subtitle: `Com destaque para a MSC. ${INSP}`, image: "cruzeiro", order: 2, enabled: true },
    { title: "Resorts e all-inclusive", subtitle: `Viagens em família com planejamento detalhado. ${INSP}`, image: "resort", order: 3, enabled: true },
  ],
  signature: {
    kicker: "FAMÍLIA · SOB MEDIDA · ACOMPANHAMENTO",
    title: "Consultoria personalizada para viagens em família",
    text: "Roteiros sob medida e acompanhamento próximo. Orlando e parques temáticos, cruzeiros, resorts, Brasil, Estados Unidos e Canadá orientam o trabalho da Innovati Travel.",
  },
  destinations: [
    { key: "orlando", image: "parques", label: "Orlando", title: "Orlando e parques temáticos", text: `Parques temáticos para toda a família. ${INSP}`, service: "pacotes", enabled: true, order: 1 },
    { key: "cruzeiros", image: "cruzeiro", label: "Cruzeiros", title: "Cruzeiros", text: `Com destaque para a MSC. ${INSP}`, service: "cruzeiros", enabled: true, order: 2 },
    { key: "resorts", image: "resort", label: "Resorts", title: "Resorts e all-inclusive", text: `Descanso planejado em detalhes. ${INSP}`, service: "hospedagem", enabled: true, order: 3 },
    { key: "brasil", image: "litoral", label: "Brasil", title: "Brasil: Sul e Nordeste", text: `Destinos nacionais sob medida. ${INSP}`, service: "pacotes", enabled: true, order: 4 },
  ],
  modules: [
    { key: "orlando", title: "Orlando e parques temáticos", text: "Planejamento detalhado para a família.", image: "parques", service: "pacotes", enabled: true, order: 1 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Com destaque para a MSC. Imagem genérica.", image: "cruzeiro", service: "cruzeiros", enabled: true, order: 2 },
    { key: "eua", title: "Estados Unidos e Canadá", text: "Roteiros sob medida e experiências esportivas nos EUA. Imagem genérica.", image: "grupos", service: "pacotes", enabled: true, order: 3 },
    { key: "brasil", title: "Brasil: Sul e Nordeste", text: "Viagens nacionais personalizadas. Imagem genérica.", image: "brasil", service: "pacotes", enabled: true, order: 4 },
  ],
  highlights: [
    { title: "Viagens em família", text: "Planejamento detalhado e recomendações personalizadas.", service: "pacotes", cta: "Planejar em família" },
    { title: "Roteiros sob medida", text: "Cada viagem pensada para o perfil de quem viaja.", service: "pacotes", cta: "Planejar minha viagem" },
    { title: "Experiências esportivas nos EUA", text: "Entre as especialidades da agência.", service: "pacotes", cta: "Saber mais" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "Jussara Beraldes, fundadora e consultora",
    text: "A Innovati Travel atua desde 2023 em Franco da Rocha (SP), com consultoria personalizada, viagens em família, roteiros sob medida e acompanhamento próximo.\n\nJussara Beraldes, fundadora e consultora, conduz o atendimento humano e o planejamento detalhado de cada viagem.\n\nAs especialidades incluem Orlando e parques temáticos, cruzeiros (com destaque para a MSC), resorts e all-inclusive, Brasil (Sul e Nordeste), Estados Unidos e Canadá e experiências esportivas nos EUA.",
    badge: { value: "Desde 2023", label: "Innovati Travel" }, media: "hidden", showLocation: true, ownerName: "Jussara Beraldes",
  },
  differentials: [
    { title: "Atendimento humano", text: "Conversa próxima com quem planeja a viagem.", icon: "consultivo" },
    { title: "Planejamento detalhado", text: "Cada etapa da viagem organizada com cuidado.", icon: "conferido" },
    { title: "Recomendações personalizadas", text: "Sugestões pensadas para o perfil de cada viajante.", icon: "fornecedores" },
    { title: "Suporte antes, durante e depois", text: "Acompanhamento em todas as fases da viagem.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa sobre a viagem pelo WhatsApp ou e-mail.",
    "Planejamento detalhado e recomendações personalizadas.",
    "Roteiro sob medida e organização da viagem.",
    "Suporte antes, durante e depois da viagem.",
  ],
  faq: [
    { q: "Quem é responsável pela agência?", a: "Jussara Beraldes, fundadora e consultora da Innovati Travel." },
    { q: "Desde quando a agência atua?", a: "A Innovati Travel atua desde 2023, em Franco da Rocha (SP)." },
    { q: "Quais são as especialidades?", a: "Orlando e parques temáticos, cruzeiros (com destaque para MSC), resorts e all-inclusive, Brasil (Sul e Nordeste), Estados Unidos e Canadá e experiências esportivas nos EUA." },
    { q: "Como é o atendimento?", a: "Atendimento humano, planejamento detalhado, recomendações personalizadas e suporte antes, durante e depois da viagem." },
    { q: "Quais são os canais de contato?", a: "WhatsApp (11) 91857-8547, e-mail innovatitravel@gmail.com e Instagram @innovatitravel." },
  ],
  copy: {
    modules: { kicker: "ESPECIALIDADES", title: "Destaques da Innovati Travel", subtitle: "Orlando, cruzeiros, EUA e Canadá e Brasil." },
    destinations: { kicker: "DESTINOS", title: "Destinos para a sua próxima viagem", subtitle: "Imagens genéricas de inspiração." },
    highlights: { kicker: "PERFIS", title: "Viagens pensadas para você", subtitle: "Família, roteiros sob medida e experiências esportivas." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Acompanhamento próximo em cada etapa", subtitle: "Atendimento humano e planejamento detalhado." },
    concierge: { kicker: "COMO FUNCIONA", title: "Do planejamento ao retorno", subtitle: "Suporte antes, durante e depois." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Sobre a Innovati Travel" },
  },
  footer: {
    description: "Consultoria personalizada de viagens em Franco da Rocha (SP), desde 2023. Roteiros sob medida e acompanhamento próximo.",
    phone: "WhatsApp (11) 91857-8547", email: "innovatitravel@gmail.com",
    instagram: "https://www.instagram.com/innovatitravel/", instagramLabel: "@innovatitravel",
    address: "Franco da Rocha/SP", showLocation: true, legalLinksDisabled: true,
  },
  seo: { title: "Prévia para revisão — Innovati Travel", description: "Prévia técnica da Innovati Travel; sem publicação e com ações desativadas." },
}, "Innovati Travel");
const innovatiMundoSource: AgencySiteProfile = JSON.parse(JSON.stringify(MUNDO_EM_CORES_PREVIEW_PROFILE));
export const INNOVATI_PREVIEW_PROFILE: AgencySiteProfile = {
  ...innovatiMundoSource, key: "innovatiBriefing24",
  nav: innovatiMundoSource.nav?.filter(item => item.to !== "/oportunidades-novembro"),
  heroPresentation: { ...innovatiMundoSource.heroPresentation, kicker: "INNOVATI TRAVEL · VIAGENS EM FAMÍLIA" },
  hero: innovatiMundoSource.hero?.map((slide, index) => ({
    ...slide, title: innovatiBaseline.hero?.[index]?.title ?? slide.title,
    subtitle: (innovatiBaseline.hero?.[index]?.subtitle ?? slide.subtitle).replace(/ Imagem genérica de inspiração\./g, ""),
  })),
  signature: innovatiBaseline.signature,
  modules: innovatiMundoSource.modules?.map((item, index) => ({
    ...item, title: innovatiBaseline.modules?.[index]?.title ?? item.title,
    text: (innovatiBaseline.modules?.[index]?.text ?? item.text).replace(/ Imagem genérica\./g, ""),
    service: innovatiBaseline.modules?.[index]?.service ?? item.service,
  })),
  destinations: innovatiMundoSource.destinations?.map((item, index) => {
    const content = innovatiBaseline.destinations?.[index];
    return { ...item, ...(content ?? { key: "resorts-brasil", label: "Brasil", title: "Resorts no Brasil",
      text: "Hospedagens para descansar e aproveitar no seu ritmo, com orientação da Innovati Travel.", service: "hospedagem" }),
      key: content?.key ?? (index === 4 ? "eua-canada" : "resorts-brasil"),
      ...(index === 4 ? { title: "Estados Unidos e Canadá", label: "América do Norte", text: "Roteiros sob medida e experiências para a família, com acompanhamento próximo.", service: "pacotes" } : {}),
      text: (index === 4 ? "Roteiros sob medida e experiências para a família, com acompanhamento próximo." : content?.text ?? "Resorts no Brasil para aproveitar no seu ritmo.").replace(/ Imagem genérica de inspiração\./g, ""),
      image: item.image, order: item.order };
  }),
  about: { ...innovatiMundoSource.about, ...innovatiBaseline.about, media: undefined,
    images: innovatiMundoSource.about?.images, mural: innovatiMundoSource.about?.mural,
    visitedDestinations: undefined, tagline: "Consultoria personalizada · Acompanhamento próximo" },
  featuredExperience: innovatiMundoSource.featuredExperience ? { ...innovatiMundoSource.featuredExperience,
    kicker: "DESCUBRA A RIVIERA MAYA", title: "Parques e hotéis Xcaret para a sua próxima viagem",
    description: "Converse com a Innovati Travel para conhecer as possibilidades de parques, hotéis e experiências Xcaret e planejar uma viagem de acordo com suas preferências.",
    highlights: ["Parques e hotéis", "Viagens em família", "Planejamento sob medida"] } : undefined,
  authority: innovatiMundoSource.authority ? { ...innovatiMundoSource.authority,
    companies: innovatiMundoSource.authority.companies ? { ...innovatiMundoSource.authority.companies,
      title: "Planeje seu próximo cruzeiro com a Innovati Travel." } : undefined } : undefined,
  differentials: innovatiBaseline.differentials, conciergeSteps: innovatiBaseline.conciergeSteps,
  faq: innovatiBaseline.faq,
  copy: { ...innovatiMundoSource.copy, ...innovatiBaseline.copy,
    modules: { ...innovatiBaseline.copy?.modules, cta: "Conversar com a Jussara" },
    concierge: { ...innovatiBaseline.copy?.concierge, cta: "Conversar com a Jussara" },
    avaliacoes: { title: "Experiências de quem viaja com a Innovati Travel" },
    testimonials: undefined,
    newsletter: { title: "Novidades da Innovati Travel", subtitle: "Converse com a Jussara sobre destinos e possibilidades para sua próxima viagem.", cta: "Quero saber mais" },
  },
  footer: { ...innovatiBaseline.footer, whatsapp: "(11) 91857-8547", phone: "(11) 91857-8547" }, socialStrip: { title: "Siga-nos nas redes", links: [{ network: "instagram", url: "https://www.instagram.com/innovatitravel/" }] },
  testimonials: undefined, inspirationDialog: undefined, seo: innovatiBaseline.seo,
};


ADS_PREVIEW_FIXTURES[INNOVATI_PREVIEW_JOB_ID] = {
  jobId: INNOVATI_PREVIEW_JOB_ID, info: INNOVATI_PREVIEW_INFO, profile: INNOVATI_PREVIEW_PROFILE,
  notice: "prévia para revisão · sem publicação · ações desativadas",
  documentTitle: "Prévia para revisão — Innovati Travel", realAgency: true,
};

/* Shopping Viagens: local-only fixture (briefing-25-v1). The authenticated
 * briefing matched a profile without a public domain; no identifier or
 * association is imported. Logo and palette pending: textual wordmark and
 * shared neutral tokens only. */
export const SHOPPING_PREVIEW_JOB_ID = "briefing-25-v1";
export const SHOPPING_PREVIEW_HOST = "briefing-25-v1.preview.local";
export const SHOPPING_PREVIEW_PATH = `/ads-briefing-preview/${SHOPPING_PREVIEW_JOB_ID}`;
export const SHOPPING_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad25",
  agency_slug: "", public_slug: null, is_primary: false,
  hostname: SHOPPING_PREVIEW_HOST,
  agency_name: "Shopping Viagens", owner_name: "Cristina Vale",
  logo_url: null, cover_image_url: null,
  // Shared wl-site-base neutral fallbacks, not an official palette.
  primary_color: "#0F1729", secondary_color: "#0F1729",
  tertiary_color: "#F6F6F8", secondary_auto: false, tertiary_auto: false,
  on_secondary_color: null, phone: null, city: "São Paulo", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
const shoppingBaseline = buildGoldStandardProfile("shoppingBriefing25", {
  textualWordmark: true,
  navDensity: "compact", visaHome: false, featuredExperience: undefined,
  dmc: undefined, credentials: undefined, team: undefined,
  authority: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    testimonials: { enabled: false }, avaliacoes: { enabled: false }, offers: { enabled: false },
    newsletter: { enabled: false }, authority: { enabled: false },
  },
  nav: [
    { label: "Início", to: "/" }, { label: "Sob medida", to: "/#assinatura" },
    { label: "Destinos", to: "/#destinos" }, { label: "Cruzeiros", to: "/#cruzeiros" },
    { label: "Resorts", to: "/#resorts" }, { label: "Sobre", to: "/#sobre" }, { label: "Dúvidas", to: "/#faq" },
  ],
  heroPresentation: { kicker: "SÃO PAULO · SP · DESDE 2002", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "Shopping Viagens", subtitle: "Planejamento completo para você viajar com tranquilidade.", image: "europa", order: 1, enabled: true },
    { title: "Europa, Itália e cruzeiros", subtitle: "Viagens sob medida com planejamento detalhado. Imagem genérica de inspiração.", image: "cruzeiro", order: 2, enabled: true },
    { title: "Caribe, México e resorts", subtitle: "Resorts e all inclusive com orientação e atendimento próximo. Imagem genérica de inspiração.", image: "resort", order: 3, enabled: true },
  ],
  signature: {
    kicker: "VIAGENS SOB MEDIDA · DESDE 2002",
    title: "Consultoria completa para diferentes viagens",
    text: "Desde 2002, a Shopping Viagens planeja viagens sob medida para quem quer viajar sem se preocupar com nada e valoriza orientação e atendimento próximo.",
  },
  destinations: [
    { key: "europa", image: "europa", label: "Europa", title: "Europa e Itália", text: "Europa entre as prioridades, com destaque para a Itália. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 1 },
    { key: "caribe", image: "litoral", label: "Caribe e México", title: "Caribe e México", text: "Destinos caribenhos e mexicanos planejados sob medida. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 2 },
    { key: "brasil", image: "brasil", label: "Brasil", title: "Brasil e Nordeste", text: "Viagens pelo Brasil, com destaque para os resorts no Nordeste.", service: "pacotes", enabled: true, order: 3 },
    { key: "cruzeiros", image: "cruzeiro", label: "Cruzeiros", title: "Cruzeiros", text: "Cruzeiros entre os detalhes prioritários do planejamento.", service: "cruzeiros", enabled: true, order: 4 },
    { key: "resorts", image: "resort", label: "Resorts", title: "Resorts e all inclusive", text: "Descanso com planejamento completo, do Nordeste ao Caribe.", service: "hospedagem", enabled: true, order: 5 },
    { key: "eua", image: "parques", label: "América do Norte", title: "Estados Unidos", text: "Estados Unidos entre os destinos prioritários. Imagem genérica de inspiração.", service: "pacotes", enabled: true, order: 6 },
  ],
  modules: [
    { key: "cruzeiros", title: "Cruzeiros", text: "Um dos detalhes prioritários da Shopping Viagens.", image: "cruzeiro", service: "cruzeiros", enabled: true, order: 1 },
    { key: "italia", title: "Itália", text: "Destaque europeu nas viagens sob medida. Imagem genérica de inspiração.", image: "europa", service: "pacotes", enabled: true, order: 2 },
    { key: "nordeste", title: "Resorts no Nordeste", text: "Resorts e all inclusive no Brasil.", image: "resort", service: "hospedagem", enabled: true, order: 3 },
    { key: "caribe", title: "Caribe", text: "Inspirações caribenhas para a próxima viagem. Imagem genérica.", image: "litoral", service: "pacotes", enabled: true, order: 4 },
    { key: "eua", title: "Estados Unidos", text: "Destino prioritário no planejamento. Imagem genérica.", image: "parques", service: "pacotes", enabled: true, order: 5 },
    { key: "brasil", title: "Brasil", text: "Diferentes destinos nacionais planejados sob medida.", image: "brasil", service: "pacotes", enabled: true, order: 6 },
  ],
  highlights: [
    { title: "Viagens sob medida", text: "Cada viagem planejada conforme as necessidades do cliente.", service: "pacotes", cta: "Planejar minha viagem" },
    { title: "Cruzeiros", text: "Cruzeiros entre os destaques do planejamento.", service: "cruzeiros", cta: "Planejar meu cruzeiro" },
    { title: "Resorts e all inclusive", text: "Descanso no Nordeste, no Caribe e no México.", service: "hospedagem", cta: "Planejar meu descanso" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "Cristina Vale, fundadora",
    text: "A Shopping Viagens atua desde 2002, em São Paulo (SP), com consultoria completa para diferentes viagens. Cristina Vale, fundadora, é a responsável pelo atendimento.\n\nA especialidade são as viagens sob medida, com planejamento completo para o cliente viajar com tranquilidade. Europa, Caribe e México, Brasil, cruzeiros, resorts e all inclusive estão entre as prioridades.\n\nO planejamento detalhado antecipa riscos e necessidades, apoiado pela vivência pessoal frequente nos destinos vendidos. A equipe compartilhada mantém a continuidade das informações, e o responsável habitual acompanha eventuais incidentes até a solução.",
    badge: { value: "Desde 2002", label: "Shopping Viagens" }, media: "hidden", showLocation: true, ownerName: "Cristina Vale",
  },
  differentials: [
    { title: "Planejamento detalhado", text: "Antecipa riscos e necessidades da viagem.", icon: "consultivo" },
    { title: "Vivência nos destinos", text: "Vivência pessoal frequente nos destinos vendidos.", icon: "conferido" },
    { title: "Continuidade no atendimento", text: "Equipe compartilhada com continuidade das informações.", icon: "fornecedores" },
    { title: "Acompanhamento até a solução", text: "O responsável habitual acompanha incidentes até a solução.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversa por WhatsApp, telefone, e-mail ou atendimento presencial.",
    "Planejamento detalhado da viagem sob medida.",
    "Orçamento e reservas.",
    "Acompanhamento pelo responsável habitual em caso de incidentes, até a solução.",
  ],
  faq: [
    { q: "Quem é responsável pelo atendimento?", a: "Cristina Vale, fundadora da Shopping Viagens." },
    { q: "Desde quando a agência atua?", a: "A Shopping Viagens atua desde 2002, em São Paulo/SP." },
    { q: "Qual é a especialidade?", a: "Viagens sob medida, com consultoria completa para diferentes viagens." },
    { q: "Quais são os destinos prioritários?", a: "Europa, Caribe e México, Brasil, cruzeiros, resorts e all inclusive — com destaque para cruzeiros, Itália, resorts no Nordeste, Caribe e Estados Unidos." },
    { q: "Como funciona o atendimento?", a: "Planejamento, orçamento e reservas, com equipe compartilhada que mantém a continuidade das informações. O responsável habitual acompanha incidentes até a solução." },
    { q: "Quais são os canais de atendimento?", a: "WhatsApp 11 94714-8466, telefone 11 2096-7777, e-mail info@shoppingviagens.com.br, atendimento presencial e Instagram @shoppingviagens." },
  ],
  copy: {
    modules: { kicker: "DESTAQUES", title: "Destaques da Shopping Viagens", subtitle: "Cruzeiros, Itália, resorts no Nordeste, Caribe e Estados Unidos." },
    destinations: { kicker: "DESTINOS", title: "Destinos para a sua próxima viagem", subtitle: "Europa, Caribe e México, Brasil, cruzeiros e resorts." },
    highlights: { kicker: "INSPIRAÇÕES", title: "Diferentes formas de viajar", subtitle: "Planejamento completo para viajar com tranquilidade." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "O jeito Shopping Viagens de planejar", subtitle: "Orientação e atendimento próximo do início ao fim." },
    concierge: { kicker: "COMO FUNCIONA", title: "Do planejamento à solução", subtitle: "Planejamento, orçamento, reservas e acompanhamento." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Sobre a Shopping Viagens" },
  },
  footer: {
    description: "Viagens sob medida desde 2002. Planejamento completo para viajar com tranquilidade.",
    phone: "WhatsApp 11 94714-8466 · Telefone 11 2096-7777", email: "info@shoppingviagens.com.br",
    instagram: "https://www.instagram.com/shoppingviagens/", instagramLabel: "@shoppingviagens",
    address: "São Paulo/SP", showLocation: true, legalLinksDisabled: true,
  },
  seo: { title: "Prévia para revisão — Shopping Viagens", description: "Prévia técnica da Shopping Viagens. Logotipo e paleta pendentes; sem publicação." },
}, "Shopping Viagens");
export const SHOPPING_PREVIEW_PROFILE: AgencySiteProfile = buildMundoReviewProfile("shoppingBriefing25", shoppingBaseline, "Shopping Viagens", "Cristina Vale");
SHOPPING_PREVIEW_PROFILE.footer = { ...shoppingBaseline.footer, whatsapp: "(11) 94714-8466", phone: "(11) 2096-7777" };
ADS_PREVIEW_FIXTURES[SHOPPING_PREVIEW_JOB_ID] = {
  jobId: SHOPPING_PREVIEW_JOB_ID, info: SHOPPING_PREVIEW_INFO, profile: SHOPPING_PREVIEW_PROFILE,
  notice: "prévia técnica para revisão · logotipo e paleta pendentes · imagens genéricas · sem publicação",
  documentTitle: "Prévia para revisão — Shopping Viagens", realAgency: true,
};

/** Bardelli review copy; never changes the official tenant or previous presentation. */
export const BARDELLI_MUNDO_PREVIEW_HOST = "bardelli-mundo.preview.local";
export const BARDELLI_MUNDO_PREVIEW_JOB_ID = "bardelli-mundo-v1";
const bardelliMundoSource: AgencySiteProfile = JSON.parse(JSON.stringify(MUNDO_EM_CORES_PREVIEW_PROFILE));
export const BARDELLI_MUNDO_PREVIEW_PROFILE: AgencySiteProfile = {
  ...bardelliMundoSource, key: "bardelliMundoPreview",
  nav: bardelliMundoSource.nav?.filter(item => item.to !== "/oportunidades-novembro"),
  heroPresentation: { ...bardelliMundoSource.heroPresentation, kicker: "BARDELLI VIAGENS · VIAGENS PERSONALIZADAS" },
  hero: bardelliMundoSource.hero?.map((slide, index) => ({
    ...slide,
    title: ["Uma viagem com a sua identidade.", "A Europa no seu ritmo.", "Momentos para viver em boa companhia."][index] ?? slide.title,
    subtitle: ["Planejamento personalizado para famílias, casais e grupos de amigos, com atenção a cada detalhe.", "Roteiros e experiências escolhidos a partir das suas preferências.", "Parques, resorts e cruzeiros para compartilhar novas histórias."][index] ?? slide.subtitle,
  })),
  signature: { ...BARDELLI_OFFICIAL_PROFILE.signature! },
  modules: bardelliMundoSource.modules?.map((item, index) => ({
    ...item,
    title: ["Viagens personalizadas", "Famílias e casais", "Grupos de amigos", "Parques, resorts e cruzeiros"][index] ?? item.title,
    text: ["Roteiros construídos a partir do perfil, do ritmo e das preferências de quem viaja.", "Planejamento que considera diferentes idades, interesses e momentos.", "Experiências para compartilhar, com logística e serviços organizados.", "Orientação para escolher destinos, hospedagens e experiências que combinam com você."][index] ?? item.text,
  })),
  destinations: bardelliMundoSource.destinations?.map((item, index) => ({
    ...item,
    key: ["europa", "brasil", "orlando", "cruzeiros", "resorts-internacionais", "resorts-nacionais"][index] ?? item.key,
    label: ["Europa", "Brasil", "Parques temáticos", "Cruzeiros", "Resorts internacionais", "Resorts no Brasil"][index] ?? item.label,
    title: ["Europa no seu ritmo", "Descubra o Brasil", "Disney e Universal", "Sua próxima viagem no mar", "Resorts e all-inclusive", "Descanso no Brasil"][index] ?? item.title,
    text: ["Roteiros personalizados para conhecer cidades, paisagens e experiências europeias.", "Destinos brasileiros com planejamento e atenção aos detalhes.", "Parques, hospedagem e experiências para famílias, casais e amigos.", "Compare companhias, navios, cabines e itinerários com orientação da Bardelli.", "Hospedagens escolhidas de acordo com o perfil e o ritmo da sua viagem.", "Resorts nacionais para aproveitar dias de lazer com tranquilidade."][index] ?? item.text,
  })),
  about: { ...bardelliMundoSource.about, ...BARDELLI_OFFICIAL_PROFILE.about,
    media: undefined, images: bardelliMundoSource.about?.images, mural: bardelliMundoSource.about?.mural,
    visitedDestinations: undefined, tagline: "Viagens personalizadas · Planejamento com cuidado",
    badge: { value: "Desde 2008", label: "Bardelli Viagens" } },
  featuredExperience: bardelliMundoSource.featuredExperience ? {
    ...bardelliMundoSource.featuredExperience, kicker: "DESCUBRA A RIVIERA MAYA",
    title: "Parques e hotéis Xcaret para a sua próxima viagem",
    description: "Converse com a Bardelli Viagens para conhecer as possibilidades de parques, hotéis e experiências Xcaret e planejar uma viagem de acordo com suas preferências.",
    highlights: ["Parques e hotéis", "Famílias, casais e amigos", "Planejamento personalizado"],
  } : undefined,
  authority: bardelliMundoSource.authority ? { ...bardelliMundoSource.authority,
    companies: bardelliMundoSource.authority.companies ? { ...bardelliMundoSource.authority.companies,
      title: "Planeje seu próximo cruzeiro com a Bardelli Viagens." } : undefined } : undefined,
  differentials: [
    { title: "Conversa próxima", text: "O planejamento começa por entender quem vai viajar e o que deseja viver.", icon: "consultivo" },
    { title: "Experiência no turismo", text: "Barbara Bardelli reúne 33 anos de experiência no turismo.", icon: "conferido" },
    { title: "Viagens personalizadas", text: "Destinos, hospedagens e experiências escolhidos conforme o perfil de cada viajante.", icon: "fornecedores" },
    { title: "Acompanhamento", text: "Orientação antes e durante a viagem, com suporte por WhatsApp.", icon: "acompanhamento" },
  ],
  conciergeSteps: ["Uma conversa sobre seus planos, preferências e viajantes.", "Seleção de destinos, hospedagens e serviços.", "Apresentação das opções e ajustes antes das reservas.", "Orientação antes e durante a viagem."],
  faq: [
    { q: "Como funciona o planejamento?", a: "Começamos por uma conversa sobre seu perfil, seu ritmo e o que deseja viver. A partir disso, montamos uma proposta personalizada." },
    { q: "Quais viagens a Bardelli planeja?", a: "Viagens de lazer para famílias, casais e grupos de amigos, incluindo parques temáticos, resorts, cruzeiros e destinos nacionais e internacionais." },
    { q: "Quem cuida da minha viagem?", a: "Barbara Bardelli, à frente da agência fundada em 2008, reúne 33 anos de experiência no turismo." },
    { q: "Há suporte durante a viagem?", a: "Sim. O atendimento acompanha você antes e durante a viagem, com suporte por WhatsApp." },
  ],
  copy: { ...bardelliMundoSource.copy,
    modules: { title: "Cada viagem começa por quem vai vivê-la", subtitle: "Planejamento personalizado e atenção a cada escolha.", cta: "Conversar com a Barbara" },
    destinations: { title: "Destinos para novas histórias", subtitle: "Possibilidades para famílias, casais e grupos de amigos." },
    differentials: { title: "O cuidado da Bardelli em cada etapa", subtitle: "Experiência, planejamento e atenção aos detalhes." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa à viagem", subtitle: "Você conhece as opções e ajusta os detalhes com a Barbara antes de reservar.", cta: "Conversar com a Barbara" },
    avaliacoes: { title: "Experiências de quem viaja com a Bardelli" },
    testimonials: undefined,
    newsletter: { title: "Novidades da Bardelli Viagens", subtitle: "Converse com a Barbara sobre destinos e possibilidades para sua próxima viagem.", cta: "Quero saber mais" },
  },
  footer: { ...BARDELLI_OFFICIAL_PROFILE.footer },
  socialStrip: BARDELLI_OFFICIAL_PROFILE.socialStrip ? JSON.parse(JSON.stringify(BARDELLI_OFFICIAL_PROFILE.socialStrip)) : undefined,
  testimonials: undefined, inspirationDialog: undefined,
  seo: { title: "Prévia para revisão — Bardelli Viagens", description: "Nova prévia da Bardelli Viagens com a estrutura do Mundo em Cores." },
};
ADS_PREVIEW_FIXTURES[BARDELLI_MUNDO_PREVIEW_JOB_ID] = {
  jobId: BARDELLI_MUNDO_PREVIEW_JOB_ID,
  info: { ...BARDELLI_PRESENTATION_INFO, hostname: BARDELLI_MUNDO_PREVIEW_HOST },
  profile: BARDELLI_MUNDO_PREVIEW_PROFILE,
  notice: "Bardelli Viagens · prévia para revisão · fotos do modelo provisórias · sem envios ou publicação",
  documentTitle: "Prévia — Bardelli Viagens", realAgency: true,
  pages: { xcaret: { slots: GENERIC_XCARET_SLOTS, textRewrites: BARDELLI_XCARET_REWRITES },
    resorts: { title: "Explore os resorts do Brasil com a Bardelli Viagens" }, orlandoTickets: true, editorial: true },
};

// Shared content pages for the isolated Bagagem review only; no real submissions.
ADS_PREVIEW_FIXTURES[BAGAGEM_NA_MAO_PREVIEW_JOB_ID].pages = {
  xcaret: { slots: GENERIC_XCARET_SLOTS, textRewrites: BARDELLI_XCARET_REWRITES.map(([from, to]) => [from, to.replace(/Bardelli Viagens/g, "Bagagem na Mão Viagens").replace(/Bardelli/g, "Bagagem na Mão")]) },
  resorts: { title: "Explore os resorts do Brasil com a Bagagem na Mão" }, orlandoTickets: true, editorial: true,
};
ADS_PREVIEW_FIXTURES[BAGAGEM_NA_MAO_PREVIEW_JOB_ID].notice = "Bagagem na Mão · prévia para revisão · fotos do modelo provisórias · sem envios ou publicação";

// Content pages stay within the isolated Innovati review; no live submissions.
ADS_PREVIEW_FIXTURES[INNOVATI_PREVIEW_JOB_ID].pages = {
  xcaret: { slots: GENERIC_XCARET_SLOTS, textRewrites: BARDELLI_XCARET_REWRITES.map(([from, to]) => [from, to.replace(/Bardelli Viagens/g, "Innovati Travel").replace(/Bardelli/g, "Innovati")]) },
  resorts: { title: "Explore os resorts do Brasil com a Innovati Travel" }, orlandoTickets: true, editorial: true,
};
ADS_PREVIEW_FIXTURES[INNOVATI_PREVIEW_JOB_ID].notice = "Innovati Travel · prévia para revisão · fotos do modelo provisórias · sem envios ou publicação";

/** Review-only configuration copy: keeps source media, applies confirmed agency copy. */
function buildMundoReviewProfile(
  key: AgencySiteProfile["key"], baseline: AgencySiteProfile, agency: string, consultant: string,
): AgencySiteProfile {
  const source: AgencySiteProfile = JSON.parse(JSON.stringify(MUNDO_EM_CORES_PREVIEW_PROFILE));
  const clean = (text?: string) => (text ?? "").replace(/\s*Imagem genérica(?: de inspiração)?\./g, "").trim();
  return {
    ...source, key, textualWordmark: baseline.textualWordmark,
    nav: source.nav?.filter(item => item.to !== "/oportunidades-novembro"),
    heroPresentation: { ...source.heroPresentation, kicker: agency.toUpperCase() + " · VIAGENS SOB MEDIDA" },
    hero: source.hero?.map((slide, index) => ({
      ...slide, title: baseline.hero?.[index]?.title ?? slide.title,
      subtitle: clean(baseline.hero?.[index]?.subtitle ?? slide.subtitle),
    })),
    signature: baseline.signature,
    modules: source.modules?.map((item, index) => ({
      ...item, title: baseline.modules?.[index]?.title ?? "Viagens sob medida",
      text: clean(baseline.modules?.[index]?.text ?? "Planejamento personalizado para o perfil de quem viaja."),
      service: baseline.modules?.[index]?.service ?? item.service,
    })),
    destinations: source.destinations?.map((item, index) => {
      const own = baseline.destinations?.[index];
      return { ...item, ...(own ?? { key: "resorts-brasil-review", label: "Brasil", title: "Resorts no Brasil", service: "hospedagem" }),
        text: clean(own?.text ?? "Resorts para aproveitar no seu ritmo, com orientação da agência."),
        image: item.image, order: item.order };
    }),
    about: { ...source.about, ...baseline.about, media: undefined,
      images: source.about?.images, mural: source.about?.mural, visitedDestinations: undefined,
      tagline: "Planejamento personalizado · Atendimento próximo" },
    featuredExperience: source.featuredExperience ? { ...source.featuredExperience,
      kicker: "DESCUBRA A RIVIERA MAYA", title: "Parques e hotéis Xcaret para a sua próxima viagem",
      description: "Converse com a " + agency + " para conhecer as possibilidades de parques, hotéis e experiências Xcaret e planejar uma viagem de acordo com suas preferências.",
      highlights: ["Parques e hotéis", "Planejamento personalizado", "Atendimento próximo"] } : undefined,
    authority: source.authority ? { ...source.authority,
      companies: source.authority.companies ? { ...source.authority.companies,
        title: "Planeje seu próximo cruzeiro com a " + agency + "." } : undefined } : undefined,
    differentials: baseline.differentials, conciergeSteps: baseline.conciergeSteps, faq: baseline.faq,
    copy: { ...source.copy, ...baseline.copy,
      modules: { ...baseline.copy?.modules, cta: "Conversar com a " + consultant },
      concierge: { ...baseline.copy?.concierge, cta: "Conversar com a " + consultant },
      avaliacoes: { title: "Experiências de quem viaja com a " + agency },
      testimonials: undefined,
      newsletter: { title: "Novidades da " + agency, subtitle: "Converse com a equipe sobre destinos e possibilidades para sua próxima viagem.", cta: "Quero saber mais" },
    },
    footer: baseline.footer,
    socialStrip: baseline.footer?.instagram ? { title: "Siga-nos nas redes", links: [{ network: "instagram", url: baseline.footer.instagram }] } : undefined,
    testimonials: undefined, inspirationDialog: undefined, seo: baseline.seo,
  };
}
ADS_PREVIEW_FIXTURES[SHOPPING_PREVIEW_JOB_ID].pages = {
  xcaret: { slots: GENERIC_XCARET_SLOTS, textRewrites: BARDELLI_XCARET_REWRITES.map(([from, to]) => [from, to.replace(/Bardelli Viagens/g, "Shopping Viagens").replace(/Bardelli/g, "Shopping Viagens")]) },
  resorts: { title: "Explore os resorts do Brasil com a Shopping Viagens" }, orlandoTickets: true, editorial: true,
};
ADS_PREVIEW_FIXTURES[SHOPPING_PREVIEW_JOB_ID].notice = "Shopping Viagens · prévia para revisão · logotipo e paleta pendentes · fotos do modelo provisórias · sem publicação";
