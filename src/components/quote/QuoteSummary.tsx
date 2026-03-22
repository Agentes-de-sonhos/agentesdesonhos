import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Baby, MapPin, Calendar as CalendarIcon, DollarSign, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Quote } from "@/types/quote";

interface QuoteSummaryProps {
  quote: Quote;
  externalEditDates?: boolean;
  onExternalEditDatesChange?: (v: boolean) => void;
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

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function QuoteSummary({ quote }: QuoteSummaryProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(() => parseLocalDate(quote.start_date));
  const [endDate, setEndDate] = useState<Date | undefined>(() => parseLocalDate(quote.end_date));
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const displayStart = parseLocalDate(quote.start_date);
  const displayEnd = parseLocalDate(quote.end_date);
  const days = Math.ceil((displayEnd.getTime() - displayStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const handleStartEdit = () => {
    setStartDate(parseLocalDate(quote.start_date));
    setEndDate(parseLocalDate(quote.end_date));
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Datas inválidas", description: "Selecione as datas de ida e volta.", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Data inválida", description: "A data de volta não pode ser anterior à data de ida.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("quotes")
      .update({ start_date: toYMD(startDate), end_date: toYMD(endDate) } as any)
      .eq("id", quote.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar datas", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["quote", quote.id] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    toast({ title: "Datas atualizadas com sucesso" });
    setEditing(false);
  };

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
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Editar Datas
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">Ida</span>
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          if (d) {
                            setStartDate(d);
                            if (endDate && d > endDate) setEndDate(undefined);
                          }
                          setStartOpen(false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">Volta</span>
                  <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => { if (d) setEndDate(d); setEndOpen(false); }}
                        disabled={(d) => startDate ? d < startDate : false}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !startDate || !endDate}>
                  {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Salvar Datas
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Período:</span>
              <span className="font-medium">
                {format(displayStart, "dd/MM/yyyy", { locale: ptBR })} a{" "}
                {format(displayEnd, "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <span className="text-muted-foreground">({days} dias)</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={handleStartEdit} title="Editar datas">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
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