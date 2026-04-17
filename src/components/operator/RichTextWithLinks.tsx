import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface RichTextWithLinksProps {
  text: string;
  /** Render non-URL lines as bullet list */
  asBullets?: boolean;
  /** Bullet dot color class (default: bg-primary/60) */
  bulletColor?: string;
  /** CSS line-clamp number for text mode */
  lineClamp?: number;
}

interface ParsedLine {
  type: "text" | "button";
  label: string;
  url?: string;
}

function parseLines(text: string): ParsedLine[] {
  return text.split(/\n/).filter((l) => l.trim() !== "").map((line) => {
    const trimmed = line.trim();
    // Match http(s) URLs OR mailto: links — emails alone stay as plain text
    const linkRegex = /(https?:\/\/[^\s]+|mailto:[^\s]+)/i;
    const match = trimmed.match(linkRegex);
    if (!match) return { type: "text" as const, label: trimmed };

    const url = match[1];
    let label = trimmed.replace(url, "").trim();
    label = label.replace(/^[-•*]\s*/, "").replace(/[:;\-–—]+$/, "").trim();
    if (!label) {
      label = url.startsWith("mailto:") ? url.replace(/^mailto:/i, "") : "Acessar link";
    }

    return { type: "button" as const, label, url };
  });
}

export function RichTextWithLinks({ text, asBullets, bulletColor = "bg-primary/60", lineClamp }: RichTextWithLinksProps) {
  const parsed = parseLines(text);
  const textLines = parsed.filter((p) => p.type === "text");
  const buttons = parsed.filter((p) => p.type === "button");

  return (
    <div className="space-y-4">
      {textLines.length > 0 && (
        asBullets ? (
          <ul className="space-y-2">
            {textLines.map((l, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletColor}`} />
                <span className="leading-relaxed">{l.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap"
            style={lineClamp ? { display: "-webkit-box", WebkitLineClamp: lineClamp, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
          >
            {textLines.map((l) => l.label).join("\n")}
          </p>
        )
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
