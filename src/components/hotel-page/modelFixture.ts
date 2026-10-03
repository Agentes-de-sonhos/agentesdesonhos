import quarto from "@/assets/hotel-modelo/quarto.jpg";
import piscina from "@/assets/hotel-modelo/piscina.jpg";
import restaurante from "@/assets/hotel-modelo/restaurante.jpg";
import banheiro from "@/assets/hotel-modelo/banheiro.jpg";
import jardim from "@/assets/hotel-modelo/jardim.jpg";
import type { HotelPageData } from "./types";

/** Fixture ILUSTRATIVA da página modelo. Não é cadastro real. */
export const MODEL_HOTEL: HotelPageData = {
  slug: "almenat-embu-das-artes",
  name: "Almenat Embu das Artes São Paulo, Tapestry Collection",
  stars: 4,
  address: "Rua Águas Marinhas, 553",
  city: "Embu das Artes",
  state: "São Paulo",
  photos: [
    { url: quarto, alt: "Quarto" },
    { url: jardim, alt: "Jardim" },
    { url: banheiro, alt: "Banheiro" },
    { url: restaurante, alt: "Restaurante" },
    { url: piscina, alt: "Piscina" },
    { url: quarto, alt: "Quarto" },
    { url: jardim, alt: "Área verde" },
    { url: piscina, alt: "Área da piscina" },
  ],
  description: [
    "Em meio ao verde de Embu das Artes, o hotel combina conforto, lazer e tranquilidade para uma estadia especial.",
    "Os ambientes acolhedores e a atmosfera de descanso convidam a aproveitar cada momento, seja em uma viagem a lazer ou a trabalho.",
    "Opções de gastronomia e espaços de bem-estar completam a experiência de quem busca uma pausa perto de São Paulo.",
  ],
  amenities: [
    { icon: "restaurant", label: "2 restaurantes" },
    { icon: "room-service", label: "Serviço de quarto" },
    { icon: "spa", label: "Spa e bem-estar" },
    { icon: "gym", label: "Academia" },
    { icon: "pets", label: "Aceita pets" },
  ],
  checkIn: "A partir das 15h",
  checkOut: "Até as 12h",
  scheduleNote: "Horários ilustrativos — confirmar com o hotel.",
  google: {
    rating: 4.6,
    totalReviews: 1280,
    reviewsUrl: "https://www.google.com/maps/search/?api=1&query=Almenat+Embu+das+Artes",
    featuredReview: {
      author: "Mariana S.",
      text: "Quartos confortáveis, equipe atenciosa e uma área verde maravilhosa.",
      relativeTime: "Há 2 semanas",
    },
    illustrative: true,
  },
  location: {
    lat: -23.6489,
    lng: -46.8522,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Almenat+Embu+das+Artes",
  },
};
