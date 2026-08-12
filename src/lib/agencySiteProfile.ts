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
import {
  type AgencyDestination,
  type AgencyDifferential,
  type AgencyHeroSlide,
  type AgencyHighlight,
  type AgencyModule,
  type AgencySectionKey,
  type AgencySectionOverride,
} from "@/lib/agencySiteConfig";

export type AgencySiteProfileKey = "classic" | "editorialDmc" | "luxuryCurated";

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
}

export interface AgencySiteProfile {
  key: AgencySiteProfileKey;
  /** Ativa/oculta/reordena seções sobre os defaults compartilhados. */
  sections?: Partial<Record<AgencySectionKey, AgencySectionOverride>>;
  hero?: AgencyHeroSlide[];
  /** Slot de imagem de fallback do hero (resolvido na apresentação). */
  heroImage?: string;
  destinations?: AgencyDestination[];
  modules?: AgencyModule[];
  highlights?: AgencyHighlight[];
  differentials?: AgencyDifferential[];
  faq?: { q: string; a: string }[];
  signature?: AgencySignatureContent;
  credentials?: AgencyCredentialsContent;
  /** Títulos/subtítulos por seção (fallback: textos padrão da engine). */
  copy?: Partial<Record<AgencySectionKey, AgencySectionCopy>>;
  /** Conteúdo institucional da seção "about" quando o perfil define a redação. */
  about?: { kicker?: string; title?: string; text?: string; image?: string };
}

/* ------------------------------ PERFIS ------------------------------ */

const CLASSIC: AgencySiteProfile = { key: "classic" };

/** 100 Limites — DMC em Portugal, visual editorial vermelho (sem regressão). */
const EDITORIAL_DMC: AgencySiteProfile = { key: "editorialDmc" };

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
    title: "O luxo está na forma de viver cada destino.",
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
    title: "Uma trajetória construída desde 1997.",
    text:
      "À frente da Paraíso, Mariana e Daniela unem repertório, escuta e cuidado para desenhar viagens personalizadas.",
    image: "villa",
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

const PROFILE_BY_HOSTNAME: Record<string, AgencySiteProfileKey> = {
  "100limites.tur.br": "editorialDmc",
  "www.100limites.tur.br": "editorialDmc",
  "paraisoviagens.com": "luxuryCurated",
  "www.paraisoviagens.com": "luxuryCurated",
};

const PROFILES: Record<AgencySiteProfileKey, AgencySiteProfile> = {
  classic: CLASSIC,
  editorialDmc: EDITORIAL_DMC,
  luxuryCurated: LUXURY_CURATED,
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
