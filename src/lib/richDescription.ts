import { sanitizePricingContent } from "@/lib/pricingSection";

/**
 * Helpers to interop plain-text activity descriptions with the shared
 * rich-content editor. Activities historically stored plain text in
 * `description`; the editor now writes HTML in the same column, so we
 * need to detect what we're dealing with when reading/rendering and
 * strip back to plain text when handing content to AI flows that
 * expect strings.
 */

const HTML_TAG_RE = /<\/?(p|div|br|h[1-6]|ul|ol|li|strong|b|em|i|u|a|img|span|blockquote|hr|s|strike)\b/i;

export function isHtmlDescription(value: string | null | undefined): boolean {
  if (!value) return false;
  return HTML_TAG_RE.test(value);
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => (
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === '"' ? "&quot;" : "&#39;"
  ));
}

/**
 * Convert plain text (with newlines) to safe minimal HTML so the rich
 * editor can load it as paragraphs while preserving line breaks.
 */
export function plainTextToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * Value passed to the rich editor for a description column that may
 * contain either legacy plain text or new-style HTML.
 */
export function descriptionToEditorHtml(value: string | null | undefined): string {
  if (!value) return "";
  return isHtmlDescription(value) ? value : plainTextToHtml(value);
}

/**
 * Strip HTML back to plain text for flows that expect strings (AI
 * prompts, template exports, etc.). Falls back to a regex strip on the
 * server / worker where `document` is unavailable.
 */
export function descriptionToPlainText(value: string | null | undefined): string {
  if (!value) return "";
  if (!isHtmlDescription(value)) return value;
  if (typeof document === "undefined") {
    return value.replace(/<br\s*\/?>(?!\n)/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  tmp.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  tmp.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6").forEach((el) => {
    el.append("\n");
  });
  return (tmp.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Sanitized HTML ready for public/PDF rendering. Legacy plain text is
 * escaped and wrapped in paragraphs so `dangerouslySetInnerHTML`
 * always receives well-formed HTML.
 */
export function sanitizedDescriptionHtml(value: string | null | undefined): string {
  if (!value) return "";
  const html = isHtmlDescription(value) ? value : plainTextToHtml(value);
  return sanitizePricingContent(html);
}