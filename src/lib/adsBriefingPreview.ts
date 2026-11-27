import { BARDELLI_IMM_PREVIEW_HOST, BARDELLI_IMM_PREVIEW_JOB_ID, buildBardelliImmPreview } from "@/lib/bardelliImmPreview";
/**
 * Prévia técnica da fixture ADS "ads-email-test-v1" (agência FICTÍCIA).
 * Conteúdo 100% local: nenhum tenant, conta ou cadastro real é consultado.
 * Servida apenas no host técnico id-preview (e localhost de desenvolvimento).
 */
import { REQUINTE_PREVIEW_JOB_ID, REQUINTE_PREVIEW_INFO, REQUINTE_PREVIEW_PROFILE } from "@/lib/requinteBriefingPreview";
import { buildGoldStandardProfile } from "@/lib/goldStandardSiteTemplate";
import { EDITORIAL_ROSE } from "@/lib/agencyReferenceProfiles";
import bardelliLogo from "@/assets/whitelabel/logo-bardelli-viagens.png.asset.json";
import bardelliNewsletterPhoto from "@/assets/whitelabel/hero-praia.jpg";
import dricaNewsletterLondon from "@/assets/presentation/drica/london-newsletter.jpg";
import pristurNewsletterWing from "@/assets/whitelabel/mundo-newsletter-wing.jpg.asset.json";
import arenaRafaelSnowboard from "@/assets/arena-rafael-snowboard-action.webp.asset.json";
import clubMedSkiVideo from "@/assets/whitelabel/club-med-all-inclusive-ski-vacations.mp4.asset.json";
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
import pristurPriscila from "@/assets/whitelabel/pristur/pristur-priscila.png.asset.json";
import essyaCristiane from "@/assets/whitelabel/essya/essya-cristiane.png.asset.json";
const karibuLogo = { url: "/karibu-logo.png" };
import arenaLogo from "@/assets/ads-preview/briefing-23-v1-logo.jpeg.asset.json";
import innovatiLogo from "@/assets/ads-preview/briefing-24-v1-logo.png.asset.json";
import rbTourLogo from "@/assets/ads-preview/briefing-29-v1-logo.png.asset.json";
import roteirosDaTerraLogo from "@/assets/ads-preview/briefing-28-v1-logo.png.asset.json";
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

export const BAGAGEM_NA_MAO_PREVIEW_PROFILE = buildGoldStandardProfile("bagagemNaMaoBriefing19", {
  navDensity: "compact",
  randomizeDestinations: false,
  highlights: [],
  requestCenter: { title: "O que você quer planejar?", support: "Conte o que imagina para a sua viagem. A Márcia ajuda a organizar as escolhas.", notice: "Escolha o serviço para começar.", submitLabel: "Solicitar cotação", titlePlacement: "above-card" },
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
    highlights: { enabled: false },
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
    { kicker: "VIAGENS SOB MEDIDA", title: "Sua viagem começa com uma boa conversa", subtitle: "Conte à Márcia com quem você vai viajar, o que quer viver e em que ritmo. A Bagagem na Mão organiza as escolhas com você.", image: "heroVarenna", order: 1, enabled: true },
    { kicker: "ORLANDO E PARQUES", title: "Orlando no ritmo da sua família", subtitle: "Escolha os parques, combine ingressos e hospedagem e reserve tempo para descansar entre um dia de diversão e outro.", image: "orlandoMagicKingdom", order: 2, enabled: true },
    { kicker: "DISNEY CRUISE LINE", title: "A magia da Disney, agora no mar", subtitle: "Entenda o que muda de um navio para outro e encontre o roteiro, a cabine e a época que fazem sentido para sua família.", image: "cruzeiroDisneyWish", order: 3, enabled: true },
  ],
  signature: {
    kicker: "UM JEITO NOVO DE VIAJAR",
    title: "Viagens sob medida, planejadas com escuta e cuidado.",
    text: "Desde 2014, a Bagagem na Mão Viagens desenha roteiros a partir do perfil de quem viaja: famílias e parques, viagens internacionais, resorts e cruzeiros, com atenção a cada detalhe.",
    continuation: {
      title: "Orlando e a magia da Disney no mar",
      text: "Quer combinar os parques com um cruzeiro? A Márcia ajuda a organizar os dias em Orlando, comparar roteiros e cabines da Disney Cruise Line e planejar como chegar ao porto sem apertar a programação da família.",
    },
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
    { key: "cruzeiros", title: "Disney Cruise Line e outros cruzeiros", text: "Compare navios, cabines e itinerários para viajar com a família, com ou sem uma passagem pelos parques de Orlando.", service: "cruzeiros", image: "cruzeiroDisneyWish", enabled: true, order: 5 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Desde 2014, uma viagem diferente para cada viajante",
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
  conciergePoints: undefined,
  authority: {
    kicker: "DISNEY CRUISE LINE",
    title: "Encontre o cruzeiro que combina com a sua família",
    paragraphs: [
      "Um cruzeiro Disney pode ser a viagem inteira ou entrar no roteiro depois dos parques de Orlando. Compare portos, duração e dias a bordo antes de decidir o que faz sentido para a sua família.",
      "A Márcia ajuda a avaliar navio, roteiro e categoria da cabine, além de pensar no deslocamento até o porto. Se seu perfil pede outra companhia, a agência também ajuda a comparar as opções.",
    ],
    cta: "Pedir uma cotação de cruzeiro",
    service: "cruzeiros",
  },
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
    { q: "A agência orienta na escolha de um cruzeiro Disney?", a: "Sim. A Bagagem na Mão ajuda a comparar roteiros, navios e categorias de cabine para que você escolha conforme o perfil da família e as datas da viagem." },
    { q: "Qual é o horário de atendimento?", a: "De segunda a sexta, das 8h30 às 19h, e aos sábados, das 9h às 11h." },
    { q: "Onde a agência atende?", a: "A Bagagem na Mão Viagens fica na Rua Conde de Bonfim, 211, sala 412, na Tijuca, Rio de Janeiro/RJ, e também atende pelos canais digitais." },
  ],
  copy: {
    destinations: { title: "Destinos para a sua próxima viagem", subtitle: "Estados Unidos e Canadá, Europa, resorts, parques e cruzeiros planejados para o seu perfil." },
    modules: { title: "Especialidades", subtitle: "Viagens sob medida, famílias e parques, viagens internacionais, resorts e cruzeiros." },
    differentials: { title: "Um jeito novo de viajar", subtitle: "Escuta, planejamento sob medida e acompanhamento em cada etapa." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa ao retorno", subtitle: "Um processo próximo e claro, conduzido pela agência." },
    faq: { title: "Dúvidas frequentes" },
  },
  whatsappChannels: {
    group: "https://chat.whatsapp.com/Eqc08LTxqMcJIAir5xuS4l?s=cl&p=i&mlu=4&ilr=4&iam=2",
    contact: "https://api.whatsapp.com/send?phone=5521988559515&utm_medium=social&utm_source=heylink.me",
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
    hours: "Segunda a sexta, das 8h30 às 19h · Sábado, das 9h às 11h",
  },
  seo: {
    title: "Prévia para revisão — Bagagem na Mão Viagens",
    description: "Prévia técnica revisável do site Bagagem na Mão Viagens.",
  },
}, "Bagagem na Mão Viagens");
// Sem páginas especiais Xcaret, DMC Portugal ou Visto nesta prévia.
delete BAGAGEM_NA_MAO_PREVIEW_PROFILE.dmc;
delete BAGAGEM_NA_MAO_PREVIEW_PROFILE.credentials;
delete BAGAGEM_NA_MAO_PREVIEW_PROFILE.team;
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
  // Visto americano após Parques e Ingressos (pedido de Fernando, 16/11/2026).
  visaHome: true,
  featuredExperience: undefined,
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#autoridade", children: [
      { label: "Parques Orlando", to: "/ingressos-orlando" },
      { label: "Visto Americano", to: "/visto-americano" },
      { label: "Cruzeiros 26/27", to: "/cruzeiros/temporada-brasileira-2026-2027" },
      { label: "Resorts Brasil", to: "/#resorts" },
    ] },
    { label: "Blog", to: "/blog" },
    { label: "Sobre", to: "/#sobre", children: [
      { label: "Quem Somos", to: "/#sobre" },
      { label: "Avaliações do Google", to: "/#avaliacoes" },
      { label: "Dúvidas Frequentes", to: "/#faq" },
    ] },
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
    { label: "Especialidades", to: "/#ingressos-orlando", children: [
      { label: "Parques em Orlando", to: "/#ingressos-orlando" },
      { label: "Resorts no Brasil", to: "/#resorts" },
      { label: "Cruzeiros 26/27", to: "/#autoridade" },
    ] },
    { label: "Destinos", to: "/#destinos" },
    { label: "Sobre", to: "/#sobre", children: [
      { label: "Quem somos", to: "/#sobre" },
      { label: "Dúvidas frequentes", to: "/#faq" },
    ] },
  ],
  heroPresentation: { overlay: "strongLeft", titleWeight: "regular", actionsPlacement: "right" },
  hero: [
    { kicker: "CRUZEIROS", title: "O cruzeiro certo começa com boas escolhas", subtitle: "Compare navios, roteiros e cabines com a orientação da Karibu, do planejamento ao desembarque.", image: "immCruise", order: 1, enabled: true },
    { kicker: "ORLANDO · PARQUES E INGRESSOS", title: "Orlando no ritmo de quem viaja", subtitle: "Organize seus dias na Disney e na Universal com ajuda para escolher os parques e os ingressos.", image: "immDisneyCastle", order: 2, enabled: true },
    { kicker: "DESTINOS NO BRASIL E NO EXTERIOR", title: "Do Nordeste à Europa, viaje com tranquilidade", subtitle: "Roteiros pensados para o seu jeito de viajar, com suporte antes, durante e depois da viagem.", image: "heroVarenna", order: 3, enabled: true },
  ],
  signature: {
    kicker: "CRUZEIROS · INTERNACIONAIS · NACIONAIS",
    title: "Segurança e suporte antes, durante e depois da viagem.",
    text: "A Karibu Viagens e Turismo atende públicos diversos em cruzeiros, destinos internacionais e destinos nacionais, com planejamento detalhado, suporte durante a viagem e acompanhamento pós-venda.",
  },
  destinations: [
    { key: "brasil", image: "nordesteResort", label: "Brasil", title: "Nordeste brasileiro", text: "Praias e resorts para descansar, viajar em família ou descobrir um novo trecho do litoral.", service: "pacotes", enabled: true, order: 1 },
    { key: "europa", image: "heroVarenna", label: "Europa", title: "Europa", text: "Capitais, cidades históricas e paisagens em roteiros pensados para o seu tempo de viagem.", service: "pacotes", enabled: true, order: 2 },
    { key: "cruzeiros", image: "cruzeiro", label: "Cruzeiros", title: "Viagens de cruzeiro", text: "Compare navio, cabine e itinerário para encontrar a experiência que combina com você.", service: "cruzeiros", enabled: true, order: 3 },
    { key: "america-do-sul", image: "mendoza", label: "América do Sul", title: "América do Sul", text: "Cidades, montanhas e vinícolas em viagens planejadas de acordo com o seu perfil.", service: "pacotes", enabled: true, order: 4 },
    { key: "orlando", image: "orlandoMagicKingdom", label: "Estados Unidos", title: "Orlando e seus parques", text: "Disney, Universal e outras experiências, com orientação para organizar os dias e os ingressos.", service: "ingressos", enabled: true, order: 5 },
    { key: "eua-canada", image: "curtiNovaYork", label: "América do Norte", title: "Estados Unidos e Canadá", text: "Roteiros de cidades e paisagens que vão além dos parques, no ritmo de cada viajante.", service: "pacotes", enabled: true, order: 6 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Uma jornada no turismo desde 2011",
    text: "A Karibu nasceu em Guarulhos (SP) e organiza cruzeiros e viagens pelo Brasil e pelo exterior. O atendimento é feito diretamente pela proprietária: ela ouve o que você procura, ajuda a comparar as opções e cuida dos detalhes da reserva.\n\nO acompanhamento não termina no embarque. Se houver um imprevisto, o fornecedor presta o suporte direto e a Karibu ajuda a acompanhar a solução. Depois do retorno, o contato continua.",
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
    { q: "Como começo a planejar minha viagem?", a: "Conte para a Karibu quem vai viajar, o período aproximado e o que gostaria de viver. Se ainda não escolheu o destino, a agência ajuda a comparar opções de acordo com seu perfil e orçamento." },
    { q: "A Karibu ajuda a escolher navio, roteiro e cabine?", a: "Sim. A agência compara datas, portos, itinerários e tipos de cabine para orientar a escolha de um cruzeiro que faça sentido para quem vai embarcar." },
    { q: "Posso pedir ajuda só para os ingressos de Orlando?", a: "Sim. Você pode contar quais parques gostaria de visitar e pedir orientação para organizar os dias de Disney e Universal e escolher os ingressos adequados." },
    { q: "Quais são os principais destinos atendidos?", a: "A Karibu planeja viagens no Brasil, com destaque para o Nordeste, além de Europa, América do Sul, Estados Unidos e Canadá. Cruzeiros e Orlando estão entre as suas prioridades." },
    { q: "Qual é o papel da agência se houver um imprevisto na viagem?", a: "O fornecedor responsável presta o suporte direto. A Karibu ajuda a acompanhar a situação com ele e orienta você sobre os próximos passos." },
    { q: "A agência também atende presencialmente?", a: "Sim. O atendimento pode ser por WhatsApp, por e-mail ou presencialmente em Guarulhos (SP), conforme a necessidade da viagem. Combine antes de ir." },
    { q: "E depois do retorno, posso procurar a agência?", a: "Sim. A Karibu acompanha a viagem também no pós-venda. Você pode entrar em contato depois de voltar para compartilhar sua experiência ou tratar de uma pendência." },
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
  nav: karibuBaseline.nav,
  cruiseSeasonInNav: false,
  hero: karibuBaseline.hero,
  heroPresentation: karibuBaseline.heroPresentation,
  sections: {
    ...KARIBU_MUNDO_SOURCE_PROFILE.sections,
    offers: { enabled: true, order: 1 },
    modules: false,
    destinations: { enabled: true, order: 2 },
    orlando: { enabled: true, order: 3 },
    resorts: { enabled: true, order: 4 },
    authority: { enabled: true, order: 5 },
    about: { enabled: true, order: 6 },
    differentials: { enabled: true, order: 7 },
    concierge: { enabled: true, order: 8 },
    faq: { enabled: true, order: 9 },
    avaliacoes: false,
    newsletter: { enabled: true, order: 99 },
  },
  signature: karibuBaseline.signature,
  modules: karibuBaseline.modules,
  destinations: karibuBaseline.destinations,
  destinationsFixedOrder: true,
  about: karibuBaseline.about,
  featuredExperience: undefined,
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
    newsletter: { kicker: "Fique por dentro", title: "Novidades da Karibu", subtitle: "Cadastre-se para receber novidades sobre destinos, cruzeiros e oportunidades de viagem.", cta: "Quero me cadastrar" },
    avaliacoes: { title: "Experiências de quem viaja com a Karibu" },
  },
  footer: { ...karibuBaseline.footer, descriptionHidden: true, address: "Avenida Caetano Zamataro, 228, Ponte Grande, Guarulhos/SP", legalName: "Karibu Viagens e Turismo Ltda", cnpj: "13.687.335/0001-71" },
  // The source's customer reviews, social account and invitation belong to Mundo.
  testimonials: undefined,
  socialStrip: {
    title: "Acompanhe a Karibu",
    links: [{ network: "instagram", url: "https://www.instagram.com/karibuviagens/" }],
  },
  newsletterMedia: { src: pristurNewsletterWing.url, alt: "Asa de avião vista da janela durante o voo" },
  inspirationDialog: {
    title: "Receba as novidades da Karibu",
    description: "Preencha seu contato para receber dicas e oportunidades de viagem da Karibu.",
    submitLabel: "Cadastrar meu contato",
  },
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
  /** Opt-in: block even public backend exceptions in an isolated review. */
  strictBackendBlock?: boolean;
  /** Páginas internas opcionais da prévia (off por padrão). */
  pages?: {
    xcaret?: { slots: XcaretMediaSlots; textRewrites?: [string, string][] } | null;
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
    notice: "Bagagem na Mão · prévia para revisão · imagens ilustrativas · sem publicação",
    documentTitle: "Prévia para revisão — Bagagem na Mão Viagens",
    realAgency: true,
    strictBackendBlock: true,
    pages: { resorts: { title: "Explore os resorts do Brasil com a Bagagem na Mão Viagens" }, orlandoTickets: true, xcaret: undefined, visa: undefined, dmc: undefined, editorial: undefined },
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
  const fixture = jobId ? ADS_PREVIEW_FIXTURES[jobId] : null;
  if (!fixture) return null;
  // Every review shares the complete catalog; retain agency-specific overrides.
  fixture.pages = { resorts: { title: "Explore os resorts do Brasil" }, orlandoTickets: true,
    visa: true, dmc: true, xcaret: { slots: GENERIC_XCARET_SLOTS },
    editorial: true, ...fixture.pages };
  return fixture;
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
  seo: { title: "Drica Viagens | Viagens sob medida com Adriana Martins", description: "Drica Viagens: viagens sob medida com Adriana Martins. Orlando, cruzeiros, resorts e roteiros planejados com atendimento próximo.", canonical: "https://www.dricaviagens.com.br/" },
};

/* Curti Viagens — perfil OFICIAL (curtiviagens.com.br). Aprovado por Fernando (02/11/2026). */
export const CURTI_VIAGENS_OFFICIAL_PROFILE: AgencySiteProfile = {
  ...CURTI_VIAGENS_PREVIEW_PROFILE,
  key: "curtiViagensOfficial",
  presentation: false,
  authority: CURTI_VIAGENS_PREVIEW_PROFILE.authority ? {
    ...CURTI_VIAGENS_PREVIEW_PROFILE.authority,
    companies: CURTI_VIAGENS_PREVIEW_PROFILE.authority.companies ? {
      ...CURTI_VIAGENS_PREVIEW_PROFILE.authority.companies,
      title: "Aqui você encontra as principais companhias marítimas:",
    } : undefined,
  } : undefined,
  destinations: CURTI_VIAGENS_PREVIEW_PROFILE.destinations?.map((destination) =>
    destination.key === "eua-canada"
      ? { ...destination, key: "nova-york", image: "curtiNovaYork", label: "Estados Unidos", title: "Nova York", text: "Descubra o melhor dos Estados Unidos com roteiros sob medida, entre cidades vibrantes, praias e experiências inesquecíveis." }
      : destination.key === "europa"
        ? { ...destination, key: "italia-em-trem", label: "Itália · Trem", title: "Itália em Trem", text: "Roma, Nápoles, Costa Amalfitana e Puglia em 12 dias, com saídas diárias de abril a outubro de 2027.", href: "/circuitos/italia-em-trem" }
        : destination,
  ),
  copy: {
    ...CURTI_VIAGENS_PREVIEW_PROFILE.copy,
    destinations: { ...CURTI_VIAGENS_PREVIEW_PROFILE.copy?.destinations, title: "Destinos para a sua próxima viagem", subtitle: "Brasil, Caribe, Nova York, Europa, resorts e cruzeiros." },
  },
  seo: { title: "Curti Viagens | Agência de Viagens em Holambra (SP)", description: "Consultoria completa de viagens desde 2013: Orlando, cruzeiros, resorts no Brasil, Nova York, Europa e roteiros sob medida com a Curti Viagens.", canonical: "https://www.curtiviagens.com.br/" },
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
  seo: { title: "Essyatur | Consultoria de Viagens em São Paulo (SP)", canonical: "https://www.essyatur.com.br/", description: "Essyatur: consultoria de viagens sob medida em São Paulo (SP), com mais de 10 anos de experiência." },
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
  // Cores de apresentação extraídas da arte: azul escuro para ações e
  // azul esverdeado para detalhes, com superfícies muito claras.
  primary_color: "#30206D", secondary_color: "#0EAEBB",
  tertiary_color: "#EAF8F9", secondary_auto: false, tertiary_auto: false,
  on_secondary_color: "#182044", phone: null, city: "São Paulo", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
const pristurBaseline = buildGoldStandardProfile("pristurBriefing22", {
  textualWordmark: false,
  navDensity: "compact", visaHome: false, featuredExperience: undefined,
  dmc: undefined, credentials: undefined, team: undefined,
  authority: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    testimonials: { enabled: false }, avaliacoes: { enabled: false }, offers: { enabled: false },
    newsletter: { enabled: true, order: 10 }, authority: { enabled: false },
  },
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#assinatura", children: [
      { label: "Parques Orlando / Disney", to: "/#ingressos-orlando" },
      { label: "Cruzeiros 26/27", to: "/#autoridade" },
      { label: "Resorts no Brasil", to: "/#resorts" },
    ] },
    { label: "Sobre", to: "/#sobre", children: [
      { label: "Quem Somos", to: "/#sobre" }, { label: "Dúvidas Frequentes", to: "/#faq" },
    ] },
  ],
  heroPresentation: { kicker: "CONSULTORIA DE VIAGENS · SÃO PAULO", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "Disney para viver em família.", subtitle: "Parques, hospedagem e passeios pensados para as pessoas que vão viajar com você.", image: "pristurHeroDisney", order: 1, enabled: true },
    { title: "A temporada brasileira de cruzeiros espera por você.", subtitle: "Em 2026/2027, descubra os navios e roteiros que combinam com o seu jeito de viajar.", image: "pristurHeroCruzeiros", order: 2, enabled: true },
    { title: "Sua viagem ao Caribe começa com uma boa conversa.", subtitle: "Conte à Priscila o que espera da viagem. Ela ajuda a escolher o destino, planeja cada etapa e acompanha você até o retorno.", image: "pristurHeroCaribe", order: 3, enabled: true },
  ],
  signature: {
    kicker: "CONSULTORIA DE VIAGENS COM A PRISCILA",
    title: "Viagens feitas sob medida, com alguém ao seu lado em cada etapa.",
    text: "A Pristur nasceu de uma convicção simples: uma boa viagem começa por uma boa conversa. Por isso, antes de sugerir qualquer destino, a Priscila quer conhecer você: quem vai viajar, o que você deseja viver, quais são suas prioridades e o que precisa ser levado em conta, seja o orçamento, o ritmo, a companhia ou aquele detalhe que faz toda a diferença.",
    continuation: {
      title: "Um planejamento feito a quatro mãos.",
      text: "Com esse olhar atento, a Priscila constrói o roteiro junto com você. Ela ajuda a escolher destinos, hospedagens e experiências que combinam com o seu jeito de viajar, explica as opções com clareza e ajusta o plano quantas vezes for preciso. Você participa das decisões, e ela cuida do restante.",
    },
  },
  destinations: [
    { key: "punta-cana", image: "pristurPuntaCana", label: "Caribe", title: "Punta Cana", text: "Mar azul, praias de areia clara e dias de descanso no Caribe. A Pristur ajuda você a escolher a hospedagem e a organizar cada etapa da viagem.", service: "pacotes", enabled: true, order: 1 },
    { key: "iberostar-praia-do-forte", image: "iberostarPraiaDoForte", label: "Resorts", title: "Iberostar Selection Praia do Forte", text: "Dias à beira-mar na Bahia, com estrutura all inclusive para descansar e aproveitar em família ou a dois.", service: "hospedagem", enabled: true, order: 2 },
    { key: "gramado", image: "pristurGramado", label: "Serra Gaúcha", title: "Gramado", text: "Paisagens, passeios e sabores da Serra Gaúcha em um roteiro planejado para o seu jeito de viajar.", service: "pacotes", enabled: true, order: 3 },
    { key: "disney-orlando", image: "pristurDisneyPartners", label: "Estados Unidos", title: "Disney em Orlando", text: "Parques, hospedagem e experiências para viver em família, com orientação em cada escolha.", service: "pacotes", enabled: true, order: 4 },
    { key: "cruzeiros-europa", image: "heroSantoriniShip", label: "Cruzeiros", title: "Cruzeiros pela Europa", text: "Descubra diferentes destinos europeus em uma viagem de navio, com roteiro e companhia escolhidos para você.", service: "cruzeiros", enabled: true, order: 5 },
    { key: "foz-do-iguacu", image: "curtiBrasil", label: "Pelo Brasil", title: "Foz do Iguaçu", text: "A força das Cataratas e outros passeios da região com planejamento para aproveitar cada dia.", service: "pacotes", enabled: true, order: 6 },
  ],
  modules: [
    { key: "orlando", title: "Orlando e parques", text: "Uma viagem em família com atenção aos ingressos, à hospedagem e ao ritmo de cada pessoa.", image: "parques", service: "ingressos", enabled: true, order: 1 },
    { key: "resorts", title: "Resorts no Brasil", text: "Orientação para comparar opções e escolher onde aproveitar seus dias de descanso.", image: "resort", service: "hospedagem", enabled: true, order: 2 },
    { key: "gramado", title: "Gramado e Brasil", text: "Da Serra Gaúcha a outros destinos nacionais, um roteiro pensado para o seu jeito de viajar.", image: "brasil", service: "pacotes", enabled: true, order: 3 },
    { key: "caribe", title: "Caribe e all inclusive", text: "Praias e resorts para viajar a dois, em família ou com amigos, com escolhas bem orientadas.", image: "litoral", service: "pacotes", enabled: true, order: 4 },
    { key: "brasil", title: "Viagens nacionais", text: "Consultoria completa para conhecer diferentes destinos no Brasil.", image: "litoral", service: "pacotes", enabled: true, order: 5 },
    { key: "internacionais", title: "Estados Unidos e Canadá", text: "Prioridades internacionais no planejamento da sua viagem.", image: "parques", service: "pacotes", enabled: true, order: 6 },
  ],
  highlights: [
    { title: "Viagens em família", text: "Famílias e parques estão entre as especialidades da Pristur.", service: "pacotes", cta: "Planejar em família" },
    { title: "Descanso em resorts", text: "Resorts no Brasil e all-inclusive entre os destaques para viajar.", service: "hospedagem", cta: "Planejar meu descanso" },
    { title: "Parques e entretenimento", text: "Orlando e parques como inspiração para a próxima viagem.", service: "ingressos", cta: "Planejar os parques" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "Uma trajetória construída desde 2009.",
    text: "A Pristur nasceu do meu desejo de construir um negócio próprio e realizar um sonho antigo. Antes disso, trabalhei por muitos anos em uma agência de viagens, onde ganhei experiência, conheci destinos e construí relações com clientes.\n\nComecei aos poucos, com planejamento, dedicação e muito amor pelo que faço. Hoje, como fundadora e consultora, quero que cada pessoa se sinta acolhida e segura para decidir sua viagem. Você não é mais uma reserva: seus planos e expectativas importam.\n\nEu acompanho a escolha dos serviços, as orientações antes do embarque e a viagem em si. Se surgir algum imprevisto, sigo perto para ajudar a encontrar uma solução. E gosto de saber como foi quando você volta.",
    badge: { value: "Desde 2009", label: "Pristur Viagens" }, media: "default", mediaAlign: "title",
    images: [{ src: pristurPriscila.url, alt: "Priscila Vasconcelos, fundadora e consultora da Pristur Viagens", position: "center 30%" }],
    showLocation: true, ownerName: "Priscila Vasconcelos",
  },
  differentials: [
    { title: "Você conversa com a Priscila", text: "Atendimento direto com quem planeja e acompanha a sua viagem.", icon: "consultivo" },
    { title: "Planejamento atento", text: "Cada escolha considera os viajantes, o roteiro e os detalhes que podem fazer diferença.", icon: "conferido" },
    { title: "Orientação antes de embarcar", text: "Informações e ajustes para você sair com mais segurança sobre o que foi combinado.", icon: "fornecedores" },
    { title: "Apoio durante a viagem", text: "Se os planos mudarem, você continua em contato com a pessoa que conhece seu roteiro.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conversamos sobre quem vai viajar, o que deseja viver e o que precisa considerar.",
    "Selecionamos destinos, hospedagens e serviços e ajustamos o planejamento com você.",
    "Antes do embarque, você recebe as orientações para a viagem.",
    "Durante a viagem, a Priscila acompanha você; depois do retorno, mantém o contato.",
  ],
  faq: [
    { q: "Vou falar diretamente com a Priscila?", a: "Sim. A Priscila é a fundadora e consultora da Pristur e acompanha o planejamento e as etapas da viagem." },
    { q: "A Pristur organiza viagens para famílias?", a: "Sim. Viagens em família e parques estão entre as especialidades, além de destinos nacionais e internacionais para casais e grupos de amigos." },
    { q: "Quais destinos posso planejar com a agência?", a: "Entre os destaques estão Punta Cana, Praia do Forte, Gramado, Disney em Orlando, cruzeiros pela Europa e Foz do Iguaçu. A Pristur também ajuda a planejar outros destinos conforme o seu perfil." },
    { q: "Há suporte durante a viagem?", a: "Sim. A Priscila acompanha o viajante e, se surgir um imprevisto, permanece em contato para ajudar a buscar uma solução." },
    { q: "Como começo a planejar?", a: "Conte pelo WhatsApp quem vai viajar, o destino desejado e o que é importante para você. A Priscila conversa sobre as possibilidades e os próximos passos." },
    { q: "Como entro em contato?", a: "Pelo WhatsApp (11) 98301-7038 ou pelo e-mail consultoriapristurviagens@gmail.com. No Instagram, a agência está como @priturismo." },
  ],
  copy: {
    modules: { kicker: "ESPECIALIDADES", title: "O que você sonha viver?", subtitle: "De Orlando ao Caribe, de Gramado aos resorts no Brasil: vamos encontrar a viagem certa para você." },
    destinations: { kicker: "DESTINOS", title: "Lugares para viver a sua próxima história", subtitle: "Alguns destinos que a Pristur ajuda você a explorar, no Brasil e pelo mundo." },
    highlights: { kicker: "INSPIRAÇÕES", title: "Um jeito de viajar para cada pessoa", subtitle: "Famílias, casais e amigos têm planos diferentes. A viagem começa por eles." },
    differentials: { kicker: "POR QUE VIAJAR COM A PRISTUR", title: "Atenção que continua depois da reserva", subtitle: "Da primeira conversa ao retorno, você sabe com quem contar." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da ideia ao retorno", subtitle: "Você conversa com a Priscila e constrói a viagem com orientação em cada etapa." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Para planejar com tranquilidade" },
    newsletter: { kicker: "NOVIDADES DA PRISTUR", title: "Inspiração para a sua próxima viagem", subtitle: "Receba novidades sobre destinos, parques e resorts para descobrir novas possibilidades de viagem com a Pristur.", cta: "Quero receber novidades" },
  },
  footer: {
    email: "consultoriapristurviagens@gmail.com",
    instagram: "https://www.instagram.com/priturismo/", instagramLabel: "@priturismo",
    address: "São Paulo/SP", showLocation: true, legalLinksDisabled: true,
    legalName: "Priscila Vasconcelos", cnpj: "57.385.871/0001-98",
    descriptionHidden: true, phoneHidden: true, whatsappLabel: "Falar pelo WhatsApp",
  },
  seo: { title: "Prévia para revisão — Pristur Viagens", description: "Prévia técnica da Pristur Viagens com logo e cores da marca; sem envios ou publicação." },
}, "Pristur Viagens");
export const PRISTUR_PREVIEW_PROFILE: AgencySiteProfile = {
  ...buildMundoReviewProfile("pristurBriefing22", pristurBaseline, "Pristur Viagens", "Priscila Vasconcelos"),
  // Temporada de cruzeiros habilitada por solicitação posterior de Fernando;
  // o briefing não apresenta grupo de WhatsApp.
  // Evite também o retrato/mural da consultora do site usado como modelo.
  sections: { ...MUNDO_EM_CORES_PREVIEW_PROFILE.sections,
    signature: { enabled: true, order: 1 }, modules: { enabled: false },
    destinations: { enabled: true, order: 2 }, orlando: { enabled: true, order: 3 },
    resorts: { enabled: true, order: 4 }, about: { enabled: true, order: 5 },
    authority: { enabled: true, order: 3.5 }, newsletter: { enabled: true, order: 10 },
    avaliacoes: { enabled: false }, testimonials: { enabled: false } },
  nav: pristurBaseline.nav,
  cruiseSeasonInNav: false,
  copy: { ...pristurBaseline.copy },
  about: pristurBaseline.about,
  destinations: pristurBaseline.destinations,
  destinationsFixedOrder: true,
  destinationCredits: [
    { title: "Punta Cana (Cap Cana)", author: "Mary Mark Ockerbloom", source: "https://commons.wikimedia.org/wiki/File:Beach_near_Santuary_Cap_Cana,_Dominican_Republic.jpg", license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" },
    { title: "Gramado (centro)", author: "Yeuxpapilon", source: "https://commons.wikimedia.org/wiki/File:Centro_de_Gramado,_RS.jpg", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  ],
  modules: pristurBaseline.modules?.slice(0, 4),
  hero: pristurBaseline.hero,
  heroPresentation: { ...MUNDO_EM_CORES_PREVIEW_PROFILE.heroPresentation, kicker: "PRISTUR VIAGENS · CONSULTORIA DE VIAGENS" },
  socialStrip: { title: "Acompanhe a Pristur no Instagram", links: [{ network: "instagram", url: "https://www.instagram.com/priturismo/" }] },
  newsletterMedia: { src: pristurNewsletterWing.url, alt: "Vista do céu e da asa de um avião pela janela" },
  inspirationDialog: { title: "Receber novidades da Pristur", description: "Informe seus dados para receber novidades sobre destinos e viagens da Pristur.", notice: "Prévia para revisão: nenhum dado será enviado agora." },
};
if (PRISTUR_PREVIEW_PROFILE.authority?.companies) {
  PRISTUR_PREVIEW_PROFILE.authority.companies.title =
    "Na Pristur Viagens, você encontra as principais companhias marítimas. Planeje seu próximo cruzeiro!";
}
PRISTUR_PREVIEW_PROFILE.footer = { ...pristurBaseline.footer, whatsapp: "(11) 98301-7038" };
// Fernando (18/11/2026): sem Xcaret, sem Novembro e sem Avaliações do Google por enquanto.
PRISTUR_PREVIEW_PROFILE.featuredExperience = undefined;
PRISTUR_PREVIEW_PROFILE.sections = { ...PRISTUR_PREVIEW_PROFILE.sections, avaliacoes: { enabled: false }, testimonials: { enabled: false } };
PRISTUR_PREVIEW_PROFILE.nav = PRISTUR_PREVIEW_PROFILE.nav?.map((item) => item.children
  ? { ...item, children: item.children.filter((c) => c.to !== "/xcaret" && c.to !== "/#avaliacoes") }
  : item).filter((item) => item.to !== "/xcaret" && item.to !== "/oportunidades-novembro");
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
  clubMedSnowHome: {
    enabled: true,
    videoUrl: clubMedSkiVideo.url,
  },
  alternateSurfaces: false,
  nav: ["/", "/#destinos", "/#campanhas", "/#sobre"].flatMap(to => {
    const item = arenaMundoSource.nav?.find(entry => entry.to === to);
    if (!item) return [];
    const children = item.children?.filter(child => !["/xcaret", "/#avaliacoes"].includes(child.to));
    return [{ ...item, children: item.label === "Especialidades" ? [
      { label: "Club Med na neve", to: "/#campanhas" },
      { label: "Parques e Ingressos", to: "/#ingressos-orlando" },
      { label: "Resorts no Brasil", to: "/#resorts" },
      { label: "Cruzeiros no Brasil 26/27", to: "/#autoridade" },
    ] : children }];
  }),
  sections: { ...arenaMundoSource.sections, resorts: { enabled: true, order: 4.75 }, concierge: { enabled: false }, avaliacoes: { enabled: false } },
  heroPresentation: { ...arenaMundoSource.heroPresentation, kicker: "ARENA TRAVEL GROUP · VIAGENS SOB MEDIDA" },
  hero: [
    { kicker: "VIAGENS PARA A NEVE", title: "Sua próxima história começa na neve.", subtitle: "Da escolha do destino à hospedagem, planejamos sua viagem para esquiar com orientação e acompanhamento em cada etapa.", image: "arenaRafaelSnow", textWidth: "narrowLeft", order: 1, enabled: true },
    { kicker: "TEMPO PARA APROVEITAR", title: "Descansar também merece um bom planejamento.", subtitle: "Destinos escolhidos de acordo com o perfil da sua família ou grupo, com atenção à estrutura, à localização e ao que está incluído.", image: "arenaNoronha", textWidth: "narrowLeft", order: 2, enabled: true },
    { kicker: "EUROPA NO SEU RITMO", title: "Novos lugares. Boas companhias. A sua viagem.", subtitle: "Roteiros personalizados para famílias e grupos de amigos, com escolhas que respeitam seus interesses e seu jeito de viajar.", image: "arenaMontanhas", textWidth: "narrowLeft", order: 3, enabled: true },
  ],
  signature: arenaBaseline.signature,
  modules: arenaMundoSource.modules?.map((item, index) => ({
    ...item,
    title: arenaBaseline.modules?.[index]?.title ?? item.title,
    text: (arenaBaseline.modules?.[index]?.text ?? item.text).replace(/ Imagem genérica\./g, ""),
    service: arenaBaseline.modules?.[index]?.service ?? item.service,
  })),
  destinationsFixedOrder: true,
  destinations: [
    { key: "arena-alpes-franceses", image: "arenaAlpesUser", label: "Neve", title: "Alpes Franceses", text: "Paisagens nevadas e estações de esqui nos Alpes Franceses, com hospedagem e roteiro planejados para o seu grupo.", service: "pacotes", href: "/club-med-neve?pais=franca", ctaLabel: "Ver neve na França", enabled: true, order: 1 },
    { key: "arena-suica", image: "arenaSuicaUser", label: "Europa", title: "Suíça", text: "Lagos de montanha, paisagens alpinas e cidades suíças em roteiros personalizados.", service: "pacotes", enabled: true, order: 2 },
    { key: "arena-italia", image: "arenaVenezaUser", label: "Europa", title: "Itália", text: "Veneza, seus canais e cidades históricas italianas em uma viagem no seu ritmo.", service: "pacotes", enabled: true, order: 3 },
    { key: "arena-resorts-brasil", image: "arenaResortsUser", label: "Resorts", title: "Resorts no Brasil", text: "Resorts no litoral brasileiro escolhidos de acordo com a estrutura, os serviços e o perfil da sua viagem.", service: "hospedagem", href: "/resorts-brasil", ctaLabel: "Ver resorts", enabled: true, order: 4 },
    { key: "arena-caribe-all-inclusive", image: "arenaCaribeUser", label: "All inclusive", title: "Caribe all inclusive", text: "Praias do Caribe e resorts all inclusive escolhidos para o seu perfil.", service: "pacotes", enabled: true, order: 5 },
    { key: "arena-disney-orlando", image: "arenaRafaelMickey", label: "Parques", title: "Disney Orlando", text: "Parques Disney em Orlando planejados com ingressos, hospedagem e roteiro para cada perfil.", service: "pacotes", href: "/disney", imagePosition: "center 40%", ctaLabel: "Conhecer Disney", enabled: true, order: 6 },
  ],
  about: { ...arenaMundoSource.about, ...arenaBaseline.about, media: undefined,
    kicker: "QUEM SOMOS",
    title: "A paixão por viajar. O cuidado de quem conhece.",
    text: "A Arena Travel Group nasceu da paixão por viajar e compartilhar descobertas. Depois de encerrar sua carreira como atleta profissional de futebol, Rafael Souza trouxe para o turismo a experiência de ter morado em diferentes partes do mundo e viajado por mais de 40 países.\n\nNos últimos anos, essa vivência se transformou em ajuda próxima a amigos e familiares: indicar destinos, hotéis e passeios de acordo com o perfil e a curiosidade de cada um, despertando a vontade de explorar novas culturas. Em 2024, esse cuidado deu origem à Arena, em Florianópolis (SC).\n\nHoje, planejamos viagens sob medida para famílias e grupos de amigos, com destaque para resorts e all inclusive, Europa e experiências na neve. Combinamos conhecimento dos destinos, roteiros personalizados e atenção às condições de cada viagem, com orientação antes do embarque, acompanhamento durante a experiência e contato depois do retorno.\n\nQueremos que você encontre na Arena alguém de confiança para cuidar dos detalhes da sua próxima aventura. Vamos embarcar juntos nessa jornada?",
    ownerName: "Rafael Souza",
    tagline: "Mais de 40 países na bagagem. Novas histórias para viver com você.",
    badge: { value: "Desde 2024", label: "Arena Travel Group" },
    images: [{ src: "/arena-travel-group/equipe-teleferico-neve.png", alt: "Equipe da Arena Travel Group em um teleférico na neve", position: "center" }], mural: undefined,
    visitedDestinations: undefined },
  featuredExperience: undefined,
  authority: arenaMundoSource.authority ? { ...arenaMundoSource.authority,
    companies: arenaMundoSource.authority.companies ? { ...arenaMundoSource.authority.companies,
      title: "Na Arena Travel Group, você encontra as principais companhias marítimas. Planeje seu próximo cruzeiro." } : undefined } : undefined,
  differentials: arenaBaseline.differentials, conciergeSteps: arenaBaseline.conciergeSteps,
  faq: [
  {
    "q": "Como a Arena ajuda a planejar minha viagem?",
    "a": "Tudo começa com uma conversa sobre quem vai viajar, os interesses, as datas e o investimento previsto. A partir disso, a Arena orienta a escolha do destino, prepara o orçamento e organiza as reservas, acompanhando você antes do embarque, durante a viagem e depois do retorno."
  },
  {
    "q": "Quem vai cuidar do meu atendimento?",
    "a": "O atendimento é feito diretamente pelo proprietário ou pelos sócios da Arena Travel Group. Você conta com uma referência próxima para conversar sobre suas escolhas e acompanhar o planejamento."
  },
  {
    "q": "Vocês organizam viagens para esquiar?",
    "a": "Sim. Viagens de esqui estão entre os focos da Arena. O planejamento considera o perfil dos viajantes e suas preferências para orientar a escolha do destino, da hospedagem e dos serviços da viagem."
  },
  {
    "q": "Como escolher o resort ideal para minha família?",
    "a": "A Arena ajuda a comparar as opções considerando quem vai viajar, a estrutura desejada, a localização e os serviços incluídos. Assim, a escolha parte das necessidades da sua família, com orientação sobre as diferenças entre os resorts."
  },
  {
    "q": "Vocês planejam viagens para grupos de amigos e famílias com crianças?",
    "a": "Sim. Esses estão entre os principais públicos da agência. O planejamento considera os interesses do grupo e as necessidades dos viajantes para organizar hospedagens, deslocamentos e experiências."
  },
  {
    "q": "O roteiro pode ser personalizado?",
    "a": "Sim. Viagens sob medida estão entre as especialidades da Arena, incluindo destinos internacionais e roteiros pela Europa. As opções são construídas a partir do perfil, das preferências e do investimento previsto para a viagem."
  },
  {
    "q": "Terei suporte se acontecer algum imprevisto durante a viagem?",
    "a": "Sim. A Arena oferece acompanhamento durante a viagem. Se ocorrer um imprevisto, o responsável pelo seu atendimento acompanha o caso e a tratativa com os fornecedores até a solução."
  },
  {
    "q": "O Rafael conhece os destinos que recomenda?",
    "a": "A vivência pessoal é uma das bases da consultoria. Muitos dos destinos, hotéis e passeios recomendados já foram conhecidos pessoalmente pelo Rafael. Essa experiência se soma às capacitações e às parcerias com fornecedores para orientar cada indicação."
  },
  {
    "q": "Como começo a planejar minha viagem?",
    "a": "Você pode preencher uma solicitação pelo site ou entrar em contato pelo WhatsApp, e-mail ou telefone. Conte o que está imaginando, quem vai viajar e quando pretende embarcar para iniciar o planejamento."
  }
],
  copy: { ...arenaMundoSource.copy, ...arenaBaseline.copy,
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Antes de fazer as malas", subtitle: "Se a sua dúvida não estiver aqui, converse com a equipe da Arena." },
    destinations: { ...arenaBaseline.copy?.destinations, subtitle: "Alpes Franceses, Suíça, Itália, resorts no Brasil, Caribe all inclusive e Disney Orlando." },
    modules: { ...arenaBaseline.copy?.modules, cta: "Conversar com a Arena" },
    avaliacoes: { title: "Experiências de quem viaja com a Arena" },
    newsletter: { title: "Novidades da Arena Travel Group", subtitle: "Converse com a equipe sobre destinos e possibilidades para sua próxima viagem.", cta: "Quero saber mais" },
  },
  footer: { ...arenaBaseline.footer, whatsapp: "(47) 99269-0807", phone: "(47) 99269-0807", phoneHidden: true, legalName: "ARENA TRAVEL GROUP LTDA", cnpj: "57.332.735/0001-30" },
  newsletterMedia: { src: arenaRafaelSnowboard.url, alt: "Rafael Souza com prancha de snowboard na neve" },
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
// Briefing 24, 04 Nov 2026: reuse the editorial layout, not another agency’s content.
export const INNOVATI_PREVIEW_PROFILE = buildGoldStandardProfile("innovatiBriefing24", {
  navDensity: "compact", visaHome: false, randomizeDestinations: false,
  featuredExperience: undefined, dmc: undefined, credentials: undefined,
  team: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    signature: { enabled: true, order: 1 }, destinations: { enabled: true, order: 2 },
    orlando: { enabled: true, order: 3 }, resorts: { enabled: true, order: 4 },
    authority: { enabled: true, order: 5 }, highlights: { enabled: true, order: 6 },
    about: { enabled: true, order: 7 }, differentials: { enabled: true, order: 8 },
    concierge: { enabled: true, order: 9 }, faq: { enabled: true, order: 10 },
    modules: { enabled: false }, dmc: { enabled: false }, credentials: { enabled: false },
    team: { enabled: false }, testimonials: { enabled: false }, avaliacoes: { enabled: false },
    offers: { enabled: false }, blog: { enabled: false }, newsletter: { enabled: false },
  },
  nav: [
    { label: "Início", to: "/" }, { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#assinatura", children: [
      { label: "Parques em Orlando", to: "/ingressos-orlando" },
      { label: "Resorts no Brasil", to: "/#resorts" },
      { label: "Cruzeiros", to: "/#autoridade" },
    ] },
    { label: "Sobre", to: "/#sobre", children: [
      { label: "Nossa história", to: "/#sobre" }, { label: "Como funciona", to: "/#atendimento" },
      { label: "Dúvidas frequentes", to: "/#faq" },
    ] },
  ],
  heroPresentation: { kicker: "INNOVATI TRAVEL · CONSULTORIA DE VIAGENS", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "Orlando, do jeito da sua família", subtitle: "Organize parques, hospedagem e dias de descanso com quem conhece Orlando de perto.", image: "parques", order: 1, enabled: true },
    { title: "Seu próximo destino pode começar no mar", subtitle: "Compare roteiros, navios e cabines, com atenção especial aos cruzeiros MSC.", image: "cruzeiro", order: 2, enabled: true },
    { title: "Descanse em um resort no Nordeste", subtitle: "Escolha a hospedagem pela localização, estrutura e experiências que importam para você.", image: "resort", order: 3, enabled: true },
  ],
  signature: {
    kicker: "SEU JEITO DE VIAJAR",
    title: "Você conta como quer viajar. A Jussara ajuda a organizar o resto.",
    text: "Seja para levar a família aos parques, viajar em casal ou reunir amigos a bordo, o planejamento começa com uma conversa. A Jussara ouve suas prioridades, compara hotéis, serviços e experiências e ajuda você a decidir o que realmente faz sentido para a viagem.",
  },
  destinations: [
    { key: "orlando", image: "parques", label: "Famílias e parques", title: "Orlando", text: "Organize os dias de parque, sem deixar de reservar tempo para descansar.", href: "/ingressos-orlando", ctaLabel: "Planejar os parques", service: "ingressos", enabled: true, order: 1 },
    { key: "msc", image: "cruzeiro", label: "Viagens no mar", title: "Cruzeiros MSC", text: "Compare itinerários, datas e cabines de acordo com o perfil de quem vai embarcar.", service: "cruzeiros", enabled: true, order: 2 },
    { key: "nordeste", image: "resort", label: "Nordeste", title: "Resorts e all-inclusive", text: "Escolha entre praia, lazer e descanso, com atenção ao que o hotel inclui na diária.", href: "/resorts-brasil", ctaLabel: "Ver resorts", service: "hospedagem", enabled: true, order: 3 },
    { key: "sul-do-brasil", image: "innovatiIguacu", label: "Brasil", title: "Sul do Brasil", text: "Foz do Iguaçu é um ponto de partida para explorar a região em um roteiro no seu ritmo.", service: "pacotes", enabled: true, order: 4 },
    { key: "america-do-norte", image: "innovatiNorthAmerica", label: "América do Norte", title: "Estados Unidos e Canadá", text: "Combine cidades e experiências a partir do que você quer ver e fazer na viagem.", service: "pacotes", enabled: true, order: 5 },
  ],
  highlights: [
    { title: "Casais", text: "Roteiros com tempo para aproveitar a viagem a dois, sem encher demais a agenda.", service: "pacotes", cta: "Planejar a dois" },
    { title: "Grupos de amigos", text: "Datas, hospedagem e atividades que levem em conta o que o grupo quer fazer junto.", service: "pacotes", cta: "Planejar com amigos" },
    { title: "Viajantes 60+", text: "Planeje pausas, deslocamentos e atividades no ritmo que você prefere.", service: "pacotes", cta: "Planejar no meu ritmo" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "De muitas idas a Orlando a uma carreira no turismo",
    text: "Na adolescência, Jussara Beraldes acompanhava o trabalho de uma tia que havia aberto uma agência de viagens. Seguiu outra carreira, mas continuou viajando. Em 2023, depois de muitas idas a Orlando, seu destino favorito, fez do turismo a sua profissão.\n\nHoje, à frente da Innovati Travel, em Franco da Rocha (SP), a Jussara atende diretamente quem procura um roteiro próprio e orientação antes, durante e depois da viagem.",
    badge: { value: "Desde 2023", label: "Innovati Travel" }, media: "hidden", showLocation: true, ownerName: "Jussara Beraldes",
  },
  differentials: [
    { title: "Atendimento direto com a Jussara", text: "Você conversa com a fundadora e consultora que vai planejar sua viagem.", icon: "consultivo" },
    { title: "Roteiro sob medida", text: "Os dias são organizados de acordo com os interesses e o ritmo de quem viaja.", icon: "conferido" },
    { title: "Curadoria de hotéis e serviços", text: "Entenda o que cada opção inclui antes de decidir onde ficar e o que reservar.", icon: "fornecedores" },
    { title: "Acompanhamento na viagem e no retorno", text: "Quando houver um imprevisto, a agência ajuda você a acompanhar a solução com o fornecedor.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Converse com a Jussara pelo WhatsApp ou por videochamada sobre as datas, o grupo e as prioridades.",
    "Compare destinos, hospedagens e experiências na proposta personalizada.",
    "Confirme as reservas e receba as orientações para o embarque.",
    "Conte com orientação durante a viagem e com acompanhamento após o retorno.",
  ],
  faq: [
    { q: "Como organizar os dias de parque em Orlando?", a: "A Jussara ajuda a encaixar os parques que sua família quer visitar, os deslocamentos e as pausas de acordo com as datas e o ritmo do grupo." },
    { q: "A Innovati planeja viagens para eventos esportivos nos Estados Unidos?", a: "Sim. Informe as datas e os esportes de interesse para a agência avaliar como incluir a experiência no roteiro." },
    { q: "Vocês trabalham com cruzeiros MSC?", a: "Sim. A MSC é um dos destaques. A escolha do navio, do itinerário e da cabine depende dos interesses de quem viaja e da disponibilidade." },
    { q: "Como funciona o suporte se houver um imprevisto?", a: "O fornecedor presta o suporte direto do serviço contratado, e a Innovati orienta você e acompanha a tratativa quando necessário." },
    { q: "Como começo a planejar?", a: "Fale com a Jussara pelo WhatsApp e conte o que você tem em mente. O atendimento também pode ser feito por videochamada." },
  ],
  copy: {
    destinations: { kicker: "DESTINOS E EXPERIÊNCIAS", title: "Encontre um ponto de partida para sua próxima viagem", subtitle: "Parques em Orlando, cruzeiros, resorts no Nordeste, Sul do Brasil e América do Norte. Imagens ilustrativas." },
    highlights: { kicker: "PARA QUEM VIAJA", title: "O roteiro se adapta a quem vai viajar", subtitle: "Um jeito de planejar para casais, amigos e viajantes 60+." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Planejamento com alguém por perto", subtitle: "Da escolha do destino ao acompanhamento após o retorno." },
    concierge: { kicker: "COMO FUNCIONA", title: "Do primeiro contato ao retorno", cta: "Conversar com a Jussara" },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Antes de planejar sua viagem" },
  },
  footer: {
    description: "Consultoria de viagens e roteiros sob medida em Franco da Rocha (SP), desde 2023.",
    phone: "WhatsApp (11) 91857-8547", whatsapp: "(11) 91857-8547", email: "innovatitravel@gmail.com",
    instagram: "https://www.instagram.com/innovatitravel/", instagramLabel: "@innovatitravel",
    address: "Franco da Rocha/SP", showLocation: true, legalLinksDisabled: true,
  },
  socialStrip: { title: "Acompanhe a Innovati Travel", links: [{ network: "instagram", url: "https://www.instagram.com/innovatitravel/" }] },
  seo: { title: "Prévia para revisão — Innovati Travel", description: "Prévia da Innovati Travel; sem publicação e com ações desativadas." },
}, "Innovati Travel");


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
export const SHOPPING_PREVIEW_PROFILE = buildGoldStandardProfile("shoppingBriefing25", {
  textualWordmark: true, navDensity: "compact", visaHome: false,
  alternateSurfaces: true, compactSectionSpacing: true, randomizeDestinations: false,
  featuredExperience: undefined, inspirationDialog: undefined,
  dmc: undefined, credentials: undefined, team: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    modules: { enabled: true, order: 1 }, destinations: { enabled: true, order: 2 },
    resorts: { enabled: true, order: 3 }, authority: { enabled: true, order: 4 },
    about: { enabled: true, order: 5 }, differentials: { enabled: true, order: 6 },
    concierge: { enabled: true, order: 7 }, faq: { enabled: true, order: 8 },
    signature: { enabled: false }, highlights: { enabled: false }, orlando: { enabled: false },
    dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    testimonials: { enabled: false }, avaliacoes: { enabled: false }, offers: { enabled: false },
    newsletter: { enabled: false }, blog: { enabled: false },
  },
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#campanhas", children: [
      { label: "Viagens sob medida", to: "/#campanhas" }, { label: "Resorts no Brasil", to: "/#resorts" },
      { label: "Cruzeiros", to: "/#autoridade" },
    ] },
    { label: "Sobre", to: "/#sobre", children: [
      { label: "Nossa história", to: "/#sobre" }, { label: "Como funciona", to: "/#atendimento" },
      { label: "Dúvidas frequentes", to: "/#faq" },
    ] },
  ],
  heroPresentation: { kicker: "SHOPPING VIAGENS · DESDE 2002", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "Sua próxima viagem, planejada do seu jeito", subtitle: "Da escolha do roteiro às reservas, a Shopping Viagens organiza os detalhes para você viajar com tranquilidade.", image: "capitaisItalia", order: 1, enabled: true },
    { title: "Encontre o cruzeiro que combina com você", subtitle: "Compare roteiros, navios e cabines com a orientação de quem ajuda a transformar preferências em escolhas.", image: "cruzeiro", order: 2, enabled: true },
    { title: "Resorts no Nordeste, no seu ritmo", subtitle: "Descubra o que vale a pena para você: praia, descanso e uma hospedagem que cabe nos seus planos.", image: "iberostarPraiaDoForte", order: 3, enabled: true },
  ],
  modules: [
    { key: "sob-medida", title: "Crie um roteiro sob medida", text: "Diga o que você quer viver e quanto tempo tem. A gente ajuda a montar um roteiro que respeite suas prioridades, sem lotar a agenda.", image: "capitaisItalia", service: "pacotes", enabled: true, order: 1 },
    { key: "cruzeiros", title: "Compare opções antes de embarcar", text: "O porto, o itinerário, a cabine e o que está incluído mudam a viagem. A gente ajuda você a comparar esses detalhes antes de decidir.", image: "cruzeiro", service: "cruzeiros", enabled: true, order: 2 },
    { key: "resorts", title: "Escolha um resort para descansar", text: "Compare localização, estrutura e regime de alimentação. Assim, você sabe o que encontrará no hotel e o que ainda precisa prever.", image: "iberostarPraiaDoForte", service: "hospedagem", enabled: true, order: 3 },
  ],
  destinations: [
    { key: "italia", image: "capitaisItalia", label: "Europa", title: "Itália", text: "Combine cidades históricas, gastronomia e pausas no roteiro com o tempo de que você dispõe.", service: "pacotes", enabled: true, order: 1 },
    { key: "caribe-mexico", image: "cancun", label: "Caribe e México", title: "Caribe e México", text: "Praias, resorts e passeios para escolher entre dias de descanso e experiências fora do hotel.", service: "pacotes", enabled: true, order: 2 },
    { key: "resorts-nordeste", image: "iberostarPraiaDoForte", label: "Brasil", title: "Resorts no Nordeste", text: "Descubra quais resorts têm a estrutura, a praia e a localização que você procura.", href: "/resorts-brasil", ctaLabel: "Ver resorts", service: "hospedagem", enabled: true, order: 3 },
    { key: "estados-unidos", image: "orlandoMagicKingdom", label: "Estados Unidos", title: "Estados Unidos", text: "Converse sobre as cidades que você quer visitar e o melhor jeito de organizar as etapas da viagem.", service: "pacotes", enabled: true, order: 4 },
  ],
  about: {
    kicker: "NOSSA HISTÓRIA", title: "Desde 2002, cuidando dos detalhes da sua viagem",
    text: `A Shopping Viagens nasceu em São Paulo em 2002. Sob a direção da fundadora Cristina Vale, a equipe planeja viagens sob medida para quem valoriza orientação próxima e quer entender bem as opções antes de reservar.

A experiência pessoal da equipe nos destinos ajuda a olhar além da lista de atrações. Na conversa, entram questões práticas: quanto tempo faz sentido ficar em cada lugar, como organizar os deslocamentos e quais detalhes vale resolver antes do embarque.

O atendimento é compartilhado pela equipe, com continuidade das informações. Se surgir um imprevisto, quem costuma atender você acompanha o caso.`,
    badge: { value: "Desde 2002", label: "Shopping Viagens" }, media: "hidden", showLocation: true, ownerName: "Cristina Vale",
  },
  differentials: [
    { title: "Planejamento detalhado", text: "Olhamos o roteiro e as reservas juntos para identificar o que merece atenção antes do embarque.", icon: "consultivo" },
    { title: "Vivência nos destinos", text: "A experiência de quem já esteve nos destinos ajuda a transformar informação em orientação prática.", icon: "conferido" },
    { title: "Continuidade no atendimento", text: "A equipe compartilha as informações do seu planejamento, sem perder o histórico da conversa.", icon: "fornecedores" },
    { title: "Acompanhamento em imprevistos", text: "Seu contato habitual acompanha o caso e orienta você nos próximos passos.", icon: "acompanhamento" },
  ],
  hideConciergeActions: true,
  conciergeSteps: [
    "Conte quem vai viajar, em que período e que tipo de experiência procura.",
    "A equipe monta uma proposta de roteiro, hospedagem ou cruzeiro com base na conversa.",
    "Você avalia as opções e aprova as escolhas antes das reservas.",
    "Em caso de imprevisto, o contato que já conhece sua viagem acompanha o caso.",
  ],
  faq: [
    { q: "Preciso já ter um roteiro em mente?", a: "Não. Basta contar o que gostaria de fazer, quem vai viajar e em que período. A equipe pode indicar por onde começar." },
    { q: "Vocês ajudam a comparar cruzeiros e resorts?", a: "Sim. Para cruzeiros, vale comparar itinerário, cabine e datas. Para resorts, a equipe orienta sobre localização, alimentação e estrutura conforme o perfil da viagem." },
    { q: "Como vocês trabalham com o meu orçamento?", a: "O investimento varia conforme as datas, o roteiro e os serviços. Compartilhe a faixa que faz sentido para você para orientar a proposta." },
    { q: "Como faço para conversar com a equipe?", a: "Você pode falar pelo WhatsApp, telefone ou e-mail. A Shopping Viagens também oferece atendimento presencial em São Paulo." },
  ],
  copy: {
    modules: { kicker: "PLANEJE COM A SHOPPING VIAGENS", title: "Três jeitos de começar a planejar", subtitle: "Roteiros sob medida, cruzeiros e resorts. Escolha o tipo de viagem e conte o que você tem em mente.", cta: "Conversar com a equipe" },
    destinations: { kicker: "DESTINOS", title: "Ideias para a sua próxima viagem", subtitle: "Da Itália aos resorts do Nordeste, veja por onde começar a planejar." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Orientação de verdade, para as escolhas da sua viagem" },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa às reservas" },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Antes de começar a planejar" },
  },
  footer: {
    description: "Consultoria de viagens sob medida em São Paulo, desde 2002.",
    whatsapp: "(11) 94714-8466", phone: "(11) 2096-7777", email: "info@shoppingviagens.com.br",
    instagram: "https://www.instagram.com/shoppingviagens/", instagramLabel: "@shoppingviagens",
    address: "São Paulo/SP", showLocation: true, legalLinksDisabled: true,
  },
  socialStrip: { title: "Acompanhe a Shopping Viagens", links: [{ network: "instagram", url: "https://www.instagram.com/shoppingviagens/" }] },
  seo: { title: "Prévia para revisão | Shopping Viagens", description: "Prévia da Shopping Viagens. Logotipo e paleta pendentes; sem publicação." },
}, "Shopping Viagens");
ADS_PREVIEW_FIXTURES[SHOPPING_PREVIEW_JOB_ID] = {
  jobId: SHOPPING_PREVIEW_JOB_ID, info: SHOPPING_PREVIEW_INFO, profile: SHOPPING_PREVIEW_PROFILE,
  notice: "prévia técnica para revisão · logotipo e paleta pendentes · imagens genéricas · sem publicação",
  documentTitle: "Prévia para revisão — Shopping Viagens", realAgency: true, strictBackendBlock: true,
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

export const BARDELLI_IMM_PREVIEW_PROFILE = buildBardelliImmPreview(BARDELLI_MUNDO_PREVIEW_PROFILE);
ADS_PREVIEW_FIXTURES[BARDELLI_IMM_PREVIEW_JOB_ID] = {
  jobId: BARDELLI_IMM_PREVIEW_JOB_ID,
  info: {
    ...BARDELLI_PRESENTATION_INFO,
    user_id: "00000000-0000-0000-0000-00000000ba18",
    hostname: BARDELLI_IMM_PREVIEW_HOST,
    agency_slug: "", public_slug: null, is_primary: false,
    cover_image_url: null, bio: null, whatsapp_group_url: null,
  },
  profile: BARDELLI_IMM_PREVIEW_PROFILE,
  notice: "Bardelli Viagens · prévia para revisão · fotos ilustrativas · sem preços, envios ou publicação",
  documentTitle: "Prévia editorial — Bardelli Viagens",
  realAgency: true, strictBackendBlock: true,
  pages: { resorts: { title: "Explore os resorts do Brasil com a Bardelli Viagens" }, orlandoTickets: true, editorial: true },
};


// Content pages stay within the isolated Innovati review; no live submissions.
ADS_PREVIEW_FIXTURES[INNOVATI_PREVIEW_JOB_ID].pages = {
  resorts: { title: "Explore os resorts do Brasil com a Innovati Travel" }, orlandoTickets: true, editorial: true,
  xcaret: undefined, visa: false, dmc: false,
};
ADS_PREVIEW_FIXTURES[INNOVATI_PREVIEW_JOB_ID].notice = "Innovati Travel · prévia para revisão · imagens ilustrativas · sem envios ou publicação";

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
  resorts: { title: "Explore os resorts do Brasil com a Shopping Viagens" }, editorial: true,
};
ADS_PREVIEW_FIXTURES[SHOPPING_PREVIEW_JOB_ID].notice = "Shopping Viagens · prévia para revisão · logotipo e paleta pendentes · fotos do modelo provisórias · sem publicação";

ADS_PREVIEW_FIXTURES[PRISTUR_PREVIEW_JOB_ID].pages = {
  xcaret: undefined, // página Xcaret desligada a pedido de Fernando (18/11/2026)
  resorts: { title: "Explore os resorts do Brasil com a Pristur Viagens" }, orlandoTickets: true, editorial: true,
};
ADS_PREVIEW_FIXTURES[PRISTUR_PREVIEW_JOB_ID].notice = "Pristur Viagens · prévia para revisão · logo e cores da marca · fotos do modelo provisórias · sem publicação";

/* IM&M Viagens e Turismo (immturismo.com.br): O Mundo em Cores model with a
 * textual wordmark; logo/palette and editorial facts pending. Generic copy only. */
const immBaseline = buildGoldStandardProfile("immOfficial", {
  textualWordmark: false,
  navDensity: "compact", visaHome: false, featuredExperience: undefined,
  dmc: undefined, credentials: undefined, team: undefined,
  authority: undefined, testimonials: undefined, conciergePoints: undefined,
  sections: {
    dmc: { enabled: false }, credentials: { enabled: false }, team: { enabled: false },
    testimonials: { enabled: false }, avaliacoes: { enabled: false }, offers: { enabled: false },
    newsletter: { enabled: false }, authority: { enabled: false },
  },
  heroPresentation: { kicker: "SÃO PAULO · SP", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    {
      kicker: "EUROPA",
      title: "Descubra os encantos de Viena",
      subtitle: "Arquitetura imperial, cafés históricos e momentos inesquecíveis na capital austríaca.",
      image: "immViennaNight", order: 1, enabled: true,
    },
    {
      kicker: "CRUZEIROS",
      title: "Temporada Brasileira 2026/2027",
      subtitle: "Explore o litoral brasileiro a bordo e transforme cada parada em uma nova experiência.",
      image: "immCruise", order: 2, enabled: true,
    },
    {
      kicker: "ORLANDO",
      title: "Viva a magia da Disney",
      subtitle: "Planeje sua viagem e aproveite cada momento nos parques de Orlando.",
      image: "immDisneyCastle", order: 3, enabled: true,
    },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "Ivete Meneghello Milazzotto",
    text: "A IM&M Viagens e Turismo atende em São Paulo (SP), com planejamento de viagens nacionais e internacionais.\n\nCada roteiro é organizado a partir do perfil de quem viaja, com orientação na escolha de destinos, hospedagens e experiências.\n\nO atendimento acompanha o cliente do primeiro contato ao retorno da viagem.",
    media: "hidden", showLocation: true, ownerName: "Ivete Meneghello Milazzotto",
  },
  footer: { descriptionHidden: true, address: "São Paulo/SP", showLocation: true, legalLinksDisabled: true },
  seo: { title: "IM&M Viagens e Turismo", description: "Planejamento de viagens, cruzeiros e resorts com a IM&M Viagens e Turismo, em São Paulo (SP)." },
}, "IM&M Viagens e Turismo");
const immReviewProfile = buildMundoReviewProfile("immOfficial", immBaseline, "IM&M Viagens e Turismo", "Ivete Meneghello Milazzotto");
export const IMM_OFFICIAL_PROFILE: AgencySiteProfile = {
  ...immReviewProfile,
  about: {
    ...immReviewProfile.about,
    mural: undefined,
    images: [{ src: "/imm/ivete-budapeste.webp", alt: "Retrato de Ivete Meneghello Milazzotto com o Parlamento Húngaro ao fundo", aspect: "landscape" }],
  },
  socialStrip: {
    title: "Acompanhe a IMM",
    links: [
      { network: "instagram", url: "https://www.instagram.com/imm_turismo/" },
      { network: "facebook", url: "https://www.facebook.com/immturismo/" },
    ],
  },
  destinations: [
    ...(immReviewProfile.destinations ?? [])
      .filter(d => d.key !== "europa-portugal")
      // O card "Resorts no Brasil" abre a página dedicada de resorts (Immerso, 27/11/2026).
      .map(d => d.key === "resorts-brasil-review"
        ? { ...d, href: "/resorts-brasil", ctaLabel: "Ver resorts" }
        : d),
    { key: "leste-europeu-premium-2027", image: "immLesteEuropeu", label: "Circuito pela Europa · 2027", title: "Leste Europeu Premium", text: "Viena, Budapeste, Bratislava, Praga, Dresden e Berlim em 11 dias e 10 noites. Saídas de abril a outubro de 2027.", service: "pacotes", href: "/circuitos/leste-europeu-premium-2027", enabled: true, order: (immReviewProfile.destinations?.length ?? 0) + 1 },
  ],
  featuredExperience: undefined,
  // Retain IMM's own slide copy and media; the shared Mundo review profile is only the visual baseline.
  hero: immBaseline.hero,
  demo: false, presentation: false, seo: immBaseline.seo,
};

ADS_PREVIEW_FIXTURES[REQUINTE_PREVIEW_JOB_ID] = {
  jobId: REQUINTE_PREVIEW_JOB_ID,
  info: REQUINTE_PREVIEW_INFO,
  profile: REQUINTE_PREVIEW_PROFILE,
  realAgency: true,
  strictBackendBlock: true,
  notice: "Requinte Turismo · prévia para revisão · imagens ilustrativas · sem envio",
  documentTitle: "Prévia — Requinte Turismo",
  pages: { dmc: false, editorial: false, xcaret: null, visa: false, orlandoTickets: true, resorts: { title: "Explore os resorts do Brasil" } },
};

/** Local identity: deliberately never uses the existing account or public slug. */
export const VIAJE_NA_MAGIA_PREVIEW_HOST = "briefing-27-v1.preview.local";
export const VIAJE_NA_MAGIA_PREVIEW_PATH = "/ads-briefing-preview/briefing-27-v1";
export const VIAJE_NA_MAGIA_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad27",
  agency_slug: "", public_slug: null, hostname: VIAJE_NA_MAGIA_PREVIEW_HOST, is_primary: false,
  agency_name: "Viaje na Magia Turismo", owner_name: "Elisangela Silva",
  logo_url: "/viaje-na-magia/logo.webp", cover_image_url: null,
  primary_color: "#164f76", secondary_color: "#ffffff",
  tertiary_color: deriveTertiaryColor("#164f76"), secondary_auto: false, tertiary_auto: false,
  on_secondary_color: "#164f76", phone: null, city: "Franco da Rocha", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
export const VIAJE_NA_MAGIA_PREVIEW_PROFILE = buildGoldStandardProfile("viajeNaMagiaBriefing27", {
  textualWordmark: false, alternateSurfaces: true, destinationsFixedOrder: true, visaHome: false, navDensity: "compact", cruiseSeasonInNav: false,
  // Keep the specialty rail instead of replacing it with an unrelated home campaign.
  featuredExperience: undefined,
  sections: { avaliacoes: false, testimonials: false, credentials: false, team: false, dmc: false, offers: false, blog: false, newsletter: false },
  dmc: undefined, credentials: undefined, team: undefined, testimonials: undefined,
  heroPresentation: { kicker: "FRANCO DA ROCHA · SP · DESDE 2020", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { kicker: "ORLANDO EM FAMÍLIA", title: "Viva a magia de Orlando no ritmo da sua família", subtitle: "Planeje os dias de parque, a hospedagem e os deslocamentos com quem cuida da viagem do começo ao retorno.", image: "parques", enabled: true, order: 1 },
    { kicker: "CRUZEIROS", title: "Encontre um cruzeiro que combine com você", subtitle: "Compare roteiros, navios e cabines antes de escolher como e onde embarcar.", image: "cruzeiro", enabled: true, order: 2 },
    { kicker: "ROTEIROS INTERNACIONAIS", title: "O próximo destino começa com uma boa conversa", subtitle: "Da América do Norte à Europa, passando por Argentina e Chile, monte um roteiro com tempo para aproveitar.", image: "europa", enabled: true, order: 3 },
  ],
  nav: [
    { label: "Início", to: "/" }, { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#assinatura", children: [
      { label: "Parques Orlando", to: "/#ingressos-orlando" }, { label: "Cruzeiros", to: "/#autoridade" },
      { label: "Resorts no Brasil", to: "/#resorts" },
    ] },
    { label: "Sobre", to: "/#sobre", children: [{ label: "Nossa história", to: "/#sobre" }, { label: "Como funciona", to: "/#atendimento" }, { label: "Dúvidas frequentes", to: "/#faq" }] },
  ],
  signature: {
    kicker: "O JEITO VIAJE NA MAGIA DE PLANEJAR", title: "Seu sonho também é importante para nós",
    text: "Uma viagem começa muito antes do embarque. Ela começa na vontade de viver algo especial com as pessoas que você ama. Na Viaje na Magia Turismo, planejamento, estudo e atualização constante ajudam a transformar esse desejo em escolhas possíveis, com orientação para cada etapa.",
    continuation: { title: "Tranquilidade para aproveitar cada momento", text: "Entendemos quem vai viajar, os interesses e o ritmo do grupo. A partir dessa conversa, organizamos destinos, reservas e orientações para que você participe das escolhas e viaje com suporte antes, durante e depois do retorno." },
  },
  modules: [
    { key: "familias", title: "Famílias e parques", text: "Orlando e Disney com planejamento para reunir diferentes gerações e respeitar o ritmo de cada viajante.", service: "ingressos", image: "parques", enabled: true, order: 1 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Roteiros, navios e cabines comparados com atenção ao perfil de quem embarca.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 2 },
    { key: "internacionais", title: "Destinos internacionais", text: "Estados Unidos, Canadá, América do Sul e Europa em roteiros personalizados.", service: "pacotes", image: "europa", enabled: true, order: 3 },
    { key: "entretenimento", title: "Parques e entretenimento", text: "Dias de diversão organizados junto à hospedagem, aos deslocamentos e aos momentos de descanso.", service: "ingressos", image: "parques", enabled: true, order: 4 },
    { key: "america-sul", title: "América do Sul", text: "Argentina, Chile e Brasil entre as prioridades para descobrir paisagens e culturas.", service: "pacotes", image: "mendoza", enabled: true, order: 5 },
    { key: "europa", title: "Europa no seu ritmo", text: "Cidades e experiências reunidas conforme os interesses e o tempo disponível para a viagem.", service: "pacotes", image: "europa", enabled: true, order: 6 },
  ],
  destinations: [
    { key: "eua", title: "Estados Unidos e Canadá", label: "América do Norte", text: "Parques, entretenimento e descobertas culturais em um planejamento personalizado.", image: "parques", service: "pacotes", enabled: true, order: 1 },
    { key: "orlando", title: "Orlando e Disney", label: "Famílias e parques", text: "O sonho que inspirou a agência, organizado com cuidado para toda a família.", image: "parques", service: "ingressos", enabled: true, order: 2 },
    { key: "cruzeiros", title: "Viagens de cruzeiro", label: "No mar", text: "Novos destinos e momentos a bordo, com orientação para escolher roteiro e cabine.", image: "cruzeiro", service: "cruzeiros", enabled: true, order: 3 },
    { key: "america-sul", title: "Argentina, Chile e Brasil", label: "América do Sul", text: "Paisagens e experiências sul-americanas para explorar com planejamento e apoio.", image: "mendoza", service: "pacotes", enabled: true, order: 4 },
    { key: "europa", title: "Europa", label: "Destinos internacionais", text: "História, cultura e cidades que podem fazer parte da sua próxima viagem.", image: "europa", service: "pacotes", enabled: true, order: 5 },
  ],
  authority: {
    kicker: "VIAGENS DE CRUZEIRO", title: "Escolha o cruzeiro pensando em quem vai embarcar",
    paragraphs: [
      "Uma viagem a dois, férias com crianças e um roteiro com amigos pedem escolhas diferentes. A Elisangela ajuda você a comparar itinerário, cabine, portos de parada e atividades a bordo.",
      "Antes de reservar, converse com a agência sobre o que está incluído e como organizar os deslocamentos até o embarque.",
    ],
    cta: "Planejar meu cruzeiro", service: "cruzeiros",
  },
  highlights: [
    { title: "Casais", text: "Tempo juntos e experiências que combinam com os interesses dos dois.", service: "pacotes", cta: "Planejar a dois" },
    { title: "Famílias multigeracionais", text: "Avós, pais e filhos com atenção aos diferentes ritmos e necessidades.", service: "pacotes", cta: "Planejar em família" },
    { title: "Grupos de amigos", text: "Planos compartilhados, organização e descobertas em boa companhia.", service: "pacotes", cta: "Planejar com amigos" },
  ],
  about: {
    kicker: "NOSSA HISTÓRIA", title: "Elisangela cuida da sua viagem do início ao retorno", media: "hidden",
    text: "A Viaje na Magia Turismo nasceu do propósito de ajudar famílias a realizarem o sonho de Orlando e Disney. Em Franco da Rocha, SP, a agência acredita que viajar é possível com planejamento, estudo e atualização constante: conhecer as opções e organizar cada etapa torna o sonho mais próximo.\n\nElisangela Silva, Consultora de Viagens, conduz o atendimento pelo WhatsApp, e-mail, videochamada e presencialmente. A conversa começa pelo que é importante para você: quem vai viajar, o que deseja viver e como construir um roteiro que respeite suas prioridades.\n\nO cuidado continua no planejamento, nas reservas e nas orientações antes do embarque. Durante a viagem, você conta com acompanhamento; após o retorno, o contato permanece.",
    badge: { value: "Desde 2020", label: "Viaje na Magia Turismo" }, ownerName: "Elisangela Silva", showLocation: true,
    tagline: "Planejamento · Reservas · Orientações · Acompanhamento",
  },
  differentials: [
    { title: "Atendimento pelo especialista", text: "Elisangela Silva acompanha suas escolhas com atenção aos seus planos.", icon: "consultivo" },
    { title: "Roteiros personalizados", text: "Destinos, hospedagem e experiências alinhados ao perfil dos viajantes.", icon: "conferido" },
    { title: "Especialização e parceiros", text: "Estudo e atualização em destinos e produtos, com parceiros consolidados.", icon: "fornecedores" },
    { title: "Suporte durante a viagem", text: "Orientações antes do embarque, acompanhamento durante a viagem e contato após o retorno.", icon: "acompanhamento" },
  ],
  hideConciergeWhatsapp: true, hideFaqWhatsapp: true,
  conciergePoints: [
    { key: "conversa", title: "1. Conhecer seus planos", text: "WhatsApp, e-mail, videochamada ou atendimento presencial para entender o sonho e os viajantes." },
    { key: "planejamento", title: "2. Planejar e reservar", text: "Roteiro personalizado, comparação das opções e organização das reservas." },
    { key: "orientacoes", title: "3. Preparar o embarque", text: "Orientações e conferência dos detalhes antes de começar a viagem." },
    { key: "suporte", title: "4. Acompanhar e ouvir", text: "Acompanhamento durante a viagem e contato após o retorno para saber como foi." },
  ],
  conciergeSteps: ["Conte seus planos à Elisangela.", "Construímos o roteiro e organizamos as reservas.", "Você recebe orientações antes do embarque.", "Seguimos em contato durante a viagem e após o retorno."],
  requestCenter: { title: "Central de solicitações", support: "Conte como imagina sua próxima viagem.", notice: "Prévia técnica: formulário simulado, sem envio de dados.", submitLabel: "Revisar", titlePlacement: "above-card" },
  faq: [
    { q: "Quem atende na Viaje na Magia Turismo?", a: "Elisangela Silva, Consultora de Viagens, com atendimento por WhatsApp, e-mail, videochamada e presencial em Franco da Rocha, SP." },
    { q: "A agência planeja viagens para diferentes gerações?", a: "Sim. Casais, famílias multigeracionais e grupos de amigos estão entre os perfis atendidos. O roteiro considera os interesses e o ritmo dos viajantes." },
    { q: "Orlando e Disney são especialidades?", a: "Sim. A agência nasceu do propósito de ajudar famílias a realizarem esse sonho, com planejamento, estudo e atualização constante." },
    { q: "Quais destinos estão entre as prioridades?", a: "Estados Unidos e Canadá, parques e entretenimento, cruzeiros, Argentina, Chile, Brasil e Europa." },
    { q: "Como funciona o planejamento de um cruzeiro?", a: "A consultoria ajuda a comparar navios, roteiros e cabines conforme o perfil dos viajantes e as datas pretendidas. Condições são confirmadas na proposta, sem preços ou disponibilidade presumidos." },
    { q: "Há acompanhamento durante a viagem?", a: "Sim. O atendimento reúne planejamento, reservas, orientações antes do embarque, acompanhamento durante a viagem e contato após o retorno." },
    { q: "Como entro em contato?", a: "WhatsApp (11) 98402-8192 ou e-mail viajenamagia@gmail.com. Nesta prévia, os contatos são informativos: ações externas e solicitações ficam bloqueadas." },
  ],
  copy: {
    modules: { kicker: "ESPECIALIDADES", title: "O que você sonha viver?", subtitle: "Famílias e parques, cruzeiros e destinos internacionais com planejamento completo." },
    destinations: { kicker: "DESTINOS PRIORITÁRIOS", title: "Destinos que inspiram novas histórias", subtitle: "Estados Unidos, Canadá, América do Sul e Europa entre as prioridades da sua próxima viagem." },
    highlights: { kicker: "QUEM VIAJA CONOSCO", title: "Uma viagem para cada companhia", subtitle: "Casais, famílias multigeracionais e grupos de amigos." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Cuidado em cada escolha", subtitle: "Atendimento pelo especialista e apoio do planejamento ao retorno." },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa ao retorno", subtitle: "Planejamento completo com Elisangela Silva, Consultora de Viagens." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Viajar com tranquilidade começa aqui" },
  },
  footer: { description: "Planejamento completo para o cliente viajar com tranquilidade", email: "viajenamagia@gmail.com", whatsapp: "(11) 98402-8192", address: "Franco da Rocha/SP", showLocation: true, legalLinksDisabled: true },
  seo: { title: "Prévia — Viaje na Magia Turismo", description: "Apresentação técnica da Viaje na Magia Turismo para revisão, sem envios ou publicação." },
}, "Viaje na Magia Turismo");
ADS_PREVIEW_FIXTURES["briefing-27-v1"] = {
  jobId: "briefing-27-v1", info: VIAJE_NA_MAGIA_PREVIEW_INFO, profile: VIAJE_NA_MAGIA_PREVIEW_PROFILE,
  realAgency: true, strictBackendBlock: true,
  notice: "Viaje na Magia Turismo · prévia para revisão · solicitações simuladas · sem envios ou publicação",
  documentTitle: "Prévia — Viaje na Magia Turismo",
  pages: { dmc: false, editorial: false, xcaret: null, visa: false, orlandoTickets: true, resorts: { title: "Explore os resorts do Brasil" } },
};

/** Briefing 28: identity belongs only to the local fixture, never to an account. */
export const ROTEIROS_DA_TERRA_PREVIEW_HOST = "briefing-28-v1.preview.local";
export const ROTEIROS_DA_TERRA_PREVIEW_PATH = "/ads-briefing-preview/briefing-28-v1";
export const ROTEIROS_DA_TERRA_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad28",
  agency_slug: "", public_slug: null, hostname: ROTEIROS_DA_TERRA_PREVIEW_HOST, is_primary: false,
  agency_name: "ROTEIROS DA TERRA", owner_name: "Andrea Machado Terra",
  logo_url: roteirosDaTerraLogo.url, cover_image_url: null,
  primary_color: "#23314D", secondary_color: "#F8E1E5",
  tertiary_color: deriveTertiaryColor("#23314D"), secondary_auto: false, tertiary_auto: false,
  on_secondary_color: "#23314D", phone: null, city: "Rio de Janeiro", state: "RJ",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
export const ROTEIROS_DA_TERRA_PREVIEW_PROFILE = buildGoldStandardProfile("roteirosDaTerraBriefing28", {
  textualWordmark: false, navDensity: "compact", cruiseSeasonInNav: false,
  sections: { credentials: false, team: false, avaliacoes: false, testimonials: false },
  credentials: undefined, team: undefined, testimonials: undefined,
  heroPresentation: { kicker: "RIO DE JANEIRO · RJ · DESDE 2019", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "ROTEIROS DA TERRA", subtitle: "Planejamento completo para o cliente viajar com tranquilidade.", image: "heroVarenna", enabled: true, order: 1 },
    { title: "Viagens sob medida", subtitle: "Europa, Ásia, Oceania, África e América do Sul entre as prioridades do seu planejamento.", image: "dricaJapan", enabled: true, order: 2 },
    { title: "Luxo e experiências exclusivas", subtitle: "Consultoria completa para diferentes viagens, com Andrea Machado Terra.", image: "safari", enabled: true, order: 3 },
  ],
  signature: {
    kicker: "O JEITO ROTEIROS DA TERRA DE PLANEJAR", title: "Consultoria completa para diferentes viagens",
    text: "Viagens sob medida, luxo e experiências exclusivas e viagens internacionais compõem as especialidades da ROTEIROS DA TERRA. O planejamento parte dos seus interesses e das escolhas que tornam cada viagem pessoal, com uma proposta de consultoria completa para diferentes viagens.",
    continuation: { title: "Seu próximo roteiro, pensado para você", text: "Europa, Ásia e Oceania, África e América do Sul estão entre as prioridades da agência. Destinos, culturas e paisagens servem de inspiração para uma conversa com Andrea Machado Terra sobre a viagem que você deseja planejar." },
  },
  modules: [
    { key: "sob-medida", title: "Viagens sob medida", text: "Planejamento alinhado aos seus interesses e ao roteiro que deseja construir.", service: "pacotes", image: "heroVarenna", enabled: true, order: 1 },
    { key: "luxo", title: "Luxo e experiências exclusivas", text: "Inspirações para conversar sobre conforto, estilo de viagem e escolhas pessoais.", service: "pacotes", image: "villa", enabled: true, order: 2 },
    { key: "internacionais", title: "Viagens internacionais", text: "Europa, Ásia/Oceania, África e América do Sul entre as prioridades editoriais.", service: "pacotes", image: "dricaJapan", enabled: true, order: 3 },
    { key: "europa", title: "Itália e Portugal", text: "Cidades, paisagens e cultura para inspirar seu planejamento pela Europa.", service: "pacotes", image: "portugalBelem", enabled: true, order: 4 },
    { key: "africa", title: "África do Sul e Marrocos", text: "Diferentes paisagens e culturas entre os destinos citados pela agência.", service: "pacotes", image: "safari", enabled: true, order: 5 },
    { key: "america-sul", title: "Atacama, Peru e Patagônia", text: "Inspirações sul-americanas para uma viagem desenhada com atenção aos seus planos.", service: "pacotes", image: "mendoza", enabled: true, order: 6 },
  ],
  destinations: [
    { key: "europa", title: "Itália e Portugal", label: "Europa", text: "História, cidades e paisagens entre os destinos citados para viagens sob medida.", image: "heroVarenna", service: "pacotes", enabled: true, order: 1 },
    { key: "asia", title: "Japão, Tailândia e Maldivas", label: "Ásia · prioridade também para Oceania", text: "Culturas e experiências diversas como inspiração para o seu roteiro. Fotografia compartilhada de Kyoto, Japão.", image: "dricaJapan", service: "pacotes", enabled: true, order: 2 },
    { key: "africa", title: "África do Sul e Marrocos", label: "África", text: "Dois destinos entre as prioridades da agência. Imagem de safári ilustrativa do acervo compartilhado.", image: "safari", service: "pacotes", enabled: true, order: 3 },
    { key: "america-sul", title: "Atacama, Peru e Patagônia", label: "América do Sul", text: "Paisagens e culturas para inspirar novas viagens. Imagem regional ilustrativa do acervo compartilhado, sem representar os três destinos.", image: "mendoza", service: "pacotes", enabled: true, order: 4 },
    { key: "luxo", title: "Luxo no seu estilo", label: "Experiências exclusivas", text: "Conforto e experiências como ponto de partida para conversar sobre suas preferências. Imagem ilustrativa, sem oferta ou disponibilidade.", image: "villa", service: "pacotes", enabled: true, order: 5 },
  ],
  highlights: [
    { title: "Seu próprio ritmo", text: "Inspiração editorial: tempo e interesses como ponto de partida para o roteiro.", service: "pacotes", cta: "Revisar planejamento" },
    { title: "Novas culturas", text: "Inspiração editorial: diferentes destinos e experiências para conhecer.", service: "pacotes", cta: "Explorar possibilidades" },
    { title: "Escolhas pessoais", text: "Inspiração editorial: conforto e estilo de viagem em uma proposta sob medida.", service: "pacotes", cta: "Revisar possibilidades" },
  ],
  about: {
    kicker: "CONHEÇA A AGÊNCIA", title: "Desde 2019, ROTEIROS DA TERRA", image: "heroVarenna",
    text: "A ROTEIROS DA TERRA foi fundada em 2019 por Andrea Machado Terra, no Rio de Janeiro/RJ. A agência apresenta uma proposta de consultoria completa para diferentes viagens, com planejamento completo para o cliente viajar com tranquilidade.\n\nViagens sob medida, luxo e experiências exclusivas e viagens internacionais são suas especialidades. Europa, Ásia e Oceania, África, América do Sul e luxo orientam as prioridades editoriais. África do Sul, Marrocos, Tailândia, Maldivas, Japão, Itália, Portugal, Atacama, Peru e Patagônia estão entre os destinos citados.\n\nAndrea Machado Terra conduz o atendimento via WhatsApp, vídeo e telefone. A conversa sobre seus planos é o ponto de partida para conhecer a proposta da agência. Canais, condições e etapas específicas do atendimento são combinados diretamente, sem compromissos operacionais adicionais nesta apresentação.",
    badge: { value: "Desde 2019", label: "ROTEIROS DA TERRA" }, ownerName: "Andrea Machado Terra", showLocation: false,
    tagline: "Andrea Machado Terra · Fundadora",
  },
  differentials: [
    { title: "Atendimento com Andrea", text: "Andrea Machado Terra, fundadora, atende via WhatsApp, vídeo e telefone.", icon: "consultivo" },
    { title: "Viagens sob medida", text: "Uma das especialidades da agência, com planejamento para diferentes viagens.", icon: "conferido" },
    { title: "Luxo e experiências exclusivas", text: "Especialidade voltada a escolhas pessoais e diferentes estilos de viagem.", icon: "fornecedores" },
    { title: "Viagens internacionais", text: "Europa, Ásia/Oceania, África e América do Sul entre as prioridades.", icon: "acompanhamento" },
  ],
  hideConciergeWhatsapp: true, hideFaqWhatsapp: true,
  conciergePoints: [
    { key: "contato", title: "Conversar com Andrea", text: "Atendimento informado: WhatsApp, vídeo e telefone." },
    { key: "interesses", title: "Compartilhar seus interesses", text: "Etapa editorial de apresentação para conhecer o roteiro desejado." },
    { key: "possibilidades", title: "Explorar possibilidades", text: "Etapa ilustrativa; opções e condições dependem de confirmação com a agência." },
    { key: "planejamento", title: "Combinar o planejamento", text: "Etapa ilustrativa; escopo e condições são combinados diretamente com Andrea." },
  ],
  conciergeSteps: ["Atendimento com Andrea via WhatsApp, vídeo e telefone.", "Etapa ilustrativa: conversar sobre seus interesses.", "Etapa ilustrativa: explorar possibilidades de roteiro.", "Condições e etapas específicas a combinar com a agência."],
  requestCenter: { title: "Central de solicitações", support: "Conte como imagina sua próxima viagem.", notice: "Prévia técnica: formulário simulado, sem envio de dados.", submitLabel: "Revisar", titlePlacement: "above-card" },
  faq: [
    { q: "Quem atende na ROTEIROS DA TERRA?", a: "Andrea Machado Terra, fundadora da agência, via WhatsApp, vídeo e telefone." },
    { q: "Quando a agência foi fundada?", a: "Em 2019. A cidade informada é Rio de Janeiro/RJ." },
    { q: "Quais são as especialidades?", a: "Viagens sob medida, luxo e experiências exclusivas e viagens internacionais." },
    { q: "Quais regiões são prioritárias?", a: "Europa, Ásia/Oceania, África e América do Sul, além de viagens de luxo." },
    { q: "Quais destinos inspiram os roteiros?", a: "África do Sul, Marrocos, Tailândia, Maldivas, Japão, Itália, Portugal, Atacama, Peru e Patagônia estão entre os destinos citados." },
    { q: "Os produtos desta prévia são ofertas disponíveis?", a: "Não. Os catálogos e continuidades do padrão ouro são uma apresentação técnica. Serviços, disponibilidade, condições e etapas de atendimento precisam de confirmação com a agência." },
    { q: "Quais são os contatos públicos?", a: "WhatsApp +55 21 98897-4969 e e-mail andrea@roteirosdaterra.com.br. Site informado: roteirosdaterra.com.br, apenas como referência textual. Contatos, formulários e ações comerciais estão bloqueados nesta prévia." },
  ],
  copy: {
    modules: { kicker: "ESPECIALIDADES", title: "Viagens com a sua personalidade", subtitle: "Sob medida, luxo e experiências exclusivas e viagens internacionais." },
    destinations: { kicker: "DESTINOS PRIORITÁRIOS", title: "Destinos que inspiram novas histórias", subtitle: "Europa, Ásia/Oceania, África, América do Sul e luxo." },
    highlights: { kicker: "INSPIRAÇÕES EDITORIAIS", title: "Diferentes formas de viver uma viagem", subtitle: "Conteúdo ilustrativo de apresentação, sem oferta comercial." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Consultoria para diferentes viagens", subtitle: "As especialidades e o atendimento informados pela ROTEIROS DA TERRA." },
    concierge: { kicker: "ATENDIMENTO", title: "Uma conversa com Andrea", subtitle: "WhatsApp, vídeo e telefone; etapas ilustrativas sujeitas à confirmação." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Conheça a proposta da agência" },
    newsletter: { title: "Receba novidades e oportunidades", subtitle: "Formulário demonstrativo, sem inscrição ou envio nesta prévia." },
  },
  footer: { description: "Consultoria completa para diferentes viagens", email: "andrea@roteirosdaterra.com.br", whatsapp: "+55 21 98897-4969", phone: "+55 21 98897-4969", showLocation: false, legalLinksDisabled: true },
  seo: { title: "Prévia — ROTEIROS DA TERRA", description: "Apresentação técnica isolada da ROTEIROS DA TERRA para revisão, sem envio ou publicação." },
}, "ROTEIROS DA TERRA");
// Short local CTA keeps the inherited Portugal presentation within mobile width.
if (ROTEIROS_DA_TERRA_PREVIEW_PROFILE.dmc) {
  ROTEIROS_DA_TERRA_PREVIEW_PROFILE.dmc.cta = "Explorar Portugal";
}
ADS_PREVIEW_FIXTURES["briefing-28-v1"] = {
  jobId: "briefing-28-v1", info: ROTEIROS_DA_TERRA_PREVIEW_INFO, profile: ROTEIROS_DA_TERRA_PREVIEW_PROFILE,
  realAgency: true, strictBackendBlock: true,
  notice: "ROTEIROS DA TERRA · prévia técnica · catálogos ilustrativos, sem oferta ou operação confirmada · contatos e envios bloqueados",
  documentTitle: "Prévia — ROTEIROS DA TERRA",
  pages: { resorts: { title: "Explore os resorts do Brasil" }, orlandoTickets: true, visa: true, xcaret: { slots: GENERIC_XCARET_SLOTS }, dmc: true, editorial: true },
};

/** Briefing 29: presentation identity only; no account/domain association. */
export const RB_TOUR_PREVIEW_HOST = "briefing-29-v1.preview.local";
export const RB_TOUR_PREVIEW_PATH = "/ads-briefing-preview/briefing-29-v1";
export const RB_TOUR_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad29",
  agency_slug: "", public_slug: null, hostname: RB_TOUR_PREVIEW_HOST, is_primary: false,
  agency_name: "RB TOUR", owner_name: "Regis Brissi",
  logo_url: rbTourLogo.url, cover_image_url: null,
  primary_color: "#0f3a57", secondary_color: "#bec4c5",
  tertiary_color: deriveTertiaryColor("#0f3a57"), secondary_auto: false, tertiary_auto: false,
  on_secondary_color: "#0f3a57", phone: null, city: "Barueri", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
export const RB_TOUR_PREVIEW_PROFILE = buildGoldStandardProfile("rbTourBriefing29", {
  textualWordmark: false, navDensity: "compact", cruiseSeasonInNav: false,
  sections: { team: false, avaliacoes: false, testimonials: false },
  team: undefined, testimonials: undefined,
  credentials: {
    kicker: "CADASTUR", title: "Cadastro informado pela RB TOUR",
    text: "Número Cadastur confirmado no briefing. Apresentação textual, sem certificado ou imagem documental.",
    items: [{ key: "cadastur", name: "Cadastur", text: "26.005703.10.0001-1" }],
  },
  heroPresentation: { kicker: "BARUERI · SP · DESDE 2004", overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { title: "RB TOUR", subtitle: "Sonhe. Deseje. Imagine. A RB Tour leva você lá! Planejamento completo para o cliente viajar com tranquilidade.", image: "heroVarenna", enabled: true, order: 1 },
    { title: "Viagens sob medida", subtitle: "Brasil, Caribe e México, América do Sul e destinos internacionais como inspiração para o seu próximo roteiro.", image: "litoral", enabled: true, order: 2 },
    { title: "Luxo e experiências exclusivas", subtitle: "Curadoria criteriosa e planejamento detalhado para famílias, casais e clientes de alto padrão.", image: "safari", enabled: true, order: 3 },
  ],
  nav: [
    { label: "Início", to: "/" }, { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#assinatura", children: [
      { label: "Resorts no Brasil", to: "/resorts-brasil" }, { label: "Club Med e neve", to: "/club-med-neve" },
      { label: "Xcaret", to: "/xcaret" }, { label: "Orlando", to: "/ingressos-orlando" },
      { label: "Cruzeiros", to: "/#autoridade" }, { label: "Visto americano", to: "/visto-americano" },
      { label: "Portugal · inspiração", to: "/dmc-portugal" },
    ] },
    { label: "Sobre", to: "/#sobre" }, { label: "Atendimento", to: "/#atendimento" },
    { label: "Inspirações", to: "/ofertas" }, { label: "Blog", to: "/blog" },
  ],
  signature: {
    kicker: "O JEITO RB TOUR DE PLANEJAR", title: "Consultoria completa para diferentes viagens",
    text: "Sonhe. Deseje. Imagine. A RB Tour leva você lá! A consultoria começa pelos seus interesses e pelo que você deseja viver. Viagens sob medida, luxo e experiências exclusivas e destinos internacionais fazem parte de uma proposta que reúne curadoria criteriosa, planejamento detalhado e especialização profunda.",
    continuation: { title: "Da inspiração ao pós-viagem", text: "Famílias com crianças, casais e clientes de alto padrão encontram um planejamento que considera seu perfil. Regis Brissi, fundador, e especialistas conforme o produto e a etapa conduzem o atendimento por WhatsApp e videochamada, com suporte durante toda a viagem." },
  },
  modules: [
    { key: "sob-medida", title: "Viagens sob medida", text: "Planejamento detalhado que considera o perfil, os interesses e o ritmo dos viajantes.", service: "pacotes", image: "heroVarenna", enabled: true, order: 1 },
    { key: "resorts", title: "Resorts e all inclusive", text: "Inspirações no Brasil, Caribe e México para descansar em família ou a dois, sem oferta vigente nesta prévia.", service: "hospedagem", image: "resort", enabled: true, order: 2 },
    { key: "luxo", title: "Luxo e hotéis boutique", text: "Conforto, personalidade e experiências exclusivas entre as prioridades da curadoria.", service: "hospedagem", image: "villa", enabled: true, order: 3 },
    { key: "neve", title: "Club Med e neve", text: "Inspirações para viagens à montanha. Produtos do catálogo compartilhado, sem preço ou disponibilidade presumidos.", service: "pacotes", image: "europa", enabled: true, order: 4 },
    { key: "exoticos", title: "Destinos exóticos e safári", text: "Paisagens e experiências como ponto de partida para um roteiro internacional sob medida.", service: "pacotes", image: "safari", enabled: true, order: 5 },
    { key: "italia", title: "Itália e destinos internacionais", text: "Cultura, cidades e paisagens reunidas com atenção aos seus planos e às escolhas de cada etapa.", service: "pacotes", image: "heroVarenna", enabled: true, order: 6 },
  ],
  destinations: [
    { key: "brasil", title: "Brasil", label: "Descobertas nacionais", text: "Praias, paisagens e resorts como inspiração para diferentes viagens pelo país.", image: "brasil", service: "pacotes", enabled: true, order: 1 },
    { key: "caribe-mexico", title: "Caribe e México", label: "Resorts e all inclusive", text: "Descanso e experiências em família ou a dois. Imagem regional ilustrativa, sem representar uma oferta vigente.", image: "litoral", service: "pacotes", enabled: true, order: 2 },
    { key: "america-sul", title: "América do Sul", label: "Novas paisagens", text: "Culturas e paisagens para um roteiro personalizado. Fotografia regional de inspiração.", image: "mendoza", service: "pacotes", enabled: true, order: 3 },
    { key: "italia", title: "Itália", label: "Europa", text: "Cidades, cultura e paisagens entre as prioridades da RB TOUR para viagens internacionais.", image: "heroVarenna", service: "pacotes", enabled: true, order: 4 },
    { key: "safari", title: "Safári e destinos exóticos", label: "Experiências exclusivas", text: "Inspiração editorial para novas descobertas, sem roteiro fechado, preço ou disponibilidade fictícios.", image: "safari", service: "pacotes", enabled: true, order: 5 },
  ],
  highlights: [
    { title: "Famílias com crianças", text: "Interesses e ritmos de cada pessoa como ponto de partida para o planejamento.", service: "pacotes", cta: "Explorar em família" },
    { title: "Viagens a dois", text: "Tempo juntos e experiências escolhidas conforme as preferências do casal.", service: "pacotes", cta: "Inspirar a próxima viagem" },
    { title: "Luxo e alto padrão", text: "Curadoria criteriosa para escolhas que valorizam conforto e experiências exclusivas.", service: "pacotes", cta: "Explorar possibilidades" },
  ],
  about: {
    kicker: "NOSSA HISTÓRIA", title: "RB TOUR: uma trajetória no turismo desde 1997", image: "heroVarenna",
    text: "A trajetória de Regis Brissi no turismo começou em 1997. Depois de experiências em companhia aérea, operadora, hotel e agência, a RB Tour foi criada em 2004. Em Barueri/SP, essa história dá origem a uma proposta de consultoria completa para diferentes viagens e de planejamento completo para o cliente viajar com tranquilidade.\n\nViagens sob medida, luxo e experiências exclusivas e destinos internacionais são suas especialidades. Famílias com crianças, casais e clientes de alto padrão estão entre os principais perfis atendidos. Brasil, Caribe e México, América do Sul, resorts e all inclusive, Club Med e neve, hotéis boutique, safári, destinos exóticos e Itália orientam as prioridades de planejamento.\n\nRegis Brissi, fundador, e especialistas conforme o produto e a etapa conduzem o atendimento por WhatsApp e videochamada. Curadoria criteriosa, planejamento detalhado, especialização profunda e suporte durante toda a viagem compõem o cuidado da inspiração ao pós-viagem. Sonhe. Deseje. Imagine. A RB Tour leva você lá!",
    badge: { value: "Desde 2004", label: "RB TOUR" }, ownerName: "Regis Brissi", showLocation: true,
    tagline: "Regis Brissi · Fundador · Turismo desde 1997",
  },
  differentials: [
    { title: "Curadoria criteriosa", text: "Escolhas orientadas pelo perfil de quem viaja e pelas experiências desejadas.", icon: "consultivo" },
    { title: "Planejamento detalhado", text: "Atenção ao roteiro e aos detalhes que conectam cada etapa da viagem.", icon: "conferido" },
    { title: "Especialização profunda", text: "Regis Brissi e especialistas conforme o produto e a etapa do planejamento.", icon: "fornecedores" },
    { title: "Suporte durante toda a viagem", text: "Atendimento da inspiração ao pós-viagem por WhatsApp e videochamada.", icon: "acompanhamento" },
  ],
  hideConciergeWhatsapp: true, hideFaqWhatsapp: true,
  conciergePoints: [
    { key: "inspiracao", title: "1. Conhecer seus planos", text: "Regis Brissi e especialistas conversam sobre quem viaja e o que deseja viver." },
    { key: "curadoria", title: "2. Selecionar possibilidades", text: "Curadoria criteriosa conforme o perfil, o produto e os interesses da viagem." },
    { key: "planejamento", title: "3. Planejar os detalhes", text: "Planejamento detalhado e atendimento por WhatsApp e videochamada." },
    { key: "suporte", title: "4. Acompanhar a viagem", text: "Suporte durante toda a viagem, da inspiração ao pós-viagem." },
  ],
  conciergeSteps: ["Compartilhe seus planos com Regis e os especialistas.", "Conheça possibilidades alinhadas ao seu perfil.", "Construa um planejamento atento aos detalhes.", "Conte com suporte durante a viagem e no pós-viagem."],
  requestCenter: { title: "Central de solicitações", support: "Como você imagina sua próxima viagem?", notice: "Prévia técnica: formulário simulado, sem envio de dados.", submitLabel: "Revisar", titlePlacement: "above-card" },
  faq: [
    { q: "Quem atende na RB TOUR?", a: "Regis Brissi, fundador, e especialistas conforme o produto e a etapa, por WhatsApp e videochamada." },
    { q: "Quando começou a história da agência?", a: "A atuação no turismo começou em 1997. A RB Tour foi criada em 2004, após experiência em companhia aérea, operadora, hotel e agência." },
    { q: "Quais são as especialidades?", a: "Viagens sob medida, luxo e experiências exclusivas e destinos internacionais. Famílias com crianças, casais e clientes de alto padrão estão entre os principais perfis atendidos." },
    { q: "Quais destinos e experiências são prioritários?", a: "Brasil, Caribe e México, América do Sul, resorts e all inclusive, viagens de luxo, Club Med e neve, destinos exóticos, hotéis boutique, safári e Itália." },
    { q: "Há suporte durante a viagem?", a: "Sim. O atendimento informado pela RB TOUR vai da inspiração ao pós-viagem, com suporte durante toda a viagem. Canais e condições específicas são combinados com a agência." },
    { q: "Os produtos apresentados estão disponíveis para reserva?", a: "Esta é uma apresentação técnica. As experiências e catálogos são inspirações, sem preços ou disponibilidade fictícios; solicitações, contatos e ações comerciais estão bloqueados." },
    { q: "Quais são os contatos públicos?", a: "WhatsApp 11 99236-3862, atendimento@rbtour.com.br e Instagram @rbtourviagens. Barueri/SP. Site informado: rbtour.com.br, apenas referência textual, sem vínculo de domínio nesta prévia." },
  ],
  copy: {
    modules: { kicker: "ESPECIALIDADES", title: "Viagens com a sua personalidade", subtitle: "Sob medida, luxo e experiências exclusivas. Inspirações sem preço ou disponibilidade presumidos." },
    destinations: { kicker: "DESTINOS", title: "Seu próximo roteiro começa na inspiração", subtitle: "Brasil, Caribe e México, América do Sul, Itália e destinos exóticos." },
    highlights: { kicker: "MOMENTOS DE VIAGEM", title: "Uma viagem para cada momento", subtitle: "Famílias com crianças, casais e clientes de luxo ou alto padrão." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Detalhes que fazem parte da viagem", subtitle: "Curadoria criteriosa, planejamento detalhado, suporte e especialização profunda." },
    concierge: { kicker: "ATENDIMENTO", title: "Da inspiração ao pós-viagem", subtitle: "Regis Brissi e especialistas conforme o produto e a etapa; WhatsApp e videochamada." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Conheça a proposta da RB TOUR" },
    newsletter: { title: "Receba inspirações de viagem", subtitle: "Formulário demonstrativo, sem inscrição ou envio nesta prévia." },
  },
  footer: { description: "Consultoria completa para diferentes viagens. Sonhe. Deseje. Imagine. A RB Tour leva você lá!", email: "atendimento@rbtour.com.br", whatsapp: "11 99236-3862", instagram: "https://www.instagram.com/rbtourviagens/", instagramLabel: "@rbtourviagens", phoneHidden: true, showLocation: true, legalLinksDisabled: true },
  seo: { title: "Prévia — RB TOUR", description: "Apresentação técnica isolada da RB TOUR para revisão, sem envios, vínculo de identidade ou publicação." },
}, "RB TOUR");
if (RB_TOUR_PREVIEW_PROFILE.dmc) RB_TOUR_PREVIEW_PROFILE.dmc.cta = "Explorar Portugal";
ADS_PREVIEW_FIXTURES["briefing-29-v1"] = {
  jobId: "briefing-29-v1", info: RB_TOUR_PREVIEW_INFO, profile: RB_TOUR_PREVIEW_PROFILE,
  realAgency: true, strictBackendBlock: true,
  notice: "RB TOUR · prévia técnica · experiências ilustrativas, sem preços ou disponibilidade · contatos e envios bloqueados",
  documentTitle: "Prévia — RB TOUR",
  pages: { resorts: { title: "Inspirações em resorts no Brasil" }, orlandoTickets: true, visa: true, xcaret: { slots: GENERIC_XCARET_SLOTS }, dmc: true, editorial: true },
};

/** Briefing 30: local presentation only. Account/domain matching stays external;
 * no confirmed logo asset, so the shared textual wordmark renderer is mandatory. */
export const JE_VIAGENS_PREVIEW_JOB_ID = "briefing-30-v1";
export const JE_VIAGENS_PREVIEW_HOST = "briefing-30-v1.preview.local";
export const JE_VIAGENS_PREVIEW_PATH = `/ads-briefing-preview/${JE_VIAGENS_PREVIEW_JOB_ID}`;
export const JE_VIAGENS_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad30",
  agency_slug: "", public_slug: null, hostname: JE_VIAGENS_PREVIEW_HOST, is_primary: false,
  agency_name: "JE VIAGENS", owner_name: "JE VIAGENS",
  logo_url: null, cover_image_url: null,
  primary_color: "#164f76", secondary_color: "#39b7d4",
  tertiary_color: deriveTertiaryColor("#164f76"), secondary_auto: false, tertiary_auto: false,
  on_secondary_color: null, phone: null, city: "Santo André", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
export const JE_VIAGENS_PREVIEW_PROFILE = buildGoldStandardProfile("jeViagensBriefing30", {
  textualWordmark: true, navDensity: "compact", cruiseSeasonInNav: false,
  heroPresentation: { kicker: "SANTO ANDRÉ · SP · DESDE 2017", overlay: "strongLeft", titleWeight: "regular", cta: { label: "Planejar minha viagem", service: "pacotes" } },
  hero: [
    { title: "JE VIAGENS", subtitle: "Atendimento personalizado para viagens nacionais e internacionais, com experiências escolhidas para o seu momento.", image: "heroVarenna", enabled: true, order: 1 },
    { title: "JE VIAGENS", subtitle: "Lazer e roteiros personalizados: paisagens e experiências como inspiração para a sua próxima viagem.", image: "litoral", enabled: true, order: 2 },
    { title: "JE VIAGENS", subtitle: "Viagens em grupo e suporte ao viajante, com atenção aos interesses de quem vai viajar.", image: "brasil", enabled: true, order: 3 },
  ],
  nav: [
    { label: "Início", to: "/" }, { label: "Destinos", to: "/#destinos" },
    { label: "Experiências", to: "/#assinatura", children: [
      { label: "Resorts no Brasil", to: "/resorts-brasil" }, { label: "Club Med e neve", to: "/club-med-neve" },
      { label: "Xcaret", to: "/xcaret" }, { label: "Orlando", to: "/ingressos-orlando" },
      { label: "Cruzeiros", to: "/#autoridade" }, { label: "Visto americano", to: "/visto-americano" },
      { label: "Portugal · inspiração", to: "/dmc-portugal" },
    ] },
    { label: "Sobre", to: "/#sobre" }, { label: "Atendimento", to: "/#atendimento" },
    { label: "Inspirações", to: "/ofertas" }, { label: "Blog", to: "/blog" },
  ],
  signature: {
    kicker: "O JEITO JE VIAGENS DE PLANEJAR", title: "A sua viagem começa com os seus planos",
    text: "A JE VIAGENS atua em Santo André/SP desde 2017, com atendimento personalizado e experiências de viagem. Viagens nacionais e internacionais, lazer, roteiros personalizados e grupos fazem parte de uma proposta que coloca os interesses de quem viaja no centro do planejamento.",
    continuation: { title: "Experiências com a sua personalidade", text: "Compartilhar preferências, datas e o ritmo desejado é o ponto de partida para pensar um roteiro. Do lazer às viagens em grupo, o atendimento personalizado e o suporte ao viajante fazem parte da proposta da JE VIAGENS." },
  },
  modules: [
    { key: "nacionais", title: "Viagens nacionais", text: "Paisagens brasileiras como inspiração para uma viagem de lazer personalizada.", service: "pacotes", image: "brasil", enabled: true, order: 1 },
    { key: "internacionais", title: "Viagens internacionais", text: "Cidades, culturas e novas paisagens para um roteiro com a sua personalidade.", service: "pacotes", image: "heroVarenna", enabled: true, order: 2 },
    { key: "lazer", title: "Tempo para descansar", text: "Praias e resorts como possibilidades de lazer, sem oferta ou disponibilidade presumidas.", service: "hospedagem", image: "resort", enabled: true, order: 3 },
    { key: "personalizados", title: "Roteiros personalizados", text: "Inspirações que podem ser combinadas conforme seus interesses e seu ritmo.", service: "pacotes", image: "europa", enabled: true, order: 4 },
    { key: "grupos", title: "Viagens em grupo", text: "Ideias para compartilhar experiências, respeitando as preferências dos viajantes.", service: "pacotes", image: "litoral", enabled: true, order: 5 },
    { key: "experiencias", title: "Experiências de viagem", text: "Parques, passeios e descobertas do catálogo compartilhado como inspiração editorial.", service: "ingressos", image: "parques", enabled: true, order: 6 },
  ],
  destinations: [
    { key: "brasil", title: "Brasil", label: "Inspiração nacional", text: "Paisagens para explorar em viagens nacionais de lazer, com planejamento personalizado.", image: "brasil", service: "pacotes", enabled: true, order: 1 },
    { key: "europa", title: "Europa", label: "Inspiração internacional", text: "Cidades e culturas como ideias de roteiro, sem afirmar especialização em um destino específico.", image: "heroVarenna", service: "pacotes", enabled: true, order: 2 },
    { key: "praias", title: "Praias e paisagens", label: "Lazer", text: "Tempo para descansar e descobrir novos cenários no ritmo de quem viaja.", image: "litoral", service: "pacotes", enabled: true, order: 3 },
    { key: "resorts", title: "Resorts no Brasil", label: "Descanso", text: "Explore o catálogo compartilhado de resorts como inspiração para suas próximas férias.", image: "resort", service: "hospedagem", href: "/resorts-brasil", ctaLabel: "Ver resorts", enabled: true, order: 4 },
    { key: "orlando", title: "Parques e experiências", label: "Inspiração em Orlando", text: "Possibilidades do catálogo para viagens de lazer; condições a confirmar com a agência.", image: "parques", service: "ingressos", href: "/ingressos-orlando", enabled: true, order: 5 },
  ],
  highlights: [
    { title: "Viagens de lazer", text: "Experiências que conversam com seus interesses e com o tempo que deseja dedicar à viagem.", service: "pacotes", cta: "Planejar momentos de lazer" },
    { title: "Roteiros personalizados", text: "Destinos e experiências como ponto de partida para um roteiro pensado para você.", service: "pacotes", cta: "Pensar meu roteiro" },
    { title: "Viagens em grupo", text: "Compartilhe os planos do grupo para explorar possibilidades de viagem em conjunto.", service: "pacotes", cta: "Planejar em grupo" },
  ],
  about: {
    kicker: "NOSSA HISTÓRIA", title: "JE VIAGENS, desde 2017", image: "heroVarenna",
    text: "Fundada em 2017, a JE VIAGENS atua em Santo André/SP com atendimento personalizado e experiências de viagem. A proposta reúne viagens nacionais e internacionais e coloca os interesses de quem viaja como ponto de partida para o planejamento. Cada ideia de viagem é uma oportunidade de conversar sobre preferências e sobre o que faz sentido para aquele momento.\n\nLazer, roteiros personalizados e viagens em grupo estão entre as especialidades da agência. Paisagens, cidades e experiências compõem as inspirações apresentadas aqui, sem estabelecer ofertas ou disponibilidade. O objetivo é reunir possibilidades para construir um roteiro que respeite o perfil dos viajantes e o ritmo desejado, seja para explorar o Brasil ou conhecer destinos internacionais.\n\nO suporte ao viajante faz parte da proposta da JE VIAGENS. Para conhecer o atendimento e conversar sobre seus planos, o contato público informado é jeviagens.tur.br. Os canais, horários e condições específicos são combinados diretamente com a agência; esta apresentação não acrescenta compromissos operacionais ou credenciais não informados.",
    badge: { value: "Desde 2017", label: "JE VIAGENS" }, showLocation: true,
    facts: ["Santo André/SP", "Fundada em 2017", "Atendimento personalizado"],
  },
  differentials: [
    { title: "Atendimento personalizado", text: "Uma conversa sobre seus interesses orienta as possibilidades de viagem.", icon: "consultivo" },
    { title: "Roteiros com personalidade", text: "Viagens nacionais e internacionais pensadas conforme o perfil de quem viaja.", icon: "conferido" },
    { title: "Experiências em grupo", text: "Lazer e experiências compartilhadas entre as especialidades da JE VIAGENS.", icon: "fornecedores" },
    { title: "Suporte ao viajante", text: "Orientação ao viajante, com canais e condições combinados diretamente com a agência.", icon: "acompanhamento" },
  ],
  credentials: {
    kicker: "CONHEÇA A JE VIAGENS", title: "Atendimento e trajetória",
    text: "Informações públicas da agência, sem atribuição de selos, certificados ou avaliações não confirmados.",
    items: [{ key: "fundacao", name: "Desde 2017", text: "JE VIAGENS, fundada em 2017, com atuação em Santo André/SP." }, { key: "atendimento", name: "Atendimento personalizado", text: "Viagens nacionais e internacionais, lazer, roteiros personalizados, grupos e suporte ao viajante." }],
  },
  team: [{ key: "atendimento", name: "Atendimento JE VIAGENS", role: "Atendimento personalizado", text: "Planejamento de experiências de viagem e suporte ao viajante. Contato público informado: jeviagens.tur.br." }],
  hideConciergeWhatsapp: true, hideFaqWhatsapp: true,
  conciergePoints: [
    { key: "planos", title: "1. Compartilhar seus planos", text: "Conte o que espera da viagem, quem vai viajar e quais são os seus interesses." },
    { key: "possibilidades", title: "2. Explorar possibilidades", text: "Considere destinos e experiências nacionais ou internacionais alinhados às suas preferências." },
    { key: "roteiro", title: "3. Personalizar o roteiro", text: "Converse sobre o ritmo da viagem e as escolhas importantes para o grupo." },
    { key: "suporte", title: "4. Combinar o suporte", text: "Alinhe com a JE VIAGENS os canais e as condições de atendimento ao viajante." },
  ],
  conciergeSteps: ["Compartilhe seus planos pelo contato público jeviagens.tur.br.", "Explore inspirações de viagem com atendimento personalizado.", "Converse sobre o roteiro e as experiências desejadas.", "Combine as condições e o suporte ao viajante com a agência."],
  requestCenter: { title: "Planeje sua viagem com a JE VIAGENS", support: "Conte como você imagina sua próxima experiência.", notice: "Prévia técnica: formulário demonstrativo, sem envio de dados.", submitLabel: "Revisar solicitação", titlePlacement: "above-card" },
  faq: [
    { q: "Onde a JE VIAGENS atua?", a: "A JE VIAGENS atua em Santo André/SP." },
    { q: "Quando a agência foi fundada?", a: "A JE VIAGENS foi fundada em 2017." },
    { q: "Quais são as especialidades?", a: "Viagens nacionais e internacionais, lazer, roteiros personalizados, grupos e suporte ao viajante." },
    { q: "O atendimento é personalizado?", a: "Sim. Atendimento personalizado e experiências de viagem fazem parte da proposta da JE VIAGENS." },
    { q: "Posso planejar uma viagem em grupo?", a: "Viagens em grupo estão entre as especialidades informadas pela JE VIAGENS. As condições são combinadas diretamente com a agência." },
    { q: "Como entrar em contato?", a: "O contato público informado é o site jeviagens.tur.br. Nesta prévia técnica, contatos, formulários e submissões estão bloqueados, sem vínculo de domínio." },
    { q: "Posso reservar os produtos desta apresentação?", a: "Não nesta prévia. Os catálogos e as imagens compartilhadas são inspirações, sem preços ou disponibilidade presumidos; nenhuma solicitação é enviada." },
  ],
  copy: {
    modules: { kicker: "EXPERIÊNCIAS E ROTEIROS", title: "Possibilidades para o seu próximo momento", subtitle: "Viagens nacionais e internacionais, lazer, roteiros personalizados e grupos." },
    destinations: { kicker: "DESTINOS", title: "Inspirações para viajar pelo Brasil e pelo mundo", subtitle: "Imagens do acervo compartilhado como inspiração, sem oferta ou disponibilidade presumidas." },
    highlights: { kicker: "MOMENTOS DE VIAGEM", title: "Experiências que combinam com você", subtitle: "Atendimento personalizado para lazer, roteiros e grupos." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "O cuidado da JE VIAGENS", subtitle: "Atendimento personalizado, experiências de viagem e suporte ao viajante." },
    concierge: { kicker: "ATENDIMENTO", title: "Dos seus planos ao roteiro personalizado", subtitle: "Proposta de apresentação do atendimento; condições a combinar pelo site jeviagens.tur.br." },
    avaliacoes: { kicker: "EXEMPLO DE APRESENTAÇÃO", title: "Experiências de quem viaja", subtitle: "Avaliações ilustrativas de demonstração, não são depoimentos reais nem avaliações do Google." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Conheça a JE VIAGENS" },
    newsletter: { title: "Inspirações da JE VIAGENS", subtitle: "Formulário demonstrativo, sem inscrição ou envio nesta prévia técnica." },
  },
  footer: { description: "JE VIAGENS · Santo André/SP · desde 2017. Atendimento personalizado e experiências de viagem. Contato público: jeviagens.tur.br.", phoneHidden: true, whatsappHidden: true, showLocation: true, legalLinksDisabled: true },
  seo: { title: "Prévia — JE VIAGENS", description: "Prévia técnica isolada da JE VIAGENS, em Santo André/SP, fundada em 2017. Sem envios, vínculo de domínio ou publicação." },
}, "JE VIAGENS");
if (JE_VIAGENS_PREVIEW_PROFILE.dmc) JE_VIAGENS_PREVIEW_PROFILE.dmc.cta = "Explorar Portugal";
ADS_PREVIEW_FIXTURES[JE_VIAGENS_PREVIEW_JOB_ID] = {
  jobId: JE_VIAGENS_PREVIEW_JOB_ID, info: JE_VIAGENS_PREVIEW_INFO, profile: JE_VIAGENS_PREVIEW_PROFILE,
  realAgency: true, strictBackendBlock: true,
  notice: "JE VIAGENS · prévia técnica · logotipo e vínculo de domínio pendentes · experiências ilustrativas · contatos e envios bloqueados",
  documentTitle: "Prévia — JE VIAGENS",
  pages: { resorts: { title: "Inspirações em resorts no Brasil" }, orlandoTickets: true, visa: true, xcaret: { slots: GENERIC_XCARET_SLOTS }, dmc: true, editorial: true },
};

/** Briefing 31: local presentation only. The account match stays external and
 * there is no unequivocal active public domain, so nothing is bound here.
 * No logo and colors not defined: textual wordmark + shared neutral tokens. */
export const BLESSING_PREVIEW_JOB_ID = "briefing-31-v1";
export const BLESSING_PREVIEW_HOST = "briefing-31-v1.preview.local";
export const BLESSING_PREVIEW_PATH = `/ads-briefing-preview/${BLESSING_PREVIEW_JOB_ID}`;
export const BLESSING_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad31",
  agency_slug: "", public_slug: null, hostname: BLESSING_PREVIEW_HOST, is_primary: false,
  agency_name: "Blessingtravel", owner_name: "Samantha Casellato Perrucci",
  logo_url: null, cover_image_url: null,
  // Shared wl-site-base neutral fallbacks, not an official palette.
  primary_color: "#0F1729", secondary_color: "#0F1729",
  tertiary_color: "#F6F6F8", secondary_auto: false, tertiary_auto: false,
  on_secondary_color: null, phone: null, city: "São Paulo", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};
const BLESSING_CONTACTS = "WhatsApp 11 5565-5560, e-mail samantha@blessingtravel.com.br, Instagram @agenciablessingtravel e site www.blessingtravel.com.br";
export const BLESSING_PREVIEW_PROFILE = buildGoldStandardProfile("blessingBriefing31", {
  textualWordmark: true, navDensity: "compact", cruiseSeasonInNav: false,
  heroPresentation: { kicker: "SÃO PAULO · SP · DESDE 2011", overlay: "strongLeft", titleWeight: "regular", cta: { label: "Planejar minha viagem", service: "pacotes" } },
  hero: [
    { title: "Blessingtravel", subtitle: "Consultoria completa para diferentes viagens, com planejamento para você viajar com tranquilidade.", image: "heroVarenna", enabled: true, order: 1 },
    { title: "Blessingtravel", subtitle: "Viagens sob medida para casais, famílias com crianças e grupos de amigos.", image: "parques", enabled: true, order: 2 },
    { title: "Blessingtravel", subtitle: "Europa, Estados Unidos e Canadá, América do Sul, Brasil e cruzeiros como inspiração.", image: "litoral", enabled: true, order: 3 },
  ],
  nav: [
    { label: "Início", to: "/" }, { label: "Destinos", to: "/#destinos" },
    { label: "Experiências", to: "/#assinatura", children: [
      { label: "Resorts no Brasil", to: "/resorts-brasil" }, { label: "Club Med e neve", to: "/club-med-neve" },
      { label: "Xcaret", to: "/xcaret" }, { label: "Orlando", to: "/ingressos-orlando" },
      { label: "Cruzeiros", to: "/#autoridade" }, { label: "Visto americano", to: "/visto-americano" },
      { label: "Portugal · inspiração", to: "/dmc-portugal" },
    ] },
    { label: "Sobre", to: "/#sobre" }, { label: "Atendimento", to: "/#atendimento" },
    { label: "Inspirações", to: "/ofertas" }, { label: "Blog", to: "/blog" },
  ],
  signature: {
    kicker: "O JEITO BLESSINGTRAVEL DE PLANEJAR", title: "Planejamento completo para viajar com tranquilidade",
    text: "A Blessingtravel atua em São Paulo/SP desde 2011 com consultoria completa para diferentes viagens. Viagens sob medida, cruzeiros, famílias e parques estão entre as especialidades de uma proposta que une roteiros personalizados e planejamento detalhado.",
    continuation: { title: "Atendimento por quem planeja", text: "O atendimento é feito pela proprietária e especialista, com suporte durante a viagem. Casais, famílias com crianças e grupos de amigos encontram aqui inspirações para conversar sobre o próximo roteiro." },
  },
  modules: [
    { key: "sob-medida", title: "Viagens sob medida", text: "Roteiros personalizados construídos a partir do perfil e do ritmo de quem viaja.", service: "pacotes", image: "heroVarenna", enabled: true, order: 1 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Navios e roteiros do catálogo compartilhado como inspiração, sem disponibilidade presumida.", service: "cruzeiros", image: "litoral", enabled: true, order: 2 },
    { key: "familias", title: "Famílias com crianças", text: "Planejamento detalhado para viagens em família, com atenção a cada etapa.", service: "pacotes", image: "resort", enabled: true, order: 3 },
    { key: "parques", title: "Parques", text: "Orlando e outros parques como inspiração editorial; condições a confirmar com a agência.", service: "ingressos", image: "parques", enabled: true, order: 4 },
    { key: "casais", title: "Viagens a dois", text: "Ideias para casais, da Itália ao Caribe, como ponto de partida para a conversa.", service: "pacotes", image: "europa", enabled: true, order: 5 },
    { key: "grupos", title: "Grupos de amigos", text: "Inspirações para viajar em grupo, respeitando as preferências de todos.", service: "pacotes", image: "brasil", enabled: true, order: 6 },
  ],
  destinations: [
    { key: "europa", title: "Europa", label: "Ex.: Itália", text: "Cidades e paisagens europeias como inspiração para roteiros personalizados.", image: "heroVarenna", service: "pacotes", enabled: true, order: 1 },
    { key: "eua-canada", title: "Estados Unidos e Canadá", label: "Ex.: Orlando", text: "Parques e cidades da América do Norte como possibilidades de viagem.", image: "parques", service: "ingressos", href: "/ingressos-orlando", enabled: true, order: 2 },
    { key: "america-sul", title: "América do Sul", label: "Inspiração", text: "Paisagens sul-americanas como ideia de roteiro, sem oferta presumida.", image: "europa", service: "pacotes", enabled: true, order: 3 },
    { key: "brasil", title: "Brasil", label: "Ex.: resorts no Nordeste", text: "Explore o catálogo compartilhado de resorts como inspiração.", image: "resort", service: "hospedagem", href: "/resorts-brasil", ctaLabel: "Ver resorts", enabled: true, order: 4 },
    { key: "cruzeiros", title: "Cruzeiros", label: "Ex.: Caribe", text: "Roteiros marítimos como inspiração; condições a confirmar com a agência.", image: "litoral", service: "cruzeiros", enabled: true, order: 5 },
  ],
  highlights: [
    { title: "Viagens sob medida", text: "Roteiros personalizados para o seu momento.", service: "pacotes", cta: "Pensar meu roteiro" },
    { title: "Famílias e parques", text: "Planejamento detalhado para viajar com crianças.", service: "ingressos", cta: "Planejar em família" },
    { title: "Cruzeiros", text: "Inspirações a bordo para casais, famílias e grupos.", service: "cruzeiros", cta: "Conversar sobre cruzeiros" },
  ],
  about: {
    kicker: "NOSSA HISTÓRIA", title: "Blessingtravel, desde 2011", image: "heroVarenna",
    text: "A Blessingtravel nasceu da paixão de sua fundadora pelo universo das viagens. Fundada em 2011 em São Paulo/SP, a agência oferece consultoria completa para diferentes viagens, com planejamento pensado para que cada cliente viaje com tranquilidade.\n\nSão 23 anos de experiência no turismo, com consultoria especializada, experiências personalizadas e cuidado em cada detalhe. Viagens sob medida, cruzeiros, famílias e parques estão entre as especialidades, para casais, famílias com crianças e grupos de amigos.\n\nO suporte durante a viagem faz parte do atendimento: em um dos casos compartilhados pela agência, uma cliente recebeu suporte remoto no aeroporto de Roma para localizar a área de embarque. Os canais públicos informados são " + BLESSING_CONTACTS + ".",
    badge: { value: "Desde 2011", label: "Blessingtravel" }, showLocation: true,
    facts: ["São Paulo/SP", "Fundada em 2011", "23 anos de experiência no turismo"],
  },
  differentials: [
    { title: "Atendimento pela especialista", text: "Atendimento feito pela proprietária e especialista.", icon: "consultivo" },
    { title: "Roteiros personalizados", text: "Viagens pensadas conforme o perfil de quem viaja.", icon: "conferido" },
    { title: "Planejamento detalhado", text: "Cuidado em cada detalhe, do planejamento ao embarque.", icon: "fornecedores" },
    { title: "Suporte durante a viagem", text: "Como no suporte remoto a uma cliente no aeroporto de Roma.", icon: "acompanhamento" },
  ],
  credentials: {
    kicker: "CONHEÇA A BLESSINGTRAVEL", title: "Atendimento e trajetória",
    text: "Informações públicas da agência, sem atribuição de selos, certificados ou avaliações não confirmados.",
    items: [{ key: "fundacao", name: "Desde 2011", text: "Blessingtravel, fundada em 2011, em São Paulo/SP." }, { key: "experiencia", name: "23 anos no turismo", text: "Consultoria especializada, experiências personalizadas e cuidado em cada detalhe." }],
  },
  team: [{ key: "samantha", name: "Samantha Casellato Perrucci", role: "Fundadora e consultora", text: "Consultoria especializada e atendimento direto. Contatos públicos: " + BLESSING_CONTACTS + "." }],
  hideConciergeWhatsapp: true, hideFaqWhatsapp: true,
  conciergePoints: [
    { key: "conversa", title: "1. Conversar sobre a viagem", text: "Conte quem vai viajar, seus interesses e o ritmo desejado." },
    { key: "roteiro", title: "2. Roteiro sob medida", text: "A especialista organiza as possibilidades em um roteiro personalizado." },
    { key: "detalhes", title: "3. Planejamento detalhado", text: "Cada etapa é revisada com cuidado antes do embarque." },
    { key: "suporte", title: "4. Suporte durante a viagem", text: "Canais e condições do suporte combinados diretamente com a agência." },
  ],
  conciergeSteps: ["Compartilhe seus planos pelos canais públicos da agência.", "Converse com a especialista sobre destinos e estilo de viagem.", "Receba um roteiro personalizado e detalhado.", "Combine o suporte durante a viagem com a agência."],
  requestCenter: { title: "Planeje sua viagem com a Blessingtravel", support: "Conte como você imagina sua próxima viagem.", notice: "Prévia técnica: formulário demonstrativo, sem envio de dados.", submitLabel: "Revisar solicitação", titlePlacement: "above-card" },
  faq: [
    { q: "Onde a Blessingtravel atua?", a: "A Blessingtravel está em São Paulo/SP." },
    { q: "Quando a agência foi fundada?", a: "A Blessingtravel foi fundada em 2011; a fundadora soma 23 anos de experiência no turismo." },
    { q: "Quais são as especialidades?", a: "Viagens sob medida, cruzeiros, famílias e parques." },
    { q: "Quem faz o atendimento?", a: "O atendimento é feito pela proprietária e especialista, Samantha Casellato Perrucci, fundadora e consultora." },
    { q: "Há suporte durante a viagem?", a: "Sim. O suporte durante a viagem faz parte dos diferenciais informados pela agência; as condições são combinadas diretamente com ela." },
    { q: "Como entrar em contato?", a: "Canais públicos: " + BLESSING_CONTACTS + ". Nesta prévia técnica, contatos, formulários e envios estão bloqueados." },
    { q: "Posso reservar os produtos desta apresentação?", a: "Não nesta prévia. Catálogos e imagens compartilhadas são inspirações, sem preços ou disponibilidade presumidos." },
  ],
  copy: {
    modules: { kicker: "ESPECIALIDADES", title: "Viagens pensadas para cada perfil", subtitle: "Sob medida, cruzeiros, famílias e parques." },
    destinations: { kicker: "DESTINOS", title: "Inspirações pelo Brasil e pelo mundo", subtitle: "Imagens do acervo compartilhado como inspiração, sem oferta ou disponibilidade presumidas." },
    highlights: { kicker: "MOMENTOS DE VIAGEM", title: "Experiências que combinam com você", subtitle: "Para casais, famílias com crianças e grupos de amigos." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "O cuidado da Blessingtravel", subtitle: "Especialista, roteiros personalizados, suporte e planejamento detalhado." },
    concierge: { kicker: "ATENDIMENTO", title: "Da conversa ao embarque", subtitle: "Proposta de apresentação do atendimento; condições a combinar com a agência." },
    avaliacoes: { kicker: "EXEMPLO DE APRESENTAÇÃO", title: "Experiências de quem viaja", subtitle: "Avaliações ilustrativas de demonstração, não são depoimentos reais nem avaliações do Google." },
    faq: { kicker: "DÚVIDAS FREQUENTES", title: "Conheça a Blessingtravel" },
    newsletter: { title: "Inspirações da Blessingtravel", subtitle: "Formulário demonstrativo, sem inscrição ou envio nesta prévia técnica." },
  },
  footer: { description: "Blessingtravel Viagens e Turismo Ltda · São Paulo/SP · desde 2011. Consultoria completa para diferentes viagens.", phoneHidden: true, whatsappHidden: true, showLocation: true, legalLinksDisabled: true },
  seo: { title: "Prévia — Blessingtravel", description: "Prévia técnica isolada da Blessingtravel, em São Paulo/SP, fundada em 2011. Sem envios, vínculo de domínio ou publicação." },
}, "Blessingtravel");
if (BLESSING_PREVIEW_PROFILE.dmc) BLESSING_PREVIEW_PROFILE.dmc.cta = "Explorar Portugal";
ADS_PREVIEW_FIXTURES[BLESSING_PREVIEW_JOB_ID] = {
  jobId: BLESSING_PREVIEW_JOB_ID, info: BLESSING_PREVIEW_INFO, profile: BLESSING_PREVIEW_PROFILE,
  realAgency: true, strictBackendBlock: true,
  notice: "Blessingtravel · prévia técnica · logotipo, cores e vínculo de cadastro/domínio pendentes · conteúdos ilustrativos · contatos e envios bloqueados",
  documentTitle: "Prévia — Blessingtravel",
  pages: { resorts: { title: "Inspirações em resorts no Brasil" }, orlandoTickets: true, visa: true, xcaret: { slots: GENERIC_XCARET_SLOTS }, dmc: true, editorial: true },
};
