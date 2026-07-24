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

export const ACCOMMODATIONS = {
  title: "Acomodações para diferentes momentos",
  subtitle:
    "Da praticidade de ficar perto das áreas centrais à sensação de refúgio em meio à natureza, a sua agência ajuda a encontrar a opção mais adequada para a viagem.",
  items: [
    {
      key: "apartamento",
      name: "Apartamentos",
      text: "Conforto e praticidade, com opções próximas às principais áreas do resort.",
    },
    {
      key: "suite",
      name: "Suítes",
      text: "Mais espaço e configurações pensadas para casais, famílias e momentos especiais.",
    },
    {
      key: "bangalo",
      name: "Bangalôs",
      text: "Mais privacidade e contato com os jardins e a atmosfera tropical da ilha.",
    },
  ],
  cta: "Consultar esta opção",
  disclaimer:
    "Capacidades, localização, benefícios e disponibilidade variam entre as categorias. A sua agência confirmará a opção adequada à composição da viagem.",
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