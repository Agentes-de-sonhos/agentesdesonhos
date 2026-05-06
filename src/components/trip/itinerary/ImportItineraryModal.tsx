import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useItineraries } from "@/hooks/useItineraries";
import type { CreateActivityData } from "@/hooks/useItineraryActivities";
import type { OverwriteMode } from "./AIItineraryModal";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const PERIOD_MAP: Record<string, "morning" | "afternoon" | "evening"> = {
  manha: "morning",
  tarde: "afternoon",
  noite: "evening",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  startDate: string;
  hasExistingActivities: boolean;
  onImported: (activities: CreateActivityData[], mode: OverwriteMode) => Promise<void>;
}

export function ImportItineraryModal({ open, onOpenChange, tripId, startDate, hasExistingActivities, onImported }: Props) {
  const { itineraries, isLoading, getItineraryWithDetails } = useItineraries();
  const [importingId, setImportingId] = useState<string | null>(null);
  const [pending, setPending] = useState<CreateActivityData[] | null>(null);
  const [showOverwrite, setShowOverwrite] = useState(false);

  // Apenas roteiros validados/publicados pelo agente
  const validated = useMemo(
    () => itineraries.filter((i) => i.status === "approved" || i.status === "published"),
    [itineraries]
  );

  useEffect(() => {
    if (!open) {
      setImportingId(null);
    }
  }, [open]);

  const handleSelect = async (itineraryId: string) => {
    setImportingId(itineraryId);
    try {
      const full = await getItineraryWithDetails(itineraryId);
      const tripStart = parseLocalDate(startDate);
      const acts: CreateActivityData[] = [];

      (full.days || []).forEach((day) => {
        const dayDate = new Date(tripStart);
        dayDate.setDate(dayDate.getDate() + (day.dayNumber - 1));
        const y = dayDate.getFullYear();
        const m = String(dayDate.getMonth() + 1).padStart(2, "0");
        const d = String(dayDate.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        day.activities.forEach((a, i) => {
          acts.push({
            trip_id: tripId,
            day_date: dateStr,
            period: PERIOD_MAP[a.period] || "morning",
            title: a.title,
            description: a.description || undefined,
            location: a.location || undefined,
            order_index: i,
            origin: "ia",
          });
        });
      });

      if (acts.length === 0) {
        toast.warning("Esse roteiro não possui atividades.");
        setImportingId(null);
        return;
      }

      onOpenChange(false);

      if (hasExistingActivities) {
        setPending(acts);
        setShowOverwrite(true);
      } else {
        await onImported(acts, "replace_all");
        toast.success("Roteiro importado com sucesso! 🎉");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar roteiro");
    } finally {
      setImportingId(null);
    }
  };

  const confirm = async (mode: OverwriteMode) => {
    if (!pending) return;
    setShowOverwrite(false);
    try {
      await onImported(pending, mode);
      toast.success("Roteiro importado com sucesso! 🎉");
    } catch {
      toast.error("Erro ao importar roteiro");
    }
    setPending(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Importar roteiro
            </DialogTitle>
            <DialogDescription>
              Selecione um roteiro validado para importar como atividades dia a dia.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : validated.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum roteiro validado disponível. Crie e aprove um roteiro em "Criar Roteiro" para importá-lo aqui.
            </div>
          ) : (
            <div className="space-y-2">
              {validated.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => handleSelect(it.id)}
                  disabled={importingId !== null}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-start justify-between gap-3 disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{it.destination}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseLocalDate(it.startDate), "dd/MM/yyyy", { locale: ptBR })} —{" "}
                      {format(parseLocalDate(it.endDate), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  {importingId === it.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showOverwrite} onOpenChange={setShowOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Já existem atividades neste roteiro</AlertDialogTitle>
            <AlertDialogDescription>
              Como deseja importar o roteiro selecionado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => confirm("append")}>
              Adicionar ao existente
            </Button>
            <Button variant="outline" onClick={() => confirm("keep_services_replace_ai")}>
              Manter serviços e substituir sugestões
            </Button>
            <Button variant="destructive" onClick={() => confirm("replace_all")}>
              Substituir tudo
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPending(null)}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}