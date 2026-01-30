import { TrendingUp, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TradeUpdate {
  id: string;
  title: string;
  description: string;
  type: "novo" | "atualização" | "destaque";
  date: string;
}

interface TradeUpdatesCardProps {
  updates: TradeUpdate[];
}

const typeStyles = {
  novo: "bg-success/10 text-success border-success/20",
  atualização: "bg-primary/10 text-primary border-primary/20",
  destaque: "bg-accent/10 text-accent border-accent/20",
};

export function TradeUpdatesCard({ updates }: TradeUpdatesCardProps) {
  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="font-display text-lg">Novidades do Trade</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.map((update) => (
          <div
            key={update.id}
            className="rounded-xl border border-border bg-secondary/20 p-4 transition-all duration-200 hover:bg-secondary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-foreground">
                {update.title}
              </h4>
              <Badge
                variant="outline"
                className={`text-xs capitalize ${typeStyles[update.type]}`}
              >
                {update.type}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {update.description}
            </p>
            <span className="mt-2 block text-xs text-muted-foreground">
              {update.date}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
