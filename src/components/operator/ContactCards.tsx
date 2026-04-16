import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ContactCardsProps {
  contacts: string;
}

interface ParsedLine {
  type: "text" | "button";
  label: string;
  url?: string;
}

function parseContactLines(text: string): ParsedLine[] {
  const lines = text.split(/\n/).filter((l) => l.trim() !== "");
  return lines.map((line) => {
    const trimmed = line.trim();
    // Match: optional label text followed by a URL
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = trimmed.match(urlRegex);
    if (!match) return { type: "text" as const, label: trimmed };

    const url = match[1];
    let label = trimmed.replace(url, "").trim();
    // Strip trailing colon/punctuation from label
    label = label.replace(/[:;\-–—]+$/, "").trim();

    if (!label) label = "Acessar link";

    return { type: "button" as const, label, url };
  });
}

export function ContactCards({ contacts }: ContactCardsProps) {
  const parsed = parseContactLines(contacts);

  const textLines = parsed.filter((p) => p.type === "text");
  const buttons = parsed.filter((p) => p.type === "button");

  return (
    <div className="space-y-4">
      {textLines.length > 0 && (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {textLines.map((l) => l.label).join("\n")}
        </p>
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
