import xelHaAsset from "@/assets/whitelabel/xcaret/xel-ha.webp.asset.json";
import xplorAsset from "@/assets/whitelabel/xcaret/xplor.webp.asset.json";
import xplorFuegoAsset from "@/assets/whitelabel/xcaret/xplor-fuego.webp.asset.json";
import xensesAsset from "@/assets/whitelabel/xcaret/xenses.webp.asset.json";
import xoximilcoAsset from "@/assets/whitelabel/xcaret/xoximilco.webp.asset.json";
import hotelMexicoAsset from "@/assets/whitelabel/xcaret/hotel-xcaret-mexico.webp.asset.json";
import hotelArteAsset from "@/assets/whitelabel/xcaret/hotel-xcaret-arte.webp.asset.json";

export type XcaretImage = { src: string; alt: string; source: string };

export const XCARET_WHATSAPP = "5511957414840";

export function xcaretWhatsappUrl(message: string) {
  return `https://wa.me/${XCARET_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

const official = (src: string, alt: string, source: string): XcaretImage => ({ src, alt, source });

export const XCARET_IMAGES = {
  xcaret: official(
    "https://www.xcaret.com/assets/xcaret/galeria/sliders/xcaret/xc-galeria-3.webp",
    "Águas cristalinas e vegetação tropical no parque Xcaret",
    "https://www.xcaret.com/en/gallery/",
  ),
  xelHa: official(xelHaAsset.url, "Visitantes flutuando nas águas naturais de Xel-Há", "https://www.xcaret.com/en/gallery/"),
  xplor: official(xplorAsset.url, "Aventura de tirolesa sobre a vegetação no Xplor", "https://www.xcaret.com/en/gallery/"),
  xplorFuego: official(xplorFuegoAsset.url, "Percurso noturno iluminado no Xplor Fuego", "https://www.xcaret.com/en/gallery/"),
  xenses: official(xensesAsset.url, "Cenário sensorial e lúdico do parque Xenses", "https://www.xcaret.com/en/gallery/"),
  xoximilco: official(xoximilcoAsset.url, "Embarcação típica em uma noite festiva no Xoximilco", "https://www.xcaret.com/en/gallery/"),
  undergroundRiver: official("https://www.xcaret.com/img/og/rio-subterraneo-og.jpg", "Rio subterrâneo de águas azuis no parque Xcaret", "https://www.xcaret.com/en/attractions/underground-rivers/"),
  mexicoShow: official("https://www.xcaret.com/img/og/mexico-espectacular-og.jpg", "Artistas no espetáculo Xcaret México Espectacular", "https://www.xcaret.com/en/attractions/xcaret-mexico-espectacular/"),
  xenotes: official("https://www.xenotes.com/img/og/xenotes-og.jpg", "Cenote cercado pela vegetação da Riviera Maya", "https://www.xcaret.com/en/parks-and-tours/tour-xenotes/"),
  chichen: official("https://www.xcaret.com/img/og/chichen-itza-og.jpg", "Pirâmide de Chichén Itzá no México", "https://www.xcaret.com/en/parks-and-tours/tour-to-chichen-itza-clasico/"),
  hotelMexico: official(hotelMexicoAsset.url, "Piscinas e arquitetura do Hotel Xcaret México", "https://hotel-xcaret-mexico.firstview.us/en/imagenes-multimedia"),
  hotelArte: official(hotelArteAsset.url, "Piscina do Hotel Xcaret Arte", "https://hotel-xcaret-arte.firstview.us/en/imagenes-multimedia/infinity-pool-cayuco/contenido"),
  casaPlaya: official("https://www.lacasadelaplaya.com/img/og/lcdlp-og.jpg", "La Casa de la Playa diante do Caribe mexicano", "https://www.lacasadelaplaya.com/en/gallery/"),
} as const;

export const XCARET_HERO_SLIDES = [
  { name: "Xcaret", caption: "Natureza e cultura mexicana em um só lugar.", image: XCARET_IMAGES.xcaret },
  { name: "Xel-Há", caption: "Mergulhe em um paraíso natural.", image: XCARET_IMAGES.xelHa },
  { name: "Xplor", caption: "A aventura ganha outra dimensão.", image: XCARET_IMAGES.xplor },
  { name: "Xplor Fuego", caption: "Sua aventura continua depois do pôr do sol.", image: XCARET_IMAGES.xplorFuego },
  { name: "Xenses", caption: "Prepare-se para questionar os seus sentidos.", image: XCARET_IMAGES.xenses },
  { name: "Xoximilco", caption: "Uma noite para celebrar o México.", image: XCARET_IMAGES.xoximilco },
] as const;

export const XCARET_EXPERIENCES = [
  { title: "Xel-Há", text: "Flutue pelo rio, mergulhe de snorkel e aproveite uma enseada cercada de natureza. Um convite para passar o dia dentro d’água.", image: XCARET_IMAGES.xelHa },
  { title: "Xplor", text: "Voe de tirolesa sobre a vegetação, percorra trilhas em veículos anfíbios e explore rios subterrâneos. Para quem quer acrescentar aventura à viagem.", image: XCARET_IMAGES.xplor },
  { title: "Xplor Fuego", text: "Depois do pôr do sol, o Xplor ganha outra atmosfera. Tirolesas, cavernas e percursos iluminados tornam a aventura ainda mais surpreendente.", image: XCARET_IMAGES.xplorFuego },
  { title: "Xenses", text: "Caminhe por cenários que desafiam a percepção e descubra experiências que brincam com os seus sentidos. Prepare-se para se surpreender e dar boas risadas.", image: XCARET_IMAGES.xenses },
  { title: "Xoximilco", text: "Embarque em uma noite de música ao vivo, sabores mexicanos e celebração a bordo de uma embarcação típica pelos canais.", image: XCARET_IMAGES.xoximilco },
] as const;

export const XCARET_FAQ = [
  ["Xcaret é um parque ou um hotel?", "Os dois! Xcaret é o nome do parque que deu origem ao grupo, que hoje reúne outros parques, passeios e três hotéis. Você pode visitar atrações específicas ou se hospedar para aproveitar vários dias de experiências."],
  ["Preciso me hospedar em um Hotel Xcaret para visitar os parques?", "Não. É possível comprar ingressos e visitar os parques estando hospedado em outros hotéis. A Ju ajuda você a comparar as opções e organizar os deslocamentos."],
  ["O que está incluído na hospedagem?", "Os Hotéis Xcaret combinam hospedagem, alimentação, acesso a parques e experiências e transporte. As inclusões variam conforme o hotel e a reserva, e algumas atividades exigem agendamento ou pagamento adicional. A Ju apresenta esses detalhes antes da contratação."],
  ["É uma viagem indicada para crianças?", "Sim! O Hotel Xcaret México recebe famílias, e há diversas experiências para aproveitar com crianças. Algumas atrações têm requisitos de idade, altura ou peso, por isso o roteiro deve considerar o perfil de cada viajante."],
  ["Quantos dias devo reservar?", "Como ponto de partida, sugerimos de 5 a 7 noites para combinar alguns dos principais parques com tempo para aproveitar o hotel. A duração ideal depende das experiências que você quer viver e do ritmo da viagem."],
  ["Posso combinar Xcaret com alguns dias em Cancún?", "Sim. É possível dividir a viagem entre uma estadia no Xcaret e alguns dias em Cancún. A Ju ajuda a definir a sequência, os hotéis e os deslocamentos."],
  ["Quanto custa uma viagem como essa?", "O investimento depende das datas, do hotel, da categoria de acomodação, da duração e do número de viajantes. Conte à Ju suas preferências para receber uma proposta personalizada."],
] as const;

export const XCARET_MEDIA_SLOTS = {
  portraitJuliana: null,
  trainingPhoto: null,
  expertBadge: null,
  julianaAtDestination: null,
} as const;