import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TripPeriodField } from "@/components/shared/TripPeriodField";

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

interface QuoteDateEditorProps {
  quoteId: string;
  startDateStr: string;
  endDateStr: string;
  onClose: () => void;
}

export function QuoteDateEditor({ quoteId, startDateStr, endDateStr, onClose }: QuoteDateEditorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(() => parseLocalDate(startDateStr));
  const [endDate, setEndDate] = useState<Date | undefined>(() => parseLocalDate(endDateStr));

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
      .eq("id", quoteId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar datas", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    toast({ title: "Datas atualizadas com sucesso" });
    onClose();
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarIcon className="h-4 w-4 text-primary" />
        Editar Datas
      </div>
      <TripPeriodField
        id="quote-date-editor-periodo"
        start={startDate ? toYMD(startDate) : ""}
        end={endDate ? toYMD(endDate) : ""}
        onChange={({ start, end }) => {
          setStartDate(start ? parseLocalDate(start) : undefined);
          setEndDate(end ? parseLocalDate(end) : undefined);
        }}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !startDate || !endDate}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Salvar Datas
        </Button>
      </div>
    </div>
  );
}
