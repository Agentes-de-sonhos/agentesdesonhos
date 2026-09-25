/**
 * Perfis editoriais dos sites White Label.
 *
 * Separação explícita de responsabilidades:
 *   1. PERFIL (este arquivo) — quais seções existem, em que ordem e com qual conteúdo;
 *   2. TEMA (`agencySiteTheme.ts`) — tokens, fontes, cores e acabamento;
 *   3. DADOS REAIS da agência — sempre vindos do cadastro (`AgencyDomainInfo`).
 *
 * A engine (`AgencySiteHome`) é única e compartilhada: ela consome o perfil
 * resolvido pelo hostname e nunca contém condicionais de domínio no JSX.
 */
import xcaretPanorama from "@/assets/whitelabel/xcaret/xcaret-panorama.webp.asset.json";
import julianaXcaretAtXplor from "@/assets/whitelabel/xcaret/juliana-xplor-sign.webp.asset.json";
import xpertsXcaretBadge from "@/assets/whitelabel/xcaret/xperts-xcaret-badge.webp.asset.json";
import destinosXcaretCover from "@/assets/whitelabel/destinos-xcaret-capa.png.asset.json";
import xcaretSnorkel from "@/assets/whitelabel/xcaret/xcaret-snorkel.webp.asset.json";
import xcaretXoximilco from "@/assets/whitelabel/xcaret/xoximilco.webp.asset.json";
import destinosStorefrontFront from "@/assets/whitelabel/destinos-com-a-ju/storefront-front-v2.png.asset.json";
import {
  type AgencyDestination,
  type AgencyDifferential,
  type AgencyDmcConfig,
  type AgencyHeroSlide,
  type AgencyHighlight,
  type AgencyImageSlot,
  type AgencyModule,
  type AgencySectionKey,
  type AgencySectionOverride,
} from "@/lib/agencySiteConfig";
import { sitelabSectionOverrides } from "@/lib/agencySiteCatalog";

export type AgencySiteProfileKey =
  | "classic"
  | "editorialDmc"
  | "luxuryCurated"
  | "editorialRose"
  | "faeCurated"
  /** Casa Nova Tur — viagens planejadas com acompanhamento (Novo Hamburgo/RS). */
  | "casaNovaCurated"
  /** Essyatur — atendimento próximo, famílias/parques, luxo (São Paulo/SP). */
  | "essyaCurated"
  /** Laboratório visual neutro (SiteLab Base): estrutura editorial, conteúdo demo. */
  | "siteLabBase";

/** Seção editorial curta de posicionamento (genérica, reutilizável). */
export interface AgencySignatureContent {
  kicker: string;
  title: string;
  text: string;
}

/** Associações, selos e credenciais verificadas (nunca inventadas). */
export interface AgencyCredentialsContent {
  kicker: string;
  title: string;
  text: string;
  items: { key: string; name: string; text: string }[];
}

export interface AgencySectionCopy {
  kicker?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  /**
   * Superfície opcional da seção. Ausente preserva o fundo padrão de marca;
   * "navy" reaproveita o azul editorial já usado na seção de cruzeiros.
   */
  surface?: "navy";
  /** Mantém o título em uma única linha em telas largas. */
  titleSingleLine?: boolean;
}


export interface AgencyAuthorityContent {
  kicker: string;
  title: string;
  paragraphs: string[];
  cta: string;
  service: string;
  image?: AgencyImageSlot;
  /** Vídeo editorial opcional; ausente preserva a imagem compartilhada. */
  video?: "disneyWishCruise";
}

export interface AgencyFooterContent {
  description?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  instagramLabel?: string;
  address?: string;
  legalName?: string;
  cnpj?: string;
  /** Exibe a cidade/UF do cadastro quando não há endereço editorial. */
  showLocation?: boolean;
}

export interface AgencyHeroPresentation {
  kicker?: string;
  cta?: { label: string; service: string };
  /** Respeita quebras explícitas no título sem impor nowrap aos demais slides. */
  preserveTitleLineBreaks?: boolean;
  /** Posicionamento opcional do CTA e da navegação; o padrão permanece inline. */
  actionsPlacement?: "inline" | "right";
}

export interface AgencySiteProfile {
  key: AgencySiteProfileKey;
  /** Menu próprio do perfil (substitui o menu padrão quando definido). */
  nav?: { label: string; to: string }[];
  /** Reduz o intervalo entre links quando o menu editorial tem mais itens. */
  navDensity?: "default" | "compact";
  /**
   * Perfil DEMONSTRATIVO (laboratório): libera conteúdo de exemplo em seções
   * normalmente condicionadas a dados reais e ativa a chrome do catálogo.
   * Nenhum tenant real usa esta marcação.
   */
  demo?: boolean;
  /** Ativa/oculta/reordena seções sobre os defaults compartilhados. */
  sections?: Partial<Record<AgencySectionKey, AgencySectionOverride>>;
  /** Conteúdo B2B/DMC do próprio perfil (tenants reais resolvem por hostname). */
  dmc?: AgencyDmcConfig;
  /** Equipe/consultores apresentados na seção "team". */
  team?: { key: string; name: string; role: string; text: string }[];
  /** Depoimentos publicados na seção "testimonials". */
  testimonials?: { key: string; quote: string; author: string; context?: string }[];
  /** Pontos do atendimento humano exibidos na seção "concierge". */
  conciergePoints?: { key: string; title: string; text: string }[];
  hero?: AgencyHeroSlide[];
  /** Apresentação opcional do hero; ausente preserva os fallbacks da engine. */
  heroPresentation?: AgencyHeroPresentation;
  /** Rótulo opcional do WhatsApp no concierge (fallback compartilhado intacto). */
  conciergeWhatsappLabel?: string;
  /** Slot de imagem de fallback do hero (resolvido na apresentação). */
  heroImage?: string;
  destinations?: AgencyDestination[];
  modules?: AgencyModule[];
  highlights?: AgencyHighlight[];
  differentials?: AgencyDifferential[];
  faq?: { q: string; a: string }[];
  signature?: AgencySignatureContent;
  authority?: AgencyAuthorityContent;
  seo?: { title: string; description: string; canonical?: string };
  reviewsCopy?: { kicker: string; title: string; subtitle: string };
  footer?: AgencyFooterContent;
  credentials?: AgencyCredentialsContent;
  /** Títulos/subtítulos por seção (fallback: textos padrão da engine). */
  copy?: Partial<Record<AgencySectionKey, AgencySectionCopy>>;
  /** Overrides de texto para a Central de Solicitações. */
  requestCenter?: {
    title?: string;
    support?: string;
    notice?: string;
    submitLabel?: string;
    /** Onde o título aparece; o padrão mantém título e apoio dentro do card. */
    titlePlacement?: "inside-card" | "above-card";
  };
  /** Conteúdo institucional da seção "about" quando o perfil define a redação. */
  about?: {
    kicker?: string;
    title?: string;
    text?: string;
    image?: AgencyImageSlot;
    images?: { src: string; alt: string; position?: string }[];
    /** Selo tipográfico factual (ex.: "Desde 1997") com apoio curto. */
    badge?: { value: string; label?: string };
    /** Fatos institucionais confirmados, apresentados separadamente. */
    facts?: string[];
    /** Oculta o painel de imagem quando não existe retrato real autorizado. */
    media?: "default" | "hidden";
    /** Exibe a cidade/UF do cadastro sob o texto institucional. */
    showLocation?: boolean;
  };
  /** Etapas opcionais do atendimento; ausente mantém os quatro textos atuais. */
  conciergeSteps?: string[];
  /** "Experiência em destaque": quando ativa, ocupa a posição da seção "modules". */
  featuredExperience?: AgencyFeaturedExperience;
}

export interface AgencyFeaturedImage {
  src: string;
  alt: string;
  position?: string;
  /** "contain" preserva montagens completas; ausente mantém o recorte padrão. */
  fit?: "cover" | "contain";
}
export interface AgencyFeaturedExperience {
  enabled: boolean;
  id?: string;
  kicker?: string;
  title: string;
  description: string;
  mainImage: AgencyFeaturedImage;
  consultantImage?: AgencyFeaturedImage | null;
  badge?: AgencyFeaturedImage | null;
  secondaryImages?: AgencyFeaturedImage[];
  highlights?: string[];
  ctaLabel?: string;
  /** URL da landing; null mantém o botão inativo, sem link fictício. */
  ctaHref?: string | null;
  align?: "left" | "right";
}

/* ------------------------------ PERFIS ------------------------------ */

const CLASSIC: AgencySiteProfile = { key: "classic" };

/** 100 Limites — consultoria global para passageiros e DMC em Portugal. */
const EDITORIAL_DMC: AgencySiteProfile = {
  key: "editorialDmc",
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Viagens", to: "/#destaques" },
    { label: "Para agências", to: "/#dmc-agencias" },
    { label: "Ofertas", to: "/ofertas" },
    { label: "Sobre", to: "/#sobre" },
    { label: "Dúvidas", to: "/#faq" },
  ],
  navDensity: "compact",
  sections: {
    dmc: { enabled: true, order: 0 },
    destinations: { order: 2 },
    highlights: { order: 3 },
    modules: { enabled: false },
    about: { order: 5 },
    differentials: { order: 6 },
    concierge: { order: 7 },
    faq: { order: 10 },
  },
  hero: [
    {
      title: "Seu próximo destino, com uma viagem feita para você",
      subtitle: "Viagens pelo Brasil e pelo mundo, com planejamento cuidadoso e o melhor equilíbrio entre experiência e investimento.",
      image: "brasil",
      order: 1,
      enabled: true,
    },
    {
      title: "Em família, a dois ou entre amigos",
      subtitle: "Roteiros pensados para o seu momento, com hospedagens, passeios e deslocamentos organizados no seu ritmo.",
      image: "parques",
      order: 2,
      enabled: true,
    },
    {
      title: "Atendimento próximo em cada etapa da viagem",
      subtitle: "Conte com Amanda Larini para planejar, esclarecer dúvidas e acompanhar sua viagem, do primeiro contato ao retorno.",
      image: "europa",
      order: 3,
      enabled: true,
    },
  ],
  heroPresentation: {
    kicker: "VIAGENS PERSONALIZADAS · BRASIL E MUNDO",
  },
  requestCenter: {
    notice: "Cada solicitação é analisada pela Amanda, considerando seu perfil, suas preferências e o investimento que você deseja fazer.",
  },
  destinations: [
    { key: "brasil-nordeste", image: "brasil", label: "Brasil", title: "Brasil e Nordeste", text: "Praias, natureza e cultura em diferentes regiões do país.", service: "pacotes", enabled: true, order: 1 },
    { key: "europa-portugal", image: "europa", label: "Europa", title: "Europa e Portugal", text: "Cidades, paisagens e experiências com deslocamentos bem planejados.", service: "pacotes", enabled: true, order: 2 },
    { key: "orlando-parques", image: "parques", label: "Família", title: "Orlando e parques", text: "Parques, ingressos, hospedagem e deslocamentos organizados no seu ritmo.", service: "ingressos", enabled: true, order: 3 },
    { key: "caribe-mexico", image: "litoral", label: "Caribe", title: "Caribe e México", text: "Praias, resorts e experiências escolhidas para o seu perfil.", service: "pacotes", enabled: true, order: 4 },
    { key: "america-sul", image: "safari", label: "América do Sul", title: "América do Sul", text: "Cultura, gastronomia e grandes paisagens perto de casa.", service: "pacotes", enabled: true, order: 5 },
  ],
  highlights: [
    { title: "Viagens em família", text: "Hospedagens, passeios e deslocamentos pensados para diferentes idades, com atenção ao conforto e ao ritmo da família.", service: "pacotes", cta: "Planejar em família" },
    { title: "Lua de mel", text: "Uma viagem para celebrar a dois, com destinos e experiências escolhidos conforme os seus desejos.", service: "pacotes", cta: "Planejar nossa viagem" },
    { title: "Entre amigos", text: "Preferências combinadas e logística organizada para aproveitar a viagem com quem faz parte da sua história.", service: "pacotes", cta: "Planejar com amigos" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Conheça Amanda Larini",
    text: "À frente da 100 Limites desde 2015, Amanda Larini reúne mais de 20 anos de experiência no turismo e acompanha de perto o planejamento de cada cliente.\n\nSeu trabalho começa pela escuta: entender os gostos, as expectativas e o investimento de quem vai viajar para organizar uma experiência que faça sentido do início ao fim.\n\nHoje, vivendo em Lisboa, Amanda continua atendendo passageiros com viagens pelo Brasil e pelo mundo. Em Portugal, também atua como parceira de agências brasileiras, oferecendo serviços receptivos e apoio local aos seus clientes.",
    facts: ["100 Limites desde 2015", "Mais de 20 anos de experiência da Amanda no turismo"],
    media: "hidden",
  },
  differentials: [
    { title: "Atendimento com a Amanda", text: "Seu planejamento é acompanhado por quem conhece suas preferências e participa das decisões com você.", icon: "consultivo" },
    { title: "Reservas reconfirmadas", text: "Conferência dos serviços contratados, pagamentos e detalhes importantes antes da viagem.", icon: "conferido" },
    { title: "Preparação antes do embarque", text: "Roteiro personalizado e reunião online para revisar a programação e esclarecer dúvidas.", icon: "fornecedores" },
    { title: "Acompanhamento durante a viagem", text: "Apoio para orientações e imprevistos, com continuidade no atendimento até o retorno.", icon: "acompanhamento" },
  ],
  conciergeWhatsappLabel: "Falar com a Amanda",
  conciergeSteps: [
    "Conte sua ideia, suas preferências e o investimento previsto.",
    "Receba uma proposta personalizada e ajuste os detalhes com a Amanda.",
    "Confirme os serviços e prepare o embarque com as orientações da agência.",
    "Consulte os documentos disponibilizados na Área do Cliente e conte com acompanhamento durante a viagem.",
  ],
  faq: [
    { q: "Vocês organizam viagens apenas para Portugal?", a: "Não. A 100 Limites planeja viagens para destinos no Brasil e no mundo, conforme o perfil e as preferências de cada cliente." },
    { q: "O atendimento pode ser feito online?", a: "Sim. O atendimento acontece por WhatsApp, e-mail e videochamada, permitindo organizar sua viagem de onde você estiver." },
    { q: "Posso contratar serviços separados?", a: "Sim. Você pode solicitar serviços como passagens, hospedagem, transfers, ingressos e seguro, ou planejar uma viagem completa." },
    { q: "Sou agente de viagens. Como solicito serviços em Portugal?", a: "Acesse a seção ‘Sua DMC em Portugal’ e clique em ‘Solicitar cotação para minha agência’. Informe os dados da viagem e os serviços desejados." },
    { q: "A Amanda acompanha pessoalmente os passeios?", a: "O acompanhamento pode ser organizado conforme o roteiro, o serviço contratado e a disponibilidade. Essa condição é combinada na proposta." },
    { q: "Como acompanho a minha viagem depois de fechar?", a: "Os documentos disponibilizados pela agência ficam reunidos na Área do Cliente para consulta durante a sua viagem." },
  ],
  footer: {
    description: "Viagens pelo Brasil e pelo mundo. DMC em Portugal para agências parceiras.\nAtendimento online com Amanda Larini.",
    showLocation: false,
  },
  copy: {
    destinations: {
      title: "Descubra o seu próximo destino",
      subtitle: "Algumas inspirações para começar. Seu próximo destino pode estar aqui ou em qualquer outro lugar do mundo.",
    },
    highlights: {
      title: "Uma viagem para cada momento",
      subtitle: "O planejamento acompanha o seu jeito de viajar e as pessoas que vão com você.",
    },
    differentials: {
      title: "Como cuidamos da sua viagem",
    },
    concierge: {
      kicker: "ATENDIMENTO PERSONALIZADO",
      title: "Vamos planejar sua próxima viagem?",
      subtitle: "Conte para a Amanda para onde você quer ir, com quem pretende viajar e o que espera dessa experiência. A partir disso, vocês constroem uma proposta alinhada ao seu perfil.",
      cta: "Solicitar atendimento",
    },
    faq: { title: "Perguntas frequentes" },
  },
};

/** Paraíso Viagens — curadoria de luxo, sem DMC e sem depoimentos. */
const LUXURY_CURATED: AgencySiteProfile = {
  key: "luxuryCurated",
  sections: {
    dmc: { enabled: false },
    testimonials: { enabled: false },
    team: { enabled: false },
    signature: { enabled: true, order: 1 },
    destinations: { order: 2 },
    modules: { order: 3 },
    highlights: { order: 4 },
    differentials: { order: 5 },
    about: { order: 6 },
    credentials: { enabled: true, order: 7 },
    concierge: { order: 8 },
    faq: { order: 9 },
    newsletter: { order: 10 },
    // Ofertas reais continuam possíveis, mas nunca lideram a página de luxo.
    offers: { order: 11 },
  },
  heroImage: "luxo",
  hero: [
    {
      title: "Viagens extraordinárias começam nos detalhes",
      subtitle:
        "Roteiros personalizados, hotéis excepcionais e experiências escolhidas para a sua forma de viajar.",
      order: 1,
      enabled: true,
    },
    {
      title: "O mundo, vivido do seu jeito",
      subtitle:
        "Da natureza selvagem à alta gastronomia, cada jornada nasce de uma curadoria atenta.",
      order: 2,
      enabled: true,
    },
    {
      title: "Planejamento próximo. Experiências memoráveis.",
      subtitle:
        "Conte o que você imagina. A {agency} cuida de transformar desejos em uma viagem bem desenhada.",
      order: 3,
      enabled: true,
    },
  ],
  signature: {
    kicker: "CURADORIA PARAÍSO",
    title: "O verdadeiro luxo está em cada detalhe da viagem.",
    text:
      "Mais do que escolher lugares, criamos conexões entre o seu momento, o seu estilo e experiências que realmente fazem sentido.",
  },
  destinations: [
    { key: "safari", image: "safari", label: "Natureza", title: "Safáris e natureza extraordinária", text: "Botsuana é uma das referências desse repertório: acampamentos com poucas acomodações, guias experientes e encontros que não se repetem.", service: "pacotes", enabled: true, order: 1 },
    { key: "douro", image: "douro", label: "Cultura e gastronomia", title: "Europa com cultura e gastronomia", text: "Do Vale do Douro às cidades históricas: vinhos, mesas memoráveis e um ritmo de viagem pensado com calma.", service: "pacotes", enabled: true, order: 2 },
    { key: "cruzeiros-premium", image: "cruzeiro", label: "Navegação", title: "Cruzeiros premium e expedições", text: "Navios menores, itinerários bem escolhidos e expedições para quem quer ir além do roteiro comum.", service: "cruzeiros", enabled: true, order: 3 },
    { key: "villas", image: "villa", label: "Hospedagem", title: "Hotéis, resorts e villas excepcionais", text: "Endereços selecionados por localização, serviço e atmosfera — não por catálogo.", service: "hospedagem", enabled: true, order: 4 },
    { key: "brasil", image: "brasil", label: "Brasil", title: "Brasil sofisticado", text: "Vilas de praia, pousadas autorais e experiências brasileiras com o mesmo cuidado de uma viagem internacional.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "hoteis-villas", title: "Hotéis, resorts e villas", text: "Seleção criteriosa de endereços, com o serviço e a atmosfera conferidos antes de indicar.", service: "hospedagem", image: "villa", enabled: true, order: 1 },
    { key: "safaris", title: "Safáris e natureza", text: "Jornadas de natureza planejadas com parceiros especializados e ritmo confortável.", service: "pacotes", image: "safari", enabled: true, order: 2 },
    { key: "cruzeiros-expedicoes", title: "Cruzeiros premium e expedições", text: "Itinerários, cabines e categorias explicados com transparência.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 3 },
    { key: "gastronomia", title: "Gastronomia e vinhos", text: "Mesas, vinícolas e experiências que valem uma viagem inteira.", service: "pacotes", image: "gastronomia", enabled: true, order: 4 },
    { key: "celebracoes", title: "Lua de mel e celebrações", text: "Momentos marcantes organizados com discrição e atenção aos detalhes.", service: "pacotes", image: "luademel", enabled: true, order: 5 },
    { key: "familia-conforto", title: "Viagens em família com conforto", text: "Roteiros equilibrados para diferentes idades, sem abrir mão do conforto.", service: "pacotes", image: "brasil", enabled: true, order: 6 },
    { key: "europa-personalizada", title: "Europa personalizada", text: "Cidades, campo e vinhedos combinados no seu tempo.", service: "pacotes", image: "douro", enabled: true, order: 7 },
    { key: "parques-orlando", title: "Parques e Orlando", text: "Planejamento completo de parques, ingressos, hotéis e deslocamentos.", service: "ingressos", image: "parques", enabled: true, order: 8 },
  ],
  highlights: [
    { title: "Roteiros desenhados para cada viajante", text: "O ponto de partida é sempre o seu momento, o seu estilo e o tempo que você tem.", service: "pacotes", cta: "Começar a planejar" },
    { title: "Seleção criteriosa de hospedagens", text: "Indicamos endereços que conhecemos ou avaliamos com critério, explicando o porquê de cada escolha.", service: "hospedagem", cta: "Falar sobre hospedagem" },
    { title: "Parceiros especializados", text: "Operadoras, receptivos e guias escolhidos pela especialidade em cada destino.", service: "pacotes", cta: "Solicitar proposta" },
  ],
  differentials: [
    { title: "Roteiros desenhados para cada viajante", text: "Nada de modelo pronto: a viagem nasce da conversa e do seu repertório.", icon: "consultivo" },
    { title: "Seleção criteriosa de hospedagens", text: "Localização, serviço e atmosfera avaliados antes de qualquer indicação.", icon: "conferido" },
    { title: "Parceiros especializados", text: "Fornecedores escolhidos pela especialidade local, não por volume.", icon: "fornecedores" },
    { title: "Cuidado antes, durante e depois da viagem", text: "Acompanhamento em cada etapa, do planejamento ao retorno.", icon: "acompanhamento" },
  ],
  about: {
    kicker: "QUEM DESENHA A SUA VIAGEM",
    title: "Uma trajetória construída desde 2011.",
    text:
      "À frente da Paraíso, Mariana e Daniela unem repertório, escuta e cuidado para desenhar viagens personalizadas.",
    image: "villa",
    badge: { value: "Desde 2011", label: "Experiência e cuidado em cada etapa." },
  },
  credentials: {
    kicker: "CREDENCIAIS E CONEXÕES",
    title: "Uma rede que amplia o repertório da curadoria.",
    text:
      "A Paraíso integra a comunidade Luxperts, que reúne agências brasileiras selecionadas e conectadas ao turismo de luxo.",
    items: [
      {
        key: "luxperts",
        name: "Luxperts",
        text: "Comunidade de agências brasileiras selecionadas, conectadas ao turismo de luxo.",
      },
    ],
  },
  faq: [
    {
      q: "O que torna uma viagem personalizada?",
      a: "A viagem parte do seu contexto: quem viaja, quanto tempo tem, o que quer viver e o que prefere evitar. A partir disso desenhamos roteiro, hospedagens e experiências, explicando cada escolha.",
    },
    {
      q: "A Paraíso também organiza viagens em família e resorts?",
      a: "Sim. Além de roteiros autorais, planejamos viagens em família, resorts e destinos tradicionais, sempre com o mesmo critério de seleção e acompanhamento.",
    },
    {
      q: "É possível solicitar apenas aéreo ou hospedagem?",
      a: "Sim. Você pode solicitar um serviço isolado — aéreo, hospedagem, transfer, seguro, ingressos — ou o planejamento completo da viagem.",
    },
    {
      q: "Como funciona o atendimento e o acompanhamento?",
      a: "Você envia a sua solicitação pela Central, conversamos para entender os detalhes e apresentamos uma proposta clara. Confirmada a viagem, seguimos acompanhando antes, durante e depois.",
    },
    {
      q: "Como começo a planejar?",
      a: "Basta enviar uma solicitação pela Central ou falar pelo WhatsApp com o que você já imagina. A partir daí conduzimos o planejamento com você.",
    },
  ],
  copy: {
    destinations: {
      title: "Inspirações para viajar além do óbvio",
      subtitle:
        "Referências editoriais que guiam a nossa curadoria. Escolha uma e conversamos sobre como ela pode virar a sua viagem.",
    },
    modules: {
      title: "Coleções de experiências",
      subtitle: "Temas que acompanhamos de perto. Escolha um e conte o que você imagina.",
    },
    highlights: {
      title: "A curadoria Paraíso",
      subtitle: "Três princípios que orientam cada viagem que desenhamos.",
    },
    differentials: {
      title: "Como cuidamos de cada viagem",
      subtitle: "O que sustenta a experiência, do primeiro contato ao retorno.",
    },
    concierge: {
      kicker: "ATENDIMENTO PRÓXIMO",
      title: "Um consultor dedicado à sua viagem",
      subtitle:
        "Conversamos, entendemos o seu momento e desenhamos as opções. Você decide com todas as informações à mão.",
      cta: "Planeje sua viagem",
    },
    newsletter: {
      kicker: "INSPIRAÇÕES",
      title: "Receba inspirações para a sua próxima viagem",
      subtitle:
        "Deixe o seu contato e o canal preferido: enviamos ideias de destinos e experiências alinhadas ao seu estilo de viajar.",
      cta: "Quero receber inspirações",
    },
    faq: {
      title: "Perguntas frequentes",
    },
  },
};

/**
 * Destinos com a Ju — MESMA estrutura editorial aprovada (nenhum override de
 * seção): apenas o tema muda. Conteúdo exclusivo (DMC) nunca é herdado, pois é
 * resolvido por hostname em `resolveDmc`.
 */
const EDITORIAL_ROSE: AgencySiteProfile = {
  key: "editorialRose",
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Experiências", to: "/#campanhas" },
    { label: "Cruzeiros", to: "/#autoridade" },
    { label: "Xcaret", to: "/xcaret" },
    { label: "Ofertas", to: "/ofertas" },
    { label: "Sobre", to: "/#sobre" },
    { label: "Avaliações", to: "/#avaliacoes" },
  ],
  sections: {
    dmc: { enabled: false }, testimonials: { enabled: false }, team: { enabled: false },
    credentials: { enabled: false }, highlights: { enabled: false },
    signature: { enabled: true, order: 1 }, destinations: { order: 2 }, modules: { order: 3 },
    authority: { enabled: true, order: 4 }, about: { order: 5 }, differentials: { order: 6 },
    concierge: { order: 7 }, avaliacoes: { enabled: true, order: 8 }, faq: { order: 9 },
    newsletter: { order: 10 }, offers: { order: 11 },
  },
  seo: {
    title: "Destinos com a Ju | Viagens Personalizadas, Orlando, Europa e Cruzeiros",
    description: "Consultoria completa para viagens personalizadas, Orlando, Europa, cruzeiros, Caribe e resorts, com suporte antes, durante e depois.",
    canonical: "https://www.destinoscomaju.com.br/",
  },
  heroImage: "europa",
  heroPresentation: {
    kicker: "CONSULTORIA DE VIAGENS PERSONALIZADAS · SÃO PAULO",
    preserveTitleLineBreaks: true,
    actionsPlacement: "right",
  },
  hero: [
    { title: "Sua viagem importa.\nCada detalhe também.", subtitle: "Consultoria completa e atendimento próximo para você viajar com tranquilidade, segurança\ne experiências que realmente combinam com você.", order: 1, enabled: true },
    { title: "Orlando, Europa, cruzeiros e resorts planejados por quem conhece", subtitle: "Destinos, hospedagens e experiências selecionados de acordo com o perfil, o momento e as prioridades de cada viajante.", order: 2, enabled: true },
    { title: "Do primeiro planejamento ao retorno,\nvocê viaja com suporte de verdade", subtitle: "Um atendimento conduzido de perto, com orientação, organização e acompanhamento antes, durante e depois da viagem.", order: 3, enabled: true },
  ],
  requestCenter: {
    title: "Por onde você quer começar?",
    notice: "Sua solicitação não é processada automaticamente. Cada pedido é analisado com atenção para que as opções realmente façam sentido para a sua viagem.",
    submitLabel: "Solicitar",
    titlePlacement: "above-card",
  },
  signature: {
    kicker: "O JEITO DESTINOS COM A JU DE PLANEJAR",
    title: "Uma viagem bem planejada começa por uma boa conversa.",
    text: "Antes de sugerir destinos, hotéis ou experiências, queremos entender quem vai viajar, o que espera viver e quais detalhes são realmente importantes. É assim que cada viagem ganha personalidade, tranquilidade e significado.",
  },
  destinations: [
    { key: "europa-no-seu-ritmo", image: "europa", label: "Cultura e experiências", title: "Europa no seu ritmo", text: "Cidades históricas, gastronomia, paisagens e experiências combinadas em um roteiro personalizado, com deslocamentos e hospedagens cuidadosamente planejados.", service: "pacotes", enabled: true, order: 1 },
    { key: "orlando-completo", image: "parques", label: "Parques e entretenimento", title: "Orlando com planejamento completo", text: "Parques, ingressos, hospedagem, alimentação e deslocamentos organizados para aproveitar melhor cada dia da viagem.", service: "ingressos", enabled: true, order: 2 },
    { key: "cruzeiro-certo", image: "cruzeiro", label: "Experiência em alto-mar", title: "O cruzeiro certo para cada viajante", text: "Companhia, navio, itinerário e categoria de cabine escolhidos com orientação de quem conhece diferentes experiências de cruzeiro.", service: "cruzeiros", enabled: true, order: 3 },
    { key: "caribe-mexico", image: "litoral", label: "Praias e experiências", title: "Caribe e México", text: "Mar, cultura, gastronomia e resorts selecionados para casais, famílias e grupos de amigos que procuram conforto e experiências especiais.", service: "pacotes", enabled: true, order: 4 },
    { key: "nordeste-conforto", image: "resort", label: "Resorts e all inclusive", title: "Nordeste com conforto e tranquilidade", text: "Resorts e experiências para famílias, casais e grupos que querem descansar com estrutura, segurança e facilidade.", service: "hospedagem", enabled: true, order: 5 },
  ],
  modules: [
    { key: "internacionais-personalizadas", title: "Viagens internacionais personalizadas", text: "Roteiros, hospedagens e experiências combinados de acordo com o ritmo, os interesses e as prioridades dos viajantes.", service: "pacotes", image: "europa", enabled: true, order: 1 },
    { key: "orlando-disney-universal", title: "Orlando, Disney e Universal", text: "Planejamento de parques, ingressos, hotéis, refeições e deslocamentos para aproveitar a viagem com mais organização e menos preocupação.", service: "ingressos", image: "parques", enabled: true, order: 2 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Orientação para escolher companhia, navio, cabine e itinerário entre opções como Disney Cruise Line, MSC, Norwegian e Royal Caribbean.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 3 },
    { key: "resorts-all-inclusive", title: "Resorts e all inclusive", text: "Seleção de resorts no Brasil, Caribe e México, considerando estrutura, localização, perfil dos hóspedes e experiência desejada.", service: "hospedagem", image: "resort", enabled: true, order: 4 },
    { key: "europa-multidestinos", title: "Europa e multidestinos", text: "Combinações de cidades e países com logística organizada, hospedagens selecionadas e tempo adequado em cada destino.", service: "pacotes", image: "europa", enabled: true, order: 5 },
    { key: "viagens-em-familia", title: "Viagens em família", text: "Planejamento pensado para diferentes idades, equilibrando diversão, conforto, segurança e o ritmo de toda a família.", service: "pacotes", image: "parques", enabled: true, order: 6 },
  ],
  authority: {
    kicker: "EXPERIÊNCIA QUE FAZ DIFERENÇA",
    title: "Cruzeiros orientados por quem realmente conhece essa forma de viajar",
    paragraphs: [
      "Juliana é especialista em Disney Cruise Line e já vivenciou mais de 18 experiências em cruzeiros, além de conhecer companhias como MSC, Norwegian e Royal Caribbean.",
      "Esse repertório ajuda a comparar navios, itinerários, cabines, experiências a bordo e perfis de viagem com muito mais segurança. O objetivo não é apenas encontrar um cruzeiro, mas escolher aquele que realmente combina com você.",
    ],
    cta: "Quero planejar meu cruzeiro", service: "cruzeiros", image: "cruzeiro", video: "disneyWishCruise",
  },
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Uma história construída por paixão, experiência e proximidade",
    text: "A Destinos com a Ju nasceu em 2013, quando Juliana Neves Sanches transformou sua paixão por viagens em uma agência dedicada a criar experiências personalizadas.\n\nAo longo dos anos, Juliana construiu um repertório especialmente forte em Disney, Universal, viagens internacionais e cruzeiros. É especialista em Disney Cruise Line e já vivenciou mais de 18 experiências em alto-mar, incluindo viagens com MSC, Norwegian e Royal Caribbean.\n\nHoje, a Destinos com a Ju atende diferentes perfis de viajantes, sempre com a mesma essência: ouvir com atenção, planejar cada detalhe e acompanhar o cliente do primeiro contato ao retorno.",
    image: "destinosStorefrontFront",
    images: [
      { src: destinosStorefrontFront.url, alt: "Fachada da loja Destinos com a Ju na Rua Pontins em Santana", position: "center" },
    ],

    badge: { value: "Desde 2013", label: "Experiência, planejamento e cuidado em cada viagem." },
  },
  differentials: [
    { title: "Atendimento conduzido de perto", text: "A Juliana participa do planejamento e acompanha pessoalmente cada cliente durante as principais etapas da viagem.", icon: "consultivo" },
    { title: "Planejamento realmente personalizado", text: "As escolhas consideram quem vai viajar, o perfil dos passageiros, o orçamento, os interesses e o ritmo desejado.", icon: "conferido" },
    { title: "Experiência nos destinos e produtos vendidos", text: "O conhecimento construído em viagens, parques, resorts e cruzeiros permite apresentar opções com mais clareza e segurança.", icon: "fornecedores" },
    { title: "Suporte antes, durante e depois", text: "O atendimento continua após a confirmação das reservas, com orientação antes do embarque, acompanhamento durante a viagem e apoio no retorno.", icon: "acompanhamento" },
  ],
  conciergePoints: [
    { key: "ideia", title: "Conte a sua ideia", text: "Envie a solicitação com o destino, período, passageiros e o que você já imagina para a viagem." },
    { key: "detalhes", title: "Conversamos sobre os detalhes", text: "A Juliana entra em contato para entender o perfil dos viajantes, as prioridades e as expectativas." },
    { key: "proposta", title: "Receba uma proposta personalizada", text: "Você recebe opções claras, organizadas e explicadas para escolher com segurança." },
    { key: "acompanhamento", title: "Viaje com acompanhamento", text: "Depois da confirmação, documentos, roteiro e informações ficam organizados na Área do Cliente, com suporte durante toda a jornada." },
  ],
  conciergeWhatsappLabel: "Falar com a Juliana",
  reviewsCopy: {
    kicker: "EXPERIÊNCIAS REAIS", title: "O que os clientes dizem sobre viajar com a Ju",
    subtitle: "Avaliações reais de clientes que confiaram à Destinos com a Ju o planejamento de momentos importantes.",
  },
  faq: [
    { q: "O atendimento da Destinos com a Ju é personalizado?", a: "Sim. Cada solicitação é analisada individualmente. Antes de montar a proposta, buscamos entender o perfil dos viajantes, as prioridades, o orçamento e o tipo de experiência desejada." },
    { q: "Posso solicitar apenas um serviço?", a: "Sim. Você pode solicitar passagem aérea, hospedagem, aluguel de carro, transfer, ingressos, seguro ou cruzeiro separadamente. Também podemos organizar a viagem completa." },
    { q: "A agência é especializada em cruzeiros?", a: "Sim. Juliana é especialista em Disney Cruise Line e já vivenciou mais de 18 experiências em cruzeiros, além de conhecer companhias como MSC, Norwegian e Royal Caribbean." },
    { q: "Vocês organizam viagens para Orlando?", a: "Sim. Planejamos passagens, hospedagem, ingressos, parques, alimentação, deslocamentos e outros detalhes importantes para aproveitar melhor cada dia em Orlando." },
    { q: "Como funciona o suporte durante a viagem?", a: "A Destinos com a Ju acompanha o cliente antes do embarque e permanece disponível durante a viagem para orientar e ajudar na condução de eventuais imprevistos." },
    { q: "Onde encontro meus documentos depois da compra?", a: "Orçamento, roteiro, documentos, vouchers e informações ficam organizados na Área do Cliente, acessível pelos links enviados pela agência." },
    { q: "Solicitar uma proposta tem algum custo?", a: "Não. A solicitação inicial é gratuita e sem compromisso. Depois de entender a viagem, apresentamos as possibilidades e orientamos os próximos passos." },
  ],
  footer: {
    description: "Consultoria completa para viagens personalizadas, com planejamento e acompanhamento antes, durante e depois.",
    whatsapp: "(11) 95741-4840", phone: "(11) 2959-6402", email: "contato@destinoscomaju.com.br",
    instagram: "https://instagram.com/destinoscomaju", instagramLabel: "@destinoscomaju",
    address: "Rua Pontins, 54 — Santana — São Paulo/SP", legalName: "FECAFER Agência de Viagens e Turismo Ltda.", cnpj: "23.593.301/0001-71",
  },
  featuredExperience: {
    enabled: true,
    id: "experiencia-xcaret",
    kicker: "EXPERIÊNCIA E ESPECIALIZAÇÃO",
    title: "Xcaret com o olhar de quem viveu essa experiência",
    description: "Juliana conheceu de perto o universo Xcaret e recebeu o selo de Expert. Agora, transforma essa experiência em orientação personalizada para ajudar você a escolher os parques, hotéis e experiências que realmente combinam com a sua viagem.",
    mainImage: {
      src: destinosXcaretCover.url,
      alt: "Montagem com vista aérea do Parque Xcaret, o selo Xperts Xcaret 2026 e Juliana nos parques Xcaret, Xplor e Xenses",
      position: "center",
      fit: "contain",
    },
    consultantImage: null,
    badge: null,
    highlights: ["Experiência vivida no destino", "Conhecimento dos parques e hotéis", "Planejamento personalizado", "Orientação antes, durante e depois da viagem"],
    ctaLabel: "Conheça o Xcaret com a Ju",
    ctaHref: "/xcaret",
  },
  copy: {
    destinations: { title: "Inspirações para a sua próxima viagem", subtitle: "Destinos e experiências que fazem parte do repertório da Destinos com a Ju. Escolha uma inspiração e conte como você imagina a sua viagem." },
    modules: { title: "Viagens que planejamos com atenção \na cada detalhe", subtitle: "A Destinos com a Ju combina consultoria, experiência e acompanhamento para criar viagens que respeitam o perfil de cada cliente." },
    differentials: { title: "O que você encontra na Destinos com a Ju", subtitle: "Mais do que reservas, você recebe orientação, acompanhamento e a tranquilidade de ter alguém cuidando da sua viagem." },
    concierge: { kicker: "SUA VIAGEM REALMENTE IMPORTA", title: "Aqui você não é apenas mais um cliente", subtitle: "Um consultor dedicado acompanha a sua viagem do início ao fim. Você recebe orientação para tomar decisões, entende cada escolha e sabe com quem contar caso aconteça algum imprevisto.", cta: "Solicitar atendimento personalizado" },
    avaliacoes: { kicker: "EXPERIÊNCIAS REAIS", title: "O que os clientes dizem sobre viajar com a Ju", subtitle: "Avaliações reais de clientes que confiaram à Destinos com a Ju o planejamento de momentos importantes." },
    faq: { title: "Dúvidas frequentes" },
    newsletter: { kicker: "INSPIRAÇÕES PARA VIAJAR", title: "Receba novidades e oportunidades", subtitle: "Deixe o seu contato para receber inspirações de destinos, cruzeiros, resorts e experiências selecionadas pela Destinos com a Ju.", cta: "Quero receber inspirações", surface: "navy", titleSingleLine: true },
  },
};

/**
 * Preset ESTRUTURAL compartilhado da família "curadoria sob medida": mesma
 * ordem de seções, densidade e tipos de módulos, sem conteúdo de marca.
 * Reutilizado por tenants editoriais (Faé) e pelo laboratório (SiteLab Base).
 */
const CURATED_SECTIONS: NonNullable<AgencySiteProfile["sections"]> = {
  dmc: { enabled: false },
  testimonials: { enabled: false },
  team: { enabled: false },
  credentials: { enabled: false },
  signature: { enabled: true, order: 1 },
  destinations: { order: 2 },
  modules: { order: 3 },
  highlights: { order: 4 },
  differentials: { order: 5 },
  about: { order: 6 },
  concierge: { order: 7 },
  faq: { order: 8 },
  newsletter: { order: 9 },
  offers: { order: 10 },
};

/**
 * Faé Viagens — viagens sob medida com curadoria humana. Sem DMC, depoimentos,
 * equipe ou credenciais (nada é inventado): apenas conteúdo factual da marca.
 */
const FAE_CURATED: AgencySiteProfile = {
  key: "faeCurated",
  sections: { ...CURATED_SECTIONS },
  heroImage: "fae",

  hero: [
    {
      title: "Viagens sob medida, planejadas com cuidado",
      subtitle:
        "Roteiros autênticos, experiências escolhidas a dedo e atendimento próximo do primeiro contato ao retorno.",
      order: 1,
      enabled: true,
    },
    {
      title: "Curadoria humana, do início ao fim",
      subtitle:
        "Conversamos, entendemos o seu momento e desenhamos a viagem que combina com você — sem pacote pronto.",
      order: 2,
      enabled: true,
    },
    {
      title: "Experiência e confiança desde 2003",
      subtitle:
        "Uma trajetória construída viagem por viagem, com planejamento atento e acompanhamento em cada etapa.",
      order: 3,
      enabled: true,
    },
  ],
  signature: {
    kicker: "CURADORIA FAÉ",
    title: "Cada viagem começa por uma boa conversa.",
    text:
      "Entender quem viaja é o que permite escolher os destinos, as hospedagens e o ritmo certos. É esse cuidado que transforma um roteiro em uma experiência.",
  },
  destinations: [
    { key: "europa-cultural", image: "europa", label: "Cultura", title: "Europa com tempo para viver", text: "Cidades históricas, museus, vilas e estradas cênicas combinadas no seu ritmo, com deslocamentos bem pensados.", service: "pacotes", enabled: true, order: 1 },
    { key: "norte-africa", image: "norteafrica", label: "Culturas", title: "Norte da África e culturas milenares", text: "Medinas, deserto e tradições vivas em roteiros conduzidos por parceiros locais experientes.", service: "pacotes", enabled: true, order: 2 },
    { key: "escandinavia", image: "escandinavia", label: "Natureza", title: "Escandinávia e paisagens do Norte", text: "Fiordes, auroras e cidades tranquilas para quem busca natureza com conforto e boa logística.", service: "pacotes", enabled: true, order: 3 },
    { key: "gastronomia-vinhos", image: "gastronomia", label: "Gastronomia", title: "Gastronomia e vinhos", text: "Mesas, mercados e vinícolas escolhidos como parte do roteiro — não como passeio avulso.", service: "pacotes", enabled: true, order: 4 },
    { key: "brasil-autentico", image: "brasil", label: "Brasil", title: "Brasil autêntico", text: "Praias, serras e vilas brasileiras planejadas com o mesmo critério de uma viagem internacional.", service: "pacotes", enabled: true, order: 5 },
  ],
  modules: [
    { key: "roteiros-sob-medida", title: "Roteiros sob medida", text: "Do primeiro rascunho ao roteiro final: cada escolha é explicada e ajustada com você.", service: "pacotes", image: "europa", enabled: true, order: 1 },
    { key: "grupos-acompanhados", title: "Grupos e viagens acompanhadas", text: "Saídas em grupo com organização cuidadosa, ritmo equilibrado e apoio durante toda a viagem.", service: "pacotes", image: "grupos", enabled: true, order: 2 },
    { key: "cultura-historia", title: "Viagens culturais e históricas", text: "Museus, cidades históricas e experiências locais conduzidas por quem conhece o destino.", service: "pacotes", image: "norteafrica", enabled: true, order: 3 },
    { key: "natureza-paisagens", title: "Natureza e grandes paisagens", text: "Trilhas, fiordes e cenários marcantes com logística bem resolvida.", service: "pacotes", image: "escandinavia", enabled: true, order: 4 },
    { key: "gastronomia", title: "Gastronomia e vinhos", text: "Mesas e vinícolas integradas ao roteiro, com reservas feitas antecipadamente.", service: "pacotes", image: "gastronomia", enabled: true, order: 5 },
    { key: "hospedagem-selecionada", title: "Hospedagens selecionadas", text: "Endereços escolhidos por localização, serviço e atmosfera — com o porquê de cada indicação.", service: "hospedagem", image: "villa", enabled: true, order: 6 },
    { key: "aereo-seguro", title: "Aéreo e seguro viagem", text: "Rotas, conexões e coberturas explicadas com transparência antes de decidir.", service: "aereo", image: "litoral", enabled: true, order: 7 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Itinerários, cabines e categorias comparados de forma clara.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 8 },
  ],
  highlights: [
    { title: "Roteiros desenhados para cada viajante", text: "A viagem nasce da conversa: seu tempo, seu ritmo e o que você quer viver.", service: "pacotes", cta: "Começar a planejar" },
    { title: "Seleção criteriosa de hospedagens", text: "Indicamos endereços com critério e explicamos cada escolha antes de você decidir.", service: "hospedagem", cta: "Falar sobre hospedagem" },
    { title: "Parceiros especializados", text: "Operadoras, receptivos e guias escolhidos pela especialidade em cada destino.", service: "pacotes", cta: "Solicitar proposta" },
  ],
  differentials: [
    { title: "Curadoria humana em cada etapa", text: "Nada de roteiro automático: o planejamento é conduzido por pessoas que ouvem você.", icon: "consultivo" },
    { title: "Planejamento conferido nos detalhes", text: "Horários, conexões, traslados e reservas revisados antes da confirmação.", icon: "conferido" },
    { title: "Parceiros locais de confiança", text: "Fornecedores escolhidos pela especialidade no destino, não por volume.", icon: "fornecedores" },
    { title: "Acompanhamento antes, durante e depois", text: "Você tem com quem falar em qualquer momento da viagem.", icon: "acompanhamento" },
  ],
  about: {
    kicker: "QUEM PLANEJA A SUA VIAGEM",
    title: "Uma trajetória construída desde 2003.",
    text:
      "A Faé Viagens é especialista em viagens sob medida: curadoria humana de experiências, roteiros autênticos e atendimento personalizado, com o cuidado de quem acompanha cada etapa da jornada.",
    image: "europa",
    badge: { value: "Desde 2003", label: "Experiência e cuidado em cada viagem." },
  },
  faq: [
    {
      q: "O que é uma viagem sob medida?",
      a: "É uma viagem desenhada a partir do seu contexto: quem viaja, quanto tempo tem, o que quer viver e o que prefere evitar. A partir disso montamos roteiro, hospedagens e experiências, explicando cada escolha.",
    },
    {
      q: "A Faé organiza viagens em grupo?",
      a: "Sim. Além dos roteiros individuais e em família, organizamos grupos e viagens acompanhadas, com ritmo equilibrado e apoio durante todo o percurso.",
    },
    {
      q: "É possível solicitar apenas um serviço, como aéreo ou hospedagem?",
      a: "Sim. Você pode solicitar um serviço isolado — aéreo, hospedagem, transfer, seguro, ingressos — ou o planejamento completo da viagem.",
    },
    {
      q: "Como funciona o atendimento?",
      a: "Você envia a sua solicitação pela Central, conversamos para entender os detalhes e apresentamos uma proposta clara. Confirmada a viagem, seguimos acompanhando antes, durante e depois.",
    },
    {
      q: "Como começo a planejar?",
      a: "Basta enviar uma solicitação pela Central ou falar pelo WhatsApp contando o que você já imagina. A partir daí conduzimos o planejamento com você.",
    },
  ],
  copy: {
    destinations: {
      title: "Inspirações para a sua próxima viagem",
      subtitle:
        "Referências que guiam a nossa curadoria. Escolha uma e conversamos sobre como ela pode virar a sua viagem.",
    },
    modules: {
      title: "Como podemos planejar com você",
      subtitle: "Temas que acompanhamos de perto. Escolha um e conte o que você imagina.",
    },
    highlights: {
      title: "A curadoria Faé",
      subtitle: "Três princípios que orientam cada viagem que desenhamos.",
    },
    differentials: {
      title: "Como cuidamos de cada viagem",
      subtitle: "O que sustenta a experiência, do primeiro contato ao retorno.",
    },
    concierge: {
      kicker: "ATENDIMENTO PERSONALIZADO",
      title: "Um consultor dedicado à sua viagem",
      subtitle:
        "Conversamos, entendemos o seu momento e desenhamos as opções. Você decide com todas as informações à mão.",
      cta: "Planeje sua viagem",
    },
    newsletter: {
      kicker: "INSPIRAÇÕES",
      title: "Receba inspirações de viagem",
      subtitle:
        "Deixe o seu contato e o canal preferido: enviamos ideias de destinos e experiências alinhadas ao seu jeito de viajar.",
      cta: "Quero receber inspirações",
    },
    faq: {
      title: "Perguntas frequentes",
    },
  },
};

/**
 * Casa Nova Tur — atendimento próximo, planejamento sob medida e suporte antes,
 * durante e depois. Sem DMC, depoimentos, equipe ou credenciais: nenhum dado
 * de mercado, número ou parceria é inventado.
 */
const CASA_NOVA_CURATED: AgencySiteProfile = {
  key: "casaNovaCurated",
  sections: { ...CURATED_SECTIONS, offers: { enabled: false } },
  heroImage: "praia",
  hero: [
    {
      title: "A viagem dos seus sonhos começa aqui",
      subtitle:
        "Planejamento personalizado, com segurança nas escolhas e acompanhamento do primeiro contato ao retorno.",
      order: 1,
      enabled: true,
    },
    {
      title: "Cada detalhe planejado com você",
      subtitle:
        "Conversamos para entender o seu momento e organizamos a viagem no seu ritmo, com tudo explicado antes de decidir.",
      order: 2,
      enabled: true,
    },
    {
      title: "Você tem com quem falar em qualquer etapa",
      subtitle:
        "Antes, durante e depois da viagem: atendimento próximo e transparente para viajar tranquilo.",
      order: 3,
      enabled: true,
    },
  ],
  signature: {
    kicker: "CASA NOVA TUR",
    title: "Não vendemos apenas pacotes. Planejamos experiências que marcam histórias.",
    text:
      "O planejamento começa por uma conversa: quem viaja, quando, com quem e o que você quer viver. A partir daí, cada escolha é apresentada com clareza — hospedagem, roteiro, deslocamentos e valores.",
  },
  destinations: [
    { key: "resorts-brasil", image: "resort", label: "Brasil", title: "Resorts no Brasil", text: "Estadias com estrutura completa e programação para todas as idades, escolhidas por localização e serviço.", service: "hospedagem", enabled: true, order: 1 },
    { key: "cruzeiros", image: "cruzeiro", label: "Cruzeiros", title: "Cruzeiros", text: "Itinerários, cabines e categorias comparados de forma clara antes de você decidir.", service: "cruzeiros", enabled: true, order: 2 },
    { key: "orlando-parques", image: "parques", label: "Família", title: "Orlando e parques", text: "Parques, ingressos, hotéis e deslocamentos organizados dia a dia.", service: "ingressos", enabled: true, order: 3 },
    { key: "europa", image: "europa", label: "Internacional", title: "Europa e roteiros internacionais", text: "Cidades, trajetos e hospedagens combinados em um roteiro coerente e no seu ritmo.", service: "pacotes", enabled: true, order: 4 },
    { key: "lua-de-mel", image: "luademel", label: "Casais", title: "Lua de mel", text: "Destinos e experiências pensados para a viagem mais especial do casal.", service: "pacotes", enabled: true, order: 5 },
    { key: "familia", image: "brasil", label: "Família", title: "Viagens em família", text: "Hospedagens e roteiros pensados para crianças e diferentes idades.", service: "pacotes", enabled: true, order: 6 },
  ],
  modules: [
    { key: "nacionais-internacionais", title: "Viagens nacionais e internacionais", text: "Do primeiro rascunho ao roteiro final, com aéreo, hospedagem e traslados integrados.", service: "pacotes", image: "europa", enabled: true, order: 1 },
    { key: "resorts", title: "Resorts e hospedagens", text: "Endereços indicados por localização, estrutura e adequação ao perfil da viagem.", service: "hospedagem", image: "resort", enabled: true, order: 2 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Comparação transparente de itinerários, cabines e o que está incluído.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 3 },
    { key: "parques-ingressos", title: "Parques e ingressos", text: "Atrações, ingressos e horários conferidos antes da confirmação.", service: "ingressos", image: "parques", enabled: true, order: 4 },
    { key: "roteiros-personalizados", title: "Roteiros personalizados", text: "Viagens desenhadas sob medida, com cada etapa explicada e ajustada com você.", service: "pacotes", image: "litoral", enabled: true, order: 5 },
    { key: "experiencias-especiais", title: "Experiências especiais", text: "Lua de mel, comemorações e datas marcantes planejadas com cuidado.", service: "pacotes", image: "luademel", enabled: true, order: 6 },
    { key: "aereo-seguro", title: "Aéreo e seguro viagem", text: "Rotas, conexões e coberturas apresentadas com transparência.", service: "aereo", image: "brasil", enabled: true, order: 7 },
  ],
  highlights: [
    { title: "Planejamento sob medida", text: "A viagem nasce da conversa: seu tempo, seu ritmo e o que você quer viver.", service: "pacotes", cta: "Começar a planejar" },
    { title: "Escolhas com segurança", text: "Hospedagens, roteiros e serviços conferidos antes de qualquer confirmação.", service: "hospedagem", cta: "Falar sobre hospedagem" },
    { title: "Acompanhamento completo", text: "Suporte antes, durante e depois — sempre com alguém para responder.", service: "pacotes", cta: "Solicitar proposta" },
  ],
  differentials: [
    { title: "Atendimento próximo", text: "Você fala com quem realmente planeja a sua viagem.", icon: "consultivo" },
    { title: "Transparência em cada etapa", text: "Valores, condições e o que está incluído sempre explicados antes de decidir.", icon: "conferido" },
    { title: "Planejamento sob medida", text: "Nada de pacote pronto: o roteiro é construído a partir do seu contexto.", icon: "fornecedores" },
    { title: "Suporte antes, durante e depois", text: "Documentos, vouchers e imprevistos acompanhados em toda a jornada.", icon: "acompanhamento" },
  ],
  about: {
    kicker: "SOBRE A CASA NOVA TUR",
    title: "Viagens planejadas com cuidado, do começo ao fim.",
    text:
      "A Casa Nova Tur organiza viagens nacionais e internacionais, cruzeiros, parques e roteiros personalizados. O atendimento é próximo e transparente: entendemos o que você quer viver, apresentamos as opções com clareza e acompanhamos cada etapa da viagem.",
    image: "resort",
  },
  faq: [
    {
      q: "Como funciona o atendimento?",
      a: "Você envia uma solicitação pela Central ou pelo WhatsApp, conversamos para entender os detalhes e apresentamos uma proposta clara. Confirmada a viagem, seguimos acompanhando antes, durante e depois.",
    },
    {
      q: "Vocês organizam viagens em família?",
      a: "Sim. Hospedagens, roteiros e deslocamentos são pensados para o grupo que viaja, considerando crianças e diferentes idades.",
    },
    {
      q: "É possível solicitar apenas um serviço?",
      a: "Sim. Você pode pedir apenas aéreo, hospedagem, transfer, seguro ou ingressos, ou o planejamento completo da viagem.",
    },
    {
      q: "Como funciona o planejamento de cruzeiros e parques?",
      a: "Comparamos itinerários, cabines, categorias e ingressos, explicando o que está incluído em cada opção antes da decisão.",
    },
    {
      q: "Como começo a planejar?",
      a: "Basta enviar uma solicitação pela Central ou falar pelo WhatsApp contando a ideia inicial da viagem.",
    },
  ],
  copy: {
    destinations: {
      title: "Inspirações para a sua próxima viagem",
      subtitle: "Escolha um tema e conversamos sobre como ele pode virar a sua viagem.",
    },
    modules: {
      title: "Como podemos planejar com você",
      subtitle: "Serviços que acompanhamos de perto, do pedido à volta para casa.",
    },
    highlights: {
      title: "Como planejamos",
      subtitle: "Três princípios que orientam cada viagem que organizamos.",
    },
    differentials: {
      title: "Nossos diferenciais",
      subtitle: "O que sustenta a experiência, do primeiro contato ao retorno.",
    },
    concierge: {
      kicker: "ATENDIMENTO PERSONALIZADO",
      title: "Um consultor dedicado à sua viagem",
      subtitle: "Conversamos, entendemos o seu momento e apresentamos as opções com clareza.",
      cta: "Planeje sua viagem",
    },
    newsletter: {
      kicker: "INSPIRAÇÕES",
      title: "Receba inspirações de viagem",
      subtitle: "Deixe o seu contato e o canal preferido para receber ideias de destinos.",
      cta: "Quero receber inspirações",
    },
    faq: { title: "Perguntas frequentes" },
  },
};

/**
 * SiteLab Base — CATÁLOGO MESTRE do template. Mantém a mesma engine e a mesma
 * linguagem editorial de `CURATED_SECTIONS`, mas liga TODAS as seções do
 * catálogo (`sitelabSectionOverrides`) com conteúdo puramente demonstrativo:
 * nenhum nome, ano de fundação, selo ou alegação factual de agência real.
 */
const SITE_LAB_BASE: AgencySiteProfile = {
  key: "siteLabBase",
  demo: true,
  /** Derivado da fonte única: um item novo no catálogo já aparece aqui. */
  sections: sitelabSectionOverrides(),
  heroImage: "praia",
  hero: [
    {
      title: "Viagens sob medida, planejadas com cuidado",
      subtitle:
        "Modelo de demonstração: roteiros autênticos, experiências selecionadas e atendimento próximo em cada etapa.",
      order: 1,
      enabled: true,
    },
    {
      title: "Curadoria humana, do início ao fim",
      subtitle:
        "Conteúdo de exemplo para avaliar layout, densidade e ritmo das seções deste modelo base.",
      order: 2,
      enabled: true,
    },
    {
      title: "Atendimento próximo em cada etapa",
      subtitle:
        "Texto demonstrativo, sem dados de agência: a marca real substitui este conteúdo na publicação.",
      order: 3,
      enabled: true,
    },
  ],
  signature: {
    kicker: "MODELO BASE",
    title: "Cada viagem começa por uma boa conversa.",
    text:
      "Conteúdo de demonstração usado para validar a linguagem visual do modelo: entender quem viaja orienta destinos, hospedagens e ritmo da viagem.",
  },
  destinations: [
    { key: "europa-cultural", image: "europa", label: "Cultura", title: "Europa com tempo para viver", text: "Exemplo de destino cultural: cidades históricas, museus e estradas cênicas no seu ritmo.", service: "pacotes", enabled: true, order: 1 },
    { key: "litoral-brasil", image: "litoral", label: "Praias", title: "Litoral brasileiro", text: "Exemplo de destino de praia, com hospedagens escolhidas por localização e serviço.", service: "pacotes", enabled: true, order: 2 },
    { key: "escandinavia", image: "escandinavia", label: "Natureza", title: "Paisagens do Norte", text: "Exemplo de destino de natureza: fiordes, auroras e cidades tranquilas com boa logística.", service: "pacotes", enabled: true, order: 3 },
    { key: "gastronomia-vinhos", image: "gastronomia", label: "Gastronomia", title: "Gastronomia e vinhos", text: "Exemplo de tema gastronômico: mesas, mercados e vinícolas integrados ao roteiro.", service: "pacotes", enabled: true, order: 4 },
    { key: "resorts", image: "resort", label: "All inclusive", title: "Resorts e all inclusive", text: "Exemplo de estadia com tudo incluído e programação para diferentes idades.", service: "hospedagem", enabled: true, order: 5 },
  ],
  modules: [
    { key: "roteiros-sob-medida", title: "Roteiros sob medida", text: "Bloco demonstrativo: do primeiro rascunho ao roteiro final, com cada escolha explicada.", service: "pacotes", image: "europa", enabled: true, order: 1 },
    { key: "grupos-acompanhados", title: "Grupos e viagens acompanhadas", text: "Bloco demonstrativo de saídas em grupo, com ritmo equilibrado e apoio na viagem.", service: "pacotes", image: "grupos", enabled: true, order: 2 },
    { key: "cultura-historia", title: "Viagens culturais", text: "Bloco demonstrativo de museus, cidades históricas e experiências locais.", service: "pacotes", image: "norteafrica", enabled: true, order: 3 },
    { key: "natureza-paisagens", title: "Natureza e grandes paisagens", text: "Bloco demonstrativo de trilhas e cenários marcantes com logística resolvida.", service: "pacotes", image: "escandinavia", enabled: true, order: 4 },
    { key: "gastronomia", title: "Gastronomia e vinhos", text: "Bloco demonstrativo de mesas e vinícolas com reservas antecipadas.", service: "pacotes", image: "gastronomia", enabled: true, order: 5 },
    { key: "hospedagem-selecionada", title: "Hospedagens selecionadas", text: "Bloco demonstrativo de endereços escolhidos por localização, serviço e atmosfera.", service: "hospedagem", image: "villa", enabled: true, order: 6 },
    { key: "aereo-seguro", title: "Aéreo e seguro viagem", text: "Bloco demonstrativo de rotas, conexões e coberturas explicadas com transparência.", service: "aereo", image: "litoral", enabled: true, order: 7 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Bloco demonstrativo de itinerários, cabines e categorias apresentados com clareza.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 8 },
    { key: "resorts", title: "Resorts e all inclusive", text: "Bloco demonstrativo de estadias com tudo incluído e programação para todas as idades.", service: "hospedagem", image: "resort", enabled: true, order: 9 },
    { key: "circuitos", title: "Circuitos e multidestinos", text: "Bloco demonstrativo de vários destinos em uma só viagem, com logística resolvida.", service: "pacotes", image: "europa", enabled: true, order: 10 },
    { key: "orlando-parques", title: "Orlando, parques e ingressos", text: "Bloco demonstrativo de parques, ingressos e deslocamentos organizados dia a dia.", service: "ingressos", image: "parques", enabled: true, order: 11 },
    { key: "lua-de-mel", title: "Lua de mel e celebrações", text: "Bloco demonstrativo de roteiros para datas marcantes, com detalhes combinados antes.", service: "pacotes", image: "luademel", enabled: true, order: 12 },
    { key: "familia", title: "Viagens em família", text: "Bloco demonstrativo de hospedagens e roteiros pensados para diferentes idades.", service: "pacotes", image: "brasil", enabled: true, order: 13 },
  ],
  /* Blocos normalmente condicionados a dados reais — aqui apenas exemplos. */
  dmc: {
    kicker: "EXEMPLO — EXCLUSIVO PARA AGÊNCIAS DE VIAGENS",
    title: "Bloco B2B / DMC de demonstração",
    text:
      "Exemplo de faixa para agências com operação receptiva: serviços locais, apoio a outras agências e coordenação de experiências no destino. O conteúdo real de cada operação substitui este texto.",
    services: [
      { key: "transfers", label: "Transfers privativos (exemplo)" },
      { key: "passeios", label: "Passeios e experiências (exemplo)" },
      { key: "roteiros", label: "Roteiros personalizados (exemplo)" },
      { key: "acompanhamento", label: "Acompanhamento local (exemplo)" },
      { key: "guias", label: "Guias e parceiros (exemplo)" },
      { key: "concierge", label: "Concierge no destino (exemplo)" },
    ],
    cta: "Falar sobre uma parceria",
    whatsappMessage: "Exemplo de mensagem: gostaria de conhecer os serviços B2B deste modelo.",
    note: "Texto demonstrativo: o cliente final continua sendo da agência parceira.",
  },
  credentials: {
    kicker: "CREDENCIAIS E CONEXÕES (EXEMPLO)",
    title: "Espaço para associações, selos e redes reais.",
    text:
      "Exemplo de bloco de credenciais. Em um site publicado, aqui entram apenas associações, certificações e redes verificáveis da agência.",
    items: [
      { key: "associacao", name: "Associação do setor (exemplo)", text: "Espaço para uma associação real da qual a agência participa." },
      { key: "rede", name: "Rede de curadoria (exemplo)", text: "Espaço para comunidades e redes de agências das quais a agência faz parte." },
      { key: "certificacao", name: "Certificação (exemplo)", text: "Espaço para certificações e formações comprovadas da equipe." },
    ],
  },
  team: [
    { key: "consultor-1", name: "Consultor(a) — exemplo", role: "Consultoria de viagens", text: "Espaço para apresentar quem atende o cliente, com especialidades e destinos de referência." },
    { key: "consultor-2", name: "Consultor(a) — exemplo", role: "Roteiros e grupos", text: "Espaço para o segundo integrante da equipe: função, experiência e temas que domina." },
    { key: "consultor-3", name: "Consultor(a) — exemplo", role: "Atendimento e pós-venda", text: "Espaço para quem acompanha documentos, vouchers e o suporte durante a viagem." },
  ],
  testimonials: [
    { key: "dep-1", quote: "Depoimento de exemplo: o planejamento chegou pronto, explicado e sem surpresas.", author: "Cliente (exemplo)", context: "Viagem em família" },
    { key: "dep-2", quote: "Depoimento de exemplo: ter alguém para falar durante a viagem fez toda a diferença.", author: "Cliente (exemplo)", context: "Europa" },
    { key: "dep-3", quote: "Depoimento de exemplo: cada escolha do roteiro foi justificada antes de decidirmos.", author: "Cliente (exemplo)", context: "Lua de mel" },
  ],
  conciergePoints: [
    { key: "escuta", title: "Escuta antes da pesquisa", text: "A conversa vem primeiro: quem viaja, quando, com quem e o que quer viver." },
    { key: "curadoria", title: "Curadoria além do preço", text: "As opções são comparadas por localização, serviço, horários e adequação ao perfil." },
    { key: "planejamento", title: "Planejamento integrado", text: "Aéreo, hospedagem, traslados, ingressos e seguro combinados em um roteiro coerente." },
    { key: "contato", title: "Alguém com quem falar", text: "Um consultor responsável acompanha o antes, o durante e o depois da viagem." },
    { key: "organizacao", title: "Organização na Área do Cliente", text: "Orçamento, roteiro, vouchers e documentos reunidos em um só lugar." },
  ],
  highlights: [
    { title: "Roteiros desenhados para cada viajante", text: "Texto de exemplo: a viagem nasce da conversa — seu tempo, seu ritmo e o que você quer viver.", service: "pacotes", cta: "Começar a planejar" },
    { title: "Seleção criteriosa de hospedagens", text: "Texto de exemplo: endereços indicados com critério e o porquê de cada escolha.", service: "hospedagem", cta: "Falar sobre hospedagem" },
    { title: "Parceiros especializados", text: "Texto de exemplo: operadoras, receptivos e guias escolhidos pela especialidade no destino.", service: "pacotes", cta: "Solicitar proposta" },
  ],
  differentials: [
    { title: "Curadoria humana em cada etapa", text: "Texto de exemplo: planejamento conduzido por pessoas, sem roteiro automático.", icon: "consultivo" },
    { title: "Planejamento conferido nos detalhes", text: "Texto de exemplo: horários, conexões, traslados e reservas revisados antes da confirmação.", icon: "conferido" },
    { title: "Parceiros locais de confiança", text: "Texto de exemplo: fornecedores escolhidos pela especialidade, não por volume.", icon: "fornecedores" },
    { title: "Acompanhamento antes, durante e depois", text: "Texto de exemplo: sempre há com quem falar em qualquer momento da viagem.", icon: "acompanhamento" },
  ],
  about: {
    kicker: "SOBRE ESTE MODELO",
    title: "Um modelo base para viagens sob medida.",
    text:
      "Ambiente de demonstração do modelo editorial: viagens sob medida, curadoria humana e atendimento próximo. Os textos e imagens são de exemplo e serão substituídos pelo conteúdo real de cada agência.",
    image: "europa",
    badge: { value: "Modelo base", label: "Conteúdo de demonstração, sem dados reais." },
  },
  faq: [
    {
      q: "O que é uma viagem sob medida?",
      a: "Resposta de exemplo: é uma viagem desenhada a partir do seu contexto — quem viaja, quanto tempo tem e o que quer viver — com roteiro, hospedagens e experiências explicados.",
    },
    {
      q: "É possível organizar viagens em grupo?",
      a: "Resposta de exemplo: sim, além de roteiros individuais e em família, este modelo prevê grupos e viagens acompanhadas.",
    },
    {
      q: "É possível solicitar apenas um serviço?",
      a: "Resposta de exemplo: sim — aéreo, hospedagem, transfer, seguro ou ingressos isolados, ou o planejamento completo.",
    },
    {
      q: "Como funciona o atendimento?",
      a: "Resposta de exemplo: a solicitação chega pela Central, a conversa detalha o pedido e a proposta é apresentada com clareza.",
    },
    {
      q: "Como começar a planejar?",
      a: "Resposta de exemplo: enviando uma solicitação pela Central ou pelo WhatsApp com a ideia inicial da viagem.",
    },
  ],
  copy: {
    destinations: {
      title: "Inspirações para a sua próxima viagem",
      subtitle:
        "Exemplos de referência para a curadoria. Escolha um e veja como o fluxo de solicitação se comporta.",
    },
    modules: {
      title: "Como podemos planejar com você",
      subtitle: "Temas de demonstração. Escolha um e conte o que você imagina.",
    },
    highlights: {
      title: "Curadoria sob medida",
      subtitle: "Três princípios de exemplo que orientam cada viagem desenhada.",
    },
    differentials: {
      title: "Como cuidamos de cada viagem",
      subtitle: "O que sustenta a experiência, do primeiro contato ao retorno.",
    },
    concierge: {
      kicker: "ATENDIMENTO PERSONALIZADO",
      title: "Um consultor dedicado à sua viagem",
      subtitle:
        "Conteúdo de demonstração: conversamos, entendemos o momento e apresentamos as opções.",
      cta: "Planeje sua viagem",
    },
    newsletter: {
      kicker: "INSPIRAÇÕES",
      title: "Receba inspirações de viagem",
      subtitle:
        "Formulário de demonstração: deixe o contato e o canal preferido para receber ideias de destinos.",
      cta: "Quero receber inspirações",
    },
    faq: {
      title: "Perguntas frequentes",
    },
  },
};

/**
 * Essyatur — conteúdo do briefing oficial. Sem prêmios, números, depoimentos
 * ou certificações: somente o que a agência informou.
 */
const ESSYA_CURATED: AgencySiteProfile = {
  key: "essyaCurated",
  nav: [
    { label: "Início", to: "/" },
    { label: "Sobre a Essyatur", to: "/#sobre" },
    { label: "Experiências", to: "/#destinos" },
    { label: "Serviços", to: "/#campanhas" },
    { label: "Inspirações", to: "/#destaques" },
    { label: "Dúvidas Frequentes", to: "/#faq" },
    { label: "Contato", to: "/#atendimento" },
    { label: "Área do Cliente", to: "/area-do-cliente" },
  ],
  sections: {
    dmc: { enabled: false },
    testimonials: { enabled: false },
    team: { enabled: false },
    credentials: { enabled: false },
    offers: { enabled: false },
    newsletter: { enabled: false },
    signature: { enabled: true, order: 1 },
    about: { order: 2 },
    differentials: { order: 3 },
    destinations: { order: 4 },
    modules: { order: 5 },
    highlights: { order: 6 },
    concierge: { order: 7 },
    faq: { order: 8 },
  },
  heroImage: "praia",
  hero: [
    {
      title: "Viaje com segurança e um roteiro feito para você",
      subtitle:
        "Atendimento próximo e personalizado, com suporte antes, durante e depois da viagem.",
      order: 1,
      enabled: true,
    },
    {
      title: "Orlando, cruzeiros e experiências para toda a família",
      subtitle:
        "Planejamento cuidadoso para famílias com crianças, famílias multigeracionais e casais.",
      order: 2,
      enabled: true,
    },
    {
      title: "Viagens sob medida, do primeiro contato ao retorno",
      subtitle:
        "Você fala direto com quem planeja a sua viagem, pelo WhatsApp.",
      order: 3,
      enabled: true,
    },
  ],
  signature: {
    kicker: "ESSYATUR",
    title: "Atendimento próximo para viagens realmente personalizadas.",
    text:
      "Cada viagem começa por uma conversa: quem viaja, o que desejam viver e o equilíbrio certo entre qualidade e investimento. A partir daí, a Essyatur desenha o roteiro e acompanha cada etapa.",
  },
  about: {
    kicker: "SOBRE A ESSYATUR",
    title: "Cristiane Serro Azul e um atendimento feito por especialistas.",
    text:
      "À frente da Essyatur, Cristiane Serro Azul, sócia administradora, atende pessoalmente os clientes, com os sócios, desde 2020. A vivência frequente nos destinos vendidos e as capacitações especializadas orientam cada indicação. Em qualquer imprevisto, o responsável acompanha o caso até a solução.",
    image: "resort",
    badge: { value: "Desde 2020", label: "Atendimento direto pela proprietária e sócios." },
  },
  differentials: [
    { title: "Atendimento por especialista", text: "Você fala direto com quem planeja a sua viagem, sem intermediários.", icon: "consultivo" },
    { title: "Roteiros realmente personalizados", text: "Cada roteiro nasce do perfil de quem viaja, nunca de um pacote pronto.", icon: "fornecedores" },
    { title: "Curadoria criteriosa", text: "Hotéis, serviços e experiências escolhidos com critério e vivência nos destinos.", icon: "conferido" },
    { title: "Suporte durante toda a viagem", text: "Antes, durante e depois: imprevistos acompanhados até a solução.", icon: "acompanhamento" },
  ],
  destinations: [
    { key: "familias-criancas", image: "parques", label: "Famílias", title: "Famílias com crianças", text: "Parques, hotéis e ritmo de viagem pensados para os pequenos.", service: "pacotes", enabled: true, order: 1 },
    { key: "multigeracionais", image: "resort", label: "Famílias", title: "Famílias multigeracionais", text: "Roteiros confortáveis que funcionam para avós, pais e netos juntos.", service: "pacotes", enabled: true, order: 2 },
    { key: "casais", image: "luademel", label: "Casais", title: "Casais", text: "Viagens a dois, com experiências escolhidas para o momento do casal.", service: "pacotes", enabled: true, order: 3 },
    { key: "luxo-exclusivas", image: "villa", label: "Luxo", title: "Luxo e experiências exclusivas", text: "Hotéis e experiências selecionados para uma viagem memorável.", service: "hospedagem", enabled: true, order: 4 },
  ],
  modules: [
    { key: "orlando", title: "Orlando", text: "Parques, ingressos, hotéis e deslocamentos organizados para a família.", service: "ingressos", image: "parques", enabled: true, order: 1 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Navios, itinerários e cabines comparados com clareza.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 2 },
    { key: "europa", title: "Europa", text: "Cidades, campo e experiências combinadas no seu ritmo.", service: "pacotes", image: "europa", enabled: true, order: 3 },
    { key: "america-do-sul", title: "América do Sul", text: "Roteiros próximos, com natureza, cultura e gastronomia.", service: "pacotes", image: "douro", enabled: true, order: 4 },
    { key: "caribe-mexico", title: "Caribe e México", text: "Praias e resorts escolhidos para cada perfil de viajante.", service: "hospedagem", image: "litoral", enabled: true, order: 5 },
    { key: "brasil-eua-canada", title: "Brasil, Estados Unidos e Canadá", text: "Destinos nacionais e na América do Norte planejados sob medida.", service: "pacotes", image: "brasil", enabled: true, order: 6 },
  ],
  highlights: [
    { title: "Orlando e famílias", text: "Planejamento completo de parques e hospedagem para aproveitar cada dia com as crianças.", service: "ingressos", cta: "Planejar Orlando" },
    { title: "Cruzeiros", text: "Escolha do navio, do roteiro e da cabine com orientação de especialista.", service: "cruzeiros", cta: "Falar sobre cruzeiros" },
    { title: "Sob medida e experiências exclusivas", text: "Roteiros personalizados com hotéis e experiências de alto padrão.", service: "pacotes", cta: "Solicitar proposta" },
  ],
  conciergePoints: [
    { key: "conversa", title: "1. Conversa inicial", text: "Pelo WhatsApp ou pelo formulário, entendemos quem viaja e o que desejam." },
    { key: "proposta", title: "2. Proposta personalizada", text: "Apresentamos opções equilibrando qualidade e investimento." },
    { key: "suporte", title: "3. Suporte antes, durante e depois", text: "Acompanhamos a viagem inteira e cuidamos de qualquer imprevisto até a solução." },
  ],
  faq: [
    { q: "Como funciona o atendimento?", a: "O atendimento é feito diretamente pela proprietária e sócios, pelo WhatsApp. Entendemos o seu perfil, apresentamos uma proposta personalizada e acompanhamos toda a viagem." },
    { q: "Vocês planejam viagens para famílias com crianças?", a: "Sim. Famílias com crianças e famílias multigeracionais estão entre as especialidades da Essyatur, incluindo Orlando e parques." },
    { q: "E se acontecer um imprevisto durante a viagem?", a: "O responsável pela sua viagem acompanha o caso até a solução. O suporte vale antes, durante e depois da viagem." },
    { q: "Quais destinos vocês atendem?", a: "Orlando, cruzeiros, Europa, América do Sul, Caribe e México, além de Brasil, Estados Unidos e Canadá." },
    { q: "Como começo a planejar?", a: "Envie uma solicitação pelo formulário do site ou fale pelo WhatsApp contando a ideia inicial da viagem." },
  ],
  copy: {
    destinations: { title: "Experiências por perfil", subtitle: "Viagens pensadas para quem viaja com você." },
    modules: { title: "Destinos e serviços", subtitle: "Os destinos e produtos em que a Essyatur é especialista." },
    highlights: { title: "Inspirações", subtitle: "Orlando, cruzeiros e viagens sob medida." },
    differentials: { title: "Por que viajar com a Essyatur", subtitle: "Segurança e suporte em cada etapa." },
    concierge: {
      kicker: "COMO FUNCIONA",
      title: "Suporte antes, durante e depois da viagem",
      subtitle: "Um atendimento próximo, do primeiro contato ao retorno.",
      cta: "Solicitar minha viagem",
    },
    faq: { title: "Dúvidas frequentes" },
  },
};

const PROFILE_BY_HOSTNAME: Record<string, AgencySiteProfileKey> = {

  "100limites.tur.br": "editorialDmc",
  "www.100limites.tur.br": "editorialDmc",
  "paraisoviagens.com": "luxuryCurated",
  "www.paraisoviagens.com": "luxuryCurated",
  "destinoscomaju.com.br": "editorialRose",
  "www.destinoscomaju.com.br": "editorialRose",
  "faeviagens.com.br": "faeCurated",
  "www.faeviagens.com.br": "faeCurated",
  /** Host sintético do laboratório — nunca aponta para tenants reais. */
  "sitelab.local": "siteLabBase",
  /** Host técnico de prévia da Casa Nova Tur (o domínio real não é vinculado). */
  "casanovatur.demo.local": "casaNovaCurated",
  "www.essyatur.com.br": "essyaCurated",
};

const PROFILES: Record<AgencySiteProfileKey, AgencySiteProfile> = {
  classic: CLASSIC,
  editorialDmc: EDITORIAL_DMC,
  luxuryCurated: LUXURY_CURATED,
  editorialRose: EDITORIAL_ROSE,
  faeCurated: FAE_CURATED,
  casaNovaCurated: CASA_NOVA_CURATED,
  essyaCurated: ESSYA_CURATED,
  siteLabBase: SITE_LAB_BASE,
};

function normalizeHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveProfileKey(hostname?: string | null): AgencySiteProfileKey {
  return PROFILE_BY_HOSTNAME[normalizeHost(hostname)] ?? "classic";
}

/** Perfil editorial completo do hostname (default: `classic`, sem overrides). */
export function resolveSiteProfile(hostname?: string | null): AgencySiteProfile {
  return PROFILES[resolveProfileKey(hostname)];
}
