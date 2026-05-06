import { useState, useMemo } from "react";
import { Loader2, Wallet, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTrips } from "@/hooks/useTrips";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { extractTripFormDataFromQuote, insertQuoteServicesIntoTrip } from "@/utils/quoteToTrip";
import type { Quote } from "@/types/quote";

export function ExportQuoteToWalletDialog({
  open, onOpenChange, quote,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quote: Quote;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trips, createTrip } = useTrips();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const candidateTrips = useMemo(() => {
    const sameClient = (quote as any).client_id
      ? trips.filter((t: any) => t.client_id === (quote as any).client_id)
      : [];
    return sameClient.length > 0 ? sameClient : trips;
  }, [trips, quote]);

  const services = quote.services || [];

  async function handleConfirm() {
    if (services.length === 0) {
      toast({ title: "Sem serviços", description: "Adicione serviços ao orçamento antes de exportar.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      let tripId: string;
      let startIndex = 0;

      if (mode === "new") {
        const newTrip = await createTrip(extractTripFormDataFromQuote(quote));
        tripId = newTrip.id;
      } else {
        if (!selectedTripId) {
          toast({ title: "Escolha uma carteira", variant: "destructive" });
          setBusy(false);
          return;
        }
        tripId = selectedTripId;
        const { count } = await supabase
          .from("trip_services")
          .select("id", { count: "exact", head: true })
          .eq("trip_id", tripId);
        startIndex = count || 0;
      }

      const inserted = await insertQuoteServicesIntoTrip(supabase, tripId, services, startIndex);
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });

      toast({
        title: mode === "new" ? "Carteira criada" : "Serviços adicionados",
        description: `${inserted} serviço${inserted !== 1 ? "s" : ""} importado${inserted !== 1 ? "s" : ""} do orçamento.`,
      });
      onOpenChange(false);
      navigate(`/ferramentas-ia/trip-wallet/${tripId}`);
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e?.message || "Não foi possível exportar.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Gerar Carteira Digital
          </DialogTitle>
          <DialogDescription>
            Reaproveite os {services.length} serviço{services.length !== 1 ? "s" : ""} deste orçamento numa Carteira Digital. Valores não são copiados.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "new" | "existing")} className="space-y-2">
          <div className="flex items-start gap-2 rounded-md border p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setMode("new")}>
            <RadioGroupItem value="new" id="mode-new" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-new" className="cursor-pointer font-medium flex items-center gap-1">
                <Plus className="h-4 w-4" /> Criar nova carteira
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Cria uma carteira nova com os dados do cliente e todos os serviços.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border p-3 hover:bg-muted/40 cursor-pointer" onClick={() => setMode("existing")}>
            <RadioGroupItem value="existing" id="mode-existing" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-existing" className="cursor-pointer font-medium flex items-center gap-1">
                <ArrowRight className="h-4 w-4" /> Adicionar à carteira existente
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Acrescenta os serviços a uma carteira que você já possui.
              </p>
              {mode === "existing" && (
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Escolha uma carteira" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {candidateTrips.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">Você ainda não tem carteiras.</div>
                    ) : candidateTrips.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.client_name} — {t.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={busy || (mode === "existing" && !selectedTripId)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}