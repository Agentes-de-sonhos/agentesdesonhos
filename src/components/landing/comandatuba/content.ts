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
  consultantRole: "Consultor de viagens",
  consultantPhotoUrl: null,
  whatsapp: "5511999999999",
  phone: "(11) 99999-9999",
  email: "contato@agentesdesonhos.com.br",
  city: "Atendimento on-line",
  hours: "Seg. a Sex., das 9h às 18h",
  privacyUrl: "/politica-de-privacidade",
};

export const HERO = {
  badge: "Ilha de Comandatuba • Bahia",
  titleLead: "Sua próxima história começa em uma",
  titleHighlight: "ilha na Bahia.",
  description:
    "Natureza, all inclusive, lazer para todas as idades e o cuidado de uma agência em cada etapa da viagem.",
  ctaPrimary: "Receber minha cotação",
  ctaSecondary: "Conhecer o resort",
  indicators: [
    { title: "All inclusive", text: "Mais praticidade, mais momentos" },
    { title: "Ilha exclusiva", text: "Belezas naturais em frente ao mar" },
    { title: "Mais de 80 experiências", text: "Lazer, esportes e atividades para todos os estilos" },
  ],
  imageAlt: "Vista aérea do Transamerica Comandatuba, na Bahia",
};

export const REFUGE = {
  eyebrow: "O RESORT",
  title: "Um refúgio cercado pela natureza",
  description:
    "Localizada no leste da Costa do Cacau, no município de Una, a Ilha de Comandatuba é cercada por coqueirais e banhada por praias que convidam ao descanso e à descoberta. Perfeita para famílias, casais e amigos que desejam viver momentos únicos em um cenário de tirar o fôlego.",
  benefits: [
    { title: "Natureza preservada", text: "Uma ilha privativa rodeada por coqueirais e praias de mar calmo e cristalino." },
    { title: "Férias em família", text: "Estrutura completa com lazer e segurança para todas as idades." },
    { title: "Gastronomia com identidade baiana", text: "Sabores locais e internacionais em restaurantes variados." },
    { title: "Lazer para diversos estilos", text: "Atividades na praia, esportes e experiências exclusivas." },
  ],
};

export const ALL_INCLUSIVE = {
  eyebrow: "All inclusive",
  title: "Praticidade para curtir cada momento",
  description:
    "Refeições, bebidas, petiscos e atividades fazem parte da rotina do resort. Assim, você só precisa focar no que importa: aproveitar.",
  benefits: [
    "Como desejar, o que você se lembra",
    "Perfeito de manhã à noite",
    "Diversão e energia o dia todo",
    "Mais previsão — zero surpresas na conta",
    "Variedade para todos os gostos e idades",
  ],
  disclaimer:
    "Alguns restaurantes, serviços e experiências premium podem exigir reserva ou ter custo adicional, conforme regras do resort.",
};

export const EXPERIENCES = {
  title: "Experiências e lazer para todos os ritmos",
  subtitle: "São mais de 80 opções de lazer para você explorar ao seu ritmo.",
  disclaimer:
    "Algumas experiências podem ter operação sazonal, disponibilidade limitada ou custo adicional. Confirme os detalhes com sua agência.",
  items: [
    { title: "Piscinas", text: "Áreas de piscina para relaxar em família ou com amigos." },
    { title: "Praia", text: "Faixa de areia extensa, quase deserta, para caminhar e descansar." },
    { title: "Esportes", text: "Vôlei, futevôlei, quadras e atividades guiadas na areia." },
    { title: "Atividades aquáticas", text: "Caiaque, stand-up paddle e passeios pelo mar calmo." },
    { title: "Crianças", text: "Programação diária para os pequenos, com equipe dedicada." },
    { title: "Natureza", text: "Trilhas e vivências pelo entorno preservado da ilha." },
    { title: "Bem-estar", text: "Espaços para relaxar e cuidar do corpo e da mente." },
    { title: "Entretenimento", text: "Noites com música, bares e programação para adultos." },
  ],
};

export const ACCOMMODATIONS = {
  title: "Acomodações para diferentes momentos",
  subtitle:
    "A categoria ideal é confirmada conforme a composição da viagem e a disponibilidade.",
  items: [
    {
      key: "apartamento",
      name: "Apartamentos",
      text: "Praticidade e conforto em diferentes categorias para sua escolha.",
    },
    {
      key: "suite",
      name: "Suítes",
      text: "Mais espaço e privacidade para momentos ainda mais especiais.",
    },
    {
      key: "bangalo",
      name: "Bangalôs",
      text: "Experiência exclusiva e charme do contato com a natureza.",
    },
  ],
  cta: "Consultar esta opção",
};

export const AUDIENCE = {
  title: "Para quem é Comandatuba?",
  items: [
    "Famílias que valorizam momentos juntos com estrutura completa.",
    "Casais em busca de descanso e conexão.",
    "Viagens entre gerações com conforto e diversão para todos.",
    "Grupos de amigos que querem compartilhar experiências inesquecíveis.",
  ],
};

export const HOW_TO_GET = {
  title: "Como chegar",
  intro:
    "Chegar a Comandatuba é parte da experiência: o acesso é feito por terra e balsa, com paisagens incríveis no percurso.",
  items: [
    "Aeroporto de Ilhéus — a cerca de 2h30 de transfer até a balsa.",
    "Voos, transfers, seguros e muito mais: planejamos cada detalhe para você viajar tranquilo.",
  ],
  note:
    "Rotas, frequências, operação aérea e logística podem sofrer alterações. Confirme com sua agência.",
};

export const FORM = {
  title: "Solicite sua cotação personalizada",
  subtitle: "Preencha os dados abaixo e receba uma proposta completa com as melhores opções para sua viagem.",
  submit: "Receber proposta personalizada",
  privacy: "Resposta rápida e sem compromisso. Seus dados estão seguros conosco.",
  success: "Recebemos seus dados! Em breve seu consultor entrará em contato pelo WhatsApp.",
  errorGeneric: "Não foi possível enviar agora. Tente novamente em instantes ou fale conosco pelo WhatsApp.",
  consent: "Aceito os termos de uso e a política de privacidade da agência.",
};

export const FAQ = [
  { q: "O que fica incluso no All Inclusive Comandatuba?", a: "Refeições, bebidas, petiscos e uma agenda de atividades diárias no resort. Alguns restaurantes de assinatura, experiências premium e serviços especiais podem exigir reserva ou custo adicional." },
  { q: "Como funciona o traslado até a ilha?", a: "O acesso é feito por terra saindo do aeroporto de Ilhéus e, em seguida, por uma travessia rápida de balsa até a ilha. Sua agência organiza o transfer completo." },
  { q: "Quais são as opções de acomodações?", a: "O resort oferece apartamentos, suítes e bangalôs, com diferentes categorias e vistas. A opção ideal é escolhida conforme a composição do grupo e a disponibilidade." },
  { q: "É possível levar pets para Comandatuba?", a: "A política de pets é definida diretamente pelo resort e pode variar. Sua agência confirma as regras vigentes para a sua data." },
  { q: "Existe recreação para crianças?", a: "Sim. A programação inclui atividades para diferentes faixas etárias, com equipe dedicada durante o dia." },
  { q: "Quais atividades estão disponíveis?", a: "Piscinas, praia, esportes, atividades aquáticas, trilhas, bem-estar e noites temáticas fazem parte da agenda. Algumas experiências são sazonais." },
  { q: "Como funciona o cancelamento?", a: "As regras de cancelamento e alterações seguem a política do resort e da tarifa contratada. Sua agência apresenta as condições antes da confirmação." },
  { q: "É necessário reservar as atividades?", a: "A maior parte é por ordem de chegada. Experiências específicas, restaurantes de assinatura e serviços do spa podem exigir reserva prévia." },
];

export const FINAL_CTA = {
  title: "A Bahia está te esperando. Vamos planejar?",
  text: "Fale com um especialista e descubra como viver dias inesquecíveis na ilha de Comandatuba.",
  primary: "Falar com meu consultor",
  secondary: "Falar pelo WhatsApp",
};

export const SEO_TEMPLATE = {
  title: (agency: string) => `Transamerica Comandatuba | ${agency}`,
  description: (agency: string) =>
    `Conheça o Transamerica Comandatuba e receba uma cotação personalizada com a orientação da ${agency}.`,
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
  return `Olá, ${agency.consultantFirstName}! Vi a página do Transamerica Comandatuba e gostaria de receber uma cotação.`;
}