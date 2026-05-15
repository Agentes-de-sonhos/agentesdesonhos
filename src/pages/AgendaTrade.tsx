import { useState } from "react";
import { SupplierDashboardLayout } from "@/components/layout/supplier/SupplierDashboardLayout";
import { useMyTradeEvents, useTradeEventMutations, type TradeEvent, type TradeEventType } from "@/hooks/useTradeEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const types: { value: TradeEventType; label: string }[] = [
  { value: "treinamento", label: "Treinamento" },
  { value: "evento", label: "Evento" },
  { value: "roadshow", label: "Roadshow" },
  { value: "live", label: "Live" },
  { value: "famtour", label: "Famtour" },
  { value: "reuniao", label: "Reunião" },
  { value: "capacitacao", label: "Capacitação" },
  { value: "encontro", label: "Encontro Comercial" },
  { value: "outro", label: "Outro" },
];

const statusStyle: Record<string, string> = {
  aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pendente: "bg-amber-100 text-amber-700 border-amber-200",
  recusado: "bg-rose-100 text-rose-700 border-rose-200",
};

interface FormState {
  title: string;
  description: string;
  event_type: TradeEventType;
  start_at: string;
  end_at: string;
  location: string;
  link: string;
  cover_url: string;
}

const empty: FormState = {
  title: "", description: "", event_type: "evento",
  start_at: "", end_at: "", location: "", link: "", cover_url: "",
};

export default function AgendaTrade() {
  const { data: events, isLoading } = useMyTradeEvents();
  const { create, update, remove } = useTradeEventMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TradeEvent | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (ev: TradeEvent) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description || "",
      event_type: ev.event_type,
      start_at: ev.start_at.slice(0, 16),
      end_at: ev.end_at?.slice(0, 16) || "",
      location: ev.location || "",
      link: ev.link || "",
      cover_url: ev.cover_url || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title || !form.start_at) return;
    const payload = {
      title: form.title,
      description: form.description || null,
      event_type: form.event_type,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      location: form.location || null,
      link: form.link || null,
      cover_url: form.cover_url || null,
      operator_id: null,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setOpen(false);
  };

  return (
    <SupplierDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="h-7 w-7 text-primary" /> Agenda do Trade
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Publique treinamentos, roadshows, lives, famtours e encontros. Após aprovação, seu evento aparece para todos os agentes da plataforma.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo evento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v as TradeEventType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {types.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Local</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Online ou cidade/local" />
                </div>
                <div className="space-y-1.5">
                  <Label>Início *</Label>
                  <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim</Label>
                  <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Link de inscrição</Label>
                  <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>
                  {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editing ? "Salvar" : "Enviar para aprovação"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !events || events.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nenhum evento publicado ainda. Crie seu primeiro evento.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {events.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-shrink-0 w-16 text-center rounded-lg bg-muted/40 p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">{format(parseISO(ev.start_at), "MMM", { locale: ptBR })}</p>
                    <p className="text-2xl font-bold leading-tight">{format(parseISO(ev.start_at), "dd")}</p>
                    <p className="text-[10px] text-muted-foreground">{format(parseISO(ev.start_at), "HH:mm")}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{ev.title}</h3>
                      <Badge variant="outline" className={statusStyle[ev.status]}>{ev.status}</Badge>
                      <Badge variant="outline" className="capitalize">{ev.event_type}</Badge>
                    </div>
                    {ev.location && <p className="text-xs text-muted-foreground mt-1">{ev.location}</p>}
                    {ev.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ev.description}</p>}
                    {ev.status === "recusado" && ev.rejection_reason && (
                      <p className="text-xs text-rose-600 mt-2">Motivo: {ev.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openEdit(ev)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => remove.mutate(ev.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SupplierDashboardLayout>
  );
}