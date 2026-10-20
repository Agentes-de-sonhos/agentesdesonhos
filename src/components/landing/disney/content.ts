import castle from "@/assets/orlando/editorial/disney-castle.webp.asset.json";
import logoMk from "@/assets/orlando/parks/park-magic-kingdom.asset.json";
import logoEpcot from "@/assets/orlando/parks/park-epcot.asset.json";
import logoHs from "@/assets/orlando/parks/park-hollywood-studios.asset.json";
import logoAk from "@/assets/orlando/parks/park-animal-kingdom.asset.json";
import logoTl from "@/assets/orlando/parks/park-typhoon-lagoon.asset.json";
import logoBb from "@/assets/orlando/parks/park-blizzard-beach.asset.json";
import logoHalloween from "@/assets/orlando/parks/park-disney-halloween.asset.json";
import logoChristmas from "@/assets/orlando/parks/park-disney-christmas.asset.json";
import logoAfterHours from "@/assets/orlando/parks/park-disney-after-hours.asset.json";
import logoJollywood from "@/assets/orlando/parks/park-jollywood-nights.asset.json";
import type { DisneyThemeParkId, DisneyWaterParkId } from "@/lib/disneyTickets";

/** Conteúdo revisado em fontes oficiais Disney em 20/10/2026. Operação, datas e preços mudam: confirmar na cotação. */
export const DISNEY_CONTENT_REVIEWED_AT = "2026-10-20";

export const DISNEY_LOGOS: Record<DisneyThemeParkId | DisneyWaterParkId, string> = {
  "magic-kingdom": logoMk.url, epcot: logoEpcot.url, "hollywood-studios": logoHs.url, "animal-kingdom": logoAk.url,
  "typhoon-lagoon": logoTl.url, "blizzard-beach": logoBb.url,
};

export interface DisneyHeroSlide { park: DisneyThemeParkId; kicker: string; title: string; subtitle: string; image?: string; alt?: string }
/** Só o Magic Kingdom tem foto já existente no projeto (castelo, fonte de imprensa Disney). Os demais usam o logotipo, sem foto inventada. */
export const DISNEY_HERO: DisneyHeroSlide[] = [
  { park: "magic-kingdom", kicker: "Magic Kingdom Park", title: "A fantasia clássica da Disney", subtitle: "O Castelo da Cinderela, atrações icônicas e o encanto das noites no parque.", image: castle.url, alt: "Castelo da Cinderela no Magic Kingdom Park" },
  { park: "epcot", kicker: "EPCOT", title: "Culturas, descoberta e festivais", subtitle: "World Showcase, atrações de ciência e imaginação e festivais ao longo do ano." },
  { park: "hollywood-studios", kicker: "Disney's Hollywood Studios", title: "Entre no mundo do cinema", subtitle: "Star Wars: Galaxy's Edge, Toy Story Land e espetáculos noturnos." },
  { park: "animal-kingdom", kicker: "Disney's Animal Kingdom Theme Park", title: "Natureza, animais e aventura", subtitle: "Pandora, safáris e expedições em um parque dedicado aos animais." },
];

export interface DisneyPark { id: DisneyThemeParkId | DisneyWaterParkId; name: string; description: string; highlights: string[]; source: string }
export const DISNEY_THEME_PARK_CARDS: DisneyPark[] = [
  { id: "magic-kingdom", name: "Magic Kingdom Park", description: "O parque da fantasia clássica, com o Castelo da Cinderela no centro e entretenimento que continua à noite.", highlights: ["TRON Lightcycle / Run", "Tiana's Bayou Adventure", "Pirates of the Caribbean", "Entretenimento noturno"], source: "https://disneyworld.disney.go.com/destinations/magic-kingdom/" },
  { id: "epcot", name: "EPCOT", description: "Culturas do mundo, descoberta e festivais sazonais em um só parque.", highlights: ["Guardians of the Galaxy: Cosmic Rewind", "Remy's Ratatouille Adventure", "Frozen Ever After", "World Showcase"], source: "https://disneyworld.disney.go.com/destinations/epcot/" },
  { id: "hollywood-studios", name: "Disney's Hollywood Studios", description: "Cinema e mundos imersivos, das galáxias de Star Wars ao quarto de brinquedos de Toy Story.", highlights: ["Star Wars: Galaxy's Edge", "Toy Story Land", "Mickey & Minnie's Runaway Railway", "Fantasmic!"], source: "https://disneyworld.disney.go.com/destinations/hollywood-studios/" },
  { id: "animal-kingdom", name: "Disney's Animal Kingdom Theme Park", description: "Natureza, animais e aventura, com áreas temáticas e encontros com a vida selvagem.", highlights: ["Pandora – The World of Avatar", "Kilimanjaro Safaris", "Expedition Everest", "Festival of the Lion King"], source: "https://disneyworld.disney.go.com/destinations/animal-kingdom/" },
];
export const DISNEY_WATER_PARK_CARDS: DisneyPark[] = [
  { id: "typhoon-lagoon", name: "Disney's Typhoon Lagoon Water Park", description: "Ambientação tropical depois de uma tempestade, com piscina de ondas e toboáguas.", highlights: ["Piscina de ondas", "Toboáguas", "Rio de correnteza"], source: "https://disneyworld.disney.go.com/destinations/water-parks/" },
  { id: "blizzard-beach", name: "Disney's Blizzard Beach Water Park", description: "Uma estação de esqui fictícia que derreteu e virou parque aquático.", highlights: ["Toboáguas de 'montanha'", "Rio de correnteza", "Áreas infantis"], source: "https://disneyworld.disney.go.com/destinations/water-parks/" },
];
export const DISNEY_WATER_CALENDAR_URL = "https://disneyworld.disney.go.com/calendars/five-day/#/blizzard-beach,typhoon-lagoon/";

export const DISNEY_SPRINGS = {
  title: "Disney Springs",
  paragraphs: [
    "Disney Springs é o distrito de compras, gastronomia e entretenimento do Walt Disney World — não é um parque. A entrada no distrito não é cobrada, e ele funciona bem como um respiro entre dias de parques.",
    "Lojas, restaurantes, bares e experiências como espetáculos e passeios em balão ficam lado a lado. Consumos e experiências pagas não estão incluídos em nenhum ingresso.",
  ],
  items: [
    ["World of Disney", "A maior loja Disney do complexo."],
    ["The LEGO Store", "Modelos gigantes e área de montagem."],
    ["The BOATHOUSE", "Restaurante à beira d'água."],
    ["T-REX", "Restaurante temático pré-histórico."],
    ["Drawn to Life", "Espetáculo do Cirque du Soleil com a Disney (ingresso próprio)."],
    ["Aerophile", "Passeio em balão cativo (cobrado à parte)."],
    ["Splitsville", "Boliche, música e comida."],
  ] as [string, string][],
  sources: ["https://disneyworld.disney.go.com/destinations/disney-springs/"],
};

export type EventTicket = "included" | "separate";
export interface DisneyEvent {
  id: string; name: string; park: string; ticket: EventTicket; season: string;
  /** Datas oficiais anunciadas na revisão; null quando não há datas divulgadas. */
  edition: string | null; status: "announced" | "sold_out" | "no_dates"; description: string; source: string; logo?: string;
}
export const DISNEY_EVENTS: DisneyEvent[] = [
  { id: "epcot-festival-arts", name: "EPCOT International Festival of the Arts", park: "EPCOT", ticket: "included", season: "Inverno (jan–mar)", edition: "15/01 a 01/03/2027", status: "announced", description: "Arte, música e gastronomia pelo World Showcase.", source: "https://disneyworld.disney.go.com/events-tours/epcot/epcot-international-festival-of-the-arts/" },
  { id: "epcot-flower-garden", name: "EPCOT International Flower & Garden Festival", park: "EPCOT", ticket: "included", season: "Primavera (mar–mai)", edition: "10/03 a 31/05/2027", status: "announced", description: "Jardins, topiarias de personagens e quiosques sazonais.", source: "https://www.disneyworld.eu/events-tours/epcot/epcot-international-flower-and-garden-festival/" },
  { id: "epcot-food-wine", name: "EPCOT International Food & Wine Festival", park: "EPCOT", ticket: "included", season: "Fim de verão e outono", edition: "27/08 a 21/11/2026", status: "announced", description: "Experiências gastronômicas de vários países.", source: "https://www.disneyworld.eu/events-tours/epcot/epcot-international-food-and-wine-festival/" },
  { id: "epcot-holidays", name: "EPCOT International Festival of the Holidays presented by AdventHealth", park: "EPCOT", ticket: "included", season: "Fim de ano", edition: "27/11 a 30/12/2026", status: "announced", description: "Tradições natalinas e de fim de ano do mundo todo.", source: "https://disneyworld.disney.go.com/events-tours/epcot/holiday-festival/" },
  { id: "mnsshp", name: "Mickey's Not-So-Scary Halloween Party", park: "Magic Kingdom Park", ticket: "separate", season: "Noites selecionadas (ago–out)", edition: "07/08 a 31/10/2026", status: "sold_out", description: "Festa de Halloween com fantasias, desfile e doces.", source: "https://disneyworld.disney.go.com/events-tours/magic-kingdom/mickeys-not-so-scary-halloween-party/", logo: logoHalloween.url },
  { id: "mvmcp", name: "Mickey's Very Merry Christmas Party", park: "Magic Kingdom Park", ticket: "separate", season: "Noites selecionadas (nov–dez)", edition: "08/11 a 22/12/2026", status: "announced", description: "Festa de Natal com desfile e shows temáticos.", source: "https://disneyworld.disney.go.com/events-tours/magic-kingdom/mickeys-very-merry-christmas-party/", logo: logoChristmas.url },
  { id: "jollywood", name: "Disney Jollywood Nights", park: "Disney's Hollywood Studios", ticket: "separate", season: "Noites selecionadas (nov–jan)", edition: "07/11/2026 a 05/01/2027", status: "announced", description: "Noites festivas de fim de ano no estilo de Hollywood.", source: "https://disneyworld.disney.go.com/events-tours/hollywood-studios/jollywood-nights/", logo: logoJollywood.url },
  { id: "after-hours", name: "Disney After Hours", park: "Magic Kingdom, EPCOT e Hollywood Studios", ticket: "separate", season: "Noites selecionadas, calendário próprio", edition: null, status: "announced", description: "Horas extras no parque após o fechamento, com público limitado. Não é o mesmo que o horário estendido para hóspedes.", source: "https://disneyworld.disney.go.com/events-tours/after-hours/", logo: logoAfterHours.url },
  { id: "h2o-glow", name: "Disney H2O Glow After Hours", park: "Disney's Typhoon Lagoon", ticket: "separate", season: "Edições sazonais", edition: null, status: "no_dates", description: "Noites no parque aquático após o fechamento. Sem datas divulgadas na revisão: consulte próximas edições.", source: "https://disneyworld.disney.go.com/events-tours/typhoon-lagoon/h2o-glow-after-hours/" },
];

export const EVENT_STATUS_LABEL: Record<DisneyEvent["status"], string> = {
  announced: "Datas anunciadas", sold_out: "Edição esgotada", no_dates: "Consulte próximas edições",
};

export const DISNEY_FAQ: [string, string][] = [
  ["O ingresso padrão vale quantos dias?", "O ingresso padrão é baseado em data e pode ter de 1 a 10 dias de parques temáticos. A janela de uso depende do produto; confirmamos tudo na cotação."],
  ["O que é Park Hopper?", "Permite visitar mais de um parque temático no mesmo dia. Depois de entrar no primeiro parque, a troca pode acontecer durante o funcionamento, sujeita à capacidade."],
  ["Os parques aquáticos estão incluídos?", "Não no ingresso básico. Opções como Water Park and Sports e Park Hopper Plus incluem um número de visitas a experiências elegíveis, conforme o produto. Os dois parques aquáticos não funcionam necessariamente ao mesmo tempo."],
  ["Lightning Lane é um ingresso?", "Não. É um complemento pago para algumas atrações e não significa 'sem fila'. Orientamos se faz sentido para a sua viagem."],
  ["Crianças pagam?", "Menores de 3 anos não precisam de ingresso para os parques temáticos. De 3 a 9 anos há tarifa infantil; a partir de 10, tarifa de adulto."],
  ["Preciso reservar o parque?", "Ingressos baseados em data dispensam reserva adicional de parque; outros tipos podem exigir."],
];

export const DISNEY_HOTEL_BENEFITS = [
  "Early Theme Park Entry: 30 minutos antes da abertura nos parques temáticos, para hóspedes elegíveis.",
  "Extended Evening Theme Park Hours: noites e parques selecionados, para hotéis Deluxe, Villas e alguns outros.",
  "Os dois benefícios exigem ingresso válido e não equivalem ao Disney After Hours. Ingresso não está incluído na diária.",
];
export const DISNEY_HOTEL_BENEFITS_SOURCE = "https://disneyworld.disney.go.com/resort-hotels-benefits/";
