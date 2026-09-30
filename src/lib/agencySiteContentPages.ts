/**
 * Páginas institucionais declarativas dos sites white label.
 *
 * O conteúdo editorial de páginas internas (Quem Somos, Frota, Passeios...)
 * mora aqui, por PERFIL, e é renderizado pela página compartilhada
 * `AgencyContentPage`. Nenhum tenant sem páginas declaradas é afetado: a rota
 * só existe quando o perfil do hostname declara a página.
 */
import type { AgencyImageSlot } from "@/lib/agencySiteConfig";
import { resolveSiteProfile, type AgencySiteProfileKey } from "@/lib/agencySiteProfile";

export interface AgencyContentBlock {
  key: string;
  title?: string;
  /** Parágrafos do bloco (sem HTML). */
  paragraphs?: string[];
  /** Lista de itens curtos exibidos como marcadores. */
  bullets?: string[];
}

export interface AgencyContentCard {
  key: string;
  title: string;
  /** Linha auxiliar curta (duração, região, público). */
  meta?: string;
  text: string;
  bullets?: string[];
  image?: AgencyImageSlot;
}

export interface AgencyContentPage {
  key: string;
  /** Caminho interno da página dentro do site da agência. */
  path: string;
  kicker: string;
  title: string;
  /** Linha de apoio abaixo do título. */
  subtitle?: string;
  heroImage?: AgencyImageSlot;
  intro?: string[];
  blocks?: AgencyContentBlock[];
  cardsTitle?: string;
  cardsSubtitle?: string;
  cards?: AgencyContentCard[];
  closing?: { title: string; text: string; cta: string };
  seo: { title: string; description: string };
}

/** 100 Limites — páginas do portfólio DMC/agência em Portugal. */
const EDITORIAL_DMC_PAGES: AgencyContentPage[] = [
  {
    key: "quem-somos-dmc",
    path: "/quem-somos/dmc",
    kicker: "QUEM SOMOS · DMC EM PORTUGAL",
    title: "Sua operação local em Portugal, com o cuidado que a sua agência promete",
    subtitle:
      "Serviços receptivos em Portugal para agências de viagens brasileiras, com atendimento conduzido por quem vive no destino.",
    heroImage: "douro",
    intro: [
      "A 100 Limites atua em Portugal como DMC: recebe, acompanha e assiste localmente os passageiros das agências parceiras, preservando sempre a relação entre o agente e o seu cliente.",
      "Amanda Larini vive em Lisboa e conduz pessoalmente a relação com as agências, do orçamento à execução dos serviços no destino. A proposta é simples: entregar ao passageiro a mesma atenção que a agência prometeu no Brasil.",
    ],
    blocks: [
      {
        key: "como-atuamos",
        title: "Como trabalhamos com a sua agência",
        bullets: [
          "Cotação de transfers, passeios, guias e serviços avulsos em Portugal.",
          "Montagem de roteiros e programações completas para os seus clientes.",
          "Reconfirmação dos serviços contratados antes da chegada do passageiro.",
          "Contato local durante a viagem para orientações e imprevistos.",
          "Sua marca preservada: o passageiro continua sendo cliente da sua agência.",
        ],
      },
      {
        key: "por-que",
        title: "Por que contar com um parceiro local",
        paragraphs: [
          "Fuso horário, idioma, distâncias reais entre cidades e sazonalidade mudam completamente o resultado de um roteiro em Portugal.",
          "Com uma consultora residente no destino, a agência ganha respostas rápidas, avaliação honesta do que cabe em cada roteiro e alguém presente caso algo precise ser resolvido durante a viagem.",
        ],
      },
    ],
    closing: {
      title: "Sou agente de viagens e quero cotar serviços em Portugal",
      text: "Envie os dados da viagem e os serviços desejados. A cotação é preparada pela Amanda, com as condições comerciais para agências.",
      cta: "Solicitar cotação para minha agência",
    },
    seo: {
      title: "DMC em Portugal para agências de viagens",
      description:
        "Serviços receptivos em Portugal para agências brasileiras: transfers, passeios, roteiros e apoio local com a 100 Limites.",
    },
  },
  {
    key: "quem-somos-agencia",
    path: "/quem-somos/agencia",
    kicker: "QUEM SOMOS · A AGÊNCIA",
    title: "Viagens planejadas com atenção a cada detalhe",
    subtitle:
      "Uma agência conduzida por Amanda Larini, com mais de 20 anos de experiência no turismo e atendimento próximo em cada etapa.",
    heroImage: "villa",
    intro: [
      "A 100 Limites nasceu em 2015 do desejo de organizar viagens com tempo, escuta e cuidado — sem pacotes prontos e sem pressa para fechar.",
      "Amanda Larini reúne mais de 20 anos de experiência no mercado de turismo e acompanha pessoalmente o planejamento de cada cliente, do primeiro contato ao retorno para casa.",
    ],
    blocks: [
      {
        key: "como-planejamos",
        title: "Como o planejamento acontece",
        bullets: [
          "Conversa inicial para entender gostos, expectativas e o investimento previsto.",
          "Proposta personalizada, com roteiro, hospedagens e serviços explicados.",
          "Ajustes feitos junto com você até a viagem fazer sentido.",
          "Reconfirmação das reservas e orientações antes do embarque.",
          "Acompanhamento durante a viagem e retorno depois dela.",
        ],
      },
      {
        key: "para-quem",
        title: "Para quem viajamos",
        paragraphs: [
          "Famílias, casais, grupos de amigos e viajantes que preferem ter alguém de confiança cuidando da logística e dos detalhes.",
          "Atendemos destinos no Brasil e no mundo, com atenção especial a Portugal e à Europa, onde a agência tem presença local.",
        ],
      },
    ],
    closing: {
      title: "Vamos planejar a sua próxima viagem",
      text: "Conte a sua ideia e receba uma proposta preparada para o seu perfil, com valores e condições claras.",
      cta: "Solicitar meu planejamento",
    },
    seo: {
      title: "A agência e a consultora Amanda Larini",
      description:
        "Conheça a 100 Limites: agência fundada em 2015, com planejamento personalizado e atendimento próximo em cada etapa da viagem.",
    },
  },
  {
    key: "frota",
    path: "/frota",
    kicker: "FROTA E TRANSFERS",
    title: "Deslocamentos com conforto, pontualidade e discrição",
    subtitle:
      "Veículos executivos, minivans e opções para grupos, com recepção nominal no desembarque e motoristas locais.",
    heroImage: "grupos",
    intro: [
      "Cada trecho é planejado conforme o número de passageiros, a bagagem e o roteiro do dia. Os veículos são climatizados e higienizados, e o passageiro sempre sabe com antecedência quem vai recebê-lo.",
    ],
    cardsTitle: "Opções de veículo",
    cards: [
      {
        key: "executivo",
        title: "Carro executivo",
        meta: "Até 4 passageiros",
        text: "Conforto e discrição para casais, viagens de negócios e pequenos deslocamentos.",
        image: "villa",
      },
      {
        key: "minivan",
        title: "Minivan executiva",
        meta: "Até 8 passageiros",
        text: "Espaço para bagagem e conforto para famílias e pequenos grupos em roteiros de dia inteiro.",
        image: "europa",
      },
      {
        key: "grupos",
        title: "Mini-ônibus e ônibus",
        meta: "Sob solicitação",
        text: "Para grupos maiores, famílias em celebração, comitivas e viagens organizadas, conforme disponibilidade.",
        image: "grupos",
      },
    ],
    blocks: [
      {
        key: "transfers",
        title: "Transfers mais solicitados",
        bullets: [
          "Aeroporto de Lisboa — hotel ou apartamento, nos dois sentidos.",
          "Lisboa — Porto, com possibilidade de paradas no caminho.",
          "Lisboa — Algarve.",
          "Lisboa — Coimbra.",
          "Trechos sob medida, conforme o seu roteiro.",
        ],
      },
      {
        key: "como-funciona",
        title: "O que está incluído no serviço",
        bullets: [
          "Recepção no desembarque com placa nominal.",
          "Contato prévio com o passageiro antes do trecho.",
          "Acompanhamento do horário do voo em caso de atraso.",
          "Auxílio com bagagem e veículo climatizado.",
        ],
      },
    ],
    closing: {
      title: "Solicitar um transfer ou veículo",
      text: "Informe as datas, os trechos e o número de passageiros para receber os valores atualizados.",
      cta: "Solicitar transfer",
    },
    seo: {
      title: "Frota e transfers em Portugal",
      description:
        "Carros executivos, minivans e opções para grupos em Portugal, com recepção nominal no aeroporto e trechos sob medida.",
    },
  },
  {
    key: "passeios-lisboa",
    path: "/passeios/lisboa",
    kicker: "PASSEIOS · LISBOA",
    title: "Lisboa no seu ritmo, com quem vive a cidade",
    subtitle:
      "Roteiros a pé ou com veículo executivo, ajustados ao seu interesse: história, mirantes, gastronomia ou compras.",
    heroImage: "europa",
    intro: [
      "Os passeios em Lisboa são conduzidos com tempo para observar, conversar e provar a cidade — e não apenas para cumprir uma lista de pontos turísticos.",
    ],
    cardsTitle: "Passeios em Lisboa",
    cards: [
      {
        key: "city-walk",
        title: "City Walk Lisboa",
        meta: "Cerca de 6 horas · a pé",
        text: "Caminhada pelos bairros históricos, com paradas para descanso e provas gastronômicas ao longo do trajeto.",
        bullets: [
          "Chiado e Bairro Alto",
          "Alfama e o traçado árabe da cidade",
          "Mirantes e jardins com vista para o Tejo",
          "Paradas para pastel de nata e pastel de bacalhau",
        ],
        image: "gastronomia",
      },
      {
        key: "city-tour-executivo",
        title: "City Tour com veículo executivo",
        meta: "Cerca de 6 horas · com veículo",
        text: "Indicado para quem prefere conforto na locomoção, tem mobilidade reduzida ou pouco tempo na cidade.",
        bullets: [
          "Belém: Torre, Padrão dos Descobrimentos e Mosteiro dos Jerónimos",
          "Paradas estratégicas para fotos",
          "Roteiro ajustado ao ritmo do grupo",
        ],
        image: "villa",
      },
      {
        key: "tour-compras",
        title: "Tour de compras",
        meta: "Cerca de 6 horas · com veículo",
        text: "Roteiro montado conforme o que você procura, com orientação sobre lojas, preços e o que vale trazer.",
        bullets: [
          "Vinhos e azeites portugueses",
          "Outlets e lojas de marca",
          "Perfumes, maquiagem e roupas",
        ],
        image: "gastronomia",
      },
    ],
    closing: {
      title: "Montar meu passeio em Lisboa",
      text: "Conte quantas pessoas viajam, as datas e o que mais interessa no roteiro.",
      cta: "Solicitar passeio em Lisboa",
    },
    seo: {
      title: "Passeios em Lisboa com consultora local",
      description:
        "City Walk, city tour executivo e tour de compras em Lisboa, com roteiros ajustados ao ritmo de cada viajante.",
    },
  },
  {
    key: "passeios-portugal",
    path: "/passeios/portugal",
    kicker: "PASSEIOS · PORTUGAL",
    title: "Portugal além de Lisboa, com roteiros bem planejados",
    subtitle:
      "Sintra, Fátima, Óbidos, Nazaré, Évora, Porto, o Douro e as aldeias históricas, em dias bem aproveitados.",
    heroImage: "douro",
    intro: [
      "As distâncias em Portugal permitem combinar cidades em um mesmo dia — desde que o roteiro respeite horários, épocas do ano e o ritmo de quem viaja. É isso que organizamos com você.",
    ],
    cardsTitle: "Roteiros pelo país",
    cards: [
      {
        key: "sintra-cascais",
        title: "Sintra, Cabo da Roca, Cascais e Estoril",
        meta: "Dia inteiro",
        text: "Palácios, floresta, o ponto mais ocidental da Europa e a Riviera Portuguesa em um só dia.",
        bullets: [
          "Palácio da Pena e Quinta da Regaleira",
          "Travesseiros e queijadas na Casa da Piriquita",
          "Cabo da Roca, Boca do Inferno e orla de Cascais",
        ],
        image: "europaCastelo",
      },
      {
        key: "fatima",
        title: "Fátima e rota religiosa",
        meta: "Dia inteiro ou com programação noturna",
        text: "Visita ao Santuário e aos locais ligados aos pastorinhos, com a opção de acompanhar a Procissão das Velas.",
        bullets: [
          "Aljustrel e a casa dos pastorinhos",
          "Santuário de Fátima e Capelinha das Aparições",
          "Opção de Procissão das Velas à noite",
        ],
        image: "villa",
      },
      {
        key: "obidos-nazare",
        title: "Óbidos, Nazaré e Alcobaça",
        meta: "Dia inteiro",
        text: "Vila medieval murada, a praia das ondas gigantes e o mosteiro de Alcobaça, em combinações possíveis com Fátima.",
        bullets: [
          "Óbidos e a ginjinha servida no copo de chocolate",
          "Nazaré e o mirante do Suberco",
          "Batalha e Tomar como alternativas de roteiro",
        ],
        image: "europa",
      },
      {
        key: "porto-douro",
        title: "Porto e Vale do Douro",
        meta: "Dia inteiro ou com pernoite",
        text: "O centro histórico do Porto e as vinhas em terraços do Douro, com degustações e cruzeiro pelo rio.",
        bullets: [
          "Sé, São Bento, Livraria Lello e Ribeira",
          "Caves de vinho do Porto em Gaia",
          "Cruzeiro das Seis Pontes",
          "Com pernoite: visita e degustação em quinta do Douro",
        ],
        image: "douro",
      },
      {
        key: "alentejo-evora",
        title: "Évora, Monsaraz e Alentejo",
        meta: "Dia inteiro ou com pernoite",
        text: "História romana, vilarejos medievais e uma das regiões de vinho mais marcantes do país.",
        bullets: [
          "Templo Romano e Capela dos Ossos, em Évora",
          "Monsaraz e a vista para o Alqueva",
          "Experiência enogastronômica em adega da região",
        ],
        image: "gastronomia",
      },
      {
        key: "aldeias-historicas",
        title: "Aldeias históricas",
        meta: "Roteiro de vários dias",
        text: "Para quem busca raízes, autenticidade e o Portugal de pedra, com tempo para conversar com quem vive ali.",
        bullets: ["Monsanto", "Sortelha", "Belmonte", "Marialva"],
        image: "villa",
      },
      {
        key: "grupos",
        title: "Viagens em grupo",
        meta: "Sob medida",
        text: "Roteiros e logística para famílias grandes, grupos de amigos, comitivas corporativas, escolares ou religiosos.",
        image: "grupos",
      },
    ],
    closing: {
      title: "Planejar meus dias em Portugal",
      text: "Diga quantos dias você tem no país e o que não pode faltar. Montamos a sequência que melhor aproveita o seu tempo.",
      cta: "Solicitar roteiro em Portugal",
    },
    seo: {
      title: "Passeios e roteiros por Portugal",
      description:
        "Sintra, Fátima, Óbidos, Nazaré, Évora, Porto e Vale do Douro: roteiros por Portugal organizados com consultoria local.",
    },
  },
  {
    key: "europa",
    path: "/europa",
    kicker: "EUROPA",
    title: "Viagens pela Europa com acompanhamento presencial",
    subtitle:
      "A liberdade de viajar como turista, com uma consultora experiente ao seu lado do embarque ao retorno.",
    heroImage: "europaCastelo",
    intro: [
      "Para quem deseja conhecer a Europa sem se preocupar com idioma, deslocamentos entre países e imprevistos, a Amanda pode acompanhar a viagem pessoalmente.",
      "O roteiro é construído junto com você e ajustado durante a viagem: mais tempo em um museu, uma tarde de compras, um jantar sem pressa ou um dia de descanso quando o corpo pede.",
    ],
    blocks: [
      {
        key: "o-que-muda",
        title: "O que o acompanhamento resolve",
        bullets: [
          "Idioma e comunicação em hotéis, restaurantes e serviços.",
          "Trens, transfers e trajetos entre cidades e países.",
          "Escolha de horários e ordem das visitas para evitar filas e desgaste.",
          "Apoio imediato em imprevistos de saúde, bagagem ou reservas.",
        ],
      },
      {
        key: "para-quem",
        title: "Para quem faz sentido",
        paragraphs: [
          "Viajantes na primeira viagem internacional, famílias de várias gerações, pessoas que viajam sozinhas e grupos de amigos que preferem não cuidar da logística.",
          "A disponibilidade de acompanhamento depende do período e do roteiro, e é combinada na proposta.",
        ],
      },
    ],
    closing: {
      title: "Quero conhecer a Europa com acompanhamento",
      text: "Conte o período, os países de interesse e quem viaja com você para avaliarmos a disponibilidade.",
      cta: "Solicitar viagem pela Europa",
    },
    seo: {
      title: "Viagens pela Europa com acompanhamento",
      description:
        "Roteiros pela Europa com acompanhamento presencial de consultora experiente: logística, idioma e apoio durante toda a viagem.",
    },
  },
  {
    key: "pet-friendly",
    path: "/pet-friendly",
    kicker: "PET FRIENDLY",
    title: "Seu pet também faz parte da viagem",
    subtitle:
      "Transporte e acompanhamento especializado para quem chega, viaja ou se muda pela Europa com animais de estimação.",
    heroImage: "brasil",
    intro: [
      "Chegar a um país novo com um animal de estimação envolve mais do que reservar um carro. Envolve conforto, temperatura, paradas e alguém que entenda o estresse do trajeto.",
      "O serviço Pet Friendly da 100 Limites organiza esses deslocamentos com atenção ao bem-estar do animal e tranquilidade para a família.",
    ],
    blocks: [
      {
        key: "quando",
        title: "Quando o serviço é indicado",
        bullets: [
          "Famílias em processo de mudança para Portugal ou outro país da Europa.",
          "Chegada ao aeroporto com o pet e trecho até a nova casa ou hospedagem.",
          "Férias e deslocamentos internos com o animal acompanhando a família.",
        ],
      },
      {
        key: "como",
        title: "Como cuidamos do trajeto",
        bullets: [
          "Veículos climatizados e adequados ao tamanho do animal.",
          "Caixa de transporte confortável e segura quando necessário.",
          "Paradas planejadas em trechos mais longos.",
          "Combinação prévia de cuidados, rotina e necessidades do pet.",
        ],
      },
    ],
    closing: {
      title: "Falar sobre a viagem com o meu pet",
      text: "Informe as datas, o trecho e os dados do animal para avaliarmos o melhor formato de transporte.",
      cta: "Solicitar serviço pet friendly",
    },
    seo: {
      title: "Transporte pet friendly em Portugal e Europa",
      description:
        "Transporte e acompanhamento de animais de estimação em Portugal e na Europa, com veículos climatizados e cuidado no trajeto.",
    },
  },
];

const PAGES_BY_PROFILE: Partial<Record<AgencySiteProfileKey, AgencyContentPage[]>> = {
  editorialDmc: EDITORIAL_DMC_PAGES,
};

/** Páginas institucionais declaradas para o hostname (vazio por padrão). */
export function resolveContentPages(hostname?: string | null): AgencyContentPage[] {
  return PAGES_BY_PROFILE[resolveSiteProfile(hostname).key] ?? [];
}

/** Página institucional correspondente ao caminho interno, quando existir. */
export function resolveContentPage(
  hostname: string | null | undefined,
  path: string,
): AgencyContentPage | null {
  const normalized = `/${(path || "").replace(/^\/+|\/+$/g, "")}`;
  return resolveContentPages(hostname).find((p) => p.path === normalized) ?? null;
}
