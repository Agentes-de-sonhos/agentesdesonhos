import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface RichTextWithLinksProps {
  text: string;
  /** If true, non-URL lines render as bullet list items */
  asBullets?: boolean;
  /** Max visible text lines (CSS line-clamp) */
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
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = trimmed.match(urlRegex);
    if (!match) return { type: "text" as const, label: trimmed };

    const url = match[1];
    let label = trimmed.replace(url, "").trim();
    label = label.replace(/[:;\-–—]+$/, "").trim();
    if (!label) label = "Acessar link";

    return { type: "button" as const, label, url };
  });
}

export function RichTextWithLinks({ text, asBullets, lineClamp }: RichTextWithLinksProps) {
  const parsed = parseLines(text);
  const textLines = parsed.filter((p) => p.type === "text");
  const buttons = parsed.filter((p) => p.type === "button");

  return (
    <div className="space-y-4">
      {textLines.length > 0 && (
        asBullets ? (
          <ul className="space-y-2">
            {textLines.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{l.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap ${lineClamp ? `line-clamp-${lineClamp}` : ""}`}>
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
