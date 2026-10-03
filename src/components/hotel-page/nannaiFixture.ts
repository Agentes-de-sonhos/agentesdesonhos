import p0 from "@/assets/hotel-nannai/p0.jpg";
import p1 from "@/assets/hotel-nannai/p1.jpg";
import p2 from "@/assets/hotel-nannai/p2.jpg";
import p3 from "@/assets/hotel-nannai/p3.jpg";
import p4 from "@/assets/hotel-nannai/p4.jpg";
import p5 from "@/assets/hotel-nannai/p5.jpg";
import p6 from "@/assets/hotel-nannai/p6.jpg";
import p7 from "@/assets/hotel-nannai/p7.jpg";
import p8 from "@/assets/hotel-nannai/p8.jpg";
import p9 from "@/assets/hotel-nannai/p9.jpg";
import type { HotelPageData } from "./types";

/**
 * Primeiro cadastro real (piloto). Fotos, nota, avaliação, endereço e
 * coordenadas importados uma única vez do Google em 03/10/2026; textos com base
 * no site oficial (nannai.com.br/muro-alto). Nenhuma chamada ao Google ocorre
 * ao abrir a página.
 */
export const NANNAI_MURO_ALTO: HotelPageData = {
  slug: "nannai",
  name: "Nannai Muro Alto",
  address: "Rodovia PE-09, Muro Alto",
  city: "Ipojuca",
  state: "Pernambuco",
  photos: [
    { url: p0, alt: "Bangalô com piscina privativa" },
    { url: p2, alt: "Nannai Muro Alto" },
    { url: p3, alt: "Nannai Muro Alto" },
    { url: p4, alt: "Nannai Muro Alto" },
    { url: p5, alt: "Nannai Muro Alto" },
    { url: p6, alt: "Nannai Muro Alto" },
    { url: p7, alt: "Nannai Muro Alto" },
    { url: p8, alt: "Nannai Muro Alto" },
    { url: p1, alt: "Nannai Muro Alto" },
    { url: p9, alt: "Nannai Muro Alto" },
  ],
  descriptionTitle: "Por que escolher o NANNAI Muro Alto?",
  description: [
    "O NANNAI Muro Alto combina a estrutura de um resort com uma proposta de hospedagem que valoriza espaço, privacidade e tempo para descansar. Seus bangalôs estão entre os principais diferenciais, com opções de piscina privativa que tornam a própria acomodação parte da viagem.",
    "À beira da praia de Muro Alto, a experiência se completa com gastronomia de referências brasileiras e internacionais e o SPA by L’Occitane. É uma escolha especialmente interessante para uma viagem a dois ou para quem quer alternar momentos de praia, boa mesa e descanso, aproveitando o resort no próprio ritmo.",
  ],
  amenities: [
    { icon: "pool", label: "Bangalôs com piscina privativa", description: "Opções de hospedagem para quem valoriza privacidade e quer aproveitar momentos de descanso na própria acomodação." },
    { icon: "beach", label: "À beira de Muro Alto", description: "Acesso à praia conhecida pela paisagem de arrecifes e piscinas naturais." },
    { icon: "restaurant", label: "Gastronomia com identidade", description: "Sabores brasileiros e internacionais, com experiências como o restaurante TiaTê e o bar de tapas Salero." },
    { icon: "spa", label: "SPA by L’Occitane", description: "Tratamentos e terapias para incluir momentos de bem-estar na viagem." },
    { icon: "leisure", label: "Espaço para viver no seu ritmo", description: "Uma proposta que combina lazer de resort com ambientes e acomodações voltados ao descanso e à privacidade." },
  ],
  scheduleNote: "Horários de check-in e check-out a confirmar com o hotel.",
  google: {
    rating: 4.8,
    totalReviews: 5162,
    reviewsUrl: "https://maps.google.com/?cid=266994676508101947",
    featuredReview: {
      author: "Daniel Manso",
      text: "Um dos melhores do Brasil, recebem o hóspede como ninguém, conforto, organização e qualidade em tudo, sem contar a praia maravilhosa.",
      relativeTime: "Há 4 semanas",
    },
  },
  location: {
    lat: -8.4333252,
    lng: -34.9806039,
    mapsUrl: "https://maps.google.com/?cid=266994676508101947",
  },
};
