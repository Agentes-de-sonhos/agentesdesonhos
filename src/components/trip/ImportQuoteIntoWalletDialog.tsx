import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { insertQuoteServicesIntoTrip } from "@/utils/quoteToTrip";
import { cn } from "@/lib/utils";
import type { QuoteService, ServiceType, ServiceData } from "@/types/quote";

export function ImportQuoteIntoWalletDialog({
  open, onOpenChange, tripId, currentServiceCount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  currentServiceCount: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes-for-import", user?.id],
    queryFn: async () => {
      if (!user) return [] as any[];
      const { data, error } = await supabase
        .from("quotes")
        .select("id, client_name, destination, start_date, end_date, created_at, quote_services(id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        services_count: q.quote_services?.length || 0,
      }));
    },
    enabled: !!user && open,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return quotes;
    const s = search.toLowerCase();
    return quotes.filter((q: any) =>
      q.client_name?.toLowerCase().includes(s) ||
      q.destination?.toLowerCase().includes(s)
    );
  }, [quotes, search]);

  async function handleImport() {
    if (!selectedQuoteId) return;
    setBusy(true);
    try {
      const { data: services, error } = await supabase
        .from("quote_services")
        .select("*")
        .eq("quote_id", selectedQuoteId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      const typed = (services || []).map((s: any) => ({
        ...s,
        service_type: s.service_type as ServiceType,
        service_data: s.service_data as unknown as ServiceData,
      })) as QuoteService[];
      const inserted = await insertQuoteServicesIntoTrip(supabase, tripId, typed, currentServiceCount);
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast({
        title: "Serviços importados",
        description: `${inserted} serviço${inserted !== 1 ? "s" : ""} adicionado${inserted !== 1 ? "s" : ""} à carteira.`,
      });
      onOpenChange(false);
      setSelectedQuoteId(null);
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e?.message || "Não foi possível importar.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Importar de um orçamento
          </DialogTitle>
          <DialogDescription>
            Reaproveite os serviços de um orçamento já criado. Valores não são copiados.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-72 -mx-2">
          <div className="px-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                {search ? "Nenhum orçamento encontrado." : "Você ainda não tem orçamentos."}
              </p>
            ) : filtered.map((q: any) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQuoteId(q.id)}
                className={cn(
                  "w-full text-left rounded-md border p-3 hover:bg-muted/40 transition-colors",
                  selectedQuoteId === q.id && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{q.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{q.destination}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {q.services_count} serviço{q.services_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleImport} disabled={busy || !selectedQuoteId}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importar serviços
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}