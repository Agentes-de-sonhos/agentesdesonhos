// Central content config for the Orlando Magic B2C landing page (Phase 1 — visual only).
export const LANDING_FLAGS = {
  showTestimonials: false,
};

export const AGENT = {
  name: "Fernando Nobre",
  agency: "Agentes de Sonhos",
  avatarInitials: "FN",
  role: "Agente de viagens especialista em Orlando",
  secondaryCta: "RECEBER OPÇÕES PARA MINHA VIAGEM",
};

export const HERO = {
  eyebrow: "ORLANDO MAGIC • NBA AO VIVO",
  titleLead: "Sua viagem a Orlando merece uma",
  titleHighlight: "noite de NBA.",
  description:
    "Assista ao Orlando Magic no Kia Center e viva uma experiência com esporte, música, luzes, mascote, gastronomia e diversão para todas as idades — mesmo que você nunca tenha acompanhado basquete.",
  cta: "ENCONTRAR JOGOS NAS MINHAS DATAS",
  indicators: [
    "Atendimento em português",
    "Opções para diferentes orçamentos",
    "Orientação do seu agente",
  ],
  disclaimer:
    "Jogos, preços e setores estão sujeitos à disponibilidade no momento da consulta.",
};

export const FORM = {
  title: "Quais são as datas da sua viagem?",
  subtitle: "Preencha para receber as melhores opções de jogos, setores e ingressos.",
  submit: "RECEBER MINHAS OPÇÕES NO WHATSAPP",
  noCommit: "Consulta sem compromisso.",
  privacy: "Seus dados serão utilizados apenas para este atendimento.",
  demoNotice: "Formulário demonstrativo. A integração será realizada em uma próxima etapa.",
};

export const BENEFITS = [
  { tag: "NBA AO VIVO", text: "Sinta de perto a velocidade, a intensidade e a emoção de uma partida da principal liga de basquete do mundo." },
  { tag: "SHOW DO INÍCIO AO FIM", text: "Luzes, música, dançarinos, apresentações e atrações mantêm a arena animada durante toda a noite." },
  { tag: "DIVERSÃO PARA A FAMÍLIA", text: "Crianças, adolescentes e adultos podem aproveitar juntos, mesmo sem conhecer as regras." },
  { tag: "NO CORAÇÃO DE ORLANDO", text: "O Kia Center fica em Downtown Orlando, próximo de restaurantes e outras atrações." },
];

export const OBJECTIONS = [
  { tag: "PARA AS CRIANÇAS", text: "O mascote e as atrações da arena tornam a noite divertida e envolvente." },
  { tag: "PARA OS ADULTOS", text: "A atmosfera, a gastronomia e a emoção de um evento americano ao vivo tornam a noite especial." },
  { tag: "UMA LEMBRANÇA DA VIAGEM", text: "O jogo faz parte da experiência. A lembrança vai muito além do placar." },
];

export type TicketCategory = {
  name: string;
  description: string;
  color: string;
  image: "upper" | "mid" | "courtside";
  objectPosition?: string;
};

export const TICKET_CATEGORIES: TicketCategory[] = [
  { name: "PROMENADE", description: "Opção acessível para entrar no clima da arena e viver a experiência da NBA com ótimo custo-benefício.", color: "text-sky-500", image: "upper", objectPosition: "center 30%" },
  { name: "CLUB", description: "Assentos mais confortáveis e uma visão privilegiada da quadra.", color: "text-blue-900", image: "mid", objectPosition: "center 40%" },
  { name: "TERRACE A", description: "Setores localizados no anel inferior, próximos à ação e com excelente visão lateral.", color: "text-orange-500", image: "mid", objectPosition: "left center" },
  { name: "TERRACE B", description: "Alternativa no anel inferior, localizada atrás das cestas.", color: "text-emerald-600", image: "mid", objectPosition: "right center" },
  { name: "ULTIMATE E SUÍTES", description: "Experiências premium, próximas à quadra ou em áreas de hospitalidade, conforme disponibilidade.", color: "text-amber-500", image: "courtside", objectPosition: "center 60%" },
];

export const KIA_ITEMS = [
  { title: "CHEGUE COM ANTECEDÊNCIA", text: "Aproveite o clima antes da partida, veja o aquecimento e acompanhe as ativações da arena." },
  { title: "JANTE DURANTE A EXPERIÊNCIA", text: "A arena oferece diferentes opções de comidas e bebidas." },
  { title: "APROVEITE DOWNTOWN ORLANDO", text: "Combine o jogo com um passeio, jantar ou outras atrações da região." },
  { title: "ESPAÇOS INCLUSIVOS", text: "A arena dispõe de espaço para amamentação e sala sensorial." },
];

export const HOW_IT_WORKS = [
  { step: "1", title: "Informe as datas da viagem", text: "Diga quando você estará em Orlando e quantas pessoas participarão." },
  { step: "2", title: "Receba as opções disponíveis", text: "Seu agente verificará os jogos, setores e valores encontrados para o período." },
  { step: "3", title: "Escolha sua experiência", text: "Compare as alternativas e selecione a opção que mais combina com a viagem." },
];

export const FAQ = [
  { q: "Preciso entender de basquete para aproveitar?", a: "Não. A experiência é pensada para todos os públicos e o telão ajuda a acompanhar cada jogada." },
  { q: "É um programa indicado para crianças?", a: "Sim. Muitas famílias levam crianças, e a arena oferece atrações, mascote e áreas apropriadas." },
  { q: "Quanto custa um ingresso?", a: "Esta informação será configurada na etapa de conteúdo definitivo." },
  { q: "Como descubro se haverá um jogo durante a minha viagem?", a: "Preencha o formulário com suas datas e seu agente confirmará as partidas disponíveis no período." },
  { q: "Qual é o melhor setor?", a: "Depende do perfil da família e do orçamento. Seu agente compara as opções e recomenda." },
  { q: "Alimentação está incluída?", a: "Esta informação será configurada na etapa de conteúdo definitivo." },
  { q: "Onde fica o Kia Center?", a: "Em Downtown Orlando, próximo a restaurantes e outras atrações da região." },
  { q: "Como receberei os ingressos?", a: "Esta informação será configurada na etapa de conteúdo definitivo." },
  { q: "Posso cancelar ou alterar depois da compra?", a: "Esta informação será configurada na etapa de conteúdo definitivo." },
];

export const FINAL_CTA = {
  title: "Pronto para descobrir qual jogo combina com a sua viagem?",
  text: "Envie as datas em que você estará em Orlando e receba opções de partidas, setores e valores com o atendimento do seu agente.",
  button: "ENCONTRAR JOGOS NAS MINHAS DATAS",
  note: "Quanto antes você consultar, maior poderá ser a variedade de opções disponíveis.",
};

export const FORM_ANCHOR_ID = "trip-dates-form";

export const scrollToForm = () => {
  const el = document.getElementById(FORM_ANCHOR_ID);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};
