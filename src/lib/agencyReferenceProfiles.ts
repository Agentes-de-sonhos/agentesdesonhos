import momentFamily from "@/assets/100limites-moment-family.jpg";
import momentHoneymoon from "@/assets/100limites-moment-honeymoon.jpg";
import momentFriends from "@/assets/100limites-moment-friends.jpg";
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
import xcaretPanorama from "@/assets/whitelabel/xcaret/xcaret-panorama.webp.asset.json";
import julianaXcaretAtXplor from "@/assets/whitelabel/xcaret/juliana-xplor-sign.webp.asset.json";
import xpertsXcaretBadge from "@/assets/whitelabel/xcaret/xperts-xcaret-badge.webp.asset.json";
import destinosXcaretCover from "@/assets/whitelabel/destinos-xcaret-capa-v3.png.asset.json";
import xcaretSnorkel from "@/assets/whitelabel/xcaret/xcaret-snorkel.webp.asset.json";
import xcaretXoximilco from "@/assets/whitelabel/xcaret/xoximilco.webp.asset.json";
import amandaLariniPerfil from "@/assets/whitelabel/100-limites/amanda-larini-perfil.png.asset.json";
import destinosStorefrontFront from "@/assets/whitelabel/destinos-com-a-ju/storefront-front-v2.png.asset.json";
import {
  type AgencyDestination,
  type AgencyDifferential,
  type AgencyDmcConfig,
  type AgencyHeroSlide,
  type AgencyHighlight,
  type AgencyImageSlot,
  type AgencyModule,
  type AgencySectionKey,
  type AgencySectionOverride,
} from "@/lib/agencySiteConfig";
import type { AgencySiteProfile } from "@/lib/agencySiteProfile";

/** 100 Limites — consultoria global para passageiros e DMC em Portugal. */
export const EDITORIAL_DMC: AgencySiteProfile = {
  key: "editorialDmc",
  resortsMap: { enabled: true },
  nav: [
    { label: "Sobre", to: "/#sobre" },
    {
      label: "DMC em Portugal",
      to: "/dmc-portugal",
      children: [
        { label: "Visão geral", to: "/dmc-portugal" },
        { label: "Passeios em Lisboa", to: "/dmc-portugal#lisboa" },
        { label: "Passeios em Portugal", to: "/dmc-portugal#portugal" },
        { label: "Grupos", to: "/dmc-portugal#grupos" },
      ],
    },
    { label: "Visto americano", to: "/visto-americano" },
    { label: "Parques em Orlando", to: "/#ingressos-orlando" },
    { label: "Resorts no Brasil", to: "/#resorts" },
    { label: "Blog", to: "/blog" },
  ],
  navDensity: "compact",
  alternateSurfaces: true,
  sections: {
    dmc: { enabled: true, order: 1 },
    destinations: { order: 2 },
    orlando: { enabled: true, order: 3 },
    highlights: { order: 4 },
    resorts: { enabled: true, order: 5 },
    modules: { enabled: false },
    about: { order: 6 },
    differentials: { order: 7 },
    concierge: { order: 8 },
    avaliacoes: { enabled: true, order: 9 },
    faq: { order: 10 },
    newsletter: { enabled: true, order: 11 },
    offers: { order: 12 },
  },
  hero: [
    {
      title: "Atendimento próximo em cada etapa da viagem",
      subtitle: "Conte com Amanda Larini para planejar, esclarecer dúvidas e acompanhar sua viagem, do primeiro contato ao retorno.",
      image: "amanda100Limites",
      focalPoint: "amandaRight",
      textWidth: "narrowLeft",
      order: 1,
      enabled: true,
    },
    {
      title: "Sua agência de viagens para o Brasil e o mundo",
      subtitle: "Atendimento personalizado com a Amanda Larini, do planejamento ao retorno, com o melhor equilíbrio entre experiência e investimento.",
      image: "brasil",
      order: 2,
      enabled: true,
    },
  ],
  heroPresentation: {
    kicker: "AGÊNCIA DE VIAGENS · BRASIL E MUNDO",
    cta: { label: "Solicitar minha viagem", service: "pacotes" },
  },
  requestCenter: {
    notice: "Cada solicitação é analisada pela Amanda, considerando seu perfil, suas preferências e o investimento que você deseja fazer.",
  },
  randomizeDestinations: true,
  destinations: [
    { key: "brasil-nordeste", image: "fernandoNoronha", label: "Brasil", title: "Brasil e Nordeste", text: "Praias, natureza e cultura em diferentes regiões do país.", service: "pacotes", enabled: true, order: 1 },
    { key: "europa-portugal", image: "portugalBelem", label: "Europa", title: "Europa e Portugal", text: "Cidades, paisagens e experiências com deslocamentos bem planejados.", service: "pacotes", enabled: true, order: 2 },
    { key: "orlando-parques", image: "orlandoMagicKingdom", label: "Família", title: "Orlando e parques", text: "Parques, ingressos, hospedagem e deslocamentos organizados no seu ritmo.", service: "ingressos", enabled: true, order: 3 },
    { key: "caribe-mexico", image: "cancun", label: "Caribe", title: "Caribe e México", text: "Praias, resorts e experiências escolhidas para o seu perfil.", service: "pacotes", enabled: true, order: 4 },
    { key: "america-sul", image: "mendoza", label: "América do Sul", title: "América do Sul", text: "Cultura, gastronomia e grandes paisagens perto de casa.", service: "pacotes", enabled: true, order: 5 },
  ],
  highlights: [
    { title: "Viagens em família", text: "Hospedagens, passeios e deslocamentos pensados para diferentes idades, com atenção ao conforto e ao ritmo da família.", service: "pacotes", cta: "Planejar em família", image: momentFamily, imageAlt: "Família caminhando na praia ao pôr do sol" },
    { title: "Lua de mel", text: "Uma viagem para celebrar a dois, com destinos e experiências escolhidos conforme os seus desejos.", service: "pacotes", cta: "Planejar nossa viagem", image: momentHoneymoon, imageAlt: "Casal em lua de mel observando o pôr do sol no mar" },
    { title: "Entre amigos", text: "Preferências combinadas e logística organizada para aproveitar a viagem com quem faz parte da sua história.", service: "pacotes", cta: "Planejar com amigos", image: momentFriends, imageAlt: "Grupo de amigos passeando por uma cidade europeia" },
  ],
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Conheça Amanda Larini",
    text: "À frente da 100 Limites desde 2015, Amanda Larini reúne mais de 20 anos de experiência no turismo e acompanha de perto o planejamento de cada cliente.\n\nSeu trabalho começa pela escuta: entender os gostos, as expectativas e o investimento de quem vai viajar para organizar uma experiência que faça sentido do início ao fim.\n\nHoje, vivendo em Lisboa, Amanda continua atendendo passageiros com viagens pelo Brasil e pelo mundo. Em Portugal, também atua como parceira de agências brasileiras, oferecendo serviços receptivos e apoio local aos seus clientes.",
    facts: ["100 Limites desde 2015", "Mais de 20 anos de experiência da Amanda no turismo"],
    images: [{ src: amandaLariniPerfil.url, alt: "Amanda Larini, fundadora e consultora da 100 Limites, sorrindo em seu escritório", position: "center 30%", aspect: "square" }],
  },
  differentials: [
    { title: "Atendimento com a Amanda", text: "Seu planejamento é acompanhado por quem conhece suas preferências e participa das decisões com você.", icon: "consultivo" },
    { title: "Reservas reconfirmadas", text: "Conferência dos serviços contratados, pagamentos e detalhes importantes antes da viagem.", icon: "conferido" },
    { title: "Preparação antes do embarque", text: "Roteiro personalizado e reunião online para revisar a programação e esclarecer dúvidas.", icon: "fornecedores" },
    { title: "Acompanhamento durante a viagem", text: "Apoio para orientações e imprevistos, com continuidade no atendimento até o retorno.", icon: "acompanhamento" },
  ],
  conciergeWhatsappLabel: "Falar com a Amanda",
  hideConciergeActions: true,
  conciergeSteps: [
    "Conte sua ideia, suas preferências e o investimento previsto.",
    "Receba uma proposta personalizada e ajuste os detalhes com a Amanda.",
    "Confirme os serviços e prepare o embarque com as orientações da agência.",
    "Consulte os documentos disponibilizados na Área do Cliente e conte com acompanhamento durante a viagem.",
  ],
  faq: [
    { q: "Vocês organizam viagens apenas para Portugal?", a: "Não. A 100 Limites planeja viagens para destinos no Brasil e no mundo, conforme o perfil e as preferências de cada cliente." },
    { q: "O atendimento pode ser feito online?", a: "Sim. O atendimento acontece por WhatsApp, e-mail e videochamada, permitindo organizar sua viagem de onde você estiver." },
    { q: "Posso contratar serviços separados?", a: "Sim. Você pode solicitar serviços como passagens, hospedagem, transfers, ingressos e seguro, ou planejar uma viagem completa." },
    { q: "Sou agente de viagens. Como solicito serviços em Portugal?", a: "Acesse a seção ‘DMC em Portugal’ e clique em ‘Solicitar orçamento em Portugal’. Informe os dados da viagem e os serviços desejados." },
    { q: "A Amanda acompanha pessoalmente os passeios?", a: "O acompanhamento pode ser organizado conforme o roteiro, o serviço contratado e a disponibilidade. Essa condição é combinada na proposta." },
    { q: "Como acompanho a minha viagem depois de fechar?", a: "Os documentos disponibilizados pela agência ficam reunidos na Área do Cliente para consulta durante a sua viagem." },
  ],
  footer: {
    description: "Viagens pelo Brasil e pelo mundo. DMC em Portugal para agências parceiras.\nAtendimento online com Amanda Larini.",
    address: "Lisboa, Portugal",
    legalName: "100LIMITES VIAGENS & TURISMO LTDA",
    cnpj: "21.911.559/0001-43",
  },
  copy: {
    destinations: {
      title: "Descubra o seu próximo destino",
      subtitle: "Algumas inspirações para começar. Seu próximo destino pode estar aqui ou em qualquer outro lugar do mundo.",
      note: "Estes são alguns dos destinos que atendemos. Sua próxima viagem pode ser para qualquer lugar.",
      extraCta: { label: "Quero outro destino", service: "pacotes" },
    },
    highlights: {
      title: "Uma viagem para cada momento",
      subtitle: "O planejamento acompanha o seu jeito de viajar e as pessoas que vão com você.",
    },
    differentials: {
      title: "Como cuidamos da sua viagem",
    },
    concierge: {
      kicker: "ATENDIMENTO PERSONALIZADO",
      title: "Vamos planejar sua próxima viagem?",
      subtitle: "Conte para a Amanda para onde você quer ir, com quem pretende viajar e o que espera dessa experiência. A partir disso, vocês constroem uma proposta alinhada ao seu perfil.",
      cta: "Solicitar atendimento",
    },
    avaliacoes: { kicker: "EXPERIÊNCIAS REAIS", title: "O que os clientes dizem sobre viajar com a 100 Limites", subtitle: "Avaliações reais de clientes que confiaram à Amanda Larini o planejamento das suas viagens." },
    faq: { title: "Perguntas frequentes" },
    newsletter: {
      kicker: "GRUPO DE NOVIDADES NO WHATSAPP",
      title: "Receba novidades e oportunidades",
      subtitle: "Informe seu nome, WhatsApp e e-mail. Depois de enviar, você será direcionado para o grupo de WhatsApp da 100 Limites, onde a Amanda compartilha novidades e oportunidades de viagem.",
      cta: "Quero entrar no grupo",
    },
  },
  inspirationDialog: {
    groupUrl: "https://chat.whatsapp.com/E3SJmv1Z8aj68oVNDkhaLx?s=sw&p=i&mlu=0",
    title: "Entre no grupo de novidades",
    description: "Preencha seus dados. Ao confirmar, você será direcionado automaticamente para o grupo de WhatsApp da 100 Limites.",
    submitLabel: "Confirmar e entrar no grupo",
    notice: "Ao confirmar, você autoriza o contato da agência e será levado ao grupo de WhatsApp.",
  },
  socialStrip: {
    title: "Siga-nos nas redes",
    links: [
      { network: "instagram", url: "https://www.instagram.com/100limitesviagens/" },
      { network: "facebook", url: "https://www.facebook.com/share/1A2wzfAxVm/" },
      { network: "tiktok", url: "https://www.tiktok.com/@amandalarini100limites" },
      { network: "youtube", url: "https://www.youtube.com/@amandalarini" },
    ],
  },
};

/**
 * Destinos com a Ju — MESMA estrutura editorial aprovada (nenhum override de
 * seção): apenas o tema muda. Conteúdo exclusivo (DMC) nunca é herdado, pois é
 * resolvido por hostname em `resolveDmc`.
 */
export const EDITORIAL_ROSE: AgencySiteProfile = {
  key: "editorialRose",
  resortsMap: { enabled: true },
  compactSectionSpacing: true,
  nav: [
    { label: "Início", to: "/" },
    {
      label: "Especialidades",
      to: "/#assinatura",
      children: [
        { label: "Xcaret", to: "/#experiencia-xcaret" },
        { label: "Parques e Experiências", to: "/#ingressos-orlando" },
        { label: "Resorts no Brasil", to: "/#resorts" },
        { label: "Cruzeiros", to: "/#autoridade" },
      ],
    },
    { label: "Inspirações", to: "/#destinos" },
    { label: "Ofertas", to: "/ofertas" },
    {
      label: "Quem somos",
      to: "/#sobre",
      children: [
        { label: "Sobre", to: "/#sobre" },
        { label: "Avaliações", to: "/#avaliacoes" },
        { label: "FAQ", to: "/#faq" },
      ],
    },
    { label: "Área do Cliente", to: "/area-do-cliente" },
  ],
  sections: {
    dmc: { enabled: false }, testimonials: { enabled: false }, team: { enabled: false },
    credentials: { enabled: false }, highlights: { enabled: false },
    signature: { enabled: true, order: 1 }, modules: { order: 2 }, destinations: { order: 3 },
    authority: { enabled: true, order: 4 }, about: { order: 5 }, differentials: { order: 6 },
    resorts: { enabled: true, order: 3.5 },
    orlando: { enabled: true, order: 2.5 },
    concierge: { order: 7 }, avaliacoes: { enabled: true, order: 8 }, faq: { order: 9 },
    newsletter: { order: 10 }, offers: { order: 11 },
  },
  seo: {
    title: "Destinos com a Ju | Viagens Personalizadas, Orlando, Europa e Cruzeiros",
    description: "Consultoria completa para viagens personalizadas, Orlando, Europa, cruzeiros, Caribe e resorts, com suporte antes, durante e depois.",
    canonical: "https://www.destinoscomaju.com.br/",
  },
  heroImage: "europa",
  heroPresentation: {
    kicker: "CONSULTORIA DE VIAGENS · SÃO PAULO",
    preserveTitleLineBreaks: true,
    titleWeight: "regular",
    actionsPlacement: "right",
    overlay: "strongLeft",
  },
  hero: [
    { title: "Viva a magia de Orlando\ncom quem conhece cada detalhe", subtitle: "Roteiros inteligentes, ingressos oficiais e consultoria completa para sua família aproveitar o melhor dos parques com tranquilidade.", image: "heroJuMagicKingdom", focalPoint: "juMagicKingdom", textWidth: "narrowLeft", order: 1, enabled: true },
    { title: "Sua viagem importa.\nCada detalhe também.", subtitle: "Consultoria completa e atendimento próximo para você viajar com tranquilidade, segurança\ne experiências que realmente combinam com você.", image: "heroVarenna", focalPoint: "varenna", order: 2, enabled: true },
    { title: "Orlando, Europa, cruzeiros e resorts\nplanejados por quem conhece", subtitle: "Destinos, hospedagens e experiências selecionados de acordo com o perfil, o momento e as prioridades de cada viajante.", image: "heroSantoriniShip", focalPoint: "santoriniShip", order: 3, enabled: true },
  ],
  requestCenter: {
    title: "Por onde você quer começar?",
    notice: "Sua solicitação não é processada automaticamente. Cada pedido é analisado com atenção para que as opções realmente façam sentido para a sua viagem.",
    submitLabel: "Solicitar",
    titlePlacement: "above-card",
  },
  signature: {
    kicker: "O JEITO DESTINOS COM A JU DE PLANEJAR",
    title: "Uma viagem bem planejada começa por uma boa conversa.",
    text: "Antes de sugerir destinos, hotéis ou experiências, queremos entender quem vai viajar, o que espera viver e quais detalhes são realmente importantes. É assim que cada viagem ganha personalidade, tranquilidade e significado.",
  },
  randomizeDestinations: true,
  destinations: [
    { key: "europa-no-seu-ritmo", image: "europaCastelo", label: "Cultura e experiências", title: "Europa no seu ritmo", text: "Cidades históricas, gastronomia, paisagens e experiências combinadas em um roteiro personalizado, com deslocamentos e hospedagens cuidadosamente planejados.", service: "pacotes", enabled: true, order: 1 },
    { key: "orlando-completo", image: "orlandoMagicKingdom", label: "Parques e entretenimento", title: "Orlando com planejamento completo", text: "Parques, ingressos, hospedagem, alimentação e deslocamentos organizados para aproveitar melhor cada dia da viagem.", service: "ingressos", enabled: true, order: 2 },
    { key: "cruzeiro-certo", image: "cruzeiroDisneyWish", label: "Experiência em alto-mar", title: "O cruzeiro certo para cada viajante", text: "Companhia, navio, itinerário e categoria de cabine escolhidos com orientação de quem conhece diferentes experiências de cruzeiro.", service: "cruzeiros", enabled: true, order: 3 },
    { key: "caribe-mexico", image: "caribeMexico", label: "Praias e experiências", title: "Caribe e México", text: "Mar, cultura, gastronomia e resorts selecionados para casais, famílias e grupos de amigos que procuram conforto e experiências especiais.", service: "pacotes", enabled: true, order: 4 },
    { key: "nordeste-conforto", image: "nordesteResort", label: "Resorts e all inclusive", title: "Nordeste com conforto e tranquilidade", text: "Resorts e experiências para famílias, casais e grupos que querem descansar com estrutura, segurança e facilidade.", service: "hospedagem", enabled: true, order: 5 },
  ],
  modules: [
    { key: "internacionais-personalizadas", title: "Viagens internacionais personalizadas", text: "Roteiros, hospedagens e experiências combinados de acordo com o ritmo, os interesses e as prioridades dos viajantes.", service: "pacotes", image: "europa", enabled: true, order: 1 },
    { key: "orlando-disney-universal", title: "Orlando, Disney e Universal", text: "Planejamento de parques, ingressos, hotéis, refeições e deslocamentos para aproveitar a viagem com mais organização e menos preocupação.", service: "ingressos", image: "parques", enabled: true, order: 2 },
    { key: "cruzeiros", title: "Cruzeiros", text: "Orientação para escolher companhia, navio, cabine e itinerário entre opções como Disney Cruise Line, MSC, Norwegian e Royal Caribbean.", service: "cruzeiros", image: "cruzeiro", enabled: true, order: 3 },
    { key: "resorts-all-inclusive", title: "Resorts e all inclusive", text: "Seleção de resorts no Brasil, Caribe e México, considerando estrutura, localização, perfil dos hóspedes e experiência desejada.", service: "hospedagem", image: "resort", enabled: true, order: 4 },
    { key: "europa-multidestinos", title: "Europa e multidestinos", text: "Combinações de cidades e países com logística organizada, hospedagens selecionadas e tempo adequado em cada destino.", service: "pacotes", image: "europa", enabled: true, order: 5 },
    { key: "viagens-em-familia", title: "Viagens em família", text: "Planejamento pensado para diferentes idades, equilibrando diversão, conforto, segurança e o ritmo de toda a família.", service: "pacotes", image: "parques", enabled: true, order: 6 },
  ],
  authority: {
    sectionLabel: "Cruzeiros",
    companies: {
      title: "Sua próxima viagem de cruzeiro começa aqui! Na Destinos com a Ju,\nvocê encontra as principais companhias de cruzeiros do mundo.",
      items: [
        { name: "Disney Cruise Line", logo: "https://cruising.org/sites/default/files/styles/wide/public/2025-03/Disney%20Cruise%20Lines.jpg.webp?itok=S4CUbtvJ" },
        { name: "MSC Cruzeiros", logo: "https://cruising.org/sites/default/files/styles/wide/public/2025-03/MSC%20Cruises.jpg.webp?itok=yN8zIFPZ" },
        { name: "Norwegian Cruise Line", logo: "https://cruising.org/sites/default/files/styles/wide/public/2025-03/Norwegian%20Cruise%20Line.jpg.webp?itok=kVaPcjWS" },
        { name: "Royal Caribbean", logo: "https://cruising.org/sites/default/files/styles/wide/public/2025-03/Royal%20Caribbean.jpg.webp?itok=rz8i-L54" },
        { name: "Costa Cruzeiros", logo: "https://cruising.org/sites/default/files/styles/wide/public/2025-03/Costa%20Cruises.jpg.webp?itok=p7jzHzdd" },
      ],
    },
    kicker: "EXPERIÊNCIA QUE FAZ DIFERENÇA",
    title: "Cruzeiros orientados por quem realmente conhece essa forma de viajar",
    paragraphs: [
      "Juliana é especialista em Disney Cruise Line e já vivenciou mais de 18 experiências em cruzeiros, além de conhecer companhias como MSC, Norwegian e Royal Caribbean.",
      "Esse repertório ajuda a comparar navios, itinerários, cabines, experiências a bordo e perfis de viagem com muito mais segurança. O objetivo não é apenas encontrar um cruzeiro, mas escolher aquele que realmente combina com você.",
    ],
    cta: "Quero planejar meu cruzeiro", service: "cruzeiros", image: "cruzeiro", video: "disneyWishCruise",
    videos: [
      { key: "disney-wish", label: "Disney Wish", video: "disneyWishCruise", image: "cruzeiro" },
      { key: "legend-of-the-seas", label: "Legend of the Seas", video: "legendOfTheSeas", image: "cruzeiro" },
      { key: "msc-world-america", label: "MSC World America", video: "mscWorldAmerica", image: "cruzeiro" },
      { key: "norwegian-luna", label: "Norwegian Luna", video: "norwegianLuna", image: "cruzeiro" },
    ],

  },
  about: {
    kicker: "QUEM CUIDA DA SUA VIAGEM",
    title: "Uma história construída por paixão, experiência e proximidade",
    text: "A Destinos com a Ju nasceu em 2013, quando Juliana Neves Sanches transformou sua paixão por viagens em uma agência dedicada a criar experiências personalizadas.\n\nAo longo dos anos, Juliana construiu um repertório especialmente forte em Disney, Universal, viagens internacionais e cruzeiros. É especialista em Disney Cruise Line e já vivenciou mais de 18 experiências em alto-mar, incluindo viagens com MSC, Norwegian e Royal Caribbean.\n\nHoje, a Destinos com a Ju atende diferentes perfis de viajantes, sempre com a mesma essência: ouvir com atenção, planejar cada detalhe e acompanhar o cliente do primeiro contato ao retorno.",
    image: "destinosStorefrontFront",
    images: [
      { src: destinosStorefrontFront.url, alt: "Fachada da loja Destinos com a Ju na Rua Pontins em Santana", position: "center" },
    ],

    badge: { value: "Desde 2013", label: "Experiência, planejamento e cuidado em cada viagem." },
    ownerName: "Juliana Neves Sanches e Equipe",
  },
  differentials: [
    { title: "Atendimento conduzido de perto", text: "A Juliana participa do planejamento e acompanha pessoalmente cada cliente durante as principais etapas da viagem.", icon: "consultivo" },
    { title: "Planejamento realmente personalizado", text: "As escolhas consideram quem vai viajar, o perfil dos passageiros, o orçamento, os interesses e o ritmo desejado.", icon: "conferido" },
    { title: "Experiência nos destinos e produtos vendidos", text: "O conhecimento construído em viagens, parques, resorts e cruzeiros permite apresentar opções com mais clareza e segurança.", icon: "fornecedores" },
    { title: "Suporte antes, durante e depois", text: "O atendimento continua após a confirmação das reservas, com orientação antes do embarque, acompanhamento durante a viagem e apoio no retorno.", icon: "acompanhamento" },
  ],
  conciergePoints: [
    { key: "ideia", title: "Conte a sua ideia", text: "Envie a solicitação com o destino, período, passageiros e o que você já imagina para a viagem." },
    { key: "detalhes", title: "Conversamos sobre os detalhes", text: "A Juliana entra em contato para entender o perfil dos viajantes, as prioridades e as expectativas." },
    { key: "proposta", title: "Receba uma proposta personalizada", text: "Você recebe opções claras, organizadas e explicadas para escolher com segurança." },
    { key: "acompanhamento", title: "Viaje com acompanhamento", text: "Depois da confirmação, documentos, roteiro e informações ficam organizados na Área do Cliente, com suporte durante toda a jornada." },
  ],
  conciergeWhatsappLabel: "Falar com a equipe",
  hideConciergeActions: true,

  reviewsCopy: {
    kicker: "EXPERIÊNCIAS REAIS", title: "O que os clientes dizem sobre viajar com a Ju",
    subtitle: "Avaliações reais de clientes que confiaram à Destinos com a Ju o planejamento de momentos importantes.",
  },
  faq: [
    { q: "O atendimento da Destinos com a Ju é personalizado?", a: "Sim. Cada solicitação é analisada individualmente. Antes de montar a proposta, buscamos entender o perfil dos viajantes, as prioridades, o orçamento e o tipo de experiência desejada." },
    { q: "Posso solicitar apenas um serviço?", a: "Sim. Você pode solicitar passagem aérea, hospedagem, aluguel de carro, transfer, ingressos, seguro ou cruzeiro separadamente. Também podemos organizar a viagem completa." },
    { q: "A agência é especializada em cruzeiros?", a: "Sim. Juliana é especialista em Disney Cruise Line e já vivenciou mais de 18 experiências em cruzeiros, além de conhecer companhias como MSC, Norwegian e Royal Caribbean." },
    { q: "Vocês organizam viagens para Orlando?", a: "Sim. Planejamos passagens, hospedagem, ingressos, parques, alimentação, deslocamentos e outros detalhes importantes para aproveitar melhor cada dia em Orlando." },
    { q: "Como funciona o suporte durante a viagem?", a: "A Destinos com a Ju acompanha o cliente antes do embarque e permanece disponível durante a viagem para orientar e ajudar na condução de eventuais imprevistos." },
    { q: "Onde encontro meus documentos depois da compra?", a: "Orçamento, roteiro, documentos, vouchers e informações ficam organizados na Área do Cliente, acessível pelos links enviados pela agência." },
    { q: "Solicitar uma proposta tem algum custo?", a: "Não. A solicitação inicial é gratuita e sem compromisso. Depois de entender a viagem, apresentamos as possibilidades e orientamos os próximos passos." },
  ],
  footer: {
    description: "Consultoria completa para viagens personalizadas, com planejamento e acompanhamento antes, durante e depois.",
    whatsapp: "(11) 95741-4840", whatsappHidden: true, phone: "(11) 2959-6402", email: "contato@destinoscomaju.com.br",
    instagram: "https://instagram.com/destinoscomaju", instagramLabel: "@destinoscomaju",
    address: "Rua Pontins, 54 — Santana — São Paulo/SP", legalName: "FECAFER Agência de Viagens e Turismo Ltda.", cnpj: "23.593.301/0001-71",
  },
  featuredExperience: {
    enabled: true,
    id: "experiencia-xcaret",
    kicker: "EXPERIÊNCIA E ESPECIALIZAÇÃO",
    title: "Somos uma agência Xperts Xcaret Oficial",
    description: "Juliana conheceu de perto o universo Xcaret e recebeu o selo de Expert. Agora, transforma essa experiência em orientação personalizada para ajudar você a escolher os parques, hotéis e experiências que realmente combinam com a sua viagem.",
    mainImage: {
      src: destinosXcaretCover.url,
      alt: "Montagem com Juliana no letreiro do Parque Xcaret, o selo Xperts Xcaret 2026 e fotos da vista aérea do parque, da caverna do Xplor e das asas do Xenses",
      position: "center",
      fit: "contain",
    },
    consultantImage: null,
    badge: null,
    highlights: ["Experiência vivida no destino", "Conhecimento dos parques e hotéis", "Planejamento personalizado", "Orientação antes, durante e depois da viagem"],
    ctaLabel: "Saiba mais sobre este destino",
    ctaHref: "/xcaret",
  },
  copy: {
    destinations: { title: "Inspirações para a sua próxima viagem", subtitle: "Destinos e experiências que fazem parte do repertório da Destinos com a Ju. Escolha uma inspiração e conte como você imagina a sua viagem." },
    modules: { title: "Viagens que planejamos com atenção \na cada detalhe", subtitle: "A Destinos com a Ju combina consultoria, experiência e acompanhamento para criar viagens que respeitam o perfil de cada cliente." },
    differentials: { title: "O que você encontra na Destinos com a Ju", subtitle: "Mais do que reservas, você recebe orientação, acompanhamento e a tranquilidade de ter alguém cuidando da sua viagem." },
    concierge: { kicker: "SUA VIAGEM REALMENTE IMPORTA", title: "Aqui você não é apenas mais um cliente", subtitle: "Um consultor dedicado acompanha a sua viagem do início ao fim. Você recebe orientação para tomar decisões, entende cada escolha e sabe com quem contar caso aconteça algum imprevisto.", cta: "Solicitar atendimento personalizado" },
    avaliacoes: { kicker: "EXPERIÊNCIAS REAIS", title: "O que os clientes dizem sobre viajar com a Ju", subtitle: "Avaliações reais de clientes que confiaram à Destinos com a Ju o planejamento de momentos importantes." },
    faq: { title: "Dúvidas frequentes" },
    newsletter: { kicker: "INSPIRAÇÕES PARA VIAJAR", title: "Receba novidades e oportunidades", subtitle: "Deixe o seu contato para receber inspirações de destinos, cruzeiros, resorts e experiências selecionadas pela Destinos com a Ju.", cta: "Quero receber inspirações", surface: "navy", titleSingleLine: true },
  },
};

