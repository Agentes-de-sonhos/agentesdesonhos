// Central content config for the Orlando Magic B2C landing page (Phase 2 — definitive content).
export const LANDING_FLAGS = {
  showTestimonials: false,
};

export const AGENT = {
  name: "Fernando Nobre",
  agency: "Agentes de Sonhos",
  avatarInitials: "FN",
  role: "Agente de viagens",
  avatarAlt: "Fernando Nobre, agente de viagens da Agentes de Sonhos",
  recommendationLead: "Esta experiência foi recomendada por",
  supportPrimary: "Atendimento em português",
  supportSecondary: "Antes, durante e depois da sua viagem",
  secondaryCta: "RECEBER OPÇÕES PARA MINHA VIAGEM",
};

export const HERO = {
  eyebrow: "ORLANDO MAGIC • NBA AO VIVO",
  titleLead: "Sua viagem a Orlando merece uma",
  titleHighlight: "noite de NBA.",
  description:
    "Assista ao Orlando Magic no Kia Center e viva uma noite com esporte, música, luzes, mascote e entretenimento para todas as idades — mesmo que você nunca tenha acompanhado basquete.",
  cta: "ENCONTRAR JOGOS NAS MINHAS DATAS",
  indicators: [
    "Atendimento em português",
    "Opções para diferentes orçamentos",
    "Orientação do seu agente",
  ],
  disclaimer:
    "Jogos, setores, horários, valores e disponibilidade podem mudar até a confirmação da compra.",
  imageAlt: "Torcida acompanhando um jogo do Orlando Magic no Kia Center",
};

export const FORM = {
  title: "Quais são as datas da sua viagem?",
  subtitle:
    "Informe o período da sua estadia para receber opções de jogos, setores e valores.",
  nameLabel: "Seu nome",
  namePlaceholder: "Como podemos chamar você?",
  arrivalLabel: "Data de chegada a Orlando",
  arrivalPlaceholder: "DD/MM/AAAA",
  departureLabel: "Data de saída de Orlando",
  departurePlaceholder: "DD/MM/AAAA",
  adultsLabel: "Adultos",
  kidsLabel: "Crianças",
  peopleLabel: "Quantas pessoas vão ao jogo?",
  kidsAgesLabel: "Idade das crianças",
  kidsAgesPlaceholder: "Ex.: 5 e 10 anos",
  whatsappLabel: "Seu WhatsApp",
  whatsappPlaceholder: "(DDD) 99999-9999",
  submit: "RECEBER OPÇÕES NO WHATSAPP",
  noCommit: "Consulta sem compromisso.",
  privacy: "Seus dados serão utilizados apenas para este atendimento.",
  demoNotice: "Formulário demonstrativo. O envio será ativado na próxima etapa.",
};

export const BENEFITS_SECTION = {
  eyebrow: "A EXPERIÊNCIA",
  titleLead: "Mais do que basquete.",
  titleHighlight: "Um espetáculo para lembrar.",
  description:
    "A emoção começa antes de a bola subir. Música, telões, apresentações, brincadeiras e a energia da torcida transformam o jogo em um dos programas mais diferentes da viagem.",
  cta: "VER JOGOS NAS DATAS DA MINHA VIAGEM",
};

export const BENEFITS = [
  {
    tag: "NBA AO VIVO",
    text: "Sinta de perto a velocidade, a intensidade e a emoção de uma partida da principal liga de basquete do mundo.",
  },
  {
    tag: "SHOW DO INÍCIO AO FIM",
    text: "Luzes, música, dançarinos, apresentações e atrações mantêm a arena animada durante toda a noite.",
  },
  {
    tag: "DIVERSÃO PARA A FAMÍLIA",
    text: "Crianças, adolescentes e adultos podem aproveitar juntos, mesmo sem conhecer as regras do jogo.",
  },
  {
    tag: "NO CORAÇÃO DE ORLANDO",
    text: "O Kia Center fica em Downtown Orlando, próximo de restaurantes e outras atrações da região.",
  },
];

export const VIDEO_CARD = {
  title: "Dê o play e sinta o clima do Kia Center",
  description:
    "Veja por que assistir ao Orlando Magic pode se tornar um dos momentos mais comentados da sua viagem.",
  playAriaLabel: "Assistir ao vídeo da experiência Orlando Magic",
  thumbnailAlt:
    "Vista interna do Kia Center durante uma partida do Orlando Magic",
  demoNotice:
    "Vídeo demonstrativo. A reprodução será ativada em uma próxima etapa.",
};

export const OBJECTION_SECTION = {
  titleLead: "Não acompanha a NBA?",
  titleHighlight: "Você vai curtir do mesmo jeito.",
  description:
    "Você não precisa conhecer jogadores, regras ou estatísticas para aproveitar. O telão ajuda a acompanhar a partida, a torcida envolve o público e as atrações mantêm a experiência divertida do começo ao fim.",
  imageAlt: "Família assistindo ao Orlando Magic com o mascote Stuff",
};

export const OBJECTIONS = [
  {
    tag: "PARA AS CRIANÇAS",
    text: "O mascote Stuff e as atrações da arena ajudam a tornar a noite divertida e envolvente.",
  },
  {
    tag: "PARA OS ADULTOS",
    text: "A atmosfera, a gastronomia e a emoção de um evento esportivo americano tornam a noite especial.",
  },
  {
    tag: "UMA LEMBRANÇA DA VIAGEM",
    text: "O jogo faz parte da experiência. A lembrança vai muito além do placar.",
  },
];

export const TICKETS_SECTION = {
  eyebrow: "ESCOLHA SEU SETOR",
  title: "Escolha a experiência que combina com a sua viagem",
  description:
    "Há opções para diferentes perfis e orçamentos. Seu agente pode comparar os setores disponíveis e ajudar você a escolher.",
  notice:
    "Localização, benefícios e serviços incluídos variam conforme o ingresso selecionado.",
  cta: "RECEBER UMA RECOMENDAÇÃO DE SETOR",
};

export type TicketCategory = {
  name: string;
  description: string;
  color: string;
  image: "upper" | "mid" | "courtside";
  objectPosition?: string;
  imageAlt: string;
};

export const TICKET_CATEGORIES: TicketCategory[] = [
  {
    name: "PROMENADE",
    description:
      "Uma opção acessível para sentir a energia da arena e viver a experiência da NBA com ótimo custo-benefício.",
    color: "text-sky-500",
    image: "upper",
    objectPosition: "center 30%",
    imageAlt: "Vista panorâmica da quadra a partir do setor Promenade",
  },
  {
    name: "CLUB",
    description:
      "Assentos mais confortáveis em uma área premium, com boa visão da quadra.",
    color: "text-blue-900",
    image: "mid",
    objectPosition: "center 40%",
    imageAlt: "Vista da quadra a partir do setor Club do Kia Center",
  },
  {
    name: "TERRACE A",
    description:
      "Setores no anel inferior, nas laterais da quadra, próximos à ação e com excelente visão do jogo.",
    color: "text-orange-500",
    image: "mid",
    objectPosition: "left center",
    imageAlt: "Vista lateral da quadra a partir do setor Terrace A",
  },
  {
    name: "TERRACE B",
    description:
      "Alternativa no anel inferior, localizada atrás das cestas, para acompanhar a partida mais de perto.",
    color: "text-emerald-600",
    image: "mid",
    objectPosition: "right center",
    imageAlt: "Vista da quadra atrás da cesta a partir do setor Terrace B",
  },
  {
    name: "ULTIMATE E SUÍTES",
    description:
      "Experiências premium, próximas à quadra ou em espaços privativos, conforme o jogo e a disponibilidade.",
    color: "text-amber-500",
    image: "courtside",
    objectPosition: "center 60%",
    imageAlt: "Área premium próxima à quadra do Orlando Magic",
  },
];

export const KIA_SECTION = {
  eyebrow: "O KIA CENTER",
  title: "Uma noite completa no Kia Center",
  description:
    "Localizado em Downtown Orlando, o Kia Center reúne esporte, entretenimento e diferentes opções para aproveitar a noite.",
  imageAlt: "Fachada do Kia Center em Downtown Orlando",
};

export const KIA_ITEMS = [
  {
    title: "CHEGUE COM ANTECEDÊNCIA",
    text: "Aproveite o clima antes da partida, acompanhe o aquecimento e veja as ativações da arena.",
  },
  {
    title: "JANTE DURANTE A EXPERIÊNCIA",
    text: "A arena oferece diferentes opções de comidas e bebidas para completar a noite.",
  },
  {
    title: "APROVEITE DOWNTOWN ORLANDO",
    text: "Combine o jogo com um passeio, jantar ou outras atrações da região.",
  },
  {
    title: "ESPAÇOS INCLUSIVOS",
    text: "A arena dispõe de espaço para amamentação, sala sensorial e itens de apoio sensorial.",
  },
];

export const AGENT_PRESENTATION = {
  title: "Eu ajudo você a escolher o melhor jogo",
  paragraph1:
    "Olá, eu sou Fernando Nobre. Vou verificar quais partidas acontecem durante a sua viagem e comparar as opções disponíveis de acordo com o perfil da sua família e o orçamento desejado.",
  paragraph2:
    "Você recebe as alternativas com explicações claras para escolher com tranquilidade, sem precisar entender sozinho o mapa da arena ou as diferenças entre cada categoria.",
};

export const HOW_IT_WORKS_TITLE = "Descubra seu jogo em três passos";

export const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Informe as datas da viagem",
    text: "Diga quando você estará em Orlando e quantas pessoas participarão.",
  },
  {
    step: "2",
    title: "Receba as opções disponíveis",
    text: "Seu agente verificará os jogos, setores e valores encontrados para o período.",
  },
  {
    step: "3",
    title: "Escolha sua experiência",
    text: "Compare as alternativas e selecione a opção que mais combina com a sua viagem.",
  },
];

export const FAQ_TITLE = "Perguntas frequentes";

export const FAQ = [
  {
    q: "Preciso entender de basquete para aproveitar?",
    a: "Não. A partida é acompanhada por música, telões, apresentações, mascote e atrações nos intervalos. A experiência foi pensada para envolver tanto os fãs quanto quem nunca assistiu a um jogo da NBA.",
  },
  {
    q: "É um programa indicado para crianças?",
    a: "Sim. O jogo pode ser aproveitado por crianças, adolescentes e adultos. O mascote e as atrações da arena ajudam a manter toda a família envolvida durante a experiência.",
  },
  {
    q: "Quanto custa um ingresso?",
    a: "O valor varia conforme a data, o adversário, o setor, a procura e a disponibilidade. Informe as datas da sua viagem para receber opções atualizadas para diferentes faixas de orçamento.",
  },
  {
    q: "Como descubro se haverá um jogo durante a minha viagem?",
    a: "Os jogos em Orlando acontecem principalmente durante a temporada da NBA, normalmente entre outubro e abril. Informe o período da sua viagem para que o agente verifique o calendário disponível.",
  },
  {
    q: "Qual é o melhor setor?",
    a: "Depende do orçamento, da proximidade desejada e do perfil da viagem. Há opções mais econômicas, setores no anel inferior e experiências premium. Seu agente explicará as diferenças antes da escolha.",
  },
  {
    q: "Alimentação está incluída?",
    a: "Nos ingressos comuns, comidas e bebidas geralmente são adquiridas separadamente. Algumas experiências premium podem incluir hospitalidade ou alimentação. Os benefícios serão informados junto com cada opção.",
  },
  {
    q: "Onde fica o Kia Center?",
    a: "O Kia Center fica em Downtown Orlando. A localização permite combinar o jogo com restaurantes, passeios e outras atrações da região.",
  },
  {
    q: "Como receberei os ingressos?",
    a: "A forma e o prazo de entrega serão informados antes da confirmação da compra, de acordo com o canal de emissão utilizado.",
  },
  {
    q: "Posso cancelar ou alterar depois da compra?",
    a: "As condições podem variar conforme o ingresso, o fornecedor e a política aplicada à compra. Consulte as regras apresentadas antes da confirmação.",
  },
  {
    q: "Posso levar mochila ou bolsa para a arena?",
    a: "O Kia Center possui regras específicas para bolsas e mochilas. Como essas políticas podem ser atualizadas, consulte as orientações recebidas antes do evento.",
  },
  {
    q: "A participação de um jogador específico é garantida?",
    a: "Não. Escalações podem mudar por decisões técnicas, lesões ou outros fatores. O ingresso dá acesso ao evento, mas não garante a participação de um atleta específico.",
  },
];

export const FINAL_CTA = {
  title:
    "Pronto para descobrir qual jogo combina com a sua viagem?",
  text: "Envie as datas em que você estará em Orlando e receba opções de partidas, setores e valores com o atendimento do seu agente.",
  button: "ENCONTRAR JOGOS NAS MINHAS DATAS",
  note: "Quanto antes você consultar, maior poderá ser a variedade de setores disponíveis.",
};

export const MOBILE_STICKY = {
  label: "VER JOGOS NAS MINHAS DATAS",
  ariaLabel: "Ir para o formulário de consulta de jogos do Orlando Magic",
};

export const FOOTER = {
  brand: {
    title: "Orlando Magic",
    text: "Uma experiência da NBA em Orlando, apresentada para ajudar você a escolher jogos, setores e opções para a sua viagem.",
  },
  important: {
    title: "IMPORTANTE",
    text: "Jogos, horários, setores, valores, atrações, benefícios e disponibilidade podem mudar até a confirmação da compra.",
  },
  agent: {
    title: "FALE COM SEU AGENTE",
    line1: "Atendimento em português",
    line2: "Fernando Nobre",
    line3: "Agentes de Sonhos",
  },
  company: {
    title: "Agentes de Sonhos",
    // Links pendentes de configuração — mantemos href="#" e data-pending para sinalizar internamente
    links: [
      { label: "Política de Privacidade", href: "#", pending: true },
      { label: "Termos de Uso", href: "#", pending: true },
      { label: "Política de Cancelamento", href: "#", pending: true },
    ],
  },
  legal:
    "Jogos, atletas, horários, atrações e benefícios podem sofrer alterações. Imagens utilizadas para fins ilustrativos.",
  copyright: "© 2026 Agentes de Sonhos. Todos os direitos reservados.",
};

export const SEO = {
  title:
    "Ingressos Orlando Magic: viva a NBA em Orlando | Agentes de Sonhos",
  description:
    "Veja quais jogos do Orlando Magic acontecem durante a sua viagem e receba opções de setores e valores com atendimento personalizado em português.",
  ogTitle: "Viva uma noite de NBA em Orlando",
  ogDescription:
    "Informe as datas da sua viagem e descubra quais jogos do Orlando Magic você poderá assistir no Kia Center.",
  twitterTitle: "Viva uma noite de NBA em Orlando",
  twitterDescription:
    "Descubra os jogos do Orlando Magic disponíveis durante a sua viagem.",
};

export const SHARE = {
  shareTitle: "Viva uma noite de NBA em Orlando",
  shareDescription:
    "Descubra quais jogos do Orlando Magic acontecem durante a sua viagem e receba opções de ingressos para diferentes perfis e orçamentos.",
  whatsappShareMessage:
    "Separei uma experiência que pode combinar muito com a sua viagem: assistir ao Orlando Magic no Kia Center. É uma noite com NBA ao vivo, música, luzes, mascote e entretenimento para toda a família — mesmo para quem não acompanha basquete. Informe as datas da sua viagem para verificar os jogos disponíveis.",
};

export const FORM_ANCHOR_ID = "trip-dates-form";

export const scrollToForm = () => {
  const el = document.getElementById(FORM_ANCHOR_ID);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};
