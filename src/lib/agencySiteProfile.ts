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

export type AgencySiteProfileKey =
  | "classic"
  | "editorialDmc"
  | "luxuryCurated"
  | "editorialRose"
  | "faeCurated";

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
  about?: {
    kicker?: string;
    title?: string;
    text?: string;
    image?: string;
    /** Selo tipográfico factual (ex.: "Desde 1997") com apoio curto. */
    badge?: { value: string; label?: string };
  };
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
const EDITORIAL_ROSE: AgencySiteProfile = { key: "editorialRose" };

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
 * SiteLab Base — laboratório visual NEUTRO. Herda a estrutura editorial
 * compartilhada (`CURATED_SECTIONS`) e usa apenas textos de demonstração:
 * nenhum nome, ano de fundação, selo ou alegação factual de agência real.
 */
const SITE_LAB_BASE: AgencySiteProfile = {
  key: "siteLabBase",
  sections: { ...CURATED_SECTIONS },
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

const PROFILE_BY_HOSTNAME: Record<string, AgencySiteProfileKey> = {

  "100limites.tur.br": "editorialDmc",
  "www.100limites.tur.br": "editorialDmc",
  "paraisoviagens.com": "luxuryCurated",
  "www.paraisoviagens.com": "luxuryCurated",
  "destinoscomaju.com.br": "editorialRose",
  "www.destinoscomaju.com.br": "editorialRose",
  "faeviagens.com.br": "faeCurated",
  "www.faeviagens.com.br": "faeCurated",
};

const PROFILES: Record<AgencySiteProfileKey, AgencySiteProfile> = {
  classic: CLASSIC,
  editorialDmc: EDITORIAL_DMC,
  luxuryCurated: LUXURY_CURATED,
  editorialRose: EDITORIAL_ROSE,
  faeCurated: FAE_CURATED,
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
