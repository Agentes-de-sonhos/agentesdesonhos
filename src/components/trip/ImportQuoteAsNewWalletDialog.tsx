import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Search, MapPin, Calendar, User } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { useToast } from "@/hooks/use-toast";
import { useTrips } from "@/hooks/useTrips";
import { supabase } from "@/integrations/supabase/client";
import { insertQuoteServicesIntoTrip } from "@/utils/quoteToTrip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QuoteService, ServiceType, ServiceData } from "@/types/quote";

function parseLocalDate(s?: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function fmtDate(s?: string | null) {
  const d = parseLocalDate(s);
  return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—";
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  published: "Publicado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
};

function fmtMoney(v?: number | null, currency?: string | null) {
  if (v == null) return null;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(v);
  } catch {
    return String(v);
  }
}

export function ImportQuoteAsNewWalletDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { createTrip } = useTrips();
  const [search, setSearch] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: quotes = [], isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["quotes-for-new-wallet", agencyOwnerId],
    queryFn: async () => {
      if (!agencyOwnerId) return [] as any[];
      const { data, error } = await supabase
        .from("quotes")
        .select("id, client_id, client_name, trip_title, destination, start_date, end_date, created_at, status, total_amount, currency, quote_services(id)")
        .eq("user_id", agencyOwnerId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) {
        console.error("[ImportQuoteAsNewWallet] falha ao carregar orçamentos:", error.message);
        throw error;
      }
      return (data || []).map((q: any) => ({
        ...q,
        services_count: q.quote_services?.length || 0,
      }));
    },
    enabled: !!user && !!agencyOwnerId && open,
    refetchOnMount: "always",
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return quotes;
    const s = search.toLowerCase();
    return quotes.filter((q: any) =>
      q.client_name?.toLowerCase().includes(s) ||
      q.destination?.toLowerCase().includes(s) ||
      String(q.trip_title || "").toLowerCase().includes(s)
    );
  }, [quotes, search]);

  async function handleImport() {
    if (!selectedQuoteId) return;
    const quote = quotes.find((q: any) => q.id === selectedQuoteId);
    if (!quote) return;
    setBusy(true);
    try {
      const newTrip = await createTrip({
        client_id: quote.client_id || undefined,
        client_name: quote.client_name,
        destination: quote.destination,
        start_date: quote.start_date,
        end_date: quote.end_date,
      } as any);

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
      const inserted = await insertQuoteServicesIntoTrip(supabase, newTrip.id, typed, 0);

      toast({
        title: "Carteira criada do orçamento",
        description: `${inserted} serviço${inserted !== 1 ? "s" : ""} importado${inserted !== 1 ? "s" : ""}.`,
      });
      onOpenChange(false);
      setSelectedQuoteId(null);
      navigate(`/ferramentas-ia/trip-wallet/${newTrip.id}`);
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e?.message || "Não foi possível importar.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Importar de um orçamento
          </DialogTitle>
          <DialogDescription>
            Selecione um orçamento para criar uma nova Carteira Digital aproveitando cliente, destino, datas e serviços.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, destino ou nº do orçamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-96 -mx-2">
          <div className="px-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-destructive">
                  Não foi possível carregar seus orçamentos.
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {(queryError as any)?.message || "Tente novamente em instantes."}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                {search ? "Nenhum orçamento encontrado." : "Nenhum orçamento disponível para importar"}
              </p>
            ) : filtered.map((q: any) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQuoteId(q.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors",
                  selectedQuoteId === q.id && "border-primary ring-1 ring-primary bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-medium truncate">{q.client_name || "Sem cliente"}</p>
                  </div>
                  {fmtMoney(q.total_amount, q.currency) && (
                    <Badge variant="outline" className="shrink-0 text-xs">{fmtMoney(q.total_amount, q.currency)}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{q.trip_title || q.destination || "—"}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(q.start_date)} – {fmtDate(q.end_date)}</span>
                  <span>{q.services_count} serviço{q.services_count !== 1 ? "s" : ""}</span>
                  {q.status && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{STATUS_LABEL[q.status] || q.status}</Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Criado em {fmtDate(q.created_at?.slice(0, 10))}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleImport} disabled={busy || !selectedQuoteId}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar carteira do orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}