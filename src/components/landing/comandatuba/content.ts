// Central content config for the Transamerica Comandatuba B2C landing page.
// White-label ready: all agency-scoped values are provided through
// AgencyConfig (see useComandatubaAgency) and referenced by the page.

export const FORM_ANCHOR_ID = "cotacao";

export type AgencyConfig = {
  name: string;
  logoUrl: string | null;
  primaryColor: string; // hex or hsl string
  consultantName: string;
  consultantFirstName: string;
  consultantRole: string;
  consultantPhotoUrl: string | null;
  whatsapp: string; // digits only, e.g. 5511999999999
  phone: string;
  email: string;
  city: string;
  hours: string;
  privacyUrl: string;
};

export const DEFAULT_AGENCY: AgencyConfig = {
  name: "Agentes de Sonhos",
  logoUrl: null,
  primaryColor: "#0f7a5f",
  consultantName: "Fernando Nobre",
  consultantFirstName: "Fernando",
  consultantRole: "Consultor(a) de viagens",
  consultantPhotoUrl: null,
  whatsapp: "5511999999999",
  phone: "(11) 99999-9999",
  email: "contato@agentesdesonhos.com.br",
  city: "",
  hours: "Seg. a Sex., das 9h às 18h",
  privacyUrl: "/politica-de-privacidade",
};

export const HERO = {
  badge: "Ilha de Comandatuba • Bahia",
  titleLead: "Sua próxima história começa em uma",
  titleHighlight: "ilha na Bahia.",
  description:
    "Natureza preservada, all inclusive e lazer para diferentes idades — com a orientação da sua agência em cada etapa da viagem.",
  ctaPrimary: "Receber minha cotação",
  ctaSecondary: "Conhecer o resort",
  indicators: [
    { title: "All inclusive", text: "Mais praticidade para aproveitar cada dia." },
    { title: "21 km de praia", text: "Mar, coqueiros e espaço para desacelerar." },
    { title: "Mais de 80 opções de lazer", text: "Esporte, diversão e experiências para diferentes idades." },
  ],
  imageAlt:
    "Vista aérea do Transamerica Comandatuba, com praia, coqueiros, piscinas e áreas do resort",
};

export const REFUGE = {
  eyebrow: "O RESORT",
  title: "Um refúgio cercado pela natureza",
  description:
    "Na Ilha de Comandatuba, no sul da Bahia, praia, coqueirais e vegetação preservada formam o cenário para dias que podem ser tão tranquilos ou animados quanto você quiser. Um destino feito para reunir a família, desacelerar e aproveitar mais cada momento.",
  benefits: [
    { title: "Natureza preservada", text: "Uma ilha de paisagens tropicais, mar e vegetação nativa." },
    { title: "Férias em família", text: "Espaços e experiências para diferentes gerações aproveitarem juntas." },
    { title: "Gastronomia com identidade baiana", text: "Sabores regionais e variedade para tornar cada refeição parte da viagem." },
    { title: "Lazer no seu ritmo", text: "Escolha entre esporte, diversão, natureza ou simplesmente descanso." },
  ],
};

export const ALL_INCLUSIVE = {
  eyebrow: "All inclusive",
  title: "Praticidade para curtir cada momento",
  description:
    "O sistema all inclusive reúne alimentação disponível ao longo do dia e bebidas servidas conforme o funcionamento dos pontos de consumo. Assim, você passa menos tempo planejando detalhes e mais tempo aproveitando a ilha.",
  descriptionExtra:
    "Uma experiência pensada para trazer mais comodidade às famílias e mais liberdade para cada pessoa escolher como deseja viver o dia.",
  benefits: [
    "Alimentação disponível 24 horas",
    "Bebidas alcoólicas e não alcoólicas selecionadas",
    "Lanches e petiscos ao longo do dia",
    "Sabores baianos e opções variadas",
    "Programação esportiva e recreativa",
    "Mais tempo para aproveitar a viagem",
  ],
  disclaimer:
    "Horários, cardápios, bebidas, pontos de atendimento, reservas e inclusões podem variar conforme a operação e as condições vigentes do resort. Alguns serviços e experiências especiais podem ter custo adicional.",
};

export const EXPERIENCES = {
  title: "Experiências e lazer para todos os ritmos",
  subtitle:
    "São mais de 80 opções para preencher os dias com movimento, diversão, natureza e momentos de pausa.",
  disclaimer:
    "A programação varia conforme o período da hospedagem. Algumas atividades e experiências especiais podem ter custo adicional.",
  items: [
    { title: "Piscinas", text: "Mergulhos, brincadeiras e pausas sob o sol." },
    { title: "Praia", text: "21 km de areia para caminhar e respirar no seu ritmo." },
    { title: "Esportes", text: "Atividades em quadras, na areia e em diferentes áreas do resort." },
    { title: "Atividades aquáticas", text: "Experiências para aproveitar a ilha também dentro d'água." },
    { title: "Crianças", text: "Monitoria e programação lúdica para os pequenos viverem suas próprias descobertas." },
    { title: "Natureza", text: "Contato com os cenários e ecossistemas preservados da ilha." },
    { title: "Bem-estar", text: "Momentos para desacelerar, descansar e se reconectar." },
    { title: "Entretenimento", text: "Programação para compartilhar bons momentos ao longo do dia." },
  ],
};

export type AccommodationGroupKey = "apartamentos" | "suites" | "bangalos";

export type AccommodationCategory = {
  /** Stable key used for tracking and image mapping. */
  key: string;
  /** Exact value persisted in the lead / form field. */
  name: string;
  group: AccommodationGroupKey;
  capacity: string;
  cardText: string;
  details: string[];
  imageAlt: string;
};

export const ACCOMMODATION_GROUPS: { key: AccommodationGroupKey; label: string }[] = [
  { key: "apartamentos", label: "Apartamentos" },
  { key: "suites", label: "Suítes" },
  { key: "bangalos", label: "Bangalôs" },
];

export const ACCOMMODATION_CATEGORIES: AccommodationCategory[] = [
  {
    key: "apartamento-standard",
    name: "Apartamento Standard",
    group: "apartamentos",
    capacity: "Até 4 pessoas, desde que uma ou duas tenham até 17 anos.",
    cardText:
      "Praticidade no bloco principal, perto das piscinas, restaurantes e áreas centrais do resort.",
    details: [
      "Bloco principal, alas norte e sul.",
      "Aproximadamente 32 m² mais terraço.",
      "Configurações de camas sujeitas à disponibilidade.",
      "Possibilidade de quartos conjugados.",
    ],
    imageAlt:
      "Apartamento Standard do Transamerica Comandatuba, no bloco principal do resort",
  },
  {
    key: "apartamento-luxo",
    name: "Apartamento Luxo",
    group: "apartamentos",
    capacity: "Até 4 pessoas, desde que uma ou duas tenham até 17 anos.",
    cardText: "Mais espaço no bloco central, com vista voltada para a piscina ou para os jardins.",
    details: [
      "Ala leste do bloco principal.",
      "Aproximadamente 38 m² mais terraço.",
      "Duas camas de casal king size.",
      "Possibilidade de unidades conjugadas.",
      "Banheira integrada à área do chuveiro.",
    ],
    imageAlt:
      "Apartamento Luxo do Transamerica Comandatuba, com duas camas king size na ala leste",
  },
  {
    key: "apartamento-premium",
    name: "Apartamento Premium",
    group: "apartamentos",
    capacity: "Até 3 pessoas: dois adultos e uma criança ou um adulto e duas crianças.",
    cardText: "Localização privilegiada em frente à piscina, com fácil acesso às áreas de lazer.",
    details: [
      "Ala sul do bloco principal.",
      "Aproximadamente 37 m² mais terraço.",
      "Cama king size.",
      "Serviços e comodidades Premium sujeitos às condições vigentes.",
    ],
    imageAlt:
      "Apartamento Premium do Transamerica Comandatuba, na ala sul em frente à piscina",
  },
  {
    key: "apartamento-adaptado",
    name: "Apartamento Adaptado",
    group: "apartamentos",
    capacity: "Até 3 pessoas.",
    cardText:
      "Acomodação térrea preparada para oferecer mais segurança, autonomia e facilidade de acesso.",
    details: [
      "Unidades no piso térreo.",
      "Alas norte e leste.",
      "Três camas de solteiro.",
      "Banheiro adaptado com barras de apoio.",
      "Porta deslizante, cadeira de banho e suporte de cabides rebaixado.",
    ],
    imageAlt:
      "Apartamento Adaptado do Transamerica Comandatuba, no piso térreo com acessibilidade",
  },
  {
    key: "suite-familia",
    name: "Suíte Família",
    group: "suites",
    capacity: "Até 5 pessoas: quatro adultos e uma criança.",
    cardText: "Dois ambientes e dois banheiros para famílias que desejam mais espaço e privacidade.",
    details: [
      "Dois quartos.",
      "Uma cama king size e três camas de solteiro.",
      "Dois banheiros.",
      "Aproximadamente 63 m² mais terraço.",
      "Ala norte do bloco principal.",
      "Vista para os coqueiros e parcialmente para o mar.",
    ],
    imageAlt: "Suíte Família do Transamerica Comandatuba, com dois quartos na ala norte",
  },
  {
    key: "suite-premium",
    name: "Suíte Premium",
    group: "suites",
    capacity: "Até 2 pessoas.",
    cardText: "Uma opção espaçosa para casais, com sala de estar, closet e localização privilegiada.",
    details: [
      "Ala leste do bloco principal.",
      "Cama king size.",
      "Ampla sala de estar.",
      "Closet e lavabo.",
      "Terraço e vista privilegiada.",
    ],
    imageAlt: "Suíte Premium do Transamerica Comandatuba, com ampla sala de estar para casais",
  },
  {
    key: "bangalo-standard",
    name: "Bangalô Standard",
    group: "bangalos",
    capacity: "Até 3 adultos ou 2 adultos e 1 criança.",
    cardText: "Mais privacidade e contato com a natureza, cercado pelos jardins da ilha.",
    details: [
      "Uma cama queen size e uma cama de solteiro.",
      "Aproximadamente 24 m² mais varanda.",
      "Entre 300 e 600 metros da recepção.",
      "Unidades conectantes.",
      "Transporte interno sujeito à operação.",
    ],
    imageAlt: "Bangalô Standard do Transamerica Comandatuba, cercado pelos jardins da ilha",
  },
  {
    key: "bangalo-luxo",
    name: "Bangalô Luxo",
    group: "bangalos",
    capacity: "Até 4 pessoas, desde que uma ou duas tenham até 17 anos.",
    cardText: "Um bangalô mais amplo, com varanda e vista para o coqueiral ou para o mar.",
    details: [
      "Cama king size ou configuração familiar conforme disponibilidade.",
      "Aproximadamente 36 m² mais varanda.",
      "Entre 200 e 500 metros da recepção.",
      "Rede na varanda.",
    ],
    imageAlt: "Bangalô Luxo do Transamerica Comandatuba, com varanda e rede voltada ao coqueiral",
  },
  {
    key: "bangalo-familia",
    name: "Bangalô Família",
    group: "bangalos",
    capacity: "Até 4 adultos ou 3 adultos e 1 criança.",
    cardText: "Uma verdadeira casa de praia, com dois quartos, sala e ampla varanda.",
    details: [
      "Categoria composta por uma única unidade.",
      "Dois quartos.",
      "Um quarto com cama king size.",
      "Um quarto com duas camas de solteiro.",
      "Banheiros privativos.",
      "Sala entre os quartos.",
      "Varanda e vista para o mar.",
    ],
    imageAlt: "Bangalô Família do Transamerica Comandatuba, com dois quartos e vista para o mar",
  },
  {
    key: "bangalo-premium",
    name: "Bangalô Premium",
    group: "bangalos",
    capacity: "Até 6 adultos ou 4 adultos e 2 crianças.",
    cardText:
      "A acomodação mais ampla do resort, com três quartos, sala e varanda voltada para o mar.",
    details: [
      "Três quartos.",
      "Três banheiros privativos.",
      "Uma cama king size e quatro camas de solteiro.",
      "Ampla sala de estar.",
      "Aproximadamente 115 m² mais 33 m² de varanda.",
      "Vista para o mar.",
      "Próximo ao bloco central e à piscina.",
    ],
    imageAlt: "Bangalô Premium do Transamerica Comandatuba, a acomodação mais ampla do resort",
  },
];

/** Exact options for the "Acomodação de interesse" form field. */
export const ACCOMMODATION_FORM_OPTIONS = ACCOMMODATION_CATEGORIES.map((c) => c.name);

export const ACCOMMODATIONS = {
  title: "Acomodações para cada forma de viajar",
  subtitle:
    "Entre apartamentos próximos às áreas centrais, suítes espaçosas e bangalôs cercados pela natureza, existem opções para casais, famílias e grupos de diferentes tamanhos. Conheça as categorias e conte com a sua agência para escolher a mais adequada para a viagem.",
  cta: "Consultar esta opção",
  detailsCta: "Ver detalhes",
  capacityLabel: "Capacidade",
  detailsLabel: "Características",
  disclaimer:
    "Capacidades, configurações, localização, serviços, benefícios e disponibilidade podem variar. A sua agência confirmará as condições vigentes e a categoria mais adequada para a composição da viagem.",
};

export const AUDIENCE = {
  title: "Para quem é Comandatuba?",
  items: [
    {
      title: "Famílias com crianças",
      text: "Para quem procura estrutura, atividades e tempo de qualidade sem precisar organizar cada momento do dia.",
    },
    {
      title: "Casais",
      text: "Para quem quer combinar praia, gastronomia, natureza e espaço para desacelerar.",
    },
    {
      title: "Famílias multigeracionais",
      text: "Para viagens em que crianças, pais e avós desejam estar juntos sem abrir mão de seus próprios ritmos.",
    },
    {
      title: "Grupos de amigos",
      text: "Para quem quer compartilhar a viagem e ter liberdade para escolher experiências diferentes ao longo do dia.",
    },
  ],
};

export const HOW_TO_GET = {
  title: "Como chegar",
  intro:
    "A viagem pode ser organizada por duas rotas principais. A melhor escolha depende da cidade de saída, das datas e da operação aérea disponível no período.",
  routes: [
    {
      title: "Via Aeroporto de Comandatuba, em Una",
      text: "É o acesso mais direto ao resort. O aeroporto fica no continente, próximo à ilha, permitindo uma chegada mais rápida depois do desembarque.",
    },
    {
      title: "Via Aeroporto de Ilhéus",
      text: "Ilhéus funciona como alternativa para quem encontra melhores opções de voo. A partir do aeroporto, a viagem continua em transfer até a região de Comandatuba.",
    },
  ],
  highlightTitle: "A melhor rota não é igual para todo mundo.",
  highlightText:
    "A sua agência compara voos, horários, transfers e condições para indicar a logística mais confortável para a sua viagem.",
  note:
    "Rotas, companhias, frequências, transfers, horários e eventuais custos estão sujeitos a disponibilidade e confirmação.",
};

/** Compact multimedia gallery shown in the middle column of the audience/access section. */
export type GalleryMedia = {
  key: string;
  kind: "video" | "photo";
  caption: string;
  alt: string;
  /** object-position for the short card frame. */
  position: string;
};

export const GALLERY_MEDIA: GalleryMedia[] = [
  {
    key: "video-aereo",
    kind: "video",
    caption: "Comandatuba vista do alto",
    alt: "Vídeo com tour aéreo sobre a Ilha de Comandatuba e o resort",
    position: "center 50%",
  },
  {
    key: "aerea",
    kind: "photo",
    caption: "Uma ilha cercada pela natureza",
    alt: "Vista aérea da Ilha de Comandatuba, com praia, mar e vegetação preservada",
    position: "center 50%",
  },
  {
    key: "familia",
    kind: "photo",
    caption: "Momentos para viver em família",
    alt: "Criança se divertindo com o personagem Tobby em área de lazer do resort",
    position: "center 40%",
  },
  {
    key: "piscina",
    kind: "photo",
    caption: "Piscinas para aproveitar o dia",
    alt: "Piscina do Transamerica Comandatuba cercada por coqueiros e espreguiçadeiras",
    position: "center 55%",
  },
  {
    key: "esporte",
    kind: "photo",
    caption: "Esporte e lazer em diferentes ritmos",
    alt: "Quadra de tênis do Transamerica Comandatuba em meio à vegetação",
    position: "center 40%",
  },
  {
    key: "bem-estar",
    kind: "photo",
    caption: "Tempo para desacelerar",
    alt: "Ambiente de spa do Transamerica Comandatuba preparado para relaxamento",
    position: "center 30%",
  },
];

export const GALLERY_COPY = {
  videoBadge: "Vídeo • 30s",
  ariaLabel: "Galeria de fotos e vídeo do Transamerica Comandatuba",
  prev: "Mídia anterior",
  next: "Próxima mídia",
  openVideo: "Assistir ao vídeo Comandatuba vista do alto",
  openPhoto: (caption: string) => `Ampliar foto: ${caption}`,
};

export const FORM = {
  title: "Solicite sua cotação personalizada",
  subtitle:
    "Conte um pouco sobre a viagem. A sua agência verificará datas, acomodação e logística para preparar uma proposta de acordo com o seu perfil.",
  submit: "Receber minha cotação",
  submitLoading: "Enviando sua solicitação...",
  privacy: "Seus dados serão usados apenas para atender esta solicitação.",
  successTitle: (firstName: string) =>
    firstName ? `Solicitação recebida, ${firstName}!` : "Solicitação recebida!",
  successText: (agency: string) =>
    `Um consultor da ${agency} entrará em contato pelo WhatsApp para entender os detalhes da viagem e preparar as melhores possibilidades para você.`,
  successCta: "Falar agora pelo WhatsApp",
  errorTitle: "Não foi possível enviar agora",
  errorText:
    "Revise os campos e tente novamente. Você também pode falar diretamente com a agência pelo WhatsApp.",
  errorCta: "Falar pelo WhatsApp",
  consent: (agency: string) =>
    `Concordo em receber contato da ${agency} sobre esta solicitação. Meus dados serão tratados conforme a Política de Privacidade.`,
};

export const FAQ = [
  {
    q: "Onde fica o Transamerica Comandatuba?",
    a: "O resort fica na Ilha de Comandatuba, no município de Una, no sul da Bahia. A região combina praia extensa, vegetação preservada e uma estrutura completa de hospedagem.",
  },
  {
    q: "O que está incluído no sistema all inclusive?",
    a: "O resort informa alimentação disponível 24 horas e bebidas servidas conforme o funcionamento de cada ponto de consumo. As inclusões, marcas, horários, reservas e eventuais serviços cobrados à parte devem ser confirmados para o período da hospedagem.",
  },
  {
    q: "O resort é indicado para crianças?",
    a: "Sim. O resort possui programação infantil, monitoria e espaços voltados às famílias. Atividades, horários, faixas etárias e serviços específicos devem ser confirmados para as datas da viagem.",
  },
  {
    q: "Quais tipos de acomodação estão disponíveis?",
    a: "O resort possui apartamentos, suítes e bangalôs, com diferentes configurações. A sua agência indicará as opções compatíveis com a quantidade de hóspedes, as preferências e a disponibilidade.",
  },
  {
    q: "Como chegar à Ilha de Comandatuba?",
    a: "O acesso mais direto é pelo Aeroporto de Comandatuba, em Una. Também é possível desembarcar em Ilhéus e seguir em transfer até a região do resort. A melhor rota depende da origem, das datas e da operação disponível.",
  },
  {
    q: "Todas as atividades estão incluídas?",
    a: "Não necessariamente. O resort oferece mais de 80 opções de esporte, lazer e atividades aquáticas, mas algumas experiências e serviços especiais podem ter custo adicional. A programação também varia conforme o período.",
  },
  {
    q: "É possível viajar com animais de estimação?",
    a: "De acordo com a política atual do resort, animais de estimação não são permitidos. A sua agência pode reconfirmar essa condição no momento da cotação.",
  },
  {
    q: "Como consultar valores e disponibilidade?",
    a: "Preencha o formulário ou fale com o consultor pelo WhatsApp. A agência verificará tarifas, acomodação, disponibilidade e logística de acordo com as datas e o perfil da viagem.",
  },
];

export const FINAL_CTA = {
  title: "A Bahia está te esperando. Vamos planejar?",
  text: (agency: string) =>
    `Conte com a ${agency} para encontrar as melhores datas, a acomodação adequada e a logística mais confortável para a sua viagem.`,
  primary: "Receber minha cotação",
  secondary: "Falar pelo WhatsApp",
  imageAlt: "Vista aérea da praia e da vegetação da Ilha de Comandatuba",
};

export const SEO_TEMPLATE = {
  title: (agency: string) => `Transamerica Comandatuba | ${agency}`,
  description: (agency: string) =>
    `Conheça o Transamerica Comandatuba e receba uma cotação personalizada com a orientação da ${agency}.`,
  ogTitle: (agency: string) => `Viva a Ilha de Comandatuba com a ${agency}`,
  ogDescription:
    "Natureza, all inclusive, 21 km de praia e lazer para diferentes idades. Solicite uma cotação personalizada.",
};

export const FOOTER_COPY = {
  tagline: "Viagens planejadas com atenção aos detalhes.",
  legal:
    "Conteúdo informativo. Tarifas, disponibilidade, acomodações, inclusões, programação, voos, transfers e condições estão sujeitos a confirmação no momento da cotação. Algumas atividades e serviços podem ter custo adicional. Transamerica Comandatuba, suas marcas e imagens pertencem aos respectivos titulares.",
};

export const CONSULTANT_COPY = {
  title: "Sua viagem começa com orientação de verdade.",
  benefits: [
    "Atendimento humano e personalizado",
    "Orientação sobre a melhor acomodação",
    "Apoio na escolha de voos e transfers",
    "Suporte antes e durante a viagem",
  ],
  cta: "Falar com meu consultor",
  ctaNoConsultant: "Falar com a agência",
  mobileTitle: "Planeje sua viagem com um especialista",
};

export const NAV = [
  { id: "resort", label: "O resort" },
  { id: "allinclusive", label: "All inclusive" },
  { id: "experiencias", label: "Experiências" },
  { id: "acomodacoes", label: "Acomodações" },
  { id: "comochegar", label: "Como chegar" },
  { id: "duvidas", label: "Dúvidas" },
];

export function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function scrollToForm() {
  scrollTo(FORM_ANCHOR_ID);
}

export function whatsappUrl(agency: AgencyConfig, message: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${agency.whatsapp}?text=${encoded}`;
}

export function whatsappDefaultMessage(agency: AgencyConfig) {
  const first = agency.consultantFirstName?.trim();
  return first
    ? `Olá, ${agency.consultantName}! Vi a página do Transamerica Comandatuba e gostaria de receber uma cotação. Pode me ajudar?`
    : `Olá! Vi a página do Transamerica Comandatuba e gostaria de receber uma cotação. Pode me ajudar?`;
}

export function whatsappFromForm(
  agency: AgencyConfig,
  fields: {
    period?: string;
    origin?: string;
    adults?: number;
    kids?: number;
    category?: string;
  }
) {
  const lines: string[] = [];
  const greet = agency.consultantName
    ? `Olá, ${agency.consultantName}!`
    : "Olá!";
  lines.push(
    `${greet} Vi a página do Transamerica Comandatuba e gostaria de receber uma cotação.`
  );
  lines.push("");
  if (fields.period) lines.push(`Período desejado: ${fields.period}`);
  if (fields.origin) lines.push(`Cidade de saída: ${fields.origin}`);
  if (typeof fields.adults === "number") lines.push(`Adultos: ${fields.adults}`);
  if (typeof fields.kids === "number") lines.push(`Crianças: ${fields.kids}`);
  if (fields.category) lines.push(`Acomodação de interesse: ${fields.category}`);
  return lines.join("\n");
}