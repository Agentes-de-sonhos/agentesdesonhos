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
    image: "https://www.vitrine.tur.br/favicon.png",
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
