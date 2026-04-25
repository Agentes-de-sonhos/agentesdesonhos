import DOMPurify from "dompurify";
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

    // Helpers to convert any CSS color (hex, rgb, hsl, named) to rgba with alpha.
    const parseColorToRgb = (color: string): { r: number; g: number; b: number } | null => {
      if (!color) return null;
      const c = color.trim();
      // #rgb / #rrggbb
      const hexMatch = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
        const num = parseInt(hex, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
      }
      // rgb()/rgba()
      const rgbMatch = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
      if (rgbMatch) {
        return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };
      }
      // Fallback: let the browser resolve named/hsl colors via a temp element.
      try {
        const tmp = doc.createElement("span");
        tmp.style.color = c;
        doc.body.appendChild(tmp);
        const computed = tmp.style.color; // browsers normalize to rgb(...) when valid
        tmp.remove();
        const m = computed.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
        if (m) return { r: +m[1], g: +m[2], b: +m[3] };
      } catch {
        /* ignore */
      }
      return null;
    };

    // Find an explicit text color associated with this <a>:
    //  1) on the <a> itself
    //  2) on any descendant (TipTap often wraps the link text in <span style="color: ...">)
    //  3) on any ancestor up the tree
    const extractColorFromStyle = (el: Element): string | null => {
      const inline = el.getAttribute("style") || "";
      const m = inline.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      return m ? m[1].trim() : null;
    };
    const getAssociatedColor = (el: HTMLElement): string | null => {
      const own = extractColorFromStyle(el);
      if (own) return own;
      const descendantWithColor = el.querySelector("[style*='color']");
      if (descendantWithColor) {
        const c = extractColorFromStyle(descendantWithColor);
        if (c) return c;
      }
      let cur: HTMLElement | null = el.parentElement;
      while (cur && cur !== doc.body) {
        const c = extractColorFromStyle(cur);
        if (c) return c;
        cur = cur.parentElement;
      }
      return null;
    };

    // Style every <a>: open in new tab, secure rel, and mark as inline button.
    // If a text color is associated with the rich text, derive the button colors
    // from it (text = main color, bg = light tint, border = soft tint). Use
    // !important to win over the default Tailwind chip styling on the wrapper.
    Array.from(doc.body.querySelectorAll("a")).forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      const existing = a.getAttribute("class") || "";
      a.setAttribute("class", `${existing} rich-inline-link`.trim());

      const associatedColor = getAssociatedColor(a);
      const rgb = associatedColor ? parseColorToRgb(associatedColor) : null;
      if (rgb) {
        const { r, g, b } = rgb;
        // Strip any color/background-color/border the editor may have left on
        // the <a> so our derived chip styling is the single source of truth.
        const prev = (a.getAttribute("style") || "")
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s && !/^(color|background(-color)?|border(-[a-z]+)?)\s*:/i.test(s));
        prev.push(`color: rgb(${r}, ${g}, ${b}) !important`);
        prev.push(`background-color: rgba(${r}, ${g}, ${b}, 0.12) !important`);
        prev.push(`border: 1px solid rgba(${r}, ${g}, ${b}, 0.28) !important`);
        // Custom property powers the :hover rule defined on the wrapper.
        prev.push(`--rich-link-rgb: ${r}, ${g}, ${b}`);
        a.setAttribute("style", prev.join("; "));
        // Also strip color from any inner <span> so the <a>'s color wins
        // visually (avoids double-rendering in case of nested overrides).
        Array.from(a.querySelectorAll("[style*='color']")).forEach((child) => {
          const cleaned = (child.getAttribute("style") || "")
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s && !/^color\s*:/i.test(s))
            .join("; ");
          if (cleaned) child.setAttribute("style", cleaned);
          else child.removeAttribute("style");
        });
      }
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
      className="rich-content-display prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground [&_a.rich-inline-link]:inline-flex [&_a.rich-inline-link]:items-center [&_a.rich-inline-link]:justify-center [&_a.rich-inline-link]:text-center [&_a.rich-inline-link]:gap-1.5 [&_a.rich-inline-link]:px-3 [&_a.rich-inline-link]:py-1.5 [&_a.rich-inline-link]:my-1 [&_a.rich-inline-link]:mx-0.5 [&_a.rich-inline-link]:min-h-[2.25rem] [&_a.rich-inline-link]:max-w-full [&_a.rich-inline-link]:rounded-full [&_a.rich-inline-link]:bg-primary/10 [&_a.rich-inline-link]:text-primary [&_a.rich-inline-link]:no-underline [&_a.rich-inline-link]:font-medium [&_a.rich-inline-link]:text-[13px] sm:[&_a.rich-inline-link]:text-sm [&_a.rich-inline-link]:leading-snug [&_a.rich-inline-link]:transition-all [&_a.rich-inline-link]:duration-200 [&_a.rich-inline-link:hover]:bg-primary/20 [&_a.rich-inline-link:hover]:-translate-y-px [&_a.rich-inline-link:hover]:shadow-sm [&_a.rich-inline-link]:[overflow-wrap:break-word] [&_a.rich-inline-link]:[word-break:normal] [&_a.rich-inline-link]:[hyphens:none] [&_a.rich-inline-link]:[text-wrap:balance]"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
