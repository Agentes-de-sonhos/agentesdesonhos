import { DEFAULT_OG_IMAGE } from "./seo";

/**
 * Generic, non-personal titles/descriptions for client-shared tokenized pages.
 * Never expose customer, passenger, project, financial or reservation data
 * in social/search metadata.
 */
export const GENERIC_PUBLIC_META = {
  quote: {
    title: "Orçamento de viagem | Agentes de Sonhos",
    description:
      "Consulte os detalhes do seu orçamento de viagem em uma página segura compartilhada pela sua agência.",
  },
  itinerary: {
    title: "Roteiro de viagem | Agentes de Sonhos",
    description:
      "Consulte o roteiro e as informações da sua viagem em uma página segura compartilhada pela sua agência.",
  },
  trip: {
    title: "Informações da viagem | Agentes de Sonhos",
    description:
      "Acesse as informações da sua viagem em uma página segura compartilhada pela sua agência.",
  },
  wallet: {
    title: "Carteira digital de viagem | Agentes de Sonhos",
    description:
      "Consulte documentos e informações da sua viagem em uma carteira digital segura.",
  },
  invoice: {
    title: "Fatura da viagem | Agentes de Sonhos",
    description:
      "Consulte as informações da sua fatura em uma página segura compartilhada pela sua agência.",
  },
  form: {
    title: "Formulário da agência | Agentes de Sonhos",
    description:
      "Preencha com segurança as informações solicitadas pela sua agência de viagens.",
  },
  card: {
    title: "Contato do agente de viagens | Agentes de Sonhos",
    description:
      "Acesse o contato digital do seu agente de viagens em uma página segura.",
  },
  showcase: {
    title: "Vitrine da agência de viagens | Agentes de Sonhos",
    description:
      "Conheça experiências e ofertas em uma página segura compartilhada pela sua agência.",
  },
  payment: {
    title: "Pagamento seguro | Agentes de Sonhos",
    description:
      "Acesse o ambiente seguro disponibilizado pela sua agência de viagens.",
  },
} as const;

/**
 * Sets Open Graph and Twitter meta tags dynamically.
 * Works for JS-executing crawlers; for WhatsApp/Facebook,
 * use the public-og edge function as a proxy.
 */
export function setOgMeta(opts: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  /** Defaults to true — client-shared public pages should not be indexed. */
  noindex?: boolean;
}) {
  const defaults = {
    image: DEFAULT_OG_IMAGE,
    url: window.location.href,
  };
  const { title, description, image = defaults.image, url = defaults.url, noindex = true } = opts;

  const setMeta = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`) ||
             document.querySelector(`meta[name="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      if (property.startsWith("og:")) {
        el.setAttribute("property", property);
      } else {
        el.setAttribute("name", property);
      }
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  document.title = title;

  setMeta("og:title", title);
  setMeta("og:description", description);
  setMeta("og:image", image);
  setMeta("og:url", url);
  setMeta("og:type", "website");

  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", title);
  setMeta("twitter:description", description);
  setMeta("twitter:image", image);

  // Client-shared public pages (quotes, itineraries, wallets, cards, showcases)
  // must never be indexed by search engines.
  if (noindex) {
    setMeta("robots", "noindex, nofollow");
  }
}
