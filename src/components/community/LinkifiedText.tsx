import { Fragment } from "react";

/** Matches http(s)://... or www.... tokens inside free text. */
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?'"»]/;
const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const SAFE_PROTOCOL = /^https?:\/\//i;

export function normalizeUrl(raw: string): { href: string; label: string } | null {
  let trimmed = raw;
  // Remove sentence punctuation that belongs to the phrase, not the URL.
  // Closing brackets are only dropped when unbalanced inside the URL.
  for (;;) {
    const last = trimmed.slice(-1);
    if (TRAILING_PUNCTUATION.test(last)) {
      trimmed = trimmed.slice(0, -1);
      continue;
    }
    if (CLOSERS[last]) {
      const opens = trimmed.split(CLOSERS[last]).length - 1;
      const closes = trimmed.split(last).length - 1;
      if (closes > opens) {
        trimmed = trimmed.slice(0, -1);
        continue;
      }
    }
    break;
  }
  if (!trimmed) return null;
  const href = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
  if (!SAFE_PROTOCOL.test(href)) return null; // blocks javascript:, data:, vbscript:, etc.
  return { href, label: trimmed };
}

interface LinkifiedTextProps {
  text: string | null | undefined;
  className?: string;
  /** Rendered element (default: <p>) */
  as?: "p" | "span" | "div";
}

/**
 * Renders plain text with URLs converted into safe anchors that open in a real
 * new browser tab. Text is tokenized in React (no raw HTML injection).
 * Line breaks, spaces and emojis are preserved by the caller's whitespace class.
 */
export function LinkifiedText({ text, className, as: Tag = "p" }: LinkifiedTextProps) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <Tag className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const parsed = normalizeUrl(part);
        if (!parsed) return <Fragment key={i}>{part}</Fragment>;
        const tail = part.slice(parsed.label.length);
        return (
          <Fragment key={i}>
            <a
              href={parsed.href}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir link em nova aba"
              aria-label="Abrir link em nova aba"
              onClick={(e) => e.stopPropagation()}
              className="text-primary underline decoration-primary/40 hover:decoration-primary underline-offset-2 break-all [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {parsed.label}
            </a>
            {tail}
          </Fragment>
        );
      })}
    </Tag>
  );
}
