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
  description: [
    "Na Praia de Muro Alto, um dos trechos mais tranquilos do litoral pernambucano, o Nannai convida a mergulhar em piscinas naturais de águas mornas, emolduradas por arrecifes de corais.",
    "Os bangalôs de luxo com piscinas privativas, em arquitetura tropical, transformaram a experiência de hospedagem no Brasil e trazem privacidade e conforto para casais e famílias.",
    "A gastronomia é um capítulo à parte, com experiências especiais ao longo do ano. E a localização ajuda: apenas 10 km de Porto de Galinhas e 54 km de Recife.",
  ],
  amenities: [
    { icon: "pool", label: "Bangalôs com piscina privativa" },
    { icon: "beach", label: "Pé na areia em Muro Alto" },
    { icon: "restaurant", label: "Gastronomia autoral" },
    { icon: "kids", label: "Programação para crianças" },
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
