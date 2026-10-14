/** Complete presentation-only baseline. Reference profiles remain unchanged. */
import type { AgencySectionKey, AgencySectionOverride } from "@/lib/agencySiteConfig";
import type { AgencySiteProfile, AgencySiteProfileKey } from "@/lib/agencySiteProfile";
import { EDITORIAL_DMC, EDITORIAL_ROSE } from "@/lib/agencyReferenceProfiles";
import { XCARET_IMAGES } from "@/components/landing/xcaret/content";

import cruiseLogo0 from "@/assets/presentation/cruise-company-0.webp.asset.json";
import cruiseLogo1 from "@/assets/presentation/cruise-company-1.webp.asset.json";
import cruiseLogo2 from "@/assets/presentation/cruise-company-2.webp.asset.json";
import cruiseLogo3 from "@/assets/presentation/cruise-company-3.webp.asset.json";
import cruiseLogo4 from "@/assets/presentation/cruise-company-4.webp.asset.json";

export const GOLD_STANDARD_SECTION_ORDER: AgencySectionKey[] = [
  "signature", "modules", "orlando", "destinations", "highlights", "resorts", "authority", "dmc", "about", "differentials", "credentials", "team", "concierge", "avaliacoes", "faq", "newsletter", "offers",
];
export function goldStandardSections(): Partial<Record<AgencySectionKey, AgencySectionOverride>> {
  return { testimonials: false, ...Object.fromEntries(GOLD_STANDARD_SECTION_ORDER.map((key, i) => [key, { enabled: true, order: i + 1 }])) };
}
/** Identity is mandatory; factual/personal reference content is never inherited. */
export function buildGoldStandardProfile(key: AgencySiteProfileKey, overrides: Partial<AgencySiteProfile> = {}, agencyName = "A agência"): AgencySiteProfile {
  const name = agencyName;
  return {
    heroImage: EDITORIAL_ROSE.heroImage,
    heroPresentation: EDITORIAL_ROSE.heroPresentation,
    requestCenter: EDITORIAL_ROSE.requestCenter,
    modules: EDITORIAL_ROSE.modules,
    conciergeWhatsappLabel: EDITORIAL_ROSE.conciergeWhatsappLabel,
    key, presentation: true, demo: false, visaHome: true,
    alternateSurfaces: true, compactSectionSpacing: true, randomizeDestinations: true,
    resortsMap: { enabled: true },
    hero: EDITORIAL_ROSE.hero?.map((slide, i) => ({ ...slide, image: i === 0 ? "orlandoMagicKingdom" : slide.image, focalPoint: i === 0 ? undefined : slide.focalPoint })),
    signature: { ...(EDITORIAL_ROSE.signature ?? { kicker: "", title: "", text: "" }), kicker: `O JEITO ${name.toUpperCase()} DE PLANEJAR` },
    featuredExperience: {
      ...(EDITORIAL_ROSE.featuredExperience ?? { enabled: true, title: "", description: "", mainImage: { src: "", alt: "" } }), kicker: "DESCUBRA O UNIVERSO XCARET", title: "Xcaret: natureza, cultura e experiências no México",
      description: "Parques, hotéis e paisagens da Riviera Maya em uma viagem que pode combinar aventura, descanso e cultura mexicana. Descubra as possibilidades e converse sobre o que faz sentido para o seu perfil, suas datas e o ritmo de quem vai viajar.",
      mainImage: { src: XCARET_IMAGES.xcaret.src, alt: XCARET_IMAGES.xcaret.alt, fit: "contain" },
      consultantImage: null, badge: null, secondaryImages: [],
      highlights: ["Parques e experiências", "Hotéis na Riviera Maya", "Planejamento personalizado", "Orientação para sua viagem"],
    },
    authority: { ...(EDITORIAL_ROSE.authority ?? { kicker: "", title: "", paragraphs: [], cta: "Solicitar cruzeiro", service: "cruzeiros" }), companies: { title: "Aqui você encontra as principais companhias marítimas", items: ["Disney Cruise Line", "MSC Cruzeiros", "Norwegian Cruise Line", "Royal Caribbean", "Costa Cruzeiros"].map((name, i) => ({ name, logo: [cruiseLogo0, cruiseLogo1, cruiseLogo2, cruiseLogo3, cruiseLogo4][i].url })) }, kicker: "ESCOLHAS PARA A SUA VIAGEM", title: "Cruzeiros para diferentes formas de viajar", paragraphs: [
      "Disney, MSC, Norwegian, Royal Caribbean e Costa oferecem diferentes formas de viver uma viagem no mar. Navios, itinerários, cabines e atividades a bordo compõem experiências que podem combinar férias em família, momentos a dois e descobertas em novos destinos.",
      "A proposta é comparar as possibilidades com atenção ao perfil dos viajantes, às datas disponíveis e ao investimento desejado. Da escolha do roteiro aos detalhes da hospedagem a bordo, cada decisão merece informação clara e planejamento no seu ritmo.",
    ] },
    destinations: EDITORIAL_DMC.destinations,
    highlights: EDITORIAL_DMC.highlights,
    about: { kicker: "QUEM CUIDA DA SUA VIAGEM", title: name, image: "europa", images: undefined, badge: undefined, ownerName: undefined,
      text: `${name} reúne consultoria de viagem e roteiros personalizados em uma proposta de atendimento próximo. Cada planejamento começa pela escuta: conhecer quem vai viajar, entender os interesses e identificar os detalhes importantes para transformar uma ideia em um roteiro com personalidade.\n\nOrlando, destinos nacionais e internacionais, resorts e cruzeiros oferecem muitas possibilidades de escolha. A redação institucional desta apresentação propõe organizar essas inspirações com atenção ao tempo disponível, ao conforto e às prioridades de cada viajante, sem substituir as informações que serão confirmadas pela agência.\n\nDo primeiro contato à organização da proposta, o objetivo é construir uma conversa clara e cuidadosa sobre a viagem. Com base em São Paulo, a agência convida você a compartilhar seus planos para que destinos, hospedagens e experiências possam ser avaliados de acordo com seu perfil.`,
    },
    differentials: EDITORIAL_ROSE.differentials?.map((item, i) => ({ ...item, text: i === 0 ? "Uma conversa dedicada ajuda a entender as expectativas e as prioridades de quem vai viajar." : i === 2 ? "Destinos, parques, resorts e cruzeiros comparados conforme as preferências e o investimento da viagem." : item.text })),
    conciergePoints: EDITORIAL_ROSE.conciergePoints?.map(item => ({ ...item, text: item.key === "detalhes" ? "A equipe conversa com você sobre o perfil dos viajantes, as prioridades e as expectativas." : item.text })),
    hideConciergeActions: false,
    reviewsCopy: undefined,
    testimonials: undefined,
    faq: [
      { q: "O atendimento é personalizado?", a: "O planejamento começa por uma conversa sobre o perfil dos viajantes, prioridades, período e investimento desejado. A proposta é organizada a partir dessas informações." },
      { q: "Posso solicitar apenas um serviço?", a: "Informe no pedido se deseja uma viagem completa ou serviços separados. As opções e condições disponíveis serão confirmadas na proposta." },
      { q: "Como escolher um cruzeiro?", a: "Compare roteiro, navio, cabine, atividades e duração conforme o perfil de quem viaja. As companhias exibidas são inspirações de produtos, sem indicar certificação da agência." },
      { q: "Como planejar Orlando?", a: "Compartilhe suas datas e os parques desejados. Hospedagem, dias de visita e intervalos de descanso podem ser organizados conforme o ritmo da família." },
      { q: "Como funciona o acompanhamento?", a: "Os canais, horários e condições de atendimento serão combinados diretamente com a agência. Esta apresentação não estabelece compromissos operacionais adicionais." },
      { q: "Onde encontro meus documentos?", a: "Após a contratação, consulte a agência sobre a disponibilização dos documentos e orientações da sua viagem." },
      { q: "Como solicito uma proposta?", a: "Escolha o serviço e informe os dados iniciais da viagem. Na apresentação técnica, o formulário pode ser revisado, mas nenhum pedido é enviado." },
    ],
    dmc: { kicker: "PORTUGAL · APRESENTAÇÃO ILUSTRATIVA", title: "Portugal, com planejamento no seu ritmo", text: "Cidades históricas, gastronomia e paisagens para descobrir. Esta apresentação demonstra uma área de assistência e planejamento em Portugal; serviços, parceiros e disponibilidade dependem de confirmação da agência, sem afirmar operação local própria.", services: [{ key: "roteiros", label: "Planejamento de roteiro" }, { key: "acompanhamento", label: "Assistência ao viajante" }, { key: "grupos", label: "Ideias para grupos" }, { key: "consultoria", label: "Consultoria de viagem" }], cta: "Conhecer as possibilidades em Portugal", whatsappMessage: "Gostaria de conhecer as possibilidades em Portugal.", note: "Conteúdo ilustrativo de apresentação — capacidades e parceiros a confirmar.", presentation: { surface: "light", imageUrl: XCARET_IMAGES.chichen.src } },
    credentials: { kicker: "APRESENTAÇÃO ILUSTRATIVA", title: "Credenciais e conexões", text: "Espaço de apresentação para informações que a agência poderá confirmar. Nenhum selo ou certificado é atribuído nesta prévia.", items: [{ key: "cadastur", name: "Cadastro e documentação", text: "Informações e comprovantes serão incluídos somente após validação." }, { key: "parceiros", name: "Conexões de viagem", text: "Parcerias e especializações dependem de confirmação da agência." }] },
    team: [{ key: "consultoria", name: "Consultoria de viagens", role: "Apresentação ilustrativa", text: "Atendimento dedicado a conhecer os seus planos. Nomes, funções e fotografias da equipe serão confirmados pela agência." }],
    copy: { ...EDITORIAL_ROSE.copy,
      destinations: { title: "Descubra o seu próximo destino", subtitle: "Inspirações para viagens pelo Brasil e pelo mundo, organizadas conforme o seu perfil." },
      differentials: { title: `O que você encontra na ${name}`, subtitle: "Planejamento e atenção aos detalhes da sua viagem." },
      avaliacoes: { kicker: "EXEMPLO DE APRESENTAÇÃO", title: "Avaliações de quem viaja", subtitle: "Avaliação ilustrativa — exemplo de apresentação. Não é um depoimento real nem uma integração com o Google." },
      newsletter: { title: "Receba novidades e oportunidades", subtitle: "Conheça novas inspirações para a sua próxima viagem. Formulário demonstrativo, sem inscrição ou envio nesta apresentação." },
    },
    footer: { description: "Consultoria de viagem e roteiros personalizados." },
    seo: { title: `Apresentação — ${name}`, description: "Apresentação técnica para revisão, com conteúdo ilustrativo identificado." },
    socialStrip: undefined, visaConsult: undefined, inspirationDialog: undefined,
    nav: [ { label: "Sobre", to: "/#sobre" }, { label: "Especialidades", to: "/#assinatura", children: [{ label: "Xcaret", to: "/xcaret" }, { label: "Orlando", to: "/ingressos-orlando" }, { label: "Resorts", to: "/resorts-brasil" }, { label: "Cruzeiros", to: "/#autoridade" }] }, { label: "Visto americano", to: "/visto-americano" }, { label: "Portugal", to: "/dmc-portugal" }, { label: "Inspirações", to: "/#destinos" }, { label: "Ofertas", to: "/ofertas" }, { label: "Blog", to: "/blog" } ],
    ...overrides,
    sections: { ...goldStandardSections(), ...(overrides.sections ?? {}) },
  };
}
