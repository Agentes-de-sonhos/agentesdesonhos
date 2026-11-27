import { deriveTertiaryColor } from "@/lib/brandTheme";
import { buildGoldStandardProfile } from "@/lib/goldStandardSiteTemplate";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

export const REQUINTE_PREVIEW_JOB_ID = "briefing-26-v1";
export const REQUINTE_PREVIEW_HOST = "briefing-26-v1.preview.local";
export const REQUINTE_PREVIEW_PATH = `/ads-briefing-preview/${REQUINTE_PREVIEW_JOB_ID}`;

export const REQUINTE_PREVIEW_INFO: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-00000000ad26",
  agency_slug: "", public_slug: null, hostname: REQUINTE_PREVIEW_HOST, is_primary: false,
  agency_name: "Requinte Turismo", owner_name: "Fernanda Petratti",
  logo_url: "/requinte-turismo/logo.png", cover_image_url: null,
  primary_color: "#164F76", secondary_color: "#39B7D4",
  tertiary_color: deriveTertiaryColor("#164F76"), secondary_auto: false, tertiary_auto: false,
  on_secondary_color: "#102D45", phone: null, city: "Santana de Parnaíba", state: "SP",
  bio: null, cnpj: null, whatsapp_group_url: null,
};

export const REQUINTE_PREVIEW_PROFILE = buildGoldStandardProfile("requinteBriefing26", {
  textualWordmark: false, presentation: true, demo: false,
  alternateSurfaces: true, compactSectionSpacing: true, destinationsFixedOrder: true,
  faqContactPreview: true, visaHome: false, cruiseSeasonInNav: false,
  featuredExperience: undefined, dmc: undefined, authority: undefined, credentials: undefined,
  team: undefined, testimonials: undefined,
  sections: {
    signature: { enabled: true, order: 1 },
    destinations: { enabled: true, order: 2 },
    orlando: { enabled: true, order: 3 },
    resorts: { enabled: true, order: 4 },
    about: { enabled: true, order: 5 },
    differentials: { enabled: true, order: 6 },
    concierge: { enabled: true, order: 7 },
    faq: { enabled: true, order: 8 },
    newsletter: { enabled: true, order: 9 },
    modules: false, highlights: false, authority: false, offers: false, dmc: false,
    avaliacoes: false, testimonials: false, credentials: false, team: false, blog: false,
  },
  heroImage: "requinteSafari",
  heroPresentation: { overlay: "strongLeft", titleWeight: "regular" },
  hero: [
    { kicker: "ÁFRICA DO SUL · SAFÁRI SOB MEDIDA", title: "Da savana à Cidade do Cabo", subtitle: "Combine dias de safári, paisagens costeiras e hospedagens escolhidas para o seu ritmo de viagem.", image: "requinteSafari", enabled: true, order: 1 },
    { kicker: "ITÁLIA · ROTEIROS E LUA DE MEL", title: "Descubra a Itália sem pressa", subtitle: "Arte em Florença, mesas na Toscana e tempo para aproveitar a viagem a dois. A Requinte organiza as etapas com você.", image: "capitaisItalia", enabled: true, order: 2 },
    { kicker: "ORLANDO · EM FAMÍLIA", title: "Parques e tempo para estar juntos", subtitle: "Distribua os dias de parque, escolha onde ficar e deixe espaço para descansar entre as grandes atrações.", image: "orlandoMagicKingdom", enabled: true, order: 3 },
  ],
  nav: [
    { label: "Início", to: "/" },
    { label: "Destinos", to: "/#destinos" },
    { label: "Especialidades", to: "/#assinatura", children: [
      { label: "Viagens sob medida e lua de mel", to: "/#assinatura" },
      { label: "Parques em Orlando", to: "/#ingressos-orlando" },
      { label: "Resorts no Brasil", to: "/#resorts" },
    ] },
    { label: "Sobre", to: "/#sobre", children: [
      { label: "Quem somos", to: "/#sobre" },
      { label: "Como funciona", to: "/#atendimento" },
      { label: "Dúvidas frequentes", to: "/#faq" },
    ] },
  ],
  signature: {
    kicker: "CONSULTORIA DE VIAGENS · DESDE 1996",
    title: "Uma viagem pensada para quem vai vivê-la",
    text: "A Requinte Turismo monta roteiros sob medida para famílias, casais e viajantes que querem escolher bem cada etapa. A conversa começa pelo que vocês querem viver, pelas datas e pelo ritmo da viagem.",
    continuation: { title: "Da lua de mel à primeira viagem em família", text: "A Fernanda ajuda a comparar hospedagens, experiências e deslocamentos, do primeiro orçamento às orientações para embarcar." },
  },
  destinations: [
    { key: "africa-sul", label: "África", title: "África do Sul", text: "Safári, Cidade do Cabo e dias nas vinícolas, com tempo para aproveitar cada parada.", image: "requinteSafari", service: "pacotes", enabled: true, order: 1 },
    { key: "italia", label: "Europa", title: "Itália sob medida", text: "Cidades de arte e dias na Toscana, de acordo com o ritmo e os interesses do casal ou da família.", image: "capitaisItalia", service: "pacotes", enabled: true, order: 2 },
    { key: "orlando", label: "Estados Unidos", title: "Orlando com crianças", text: "Ingressos, hospedagem e uma agenda de parques que respeita as idades e o ritmo da família.", image: "orlandoMagicKingdom", service: "ingressos", enabled: true, order: 3 },
    { key: "esqui", label: "Américas e Europa", title: "Neve e esqui", text: "Compare estações nos Andes, na América do Norte e na Europa, considerando nível, época e dias na montanha.", image: "requinteNeve", service: "pacotes", enabled: true, order: 4 },
    { key: "america-sul", label: "América do Sul", title: "Argentina e seus vinhos", text: "Vinhas, gastronomia e paisagens aos pés dos Andes, com roteiro adaptado aos seus interesses.", image: "mendoza", service: "pacotes", enabled: true, order: 5 },
    { key: "resorts", label: "Descanso", title: "Resorts e all inclusive", text: "Compare estrutura, refeições e lazer para escolher um resort que encaixe no seu jeito de viajar.", image: "resort", service: "hospedagem", enabled: true, order: 6 },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM", title: "Fernanda Petratti e a história da Requinte", media: "hidden",
    ownerName: "Fernanda Petratti", showLocation: true, badge: { value: "Desde 1996", label: "Requinte Turismo" },
    text: "A Requinte Turismo nasceu em 1996, fundada pela mãe da Fernanda. Em 1999, Fernanda começou a trabalhar na agência e fez do turismo sua profissão.\n\nHoje ela atende diretamente e ajuda cada cliente a escolher destinos, hotéis e experiências com atenção ao que importa para aquela viagem.",
  },
  differentials: [
    { title: "Atendimento direto com a Fernanda", text: "A pessoa que conhece seu roteiro acompanha o planejamento e atende quando surgem dúvidas.", icon: "consultivo" },
    { title: "Roteiros feitos para você", text: "Datas, deslocamentos e experiências organizados conforme o ritmo e os interesses de quem viaja.", icon: "conferido" },
    { title: "Escolha cuidadosa de hotéis", text: "A consultoria compara localização, estrutura e serviços antes de indicar as opções.", icon: "fornecedores" },
    { title: "Suporte durante a viagem", text: "Se surgir um imprevisto, o atendimento acompanha o caso até a solução.", icon: "acompanhamento" },
  ],
  conciergeNumberedCards: true,
  conciergePoints: [
    { key: "conversa", title: "Conte seus planos", text: "Quem viaja, quando, que ritmo prefere e o que não pode faltar." },
    { key: "proposta", title: "Compare as opções", text: "Receba uma proposta sob medida e ajuste o roteiro antes de reservar." },
    { key: "embarque", title: "Prepare o embarque", text: "Confira as orientações, reservas e detalhes do deslocamento." },
    { key: "acompanhamento", title: "Viaje com suporte", text: "Tenha acompanhamento durante a viagem e depois do retorno." },
  ],
  hideConciergeWhatsapp: true,
  requestCenter: { title: "Vamos planejar sua próxima viagem?", support: "Escolha um serviço e conte o que você precisa.", notice: "Prévia para revisão: nenhuma solicitação é enviada.", submitLabel: "Revisar", titlePlacement: "above-card" },
  faq: [
    { q: "Quem vai me atender?", a: "A Fernanda Petratti acompanha diretamente o planejamento e é seu contato para dúvidas e ajustes." },
    { q: "Vocês organizam lua de mel e viagens em família?", a: "Sim. O roteiro é montado para o casal ou para a família, com hospedagem, deslocamentos e experiências selecionados conforme o perfil de quem viaja." },
    { q: "É possível combinar safári e Cidade do Cabo?", a: "Sim. A Requinte pode organizar um roteiro combinando as duas experiências, conforme as datas e o tempo disponível." },
    { q: "Vocês orientam quem vai esquiar pela primeira vez?", a: "A Requinte ajuda a comparar estações na América do Sul, América do Norte e Europa, considerando a experiência dos viajantes e a época da viagem." },
    { q: "Há apoio depois que eu embarcar?", a: "Sim. O atendimento inclui orientações antes do embarque, acompanhamento durante a viagem e contato após o retorno." },
  ],
  copy: {
    destinations: { kicker: "DESTINOS PARA A SUA PRÓXIMA VIAGEM", title: "Escolha por onde começar", subtitle: "Ideias para conversar com a Fernanda. As imagens são ilustrativas e não representam ofertas." },
    differentials: { kicker: "POR QUE VIAJAR CONOSCO", title: "Cuidado nas escolhas e apoio no caminho" },
    concierge: { kicker: "COMO FUNCIONA", title: "Da primeira conversa ao retorno" },
    faq: { kicker: "ANTES DE SOLICITAR", title: "Dúvidas frequentes", subtitle: "Confira as respostas ou escreva sua dúvida para a Requinte Turismo." },
    newsletter: { kicker: "NOVIDADES DA REQUINTE", title: "Inspirações para sua próxima viagem", subtitle: "Receba ideias de roteiros e novidades da Requinte Turismo.", cta: "Quero receber novidades" },
  },
  footer: { description: "Consultoria de viagens sob medida desde 1996.", address: "Santana de Parnaíba/SP", showLocation: true,
    whatsapp: "(11) 94004-4359", email: "fernanda@requinteturismo.com.br", legalLinksDisabled: true },
  socialStrip: { title: "Acompanhe a Requinte", links: [{ network: "instagram", url: "https://www.instagram.com/requinteturismo/" }] },
  seo: { title: "Prévia — Requinte Turismo", description: "Consultoria de viagens sob medida da Requinte Turismo. Prévia para revisão." },
}, "Requinte Turismo");
