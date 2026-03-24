import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Baby, MapPin, Calendar as CalendarIcon, DollarSign, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuoteDateEditor } from "./QuoteDateEditor";
import type { Quote } from "@/types/quote";
import { formatQuoteCurrency, getQuoteCurrencyInfo, getCurrencyFlag } from "@/lib/quoteCurrency";

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface QuoteSummaryProps {
  quote: Quote;
}

export function QuoteSummary({ quote }: QuoteSummaryProps) {
  const [editing, setEditing] = useState(false);

  const displayStart = parseLocalDate(quote.start_date);
  const displayEnd = parseLocalDate(quote.end_date);
  const days = Math.ceil((displayEnd.getTime() - displayStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Compute total from services to ensure accuracy
  const computedTotal = quote.services && quote.services.length > 0
    ? quote.services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    : quote.total_amount;

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

          {editing ? (
            <QuoteDateEditor
              quoteId={quote.id}
              startDateStr={quote.start_date}
              endDateStr={quote.end_date}
              onClose={() => setEditing(false)}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Período:</span>
              <span className="font-medium">
                {format(displayStart, "dd/MM/yyyy", { locale: ptBR })} a{" "}
                {format(displayEnd, "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <span className="text-muted-foreground">({days} dias)</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => setEditing(true)} title="Editar datas">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {(() => {
          const { currency } = getQuoteCurrencyInfo(quote);
          return (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-medium">Total Geral</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatQuoteCurrency(computedTotal, currency)}
                </span>
              </div>

              {currency !== 'BRL' && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-xs">
                    {getCurrencyFlag(currency)} Moeda: {currency}
                  </Badge>
                </div>
              )}

              {quote.services && quote.services.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {quote.services.length} serviço(s) incluído(s)
                </p>
              )}
            </>
          );
        })()}
      </CardContent>
    </Card>
  );
}
