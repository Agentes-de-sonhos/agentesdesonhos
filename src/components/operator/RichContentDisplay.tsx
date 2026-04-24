import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { RichTextWithLinks } from "./RichTextWithLinks";
import { useMemo } from "react";

interface RichContentDisplayProps {
  content: string;
  /** Optional CSS line-clamp for plain-text fallback */
  lineClamp?: number;
}

/**
 * Smart renderer for supplier/operator long-text fields.
 * - If the content is HTML (rich text from the editor), sanitize and render with prose styles,
 *   extracting standalone URL paragraphs as "Acessar" buttons (consistency with legacy view).
 * - If the content is plain text (legacy), defer to RichTextWithLinks.
 */
export function RichContentDisplay({ content, lineClamp }: RichContentDisplayProps) {
  const isHtml = /<[a-z][\s\S]*>/i.test(content || "");

  const { sanitizedHtml, buttons } = useMemo(() => {
    if (!isHtml) return { sanitizedHtml: "", buttons: [] as { label: string; url: string }[] };

    // Parse to extract paragraphs that are JUST a link (turn into buttons), keep the rest as HTML.
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const extracted: { label: string; url: string }[] = [];

    Array.from(doc.body.querySelectorAll("p")).forEach((p) => {
      const onlyAnchor = p.children.length === 1 && p.children[0].tagName === "A" && (p.textContent || "").trim() === (p.children[0].textContent || "").trim();
      const onlyUrlText = !p.children.length && /^(https?:\/\/|mailto:)\S+$/i.test((p.textContent || "").trim());
      if (onlyAnchor) {
        const a = p.children[0] as HTMLAnchorElement;
        const url = a.getAttribute("href") || "";
        const label = (a.textContent || url).trim();
        if (url) {
          extracted.push({ label: label === url ? "Acessar link" : label, url });
          p.remove();
        }
      } else if (onlyUrlText) {
        const url = (p.textContent || "").trim();
        extracted.push({ label: "Acessar link", url });
        p.remove();
      }
    });

    const cleanHtml = DOMPurify.sanitize(doc.body.innerHTML, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "hr", "span", "mark"],
      ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });

    return { sanitizedHtml: cleanHtml, buttons: extracted };
  }, [content, isHtml]);

  if (!content) return null;

  if (!isHtml) {
    return <RichTextWithLinks text={content} lineClamp={lineClamp} />;
  }

  return (
    <div className="space-y-4">
      {sanitizedHtml && (
        <div
          className="prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary prose-a:underline prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )}
      {buttons.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {buttons.map((btn, i) => (
            <div
              key={i}
              className="group flex items-center gap-4 rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-300 p-4"
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{btn.label}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 rounded-lg text-xs text-primary hover:bg-primary/10"
                onClick={() => window.open(btn.url, "_blank", "noopener,noreferrer")}
              >
                Acessar
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}