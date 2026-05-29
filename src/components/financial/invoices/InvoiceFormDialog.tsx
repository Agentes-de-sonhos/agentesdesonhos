import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Plus, FileDown, FileUp } from "lucide-react";
import { useInvoices, type CreateInvoiceInput } from "@/hooks/useInvoices";
import {
  INVOICE_SERVICE_CATEGORIES,
  computeInvoiceTotals,
  computeServiceTotals,
  type InvoiceServiceCategory,
  type InvoiceServiceInput,
} from "@/types/invoice";
import { useQuotes } from "@/hooks/useQuotes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function InvoiceFormDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createInvoice } = useInvoices();
  const { quotes } = useQuotes();

  const [client, setClient] = useState({
    client_name: "", client_company: "", client_document: "",
    client_email: "", client_phone: "",
  });
  const [trip, setTrip] = useState({ destination: "", travel_start: "", travel_end: "" });
  const [meta, setMeta] = useState({
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    notes: "",
    pix_key: "",
  });
  const [services, setServices] = useState<InvoiceServiceInput[]>([
    { category: "outros", description: "", fare: 0, taxes: 0, discount: 0, commission: 0, rav: 0 },
  ]);
  const [installments, setInstallments] = useState<Array<{ label: string; amount: number; due_date: string }>>([]);

  const totals = useMemo(() => computeInvoiceTotals(services), [services]);

  const addService = () =>
    setServices(s => [...s, { category: "outros", description: "", fare: 0, taxes: 0, discount: 0, commission: 0, rav: 0 }]);
  const removeService = (i: number) => setServices(s => s.filter((_, idx) => idx !== i));
  const patchService = (i: number, p: Partial<InvoiceServiceInput>) =>
    setServices(s => s.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addInstallment = () =>
    setInstallments(arr => [...arr, {
      label: arr.length === 0 ? "Entrada" : `${arr.length + 1}ª parcela`,
      amount: 0,
      due_date: "",
    }]);
  const removeInstallment = (i: number) => setInstallments(arr => arr.filter((_, idx) => idx !== i));

  const handleImportFromQuote = async (quoteId: string) => {
    const { data: q } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
    if (!q) { toast({ title: "Orçamento não encontrado", variant: "destructive" }); return; }
    const { data: svc } = await supabase
      .from("quote_services").select("*").eq("quote_id", quoteId).order("order_index");

    const clientName = (q as any).client_name || (q as any).traveler_name || "";
    setClient(c => ({
      ...c,
      client_name: clientName,
      client_email: (q as any).client_email ?? c.client_email,
      client_phone: (q as any).client_phone ?? c.client_phone,
    }));
    setTrip({
      destination: (q as any).destination ?? "",
      travel_start: (q as any).start_date ?? "",
      travel_end: (q as any).end_date ?? "",
    });

    if (svc && svc.length) {
      setServices(svc.map((s: any) => {
        const catMap: Record<string, InvoiceServiceCategory> = {
          aereo: "aereo", hotel: "hotel", cruzeiro: "cruzeiro", seguro: "seguro",
          passeio: "passeio", transfer: "transfer", ingresso: "ingresso", pacote: "pacote",
        };
        return {
          category: catMap[s.service_type] || "outros",
          description: s.title || s.description || "",
          fare: Number(s.amount || 0),
          taxes: 0,
          discount: 0,
          commission: 0,
          rav: 0,
        };
      }));
    }
    toast({ title: "Dados importados do orçamento" });
  };

  const handleImportFromTrip = async (tripId: string) => {
    const { data: t } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
    if (!t) { toast({ title: "Carteira não encontrada", variant: "destructive" }); return; }
    const { data: svc } = await supabase
      .from("trip_services").select("*").eq("trip_id", tripId).order("order_index");

    setClient(c => ({ ...c, client_name: (t as any).client_name || c.client_name }));
    setTrip({
      destination: (t as any).destination ?? "",
      travel_start: (t as any).start_date ?? "",
      travel_end: (t as any).end_date ?? "",
    });
    if (svc && svc.length) {
      setServices(svc.map((s: any) => ({
        category: (["aereo","hotel","cruzeiro","seguro","passeio","transfer","ingresso","pacote"]
          .includes(s.service_type) ? s.service_type : "outros") as InvoiceServiceCategory,
        description: s.title || s.description || s.service_type,
        fare: Number(s.price || 0),
        taxes: 0, discount: 0, commission: 0, rav: 0,
      })));
    }
    toast({ title: "Dados importados da carteira" });
  };

  const handleSubmit = async () => {
    if (!client.client_name.trim()) {
      toast({ title: "Informe o nome do cliente", variant: "destructive" });
      return;
    }
    if (!services.length) {
      toast({ title: "Adicione ao menos um serviço", variant: "destructive" });
      return;
    }
    const input: CreateInvoiceInput = {
      ...client,
      destination: trip.destination || null,
      travel_start: trip.travel_start || null,
      travel_end: trip.travel_end || null,
      issue_date: meta.issue_date,
      due_date: meta.due_date || null,
      notes: meta.notes || null,
      pix_key: meta.pix_key || null,
      status: "draft",
      services,
      installments: installments.length ? installments : undefined,
    };
    await createInvoice.mutateAsync(input);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="origem">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="origem">Origem</TabsTrigger>
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>

          <TabsContent value="origem" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Crie manualmente ou importe os dados de outro módulo.
            </p>
            <div>
              <Label>Importar de um Orçamento</Label>
              <Select onValueChange={handleImportFromQuote}>
                <SelectTrigger><SelectValue placeholder="Escolha um orçamento" /></SelectTrigger>
                <SelectContent>
                  {(quotes || []).slice(0, 50).map((q: any) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title || q.destination || "Orçamento"} — {q.client_name || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ImportTripPicker onPick={handleImportFromTrip} />
            <ImportOpportunityPicker
              onPick={async (oppId: string) => {
                const { data: op } = await supabase
                  .from("opportunities")
                  .select("*, clients(name, email, phone, document, company)")
                  .eq("id", oppId).maybeSingle();
                if (!op) { toast({ title: "Oportunidade não encontrada", variant: "destructive" }); return; }
                const c = (op as any).clients || {};
                setClient((prev) => ({
                  ...prev,
                  client_name: c.name || prev.client_name,
                  client_email: c.email || prev.client_email,
                  client_phone: c.phone || prev.client_phone,
                  client_document: c.document || prev.client_document,
                  client_company: c.company || prev.client_company,
                }));
                setTrip({
                  destination: (op as any).destination ?? "",
                  travel_start: (op as any).start_date ?? "",
                  travel_end: (op as any).end_date ?? "",
                });
                setServices([{
                  category: "pacote",
                  description: `Pacote - ${(op as any).destination}`,
                  fare: Number((op as any).estimated_value || 0),
                  taxes: 0, discount: 0, commission: 0, rav: 0,
                }]);
                toast({ title: "Dados importados da oportunidade" });
              }}
            />
          </TabsContent>

          <TabsContent value="cliente" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome *</Label>
                <Input value={client.client_name} onChange={e => setClient({ ...client, client_name: e.target.value })} />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input value={client.client_company} onChange={e => setClient({ ...client, client_company: e.target.value })} />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={client.client_document} onChange={e => setClient({ ...client, client_document: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={client.client_email} onChange={e => setClient({ ...client, client_email: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={client.client_phone} onChange={e => setClient({ ...client, client_phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <Label>Destino</Label>
                <Input value={trip.destination} onChange={e => setTrip({ ...trip, destination: e.target.value })} />
              </div>
              <div>
                <Label>Data início</Label>
                <Input type="date" value={trip.travel_start} onChange={e => setTrip({ ...trip, travel_start: e.target.value })} />
              </div>
              <div>
                <Label>Data fim</Label>
                <Input type="date" value={trip.travel_end} onChange={e => setTrip({ ...trip, travel_end: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="servicos" className="space-y-3 pt-4">
            {services.map((s, i) => {
              const t = computeServiceTotals(s);
              return (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs">Categoria</Label>
                      <Select value={s.category} onValueChange={v => patchService(i, { category: v as InvoiceServiceCategory })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(INVOICE_SERVICE_CATEGORIES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-8">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={s.description || ""} onChange={e => patchService(i, { description: e.target.value })} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeService(i)} className="col-span-1">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {(["fare","taxes","discount","commission","rav"] as const).map(k => (
                      <div key={k}>
                        <Label className="text-xs capitalize">{
                          k === "fare" ? "Tarifa" :
                          k === "taxes" ? "Taxas" :
                          k === "discount" ? "Desconto" :
                          k === "commission" ? "Comissão" : "RAV"
                        }</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(s as any)[k] || 0}
                          onChange={e => patchService(i, { [k]: Number(e.target.value) } as any)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Líquido: <b>{fmt(t.net_amount)}</b> &nbsp;•&nbsp;
                    Final: <b className="text-foreground">{fmt(t.final_amount)}</b>
                  </div>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addService}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar serviço
            </Button>

            <div className="border-t pt-3 mt-3 space-y-1 text-sm">
              <Row label="Subtotal" value={fmt(totals.subtotal)} />
              <Row label="Taxas" value={fmt(totals.taxes_total)} />
              <Row label="Descontos" value={`- ${fmt(totals.discount_total)}`} />
              <Row label="Comissão" value={fmt(totals.commission_total)} muted />
              <Row label="RAV" value={fmt(totals.rav_total)} muted />
              <div className="border-t pt-2" />
              <Row label="Valor total" value={fmt(totals.total_amount)} highlight />
              <Row label="Lucro estimado" value={fmt(totals.estimated_profit)} muted />
            </div>
          </TabsContent>

          <TabsContent value="parcelas" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Deixe em branco para pagamento único. Adicione parcelas para parcelamento.
            </p>
            {installments.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label className="text-xs">Rótulo</Label>
                  <Input value={p.label} onChange={e => {
                    const arr = [...installments]; arr[i].label = e.target.value; setInstallments(arr);
                  }} />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Valor</Label>
                  <Input type="number" step="0.01" value={p.amount} onChange={e => {
                    const arr = [...installments]; arr[i].amount = Number(e.target.value); setInstallments(arr);
                  }} />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Vencimento</Label>
                  <Input type="date" value={p.due_date} onChange={e => {
                    const arr = [...installments]; arr[i].due_date = e.target.value; setInstallments(arr);
                  }} />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeInstallment(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addInstallment}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar parcela
            </Button>
            {installments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Soma das parcelas: <b>{fmt(installments.reduce((s, p) => s + (p.amount || 0), 0))}</b> /
                Total da fatura: <b>{fmt(totals.total_amount)}</b>
              </p>
            )}
          </TabsContent>

          <TabsContent value="info" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de emissão</Label>
                <Input type="date" value={meta.issue_date} onChange={e => setMeta({ ...meta, issue_date: e.target.value })} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={meta.due_date} onChange={e => setMeta({ ...meta, due_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Chave PIX (opcional)</Label>
                <Input value={meta.pix_key} onChange={e => setMeta({ ...meta, pix_key: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea rows={4} value={meta.notes} onChange={e => setMeta({ ...meta, notes: e.target.value })} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? "Salvando..." : "Criar fatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${highlight ? "text-base font-bold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function ImportTripPicker({ onPick }: { onPick: (id: string) => void }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[] | null>(null);
  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("trips").select("id, trip_title, client_name, destination")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setTrips(data || []);
  };
  return (
    <div className="pt-2">
      <Label>Importar de uma Carteira Digital</Label>
      <Select onOpenChange={(o) => o && trips === null && load()} onValueChange={onPick}>
        <SelectTrigger><SelectValue placeholder="Escolha uma carteira" /></SelectTrigger>
        <SelectContent>
          {(trips || []).map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.trip_title || t.destination || "Carteira"} — {t.client_name || ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}