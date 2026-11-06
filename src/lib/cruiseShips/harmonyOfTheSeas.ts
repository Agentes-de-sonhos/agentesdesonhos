/**
 * Harmony of the Seas — texts, media and itinerary feed EXACTLY as in the
 * approved preview (harmony-approved-source.zip, 2026-11-06). Do not rewrite.
 */
import type { CruiseShipContent, CruiseItineraryFeed } from "./types";
import feed from "./data/harmony-of-the-seas.itineraries.json";
import { HARMONY_ASSETS } from "./harmonyAssets";

export const HARMONY_OF_THE_SEAS: CruiseShipContent = {
  lineSlug: "royal-caribbean",
  shipSlug: "harmony-of-the-seas",
  lineName: "Royal Caribbean International",
  shipName: "Harmony of the Seas",
  titleLead: "Harmony",
  titleTail: "of the Seas",
  eyebrow: "CRUZEIROS / ROYAL CARIBBEAN / CLASSE OASIS",
  tagline: "Um mar de possibilidades. Um navio para viver todas elas.",
  assets: HARMONY_ASSETS,
  hero: {
    image: "hero", video: "harmony", alt: "Vista aérea do Harmony of the Seas",
    caption: "Seu próximo horizonte começa aqui.", captionSmall: "Assista ao vídeo do navio",
    videoAria: "Assistir ao vídeo do Harmony of the Seas",
  },
  tiles: [
    { photo: "aqua", alt: "AquaTheater", label: "AquaTheater" },
    { photo: "extra4", alt: "Central Park e Trellis Bar", label: "Central Park" },
    { photo: "extra3", alt: "Lounge Dazzles vazio", label: "Ambientes a bordo" },
  ],
  albumTile: { image: "aerial", alt: "Vista da popa" },
  credit: "Fotos e vídeo: Royal Caribbean International · materiais dos sites oficiais da companhia.",
  photos: [
    { key: "hero", label: "O Harmony visto de cima", category: "Exterior" },
    { key: "aerial", label: "Uma cidade sobre o mar", category: "Exterior" },
    { key: "extra9", label: "Schooner Bar · imagem de referência", category: "Ambientes" },
    { key: "extra4", label: "Central Park · Trellis Bar", category: "Ambientes" },
    { key: "extra3", label: "Lounge Dazzles", category: "Ambientes" },
    { key: "extra5", label: "Café no Royal Promenade", category: "Gastronomia" },
    { key: "extra0", label: "Adventure Ocean · Explorers", category: "Lazer" },
    { key: "extra1", label: "Imagination Studio", category: "Lazer" },
    { key: "extra2", label: "Adventure Ocean · Voyagers", category: "Lazer" },
    { key: "aqua", label: "Acrobacias no AquaTheater", category: "Lazer" },
    { key: "interior", label: "Cabine interna · imagem ilustrativa", category: "Cabines" },
    { key: "ocean", label: "Cabine externa · imagem ilustrativa", category: "Cabines" },
    { key: "balcony", label: "Cabine com varanda · imagem ilustrativa", category: "Cabines" },
    { key: "suite", label: "Suíte · imagem ilustrativa", category: "Cabines" },
    { key: "park", label: "Central Park à noite", category: "Ambientes" },
    { key: "cafe", label: "Café Promenade", category: "Gastronomia" },
    { key: "extra11", label: "Café da manhã · imagem de referência", category: "Gastronomia" },
    { key: "slides", label: "The Perfect Storm", category: "Lazer" },
  ],
  photoCategories: ["Todas", "Exterior", "Ambientes", "Gastronomia", "Lazer", "Cabines"],
  about: {
    eyebrow: "01 / CONHEÇA O HARMONY", titleA: "Grande nas possibilidades.", titleB: "Seu em cada momento.",
    text: "Entre um espetáculo, uma caminhada e um novo destino, encontre o seu jeito de aproveitar o tempo no mar.",
    stats: [
      { value: "2016", label: "Ano de estreia" }, { value: "18", label: "Decks totais" },
      { value: "2026", label: "Renovação Royal Amplified" }, { value: "20+", label: "Opções gastronômicas*" },
      { value: "4", label: "Piscinas*" }, { value: "10", label: "Hidromassagens*" },
    ],
    techTitle: "Conheça o navio em detalhes", techText: "Capacidade, estrutura e informações da renovação.",
    techButton: "Ver ficha técnica do navio",
    why: [
      { title: "O espetáculo faz parte", text: "Água, gelo e palco dão diferentes cenários às suas noites." },
      { title: "Vários jeitos de passear", text: "Ambientes com personalidades próprias, do Central Park ao Boardwalk." },
      { title: "Tempo para cada geração", text: "Espaços infantis e atividades para compartilhar a viagem em família." },
      { title: "Também dá para desacelerar", text: "Reserve um momento entre as escalas para descansar e olhar o mar." },
    ],
  },
  experiences: {
    eyebrow: "02 / A VIDA A BORDO", titleA: "O destino também ", titleB: "é o navio.",
    tabs: [
      { key: "fun", label: "Diversão e espetáculos", image: "aqua", title: "Noites que merecem aplausos.", text: "Escolha uma nova forma de se surpreender quando o sol se põe.", items: ["AquaTheater: apresentações em um palco aquático", "Espetáculos no gelo e no teatro", "Atrações como tirolesa e Ultimate Abyss"] },
      { key: "food", label: "Sabores a bordo", image: "extra4", title: "À mesa, mais uma descoberta.", text: "Da refeição descontraída a uma ocasião especial, escolha o clima de cada momento.", items: ["Incluídos: Main Dining Room, Windjammer e opções casuais", "Novidades: Samba Grill, El Loco Fresh e Playmakers", "Restaurantes de especialidades e consumo nos bares são cobrados à parte"] },
      { key: "kids", label: "Em família", image: "extra0", title: "Boas histórias em família.", text: "Tempo juntos e oportunidades para cada geração aproveitar seus próprios interesses.", items: ["Adventure Ocean e atividades infantis", "Splashaway Bay para brincar com água", "Consulte idades, restrições e serviços disponíveis"] },
      { key: "rest", label: "Tempo para você", image: "extra10", title: "Um intervalo só seu.", text: "Entre uma escala e outra, deixe espaço na agenda para fazer menos.", items: ["Deck de piscinas renovado e The Lime & Coconut", "Solarium para adultos e academia", "Spa, tratamentos e consumo no bar pagos à parte"] },
    ],
  },
  included: {
    title: "O que está incluído na viagem?",
    items: [
      { title: "Incluído na tarifa básica", text: "Hospedagem e transporte marítimo; refeições nos restaurantes incluídos, como Main Dining Room e Windjammer; opções de bebidas básicas; piscinas, academia e a maioria dos espetáculos e atividades. Não é um pacote all inclusive." },
      { title: "Serviços adicionais", text: "Restaurantes de especialidades, bebidas alcoólicas, refrigerantes, cafés especiais, internet, spa e excursões são adicionais. Aéreo, hotel e transfers só entram quando expressamente incluídos na proposta." },
      { title: "Confira na sua proposta", text: "Confirme gorjetas, taxas e pacotes na proposta. Benefícios de suítes variam por categoria. Em CocoCay, atrações como parque aquático, cabanas e beach clubs podem ter cobrança adicional." },
    ],
  },
  cabins: {
    eyebrow: "03 / SEU LUGAR NO MAR", titleA: "Uma cabine para ", titleB: "o seu jeito.",
    text: "Comece pela experiência que deseja. A agência ajuda a escolher a categoria e a localização.",
    items: [
      { name: "Interna", image: "interior", lead: "Um espaço para descansar entre as experiências a bordo.", detail: "Categorias internas podem incluir vista para a Promenade ou varanda virtual. Confira a configuração da cabine escolhida." },
      { name: "Externa", image: "ocean", lead: "A luz natural faz parte da sua estadia.", detail: "Janela com vista externa, sujeita à categoria e possíveis obstruções." },
      { name: "Varanda", image: "balcony", lead: "Seu momento ao ar livre, pertinho da cabine.", detail: "A vista pode ser para o mar ou áreas internas do navio. Confirme a categoria antes de reservar." },
      { name: "Suíte", image: "suite", lead: "Mais espaço para viver a viagem no seu ritmo.", detail: "Royal Suite Class: níveis Sea, Sky e Star. Há suítes Grand, Loft e AquaTheater, além da Ultimate Family Suite. Benefícios e ocupação variam por categoria." },
    ],
    note: "Imagens ilustrativas da companhia para as categorias; não representam necessariamente as cabines após a renovação. Configuração, área, ocupação, vista e benefícios variam por cabine; confirme na proposta.",
  },
  routes: {
    eyebrow: "04 / NOVOS HORIZONTES", titleA: "Para onde vamos ", titleB: "a bordo?",
    text: "Explore tipos de viagem, sem percorrer uma lista de datas. Escolha um roteiro e descubra suas possibilidades.",
    homePortEyebrow: "PORT CANAVERAL, FLÓRIDA",
    homePortText: "Embarque e desembarque em Port Canaveral, na região de Orlando.",
    regions: ["Bahamas", "Caribe Oriental", "Caribe Ocidental"],
    regionRules: [
      { region: "Caribe Ocidental", ports: ["Costa Maya", "Cozumel", "Falmouth", "Roatán"] },
      { region: "Caribe Oriental", ports: ["St. Maarten", "San Juan", "St. Thomas", "Puerto Plata", "Samaná", "St. Kitts"] },
    ],
    fallbackRegion: "Bahamas",
    coordinates: {
      "Port Canaveral": [28.41, -80.61], Nassau: [25.08, -77.34], CocoCay: [25.82, -77.94], "St. Maarten": [18.01, -63.05],
      "San Juan": [18.46, -66.11], "Costa Maya": [18.73, -87.71], Cozumel: [20.5, -86.95], "St. Thomas": [18.34, -64.93],
      "Puerto Plata": [19.8, -70.7], "Samaná": [19.2, -69.33], "St. Kitts": [17.29, -62.72], Falmouth: [18.49, -77.65], "Roatán": [16.32, -86.54],
    },
    feed: feed as CruiseItineraryFeed,
    geography: HARMONY_ASSETS.caribbean,
  },
  quote: {
    eyebrow: "05 / A VIAGEM COMEÇA NA CONVERSA", titleA: "Agora, imagine", titleB: "você a bordo.",
    textA: "Conte um pouco sobre seus planos.", textB: "A próxima escolha pode ser feita com ajuda.",
  },
  tech: {
    title: "Ficha técnica do navio",
    paragraphs: [
      "Classe Oasis · 18 decks totais, 16 para passageiros.",
      "Capacidade publicada: até 6.780 hóspedes; aproximadamente 5.479 em ocupação dupla. A lotação efetiva depende das cabines e da operação.",
      "Tripulação: a Royal publica números diferentes em materiais de épocas distintas; não tratamos um número como efetivo atual confirmado.",
      "4 piscinas e 10 hidromassagens conforme Royal Caribbean Incentives. Gastronomia: mais de 20 opções conforme a apresentação do navio renovado; inclui espaços de diferentes tipos, gratuitos e pagos.",
    ],
  },
};
