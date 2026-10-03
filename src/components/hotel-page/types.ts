/**
 * Dados de uma página de hotel. Tudo é dinâmico: em produção virá do cadastro
 * do hotel (com dados do Google importados uma vez e guardados em cache).
 */
export type HotelAmenityIcon =
  | "restaurant" | "room-service" | "spa" | "gym" | "pets" | "pool"
  | "wifi" | "parking" | "kids" | "beach" | "bar" | "all-inclusive" | "leisure";

export interface HotelPhoto {
  url: string;
  alt: string;
}

export interface HotelAmenity {
  icon: HotelAmenityIcon;
  label: string;
  description?: string;
}

export interface HotelReview { author: string; text: string; rating?: number; relativeTime?: string }

export interface HotelGoogleData {
  rating: number;
  totalReviews: number;
  reviewsUrl: string;
  featuredReview?: HotelReview;
  /** Até 5 avaliações importadas uma vez do Google. */
  reviews?: HotelReview[];
  /** Indica que os números são ilustrativos (página modelo). */
  illustrative?: boolean;
}

export interface HotelPageData {
  slug: string;
  name: string;
  stars?: number;
  address: string;
  city: string;
  state: string;
  photos: HotelPhoto[];
  descriptionTitle?: string;
  description: string[];
  amenities: HotelAmenity[];
  checkIn?: string;
  checkOut?: string;
  scheduleNote?: string;
  google?: HotelGoogleData;
  location?: { lat: number; lng: number; mapsUrl: string };
}

export interface HotelQuoteRequest {
  hotelSlug: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  childrenAges: number[];
  contact: { name: string; whatsapp: string; email: string };
}
