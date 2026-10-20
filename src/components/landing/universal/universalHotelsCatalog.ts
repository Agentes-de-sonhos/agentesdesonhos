import googleData from "./universalHotelsGoogleData.json";
import type { HotelAmenity, HotelPageData } from "@/components/hotel-page/types";

/**
 * Páginas dos 11 hotéis do Universal Orlando Resort no mesmo template dos
 * resorts nacionais. Fotos, nota, avaliações e localização foram importadas
 * UMA vez do Google (20/10/2026) e ficam no projeto — abrir a página não
 * consulta o Google. Textos curados com benefícios oficiais por categoria.
 */
interface GoogleSnapshot {
  placeName: string; address: string; city: string;
  rating: number | null; total: number | null; mapsUrl: string;
  lat: number; lng: number;
  photos: { url: string; credit: string }[];
  reviews: { author: string; rating?: number; text: string; relativeTime?: string }[];
}

type Category = "Signature Collection" | "Premium" | "Prime Value" | "Econômica";
interface HotelText { name: string; category: Category; description: string[]; amenities: HotelAmenity[] }

const EARLY: HotelAmenity = { icon: "leisure", label: "Entrada antecipada nos parques", description: "Hóspedes entram antes do público em parques selecionados, conforme calendário oficial." };
const EXPRESS: HotelAmenity = { icon: "all-inclusive", label: "Universal Express Unlimited incluído", description: "Fila expressa ilimitada nas atrações participantes de Universal Studios Florida e Islands of Adventure." };
const BOAT: HotelAmenity = { icon: "beach", label: "Táxi aquático e caminhada", description: "Barco até o CityWalk e acesso a pé aos parques." };
const SHUTTLE: HotelAmenity = { icon: "parking", label: "Transporte gratuito", description: "Ônibus do hotel para os parques e o CityWalk." };
const POOL = (d: string): HotelAmenity => ({ icon: "pool", label: "Piscinas temáticas", description: d });
const FOOD = (d: string): HotelAmenity => ({ icon: "restaurant", label: "Restaurantes e bares", description: d });

export const UNIVERSAL_HOTEL_TEXTS: Record<string, HotelText> = {
  "loews-portofino-bay": { name: "Loews Portofino Bay Hotel", category: "Signature Collection", description: [
    "Inspirado na vila costeira de Portofino, na Itália, o hotel recria uma baía colorida com cafés, piazza e restaurantes à beira d'água. É a escolha de quem quer viver a Universal com mais calma e sofisticação, sem abrir mão da proximidade com os parques.",
    "Como hotel da Signature Collection, inclui o Universal Express Unlimited para cada hóspede registrado, o que reduz bastante o tempo em filas nos dois parques clássicos. O táxi aquático leva até o CityWalk e, de lá, os parques ficam a uma curta caminhada.",
    "Com piscinas temáticas, spa e gastronomia italiana, o Portofino Bay funciona bem para casais, famílias com crianças maiores e viajantes que querem equilibrar dias intensos de parque com um retorno tranquilo ao hotel.",
  ], amenities: [EXPRESS, EARLY, BOAT, POOL("Piscinas com ambientação italiana, incluindo área com toboágua."), { icon: "spa", label: "Spa", description: "Tratamentos para descansar entre os dias de parque." }, FOOD("Gastronomia italiana em restaurantes à beira da baía.")] },
  "hard-rock-hotel": { name: "Hard Rock Hotel", category: "Signature Collection", description: [
    "O Hard Rock Hotel combina a energia do rock'n'roll com a localização mais próxima dos parques clássicos: dá para chegar a pé ao Universal Studios Florida e ao CityWalk. Memorabilia musical, trilha sonora ambiente e decoração marcante fazem parte da experiência.",
    "Por ser Signature Collection, inclui o Universal Express Unlimited para cada hóspede registrado e entrada antecipada nos parques. É uma combinação muito procurada por quem quer aproveitar o máximo de atrações em poucos dias.",
    "A piscina com areia e som subaquático é um dos destaques do hotel. Funciona para famílias, grupos de amigos e casais que valorizam praticidade, estilo e deslocamentos curtos.",
  ], amenities: [EXPRESS, EARLY, { icon: "leisure", label: "Parques a pé", description: "Caminhada curta até o Universal Studios Florida e o CityWalk." }, POOL("Piscina com praia de areia e som subaquático."), FOOD("Restaurantes e bares com temática musical."), { icon: "gym", label: "Academia", description: "Espaço fitness para manter a rotina." }] },
  "loews-royal-pacific": { name: "Loews Royal Pacific Resort", category: "Signature Collection", description: [
    "Com atmosfera tropical inspirada no Pacífico Sul, o Royal Pacific recebe os hóspedes com jardins exuberantes, lagoa e arquitetura de ilha. A sensação é de resort de praia, a poucos minutos dos parques.",
    "Também é Signature Collection: cada hóspede registrado recebe o Universal Express Unlimited, além da entrada antecipada. O táxi aquático e a caminhada até o CityWalk tornam o vaivém simples ao longo do dia.",
    "A piscina em formato de lagoa com areia, área infantil e opções de gastronomia variadas fazem do Royal Pacific um dos favoritos de famílias que querem conforto e acesso rápido às atrações.",
  ], amenities: [EXPRESS, EARLY, BOAT, POOL("Piscina estilo lagoa com área de areia e espaço infantil."), FOOD("Restaurantes e bares com clima polinésio."), { icon: "kids", label: "Ideal para famílias", description: "Estrutura de lazer para todas as idades." }] },
  "helios-grand": { name: "Universal Helios Grand Hotel", category: "Premium", description: [
    "O Helios Grand é o único hotel com acesso exclusivo e direto ao Universal Epic Universe: os hóspedes entram no parque por uma passagem própria, sem depender de transporte. É a hospedagem ideal para quem quer viver o parque mais novo da Universal com intensidade.",
    "Inspirado no Celestial Park, o hotel tem arquitetura elegante e vistas privilegiadas do Epic Universe. Voltar ao quarto para descansar no meio do dia e retornar ao parque fica muito mais fácil.",
    "Inclui entrada antecipada nos parques e transporte para os demais parques e o CityWalk. Uma escolha para famílias e casais que priorizam o Epic Universe no roteiro.",
  ], amenities: [{ icon: "leisure", label: "Entrada exclusiva no Epic Universe", description: "Acesso direto do hotel ao parque." }, EARLY, SHUTTLE, POOL("Piscina com vista para o Epic Universe."), FOOD("Restaurante e bar no rooftop com vista do parque.")] },
  "loews-sapphire-falls": { name: "Loews Sapphire Falls Resort", category: "Premium", description: [
    "Inspirado no Caribe, o Sapphire Falls cerca os hóspedes de cascatas, jardins tropicais e uma grande piscina com areia. Tem clima de férias de praia e fácil acesso aos parques.",
    "O táxi aquático e a caminhada levam até o CityWalk e aos parques clássicos, e a entrada antecipada ajuda a aproveitar as primeiras horas do dia. O Universal Express pode ser adquirido à parte.",
    "Com ótimo equilíbrio entre conforto e investimento, é uma escolha frequente para famílias que querem estrutura de resort sem os valores da Signature Collection.",
  ], amenities: [EARLY, BOAT, POOL("Grande piscina com areia, cascatas e toboágua."), FOOD("Gastronomia caribenha e bares à beira da piscina."), { icon: "gym", label: "Academia", description: "Espaço fitness completo." }] },
  "aventura": { name: "Universal Aventura Hotel", category: "Prime Value", description: [
    "Moderno e com design contemporâneo, o Aventura tem quartos com tecnologia e um rooftop com vista para os parques. É uma opção prática e estilosa para quem passa o dia inteiro nas atrações.",
    "Os hóspedes contam com entrada antecipada e transporte gratuito para os parques e o CityWalk, além de acesso a pé a partir de áreas próximas.",
    "A praça de alimentação variada e o bar no rooftop completam a experiência. Funciona bem para casais, amigos e famílias que buscam bom custo-benefício.",
  ], amenities: [EARLY, SHUTTLE, { icon: "bar", label: "Rooftop com vista", description: "Bar e restaurante no alto do hotel com vista dos parques." }, POOL("Piscina com área de lazer."), FOOD("Praça de alimentação com opções variadas.")] },
  "cabana-bay": { name: "Universal Cabana Bay Beach Resort", category: "Prime Value", description: [
    "O Cabana Bay leva os hóspedes aos anos 50 e 60, com visual retrô, cores vibrantes e clima de férias de verão americanas. É um dos hotéis mais queridos pelas famílias.",
    "Há suítes familiares com espaço extra, boliche, rio lento e piscinas com areia. Os hóspedes têm entrada antecipada e transporte gratuito, além de acesso a pé ao Volcano Bay e aos parques por caminho próprio.",
    "Com muitas opções de lazer sem sair do hotel, é ideal para grupos e famílias com crianças que querem diversão também fora dos parques.",
  ], amenities: [EARLY, SHUTTLE, { icon: "kids", label: "Boliche e suítes familiares", description: "Lazer para todas as idades e espaço extra para famílias." }, POOL("Piscinas com areia, toboágua e rio lento."), FOOD("Praça de alimentação e bares retrô.")] },
  "stella-nova": { name: "Universal Stella Nova Resort", category: "Econômica", description: [
    "O Stella Nova tem visual moderno inspirado no universo e fica próximo ao Universal Epic Universe. É uma hospedagem econômica, pensada para quem quer conforto com bom investimento.",
    "Os hóspedes têm entrada antecipada e transporte gratuito para os parques e o CityWalk, o que facilita a logística em roteiros com vários dias de parque.",
    "Com piscina, praça de alimentação e quartos práticos, é uma escolha eficiente para famílias e grupos.",
  ], amenities: [EARLY, SHUTTLE, { icon: "leisure", label: "Próximo ao Epic Universe", description: "Localização conveniente para o parque mais novo." }, POOL("Piscina com área de lazer."), FOOD("Praça de alimentação no hotel.")] },
  "terra-luna": { name: "Universal Terra Luna Resort", category: "Econômica", description: [
    "Vizinho do Stella Nova, o Terra Luna tem design contemporâneo inspirado na Terra e na Lua e fica próximo ao Universal Epic Universe. É uma opção econômica e moderna.",
    "Os hóspedes contam com entrada antecipada e transporte gratuito para os parques e o CityWalk.",
    "Com piscina, alimentação prática e quartos funcionais, atende bem famílias que querem investir mais nos ingressos e experiências.",
  ], amenities: [EARLY, SHUTTLE, { icon: "leisure", label: "Próximo ao Epic Universe", description: "Localização conveniente para o parque mais novo." }, POOL("Piscina com área de lazer."), FOOD("Praça de alimentação no hotel.")] },
  "endless-summer-surfside": { name: "Universal Endless Summer Resort – Surfside Inn and Suites", category: "Econômica", description: [
    "Com tema de praia e clima de verão, o Surfside Inn and Suites é uma das hospedagens mais acessíveis da Universal. Oferece quartos e suítes familiares para grupos maiores.",
    "Os hóspedes têm entrada antecipada e transporte gratuito para os parques e o CityWalk.",
    "Piscina, praça de alimentação e ambiente descontraído completam a estadia, com ótimo custo-benefício para famílias.",
  ], amenities: [EARLY, SHUTTLE, { icon: "kids", label: "Suítes familiares", description: "Espaço para famílias e grupos maiores." }, POOL("Piscina com clima de praia."), FOOD("Praça de alimentação no hotel.")] },
  "endless-summer-dockside": { name: "Universal Endless Summer Resort – Dockside Inn and Suites", category: "Econômica", description: [
    "O Dockside Inn and Suites traz o clima de verão à beira-mar, com duas piscinas e opções de quartos e suítes familiares. É uma hospedagem econômica dentro do complexo Universal.",
    "Os hóspedes contam com entrada antecipada e transporte gratuito para os parques e o CityWalk.",
    "Com estrutura prática e preço acessível, é ideal para famílias que querem economizar na hospedagem e aproveitar ao máximo os parques.",
  ], amenities: [EARLY, SHUTTLE, { icon: "kids", label: "Suítes familiares", description: "Espaço para famílias e grupos maiores." }, POOL("Duas piscinas com clima de verão."), FOOD("Praça de alimentação no hotel.")] },
};

const DATA = googleData as Record<string, GoogleSnapshot>;

export const universalHotelSlugByName = (name: string) =>
  Object.entries(UNIVERSAL_HOTEL_TEXTS).find(([, t]) => t.name === name)?.[0];

export function getUniversalHotelPage(slug: string): HotelPageData | null {
  const t = UNIVERSAL_HOTEL_TEXTS[slug];
  const g = DATA[slug];
  if (!t || !g) return null;
  return {
    slug,
    name: t.name,
    address: g.address,
    city: "Orlando",
    state: "Flórida",
    photos: g.photos.map((p) => ({ url: p.url, alt: t.name })),
    descriptionTitle: `Por que ficar no ${t.name}?`,
    description: t.description,
    amenities: t.amenities,
    google: g.rating
      ? { rating: g.rating, totalReviews: g.total ?? 0, reviewsUrl: g.mapsUrl, reviews: [...g.reviews].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5) }
      : undefined,
    location: { lat: g.lat, lng: g.lng, mapsUrl: g.mapsUrl },
  };
}
