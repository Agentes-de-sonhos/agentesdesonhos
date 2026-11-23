import resortImage from "@/assets/whitelabel/destino-resort.jpg";
import { isImmHostname, isTechnicalPreviewHost } from "./agencyDomains";
import type { PublicOffer } from "./offers";

export const IMM_SAMPLE_SLUG = "exemplo-ferias-no-nordeste";

/** Illustrative content is never persisted or served on a real agency domain. */
export function immOfferPreviewAllowed(agencyHost: string, browserHost: string): boolean {
  return isImmHostname(agencyHost) && isTechnicalPreviewHost(browserHost);
}

export function immSampleOffer(agencyHost: string, browserHost: string): PublicOffer | null {
  if (!immOfferPreviewAllowed(agencyHost, browserHost)) return null;
  return {
    slug: IMM_SAMPLE_SLUG,
    status: "published",
    title: "Férias no Nordeste — oferta ilustrativa",
    description: "Exemplo de apresentação de um pacote de viagem ao Nordeste, com dias de descanso à beira-mar.\n\nConteúdo exclusivamente ilustrativo: não representa uma oferta vigente, disponibilidade confirmada ou serviços contratados. A imagem é genérica de inspiração.",
    destination: "Nordeste, Brasil",
    category: "Exemplo / demonstração",
    cover_url: resortImage,
    nights: 5,
    price_mode: "on_request",
    channels: ["ofertas"],
    included_services: [
      { type: "aereo", detail: "Exemplo de voos de ida e volta" },
      { type: "hospedagem", detail: "Exemplo de 5 noites em resort" },
      { type: "transfer", detail: "Exemplo de traslado aeroporto / hotel" },
    ],
  };
}

export function currentImmSample(agencyHost: string): PublicOffer | null {
  return typeof window === "undefined" ? null : immSampleOffer(agencyHost, window.location.hostname);
}