import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Baby, MapPin, Calendar as CalendarIcon, DollarSign, Pencil, ChevronDown, Check, Plane } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  const [open, setOpen] = useState(true);
  const [editingDest, setEditingDest] = useState(false);
  const [destDraft, setDestDraft] = useState(quote.destination);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState((quote as any).trip_title || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveDestination = async () => {
    const val = destDraft.trim();
    if (!val) return;
    const { error } = await supabase.from("quotes").update({ destination: val } as any).eq("id", quote.id);
    if (error) { toast({ title: "Erro ao salvar destino", description: error.message, variant: "destructive" }); return; }
    await queryClient.invalidateQueries({ queryKey: ["quote", quote.id] });
    await queryClient.invalidateQueries({ queryKey: ["quotes"] });
    setEditingDest(false);
    toast({ title: "Destino atualizado" });
  };

  const saveTitle = async () => {
    const val = titleDraft.trim() || null;
    const { error } = await supabase.from("quotes").update({ trip_title: val } as any).eq("id", quote.id);
    if (error) { toast({ title: "Erro ao salvar título", description: error.message, variant: "destructive" }); return; }
    await queryClient.invalidateQueries({ queryKey: ["quote", quote.id] });
    await queryClient.invalidateQueries({ queryKey: ["quotes"] });
    setEditingTitle(false);
    toast({ title: "Título atualizado" });
  };

  const displayStart = parseLocalDate(quote.start_date);
  const displayEnd = parseLocalDate(quote.end_date);
  const days = Math.ceil((displayEnd.getTime() - displayStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Compute total from services to ensure accuracy
  const computedTotal = quote.services && quote.services.length > 0
    ? quote.services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    : quote.total_amount;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <CardTitle className="text-lg">Resumo do Orçamento</CardTitle>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{quote.client_name}</span>
          </div>

          {/* Título da viagem (opcional) */}
          <div className="flex items-center gap-2 text-sm">
            <Plane className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Título:</span>
            {editingTitle ? (
              <span className="flex items-center gap-1 flex-1">
                <Input
                  className="h-7 text-sm"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") { setTitleDraft((quote as any).trip_title || ""); setEditingTitle(false); }
                  }}
                  placeholder="Título da viagem (opcional)"
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveTitle} title="Salvar">
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </span>
            ) : (
              <>
                <span
                  className="font-medium cursor-pointer hover:underline truncate"
                  onClick={() => { setTitleDraft((quote as any).trip_title || ""); setEditingTitle(true); }}
                >
                  {(quote as any).trip_title || <span className="text-muted-foreground italic font-normal">Adicionar título</span>}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => { setTitleDraft((quote as any).trip_title || ""); setEditingTitle(true); }} title="Editar título">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
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

          {/* Destino editável */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Destino:</span>
            {editingDest ? (
              <span className="flex items-center gap-1 flex-1">
                <Input
                  className="h-7 text-sm"
                  value={destDraft}
                  onChange={(e) => setDestDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveDestination();
                    if (e.key === "Escape") { setDestDraft(quote.destination); setEditingDest(false); }
                  }}
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveDestination} title="Salvar">
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </span>
            ) : (
              <>
                <span
                  className="font-medium cursor-pointer hover:underline truncate"
                  onClick={() => { setDestDraft(quote.destination); setEditingDest(true); }}
                >
                  {quote.destination}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => { setDestDraft(quote.destination); setEditingDest(true); }} title="Editar destino">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
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
      )}
    </Card>
  );
}
