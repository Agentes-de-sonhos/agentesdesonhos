import { useEffect } from "react";

/**
 * Sets <meta name="robots" content="noindex, nofollow"> for the current page,
 * and restores the previous value on unmount. Use in every public but
 * client-shared page (tokenized links, invoices, wallets, cards, etc.)
 * that must not be indexed by search engines.
 */
export function useNoindex(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    const previous = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      if (!meta) return;
      if (created) {
        meta.remove();
      } else if (previous !== null) {
        meta.setAttribute("content", previous);
      }
    };
  }, [enabled]);
}