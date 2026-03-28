import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Calendar, Clock, Users, Tag, ArrowRight, Building2, ExternalLink, AlertTriangle } from "lucide-react";

interface BlockResultCardProps {
  block: any;
  getCityLabel: (code: string) => string;
  formatShortDate: (d: string | null) => string;
  formatPrice: (price: number | null, currency: string | null) => string | null;
}

export function BlockResultCard({ block, getCityLabel, formatShortDate, formatPrice }: BlockResultCardProps) {
  const isHighSeason = () => {
    if (!block.departure_date) return false;
    const month = new Date(block.departure_date + "T00:00:00").getMonth() + 1;
    return [1, 2, 6, 7, 12].includes(month);
  };

  const isLimitedSeats = block.seats_available != null && block.seats_available > 0 && block.seats_available <= 10;

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-all group">
      <CardContent className="p-5 space-y-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {isHighSeason() && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">🔥 Alta temporada</Badge>
          )}
          {isLimitedSeats && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-0.5" /> Oferta limitada
            </Badge>
          )}
        </div>

        {/* Route */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))]">
            <Plane className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold flex-1 min-w-0">
            <span className="truncate">{getCityLabel(block.origin)}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{getCityLabel(block.destination)}</span>
          </div>
        </div>

        {/* Operator + Airline */}
        <div className="flex flex-wrap gap-2">
          {block.operator && (
            <Badge variant="secondary" className="text-xs">
              {block.operator}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs flex items-center gap-1 bg-primary/5">
            <Plane className="h-3 w-3" />
            {block.airline || "Não informado"}
          </Badge>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Ida
            </p>
            <p className="font-medium">{formatShortDate(block.departure_date)}</p>
            {(block.departure_time || block.arrival_time) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {block.departure_time || "—"}
                {block.arrival_time && <> → {block.arrival_time}</>}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Volta
            </p>
            <p className="font-medium">
              {formatShortDate(block.return_departure_date || block.return_date)}
            </p>
            {(block.return_departure_time || block.return_arrival_time) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {block.return_departure_time || block.return_time || "—"}
                {block.return_arrival_time && <> → {block.return_arrival_time}</>}
              </p>
            )}
          </div>
        </div>

        {/* Price + Seats */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            {block.price ? (
              <span className="flex items-center gap-1 font-bold text-[hsl(var(--section-flights))]">
                <Tag className="h-4 w-4" />
                {block.price_text?.toLowerCase().includes("a partir") ? "a partir de " : ""}
                {formatPrice(block.price, block.currency)}
              </span>
            ) : block.price_text ? (
              <span className="text-sm font-medium text-muted-foreground">{block.price_text}</span>
            ) : null}
          </div>
          {block.seats_available != null && block.seats_available > 0 && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              {block.seats_available} {block.seats_available === 1 ? "lugar" : "lugares"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
