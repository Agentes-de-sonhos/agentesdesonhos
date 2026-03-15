import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Globe, Ticket, Ship, ShoppingBag } from "lucide-react";

interface SalesChannelCardsProps {
  salesChannels: string;
}

const channelIcons: Record<string, React.ElementType> = {
  cruzeiro: Ship,
  ingresso: Ticket,
  reserva: Globe,
  loja: ShoppingBag,
};

function getIcon(text: string) {
  const lower = text.toLowerCase();
  for (const [key, icon] of Object.entries(channelIcons)) {
    if (lower.includes(key)) return icon;
  }
  return Globe;
}

function parseChannels(text: string) {
  // Try to split by line breaks first, then by comma
  const lines = text.split(/\n+/).filter(Boolean);
  if (lines.length > 1) return lines;
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

export function SalesChannelCards({ salesChannels }: SalesChannelCardsProps) {
  const channels = parseChannels(salesChannels);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {channels.map((channel, i) => {
        const Icon = getIcon(channel);
        // Try to extract URL if present
        const urlMatch = channel.match(/(https?:\/\/[^\s]+)/);
        const label = channel.replace(/(https?:\/\/[^\s]+)/, "").trim() || channel;

        return (
          <Card
            key={i}
            className="group rounded-xl border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-default"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
              </div>
              {urlMatch && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 rounded-lg text-xs text-primary hover:bg-primary/10"
                  onClick={() =>
                    window.open(urlMatch[1], "_blank", "noopener,noreferrer")
                  }
                >
                  Acessar
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
