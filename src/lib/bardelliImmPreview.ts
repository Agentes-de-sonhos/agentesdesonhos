import type { AgencySiteProfile } from "@/lib/agencySiteProfile";

export const BARDELLI_IMM_PREVIEW_JOB_ID = "bardelli-imm-v1";
export const BARDELLI_IMM_PREVIEW_HOST = "bardelli-imm.preview.local";

/** Borrow the layout rhythm from IMM, not its campaigns, images of people or contacts. */
export function buildBardelliImmPreview(briefing: AgencySiteProfile): AgencySiteProfile {
  return {
    key: "bardelliImmPreview",
    navDensity: "compact",
    compactSectionSpacing: true,
    alternateSurfaces: true,
    destinationsFixedOrder: true,
    cruiseSeasonInNav: false,
    heroPresentation: { kicker: "BARDELLI VIAGENS · DESDE 2008", overlay: "strongLeft", titleWeight: "regular" },
    hero: [
      { title: "Viajar junto. Planejar do seu jeito.", subtitle: "Com a Bárbara, o roteiro nasce de uma conversa sobre quem vai viajar e o que vocês querem viver.", image: "heroVarenna", order: 1, enabled: true },
      { title: "Orlando no ritmo da sua família", subtitle: "Combine Disney, Universal, hospedagem e pausas para aproveitar a viagem sem tentar fazer tudo de uma vez.", image: "immDisneyCastle", order: 2, enabled: true },
      { title: "Novos destinos em boa companhia", subtitle: "Encontre um cruzeiro que combine com o grupo, do itinerário à escolha da cabine.", image: "heroSantoriniShip", order: 3, enabled: true },
    ],
    nav: [
      { label: "Início", to: "/" },
      { label: "Destinos", to: "/#destinos" },
      { label: "Especialidades", to: "/#assinatura", children: [
        { label: "Parques em Orlando", to: "/#ingressos-orlando" },
        { label: "Resorts no Brasil", to: "/#resorts" },
        { label: "Cruzeiros", to: "/#autoridade" },
      ] },
      { label: "Sobre", to: "/#sobre", children: [
        { label: "Quem cuida da sua viagem", to: "/#sobre" },
        { label: "Dúvidas frequentes", to: "/#faq" },
      ] },
    ],
    sections: {
      signature: { enabled: true, order: 1 }, modules: { enabled: false }, highlights: { enabled: false },
      destinations: { enabled: true, order: 2 }, orlando: { enabled: true, order: 3 }, resorts: { enabled: true, order: 4 },
      authority: { enabled: true, order: 5 }, about: { enabled: true, order: 6 }, differentials: { enabled: true, order: 7 },
      concierge: { enabled: true, order: 8 }, faq: { enabled: true, order: 9 }, newsletter: { enabled: true, order: 10 },
      offers: { enabled: false }, blog: { enabled: false }, team: { enabled: false }, dmc: { enabled: false },
      sports: { enabled: false }, credentials: { enabled: false }, testimonials: { enabled: false }, avaliacoes: { enabled: false },
    },
    signature: {
      kicker: "CONSULTORIA PARA VIAGENS DE LAZER",
      title: "Antes de decidir o destino, vamos falar de quem vai viajar.",
      text: "Uma família com crianças, um casal e um grupo de amigos podem querer coisas bem diferentes do mesmo lugar. A Bárbara ajuda a escolher o que vale entrar no roteiro, quanto tempo ficar em cada parada e onde é melhor deixar espaço para aproveitar sem pressa.",
    },
    destinations: [
      { key: "orlando", label: "Estados Unidos", title: "Disney e Universal", text: "Escolha os parques, distribua os dias e combine a hospedagem com o ritmo da família.", image: "immDisneyCastle", service: "ingressos", href: "/#ingressos-orlando", ctaLabel: "Ver parques", enabled: true, order: 1 },
      { key: "europa", label: "Europa", title: "Cidades, lagos e um roteiro sem pressa", text: "Defina as bases da viagem e o tempo que faz sentido passar em cada lugar.", image: "heroVarenna", service: "pacotes", enabled: true, order: 2 },
      { key: "caribe", label: "Caribe", title: "Dias de descanso no Caribe", text: "Compare praias e resorts all-inclusive pelo que importa para vocês: localização, estrutura e estilo de viagem.", image: "caribeMexico", service: "pacotes", enabled: true, order: 3 },
      { key: "brasil", label: "Brasil", title: "Resorts para diferentes jeitos de descansar", text: "Da viagem a dois às férias com crianças, encontre uma hospedagem que combine com quem vai viajar.", image: "litoral", service: "hospedagem", href: "/resorts-brasil", ctaLabel: "Ver resorts", enabled: true, order: 4 },
      { key: "cruzeiros", label: "Cruzeiros", title: "Roteiros para descobrir a bordo", text: "Compare itinerários, cabines e experiências antes de escolher o navio.", image: "heroSantoriniShip", service: "cruzeiros", enabled: true, order: 5 },
    ],
    authority: briefing.authority,
    about: briefing.about ? { ...briefing.about, ownerName: "Bárbara Bardelli", media: "hidden", images: undefined, mural: undefined, visitedDestinations: undefined } : undefined,
    differentials: briefing.differentials,
    conciergeSteps: briefing.conciergeSteps,
    faq: [
      { q: "A Bardelli planeja viagens para famílias e grupos?", a: "Sim. A Bardelli planeja viagens de lazer para famílias, casais e grupos de amigos. O roteiro é preparado de acordo com os interesses e o ritmo de quem viaja." },
      { q: "Posso pedir ajuda para escolher os parques de Orlando?", a: "Sim. A Bárbara ajuda a organizar os dias de Disney e Universal e a combinar parques, hospedagem e outros momentos da viagem." },
      { q: "É possível planejar uma viagem fora dessas sugestões?", a: "Sim. Estados Unidos, Canadá, Europa, Ásia, Caribe e Brasil estão entre as especialidades. Conte à Bárbara o destino que tem em mente." },
      { q: "Como funciona o acompanhamento?", a: "A Bárbara orienta no planejamento e acompanha antes e durante a viagem, com suporte pelo WhatsApp." },
    ],
    copy: {
      destinations: { kicker: "INSPIRE-SE", title: "Cinco ideias para a próxima viagem", subtitle: "Escolha por onde começar. A proposta é montada para você, não para um viajante genérico." },
      differentials: { title: "O cuidado da Bardelli em cada etapa", subtitle: "Da escolha do roteiro aos detalhes antes do embarque." },
      concierge: { kicker: "COMO FUNCIONA", title: "Do primeiro papo ao embarque", subtitle: "Você revisa as escolhas com a Bárbara antes de reservar.", cta: "Planejar minha viagem" },
      newsletter: { title: "Novidades da Bardelli Viagens", subtitle: "Destinos e ideias para planejar a próxima viagem.", cta: "Quero receber novidades" },
    },
    requestCenter: { title: "Planeje sua viagem com a Bárbara", support: "Conte quem vai viajar e o que vocês querem viver.", notice: "Prévia de revisão: não envia solicitações.", submitLabel: "Revisar solicitação", titlePlacement: "above-card" },
    footer: briefing.footer,
    socialStrip: briefing.socialStrip,
    seo: { title: "Prévia — Bardelli Viagens", description: "Consultoria de viagens de lazer para famílias, casais e grupos de amigos. Prévia de revisão." },
  };
}
