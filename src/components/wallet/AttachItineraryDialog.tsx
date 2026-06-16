import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Copy, MapPin, CalendarDays } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { attachItineraryToTrip, cloneItineraryForTrip } from "@/lib/roteiro-domain";
import { parseLocalDate } from "@/lib/dateParsing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Trip } from "@/types/trip";

interface Props {
  trip: Trip;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAttached?: () => void;
}

export function AttachItineraryDialog({ trip, open, onOpenChange, onAttached }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: itineraries = [], isLoading } = useQuery({
    queryKey: ["my-itineraries-for-attach", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itineraries")
        .select("id, destination, start_date, end_date, status, cover_image_url")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && open,
  });

  const finish = (msg: string) => {
    toast({ title: msg });
    onAttached?.();
    onOpenChange(false);
  };

  const handleAttachExisting = async (itineraryId: string) => {
    setBusyId("attach:" + itineraryId);
    try {
      await attachItineraryToTrip(trip.id, itineraryId);
      finish("Roteiro vinculado");
    } catch (err: any) {
      toast({ title: "Erro ao vincular", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleClone = async (sourceId: string) => {
    setBusyId("clone:" + sourceId);
    try {
      const newId = await cloneItineraryForTrip(sourceId, trip.id);
      toast({ title: "Cópia criada e vinculada" });
      onAttached?.();
      onOpenChange(false);
      navigate(`/ferramentas-ia/criar-roteiro/${newId}?fromTrip=${trip.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao copiar", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateNew = () => {
    // Apenas navega para o formulário de Novo Roteiro com os dados da carteira
    // pré-preenchidos. O roteiro só é criado quando o usuário confirmar.
    const params = new URLSearchParams({
      fromTrip: trip.id,
      destination: trip.destination ?? "",
      start: trip.start_date ?? "",
      end: trip.end_date ?? "",
    });
    const clientId = (trip as any).client_id as string | null | undefined;
    if (clientId) params.set("clientId", clientId);
    if (trip.client_name) params.set("clientName", trip.client_name);
    onOpenChange(false);
    navigate(`/ferramentas-ia/criar-roteiro?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular roteiro à carteira</DialogTitle>
          <DialogDescription>
            Crie um novo roteiro ou escolha um existente. A edição acontece no módulo Criar Roteiros.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new">Criar novo</TabsTrigger>
            <TabsTrigger value="existing">Usar existente</TabsTrigger>
            <TabsTrigger value="clone">Duplicar</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-3 py-2">
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <p className="font-medium">Você será levado ao formulário de Novo Roteiro com estes dados já preenchidos:</p>
              <p className="text-muted-foreground">Destino: <span className="font-medium text-foreground">{trip.destination}</span></p>
              <p className="text-muted-foreground">
                Período: <span className="font-medium text-foreground">
                  {format(parseLocalDate(trip.start_date), "dd/MM/yyyy")} — {format(parseLocalDate(trip.end_date), "dd/MM/yyyy")}
                </span>
              </p>
              {trip.client_name && (
                <p className="text-muted-foreground">Cliente: <span className="font-medium text-foreground">{trip.client_name}</span></p>
              )}
            </div>
            <Button onClick={handleCreateNew} className="w-full">
              <Plus className="h-4 w-4 mr-1.5" />
              Ir para Novo Roteiro
            </Button>
            <p className="text-xs text-muted-foreground">
              O roteiro será vinculado automaticamente a esta carteira ao ser criado.
            </p>
          </TabsContent>

          <TabsContent value="existing" className="py-2">
            <ItineraryList
              itineraries={itineraries}
              isLoading={isLoading}
              actionLabel="Vincular"
              busyKey={busyId?.startsWith("attach:") ? busyId.slice(7) : null}
              onAction={handleAttachExisting}
            />
            <p className="text-xs text-muted-foreground mt-2">
              O roteiro será vinculado <strong>diretamente</strong>. Edições feitas aqui afetam o original.
            </p>
          </TabsContent>

          <TabsContent value="clone" className="py-2">
            <ItineraryList
              itineraries={itineraries}
              isLoading={isLoading}
              actionLabel="Duplicar"
              icon="copy"
              busyKey={busyId?.startsWith("clone:") ? busyId.slice(6) : null}
              onAction={handleClone}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Uma <strong>cópia independente</strong> será criada e vinculada a esta carteira.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItineraryList({
  itineraries, isLoading, actionLabel, onAction, busyKey, icon,
}: {
  itineraries: any[];
  isLoading: boolean;
  actionLabel: string;
  onAction: (id: string) => void;
  busyKey: string | null;
  icon?: "copy";
}) {
  if (isLoading) {
    return <div className="py-8 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!itineraries.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum roteiro encontrado.</p>;
  }
  return (
    <ScrollArea className="h-72 pr-3">
      <ul className="space-y-2">
        {itineraries.map((it) => {
          const busy = busyKey === it.id;
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-md border p-2 hover:bg-muted/40">
              <div className="h-12 w-16 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {it.cover_image_url ? (
                  <img src={it.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{it.destination}</p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(parseLocalDate(it.start_date), "dd/MM/yy", { locale: ptBR })} — {format(parseLocalDate(it.end_date), "dd/MM/yy", { locale: ptBR })}
                  <span className="ml-2 opacity-70">· {it.status === "published" ? "Publicado" : "Rascunho"}</span>
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(it.id)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon === "copy" ? <Copy className="h-4 w-4 mr-1.5" /> : null}
                {!busy && actionLabel}
              </Button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}