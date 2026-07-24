import DOMPurify from "dompurify";

/**
 * Helpers for the optional "Valores e Condições" section attached to
 * itineraries. Keeps sanitization and emptiness rules in one place so
 * the editor, public view and PDF stay in sync.
 */

/**
 * Returns true when the provided HTML has no meaningful content.
 * Whitespace-only, blank paragraphs and stray `<br>` are treated as empty.
 */
export function isPricingContentEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  // Strip tags, non-breaking spaces and whitespace to detect empty content.
  const stripped = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, "")
    .trim();
  return stripped.length === 0;
}

/**
 * Sanitizes rich-text HTML coming from the pricing editor before rendering
 * it publicly or embedding it in the PDF. Allows only the formatting we
 * actually offer in the toolbar and forces safe link attributes.
 */
export function sanitizePricingContent(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
      "h1", "h2", "h3", "h4",
      "ul", "ol", "li",
      "a", "span",
      "blockquote", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  });

  // Force safe attributes on all outbound links.
  if (typeof document !== "undefined") {
    const tpl = document.createElement("template");
    tpl.innerHTML = clean;
    tpl.content.querySelectorAll("a[href]").forEach((el) => {
      const a = el as HTMLAnchorElement;
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    return tpl.innerHTML;
  }
  return clean;
}

export const PRICING_SECTION_TITLE = "Valores e Condições";
export const PRICING_SECTION_PLACEHOLDER =
  "Apresente aqui os valores, condições de pagamento, validade da proposta e demais informações comerciais.";