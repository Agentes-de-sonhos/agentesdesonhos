import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { Briefcase, Check, Loader2, Search as SearchIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes } from "@/hooks/useQuotes";
import { useItineraries } from "@/hooks/useItineraries";
import { mapQuoteServiceToTripService } from "@/utils/quoteToTrip";
import { servicesToActivities } from "@/utils/serviceToItinerary";
import { parseLocalDate } from "@/lib/dateParsing";
import { cn } from "@/lib/utils";
import type { AIGeneratedItinerary, ItineraryFormData } from "@/types/itinerary";
import type { TripService } from "@/types/trip";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERIOD_MAP: Record<string, "manha" | "tarde" | "noite"> = {
  morning: "manha",
  afternoon: "tarde",
  evening: "noite",
};

/**
 * Importa um orçamento já montado para um novo roteiro: reaproveita o
 * cabeçalho (cliente, destino, datas, viajantes) e converte voos, hotéis,
 * passeios e transfers em atividades dia a dia, usando o mesmo mapeamento
 * de serviços da carteira digital.
 */
export function ImportQuoteItineraryDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { quotes, isLoading } = useQuotes();
  const { createItinerary, saveGeneratedItinerary } = useItineraries();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (quotes ?? []) as any[];
    if (!term) return list;
    return list.filter((q) =>
      [q.client_name, q.destination].filter(Boolean).some((v: string) => v.toLowerCase().includes(term)),
    );
  }, [quotes, search]);

  const handleConfirm = async () => {
    const quote = (quotes ?? []).find((q: any) => q.id === selectedId) as any;
    if (!quote) return;

    setSubmitting(true);
    try {
      const { data: quoteServices, error } = await supabase
        .from("quote_services")
        .select("*")
        .eq("quote_id", quote.id)
        .order("order_index", { ascending: true });
      if (error) throw error;

      const tripServices: TripService[] = (quoteServices ?? [])
        .map((qs: any) => {
          const mapped = mapQuoteServiceToTripService(qs);
          if (!mapped) return null;
          return {
            id: qs.id,
            service_type: mapped.type,
            service_data: mapped.data,
          } as unknown as TripService;
        })
        .filter(Boolean) as TripService[];

      const activities = servicesToActivities(tripServices, quote.id);

      const dates = activities.map((a) => a.day_date).filter(Boolean).sort();
      const startStr = quote.start_date || dates[0];
      if (!startStr) {
        toast.error("Este orçamento não tem datas para montar o roteiro.");
        return;
      }
      const endStr = quote.end_date || dates[dates.length - 1] || startStr;

      const startDate = parseLocalDate(startStr);
      const endDate = parseLocalDate(endStr);
      const dayCount = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);

      const adults = Number(quote.adults_count) > 0 ? Number(quote.adults_count) : 1;
      const children = Number(quote.children_count) > 0 ? Number(quote.children_count) : 0;

      const formData: ItineraryFormData = {
        destination: quote.destination || "Roteiro",
        startDate,
        endDate,
        travelersCount: adults + children,
        adultsCount: adults,
        childrenCount: children,
        tripType: "familia",
        budgetLevel: "conforto",
        interests: [],
        clientId: quote.client_id || undefined,
        clientName: quote.client_name || undefined,
        additionalPreferences: {},
      };

      const itinerary = await createItinerary.mutateAsync(formData);

      const generated: AIGeneratedItinerary = {
        days: Array.from({ length: dayCount }, (_, i) => {
          const dayDate = format(addDays(startDate, i), "yyyy-MM-dd");
          return {
            dayNumber: i + 1,
            date: dayDate,
            activities: activities
              .filter((a) => a.day_date === dayDate)
              .map((a) => ({
                period: PERIOD_MAP[a.period] ?? "manha",
                title: a.title,
                description: (a.start_time ? `${a.start_time} — ` : "") + (a.description ?? ""),
                location: a.location ?? "",
                estimatedDuration: "",
                estimatedCost: "",
              })),
          };
        }),
      };

      await saveGeneratedItinerary(itinerary.id, generated, startDate);

      toast.success("Roteiro criado a partir do orçamento. Revise os dias e complemente o que quiser.");
      onOpenChange(false);
      navigate(`/ferramentas-ia/criar-roteiro/${itinerary.id}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Não foi possível importar este orçamento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Importar de um orçamento
          </DialogTitle>
          <DialogDescription>
            Escolha o orçamento. Cliente, destino, datas, viajantes e os serviços já cadastrados viram dias e
            atividades do roteiro para você revisar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-lg pl-9"
          />
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum orçamento encontrado.</p>
          ) : (
            filtered.map((q: any) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedId(q.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition",
                  selectedId === q.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{q.client_name || "Sem cliente"}</span>
                  {selectedId === q.id ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {q.destination || "Destino não informado"}
                  {q.start_date ? ` · ${q.start_date.split("-").reverse().join("/")}` : ""}
                  {q.end_date ? ` a ${q.end_date.split("-").reverse().join("/")}` : ""}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Criando roteiro...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Importar e criar roteiro
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImportQuoteItineraryDialog;
