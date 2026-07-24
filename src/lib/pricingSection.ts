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
  // Pre-normalize anchor hrefs so DOMPurify doesn't strip URLs the user
  // typed without a protocol (e.g. "www.example.com" or "example.com").
  // DOMPurify's ALLOWED_URI_REGEXP only accepts http(s)/mailto/tel/#//, so
  // a bare host would otherwise lose its href and the link would render
  // as underlined text that is not clickable in the public view/PDF.
  const preNormalized = typeof document !== "undefined"
    ? normalizeAnchorHrefs(html)
    : html;

  const clean = DOMPurify.sanitize(preNormalized, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
      "h1", "h2", "h3", "h4",
      "ul", "ol", "li",
      "a", "span",
      "blockquote", "hr",
      "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "src", "alt", "width", "height", "data-align"],
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

/**
 * Ensures every anchor has a safe, absolute href before sanitization.
 * Bare hosts (`example.com`, `www.example.com`) get an `https://` prefix.
 * Dangerous schemes (`javascript:`, `data:`, `vbscript:`) are dropped so
 * DOMPurify strips the anchor entirely.
 */
function normalizeAnchorHrefs(html: string): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("a").forEach((el) => {
    const a = el as HTMLAnchorElement;
    const raw = (a.getAttribute("href") || "").trim();
    if (!raw) return;
    const normalized = normalizeUrl(raw);
    if (normalized) {
      a.setAttribute("href", normalized);
    } else {
      a.removeAttribute("href");
    }
  });
  return tpl.innerHTML;
}

/**
 * Normalize a user-provided URL to a safe absolute form. Returns null for
 * unsafe/unsupported schemes so the caller can strip the href.
 */
export function normalizeUrl(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  // Allow anchors and same-origin absolute paths as-is.
  if (raw.startsWith("#") || raw.startsWith("/")) return raw;
  const lower = raw.toLowerCase();
  const unsafe = ["javascript:", "data:", "vbscript:", "file:"];
  if (unsafe.some((p) => lower.startsWith(p))) return null;
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  // Bare host or path — assume https.
  return `https://${raw.replace(/^\/+/, "")}`;
}

export const PRICING_SECTION_TITLE = "Valores e Condições";
export const PRICING_SECTION_PLACEHOLDER =
  "Apresente aqui os valores, condições de pagamento, validade da proposta e demais informações comerciais.";