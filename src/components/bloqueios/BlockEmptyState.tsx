import { Plane, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BlockEmptyStateProps {
  hasSearched: boolean;
  fallbackBlocks: any[];
  origin: string;
  getCityLabel: (code: string) => string;
  onSuggestionClick: (dest: string) => void;
}

export function BlockEmptyState({ hasSearched, fallbackBlocks, origin, getCityLabel, onSuggestionClick }: BlockEmptyStateProps) {
  if (!hasSearched) return null;

  const uniqueDestinations = [...new Set(fallbackBlocks.map((b) => b.destination))];

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="py-10 text-center space-y-5">
        <Plane className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <div>
          <h3 className="text-lg font-semibold">Nenhum bloqueio disponível nesse período 😕</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Não encontramos bloqueios para o destino e período selecionados.
          </p>
        </div>

        {uniqueDestinations.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-foreground">
              {origin
                ? `Mas encontramos opções saindo de ${getCityLabel(origin.toUpperCase())} no período:`
                : "Outros bloqueios disponíveis no período:"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {uniqueDestinations.slice(0, 8).map((dest) => (
                <Badge
                  key={dest}
                  variant="secondary"
                  className="cursor-pointer hover:bg-[hsl(var(--section-flights))]/10 hover:text-[hsl(var(--section-flights))] transition-colors px-3 py-1.5"
                  onClick={() => onSuggestionClick(dest)}
                >
                  {getCityLabel(dest)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          Tente ampliar o período ou buscar todos os destinos
        </p>
      </CardContent>
    </Card>
  );
}
