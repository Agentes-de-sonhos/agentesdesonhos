import { useState } from "react";
import { useAdminTradeEvents, useTradeEventMutations, type TradeEvent } from "@/hooks/useTradeEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  aprovado: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  recusado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function AdminTradeEventsManager() {
  const { data: events = [], isLoading } = useAdminTradeEvents();
  const { review } = useTradeEventMutations();
  const [tab, setTab] = useState("pendente");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const filtered = events.filter((e) => e.status === tab);

  const handleApprove = (id: string) => review.mutate({ id, status: "aprovado" });
  const handleReject = () => {
    if (!rejectingId) return;
    review.mutate(
      { id: rejectingId, status: "recusado", rejection_reason: reason },
      {
        onSuccess: () => {
          setRejectingId(null);
          setReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendente">
            Pendentes ({events.filter((e) => e.status === "pendente").length})
          </TabsTrigger>
          <TabsTrigger value="aprovado">Aprovados</TabsTrigger>
          <TabsTrigger value="recusado">Recusados</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum evento {tab}.
            </p>
          ) : (
            filtered.map((ev) => <EventRow key={ev.id} event={ev} onApprove={handleApprove} onReject={setRejectingId} />)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar evento</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da recusa (será exibido ao fornecedor)"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={review.isPending}>
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventRow({
  event, onApprove, onReject,
}: {
  event: TradeEvent;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base">{event.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {format(parseISO(event.start_at), "dd 'de' MMM yyyy 'às' HH:mm", { locale: ptBR })}
              {event.location && ` · ${event.location}`}
            </p>
          </div>
          <Badge variant="outline" className={statusColors[event.status]}>
            {event.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
        )}
        {event.link && (
          <a
            href={event.link} target="_blank" rel="noreferrer"
            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir link
          </a>
        )}
        {event.status === "recusado" && event.rejection_reason && (
          <p className="text-xs text-destructive">Motivo: {event.rejection_reason}</p>
        )}
        {event.status === "pendente" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onApprove(event.id)} className="gap-1">
              <CheckCircle2 className="h-4 w-4" /> Aprovar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onReject(event.id)} className="gap-1">
              <XCircle className="h-4 w-4" /> Recusar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}