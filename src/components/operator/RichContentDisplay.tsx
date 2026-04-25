import DOMPurify from "dompurify";
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

  const sanitizedHtml = useMemo(() => {
    if (!isHtml) return "";

    // Parse so we can transform anchors into inline button-like links AT THEIR ORIGINAL POSITION.
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    // Convert plain URL text nodes into <a> tags first, so they also get the button styling.
    const urlRegex = /(https?:\/\/[^\s<]+|mailto:[^\s<]+)/gi;
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) textNodes.push(n as Text);
    textNodes.forEach((node) => {
      const text = node.nodeValue || "";
      if (!urlRegex.test(text)) return;
      // Skip if already inside an <a>
      let parent: HTMLElement | null = node.parentElement;
      while (parent && parent !== doc.body) {
        if (parent.tagName === "A") return;
        parent = parent.parentElement;
      }
      const frag = doc.createDocumentFragment();
      let lastIndex = 0;
      text.replace(urlRegex, (match, _g, offset: number) => {
        if (offset > lastIndex) {
          frag.appendChild(doc.createTextNode(text.slice(lastIndex, offset)));
        }
        const a = doc.createElement("a");
        a.setAttribute("href", match);
        a.textContent = match;
        frag.appendChild(a);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) {
        frag.appendChild(doc.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode?.replaceChild(frag, node);
    });

    // Style every <a>: open in new tab, secure rel, and mark as inline button.
    Array.from(doc.body.querySelectorAll("a")).forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      const existing = a.getAttribute("class") || "";
      a.setAttribute("class", `${existing} rich-inline-link`.trim());
    });

    return DOMPurify.sanitize(doc.body.innerHTML, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "hr", "span", "mark"],
      ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [content, isHtml]);

  if (!content) return null;

  if (!isHtml) {
    return <RichTextWithLinks text={content} lineClamp={lineClamp} />;
  }

  return (
    <div
      className="prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground [&_a.rich-inline-link]:inline-flex [&_a.rich-inline-link]:items-center [&_a.rich-inline-link]:gap-1.5 [&_a.rich-inline-link]:px-3 [&_a.rich-inline-link]:py-1 [&_a.rich-inline-link]:mx-0.5 [&_a.rich-inline-link]:rounded-md [&_a.rich-inline-link]:bg-primary/10 [&_a.rich-inline-link]:text-primary [&_a.rich-inline-link]:no-underline [&_a.rich-inline-link]:font-medium [&_a.rich-inline-link]:text-sm [&_a.rich-inline-link]:transition-colors [&_a.rich-inline-link:hover]:bg-primary/20 [&_a.rich-inline-link]:break-all"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

// Keep ExternalLink import referenced (for future use); silence unused warning by re-exporting.
export const __ExternalLinkRef = ExternalLink;