import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Baby, MapPin, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Quote } from "@/types/quote";

interface QuoteSummaryProps {
  quote: Quote;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function QuoteSummary({ quote }: QuoteSummaryProps) {
  const startDate = parseLocalDate(quote.start_date);
  const endDate = parseLocalDate(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Resumo do Orçamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{quote.client_name}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{quote.adults_count} adulto(s)</span>
            </div>
            {quote.children_count > 0 && (
              <div className="flex items-center gap-2">
                <Baby className="h-4 w-4 text-muted-foreground" />
                <span>{quote.children_count} criança(s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Destino:</span>
            <span className="font-medium">{quote.destination}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Período:</span>
            <span className="font-medium">
              {format(startDate, "dd/MM/yyyy", { locale: ptBR })} a{" "}
              {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <span className="text-muted-foreground">({days} dias)</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="font-medium">Total Geral</span>
          </div>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(quote.total_amount)}
          </span>
        </div>

        {quote.services && quote.services.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {quote.services.length} serviço(s) incluído(s)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
