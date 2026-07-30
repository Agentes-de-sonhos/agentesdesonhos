// Catalog of ready-made white-label landing pages ("modelos prontos").
// The product identity (layout, copy, colors) belongs to the product;
// only agency data is white-labeled.

export interface LandingProduct {
  productKey: string;
  name: string;
  destination: string;
  summary: string;
  /** Hostname prefix that serves this product publicly. */
  hostPrefix: string;
  /** Full public host for building URLs. */
  publicHost: string;
  /** Internal demo route. */
  demoPath: string;
  accentColor: string;
  defaultWhatsappMessage: string;
}

export const COMANDATUBA_PRODUCT_KEY = "transamerica-comandatuba";

export const LANDING_PRODUCTS: LandingProduct[] = [
  {
    productKey: COMANDATUBA_PRODUCT_KEY,
    name: "Transamerica Comandatuba",
    destination: "Transamerica Comandatuba",
    summary:
      "Landing page de alta conversão do resort Transamerica Comandatuba, na Bahia, com sua marca, seu WhatsApp e captação de leads direto no seu CRM.",
    hostPrefix: "comandatuba.",
    publicHost: "comandatuba.proximaviagem.tur.br",
    demoPath: "/experiencias/transamerica-comandatuba/demo",
    accentColor: "#0f7a5f",
    defaultWhatsappMessage:
      "Olá! Vi a página do Transamerica Comandatuba e gostaria de receber uma cotação.",
  },
];

export function getLandingProduct(productKey: string): LandingProduct | undefined {
  return LANDING_PRODUCTS.find((p) => p.productKey === productKey);
}

/** Resolves the product served by a given hostname, if any. */
export function productForHostname(hostname: string): LandingProduct | undefined {
  const host = (hostname || "").toLowerCase();
  return LANDING_PRODUCTS.find((p) => host.startsWith(p.hostPrefix));
}

export function buildProductLandingUrl(product: LandingProduct, slug: string): string {
  return `https://${product.publicHost}/${slug}`;
}