import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { Briefcase, Calendar, CheckCircle2, Kanban, Plus, RotateCcw, Sparkles, Users, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { STAGE_LABELS, STAGE_COLORS, STAGE_BG_COLORS, CLIENT_STATUS_LABELS, type OpportunityStage, type ClientStatus } from "@/types/crm";
import { OPERATION_STAGES, STAGE_CHECKLISTS, type OperationStage } from "@/types/operations";

/**
 * Demonstração pública do CRM. Tudo vive apenas em memória neste navegador:
 * nenhuma leitura/escrita no backend. Recarregar restaura o cenário inicial.
 */

const FUNNEL: OpportunityStage[] = ["new_contact", "in_service", "quote_creating", "quote_sent", "negotiation", "follow_up", "closed", "lost"];

type DemoClient = { id: string; name: string; phone: string; email: string; city: string; status: ClientStatus; referred_by?: string };
type DemoOpp = { id: string; clientId: string; destination: string; pax: number; value: number; start: string; stage: OpportunityStage };
type DemoOp = { id: string; clientId: string; title: string; pax: number; value: number; start: string; stage: OperationStage; done: string[] };

const initialClients = (): DemoClient[] => [
  { id: "c1", name: "Roberta Mendes", phone: "(11) 98888-1020", email: "roberta@exemplo.com", city: "São Paulo/SP", status: "lead" },
  { id: "c2", name: "Lucas e Mariana Prado", phone: "(21) 97777-3344", email: "lucas@exemplo.com", city: "Rio de Janeiro/RJ", status: "em_negociacao", referred_by: "Roberta Mendes" },
  { id: "c3", name: "Carlos Eduardo Lima", phone: "(31) 96666-5566", email: "carlos@exemplo.com", city: "Belo Horizonte/MG", status: "em_negociacao" },
  { id: "c4", name: "Família Silveira", phone: "(51) 95555-7788", email: "silveira@exemplo.com", city: "Porto Alegre/RS", status: "cliente_ativo" },
  { id: "c5", name: "Patrícia Oliveira", phone: "(41) 94444-9900", email: "patricia@exemplo.com", city: "Curitiba/PR", status: "fidelizado" },
];
const initialOpps = (): DemoOpp[] => [
  { id: "o1", clientId: "c1", destination: "Orlando em Família", pax: 4, value: 38500, start: "2027-07-10", stage: "new_contact" },
  { id: "o2", clientId: "c2", destination: "Lua de Mel Maldivas", pax: 2, value: 42000, start: "2027-03-02", stage: "in_service" },
  { id: "o3", clientId: "c3", destination: "Rota dos Vinhos Portugal", pax: 2, value: 28900, start: "2027-05-15", stage: "quote_creating" },
  { id: "o4", clientId: "c4", destination: "Férias Serra Gaúcha", pax: 5, value: 16800, start: "2026-12-20", stage: "quote_sent" },
  { id: "o5", clientId: "c5", destination: "Cruzeiro pelo Caribe", pax: 2, value: 24500, start: "2027-01-08", stage: "negotiation" },
  { id: "o6", clientId: "c3", destination: "Buenos Aires Gastronômico", pax: 2, value: 9800, start: "2026-11-12", stage: "follow_up" },
];
const initialOps = (): DemoOp[] => [
  { id: "p1", clientId: "c5", title: "Paris e Londres", pax: 2, value: 32000, start: "2026-11-03", stage: "documentacao", done: ["Passaporte"] },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("pt-BR"); };
let seq = 100;
const nid = (p: string) => `${p}${++seq}`;

function Column({ id, title, color, bg, count, children }: { id: string; title: string; color: string; bg: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex w-72 shrink-0 flex-col rounded-xl border ${bg} ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className={`h-1.5 rounded-t-xl ${color}`} />
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="flex min-h-[120px] flex-col gap-2 px-2 pb-3">{children}</div>
    </div>
  );
}

function DraggableCard({ id, children, onClick }: { id: string; children: React.ReactNode; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick}
      className={`cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${isDragging ? "z-50 opacity-80 shadow-lg" : ""}`}>
      {children}
    </div>
  );
}

export default function DemonstracaoCrm() {
  const [clients, setClients] = useState(initialClients);
  const [opps, setOpps] = useState(initialOpps);
  const [ops, setOps] = useState(initialOps);
  const [tab, setTab] = useState("funil");
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [highlightOp, setHighlightOp] = useState<string | null>(null);
  const [oppOpen, setOppOpen] = useState(false);
  const [clientModal, setClientModal] = useState<DemoClient | "new" | null>(null);
  const [opDetail, setOpDetail] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Demonstração do CRM | Agentes de Sonhos";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "Cliente";

  const reset = () => { setClients(initialClients()); setOpps(initialOpps()); setOps(initialOps()); setTab("funil"); toast.success("Demonstração reiniciada"); };

  const onFunnelDrop = (e: DragEndEvent) => {
    const to = e.over?.id as OpportunityStage | undefined;
    const opp = opps.find((o) => o.id === e.active.id);
    if (!to || !opp || opp.stage === to) return;
    setOpps((list) => list.map((o) => (o.id === opp.id ? { ...o, stage: to } : o)));
    if (to === "closed") {
      const opId = nid("p");
      setOps((list) => [{ id: opId, clientId: opp.clientId, title: opp.destination, pax: opp.pax, value: opp.value, start: opp.start, stage: "venda_confirmada", done: [] }, ...list]);
      setClients((list) => list.map((c) => (c.id === opp.clientId ? { ...c, status: "cliente_ativo" } : c)));
      setCelebrate(opp.destination);
      setTimeout(() => { setCelebrate(null); setTab("operacoes"); setHighlightOp(opId); setTimeout(() => setHighlightOp(null), 3000); }, 1800);
    }
  };

  const onOpsDrop = (e: DragEndEvent) => {
    const to = e.over?.id as OperationStage | undefined;
    if (!to) return;
    setOps((list) => list.map((o) => (o.id === e.active.id ? { ...o, stage: to } : o)));
  };

  const totalFunnel = useMemo(() => opps.filter((o) => !["closed", "lost"].includes(o.stage)).reduce((s, o) => s + o.value, 0), [opps]);
  const currentOp = ops.find((o) => o.id === opDetail);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
          <Badge className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/10"><span className="h-2 w-2 rounded-full bg-primary" />Ambiente de demonstração</Badge>
          <p className="hidden text-sm text-muted-foreground md:block">Fique à vontade: nada é salvo. Ao sair ou reiniciar, tudo volta ao modelo.</p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Reiniciar</Button>
            <Button size="sm" asChild><a href="/planos">Quero usar na minha agência</a></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-foreground">Gestão de Clientes</h1>
          <p className="text-sm text-muted-foreground">Arraste um card até <strong>Fechado</strong> e veja a viagem seguir para Operações.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="funil" className="gap-1.5"><Kanban className="h-4 w-4" />Oportunidades</TabsTrigger>
            <TabsTrigger value="operacoes" className="gap-1.5"><Briefcase className="h-4 w-4" />Operações <Badge variant="secondary" className="ml-1">{ops.length}</Badge></TabsTrigger>
            <TabsTrigger value="clientes" className="gap-1.5"><Users className="h-4 w-4" />Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="funil">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Em andamento: <strong className="text-foreground">{brl(totalFunnel)}</strong></span>
              <Button onClick={() => setOppOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Nova oportunidade</Button>
            </div>
            <DndContext sensors={sensors} onDragEnd={onFunnelDrop}>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {FUNNEL.map((st) => {
                  const items = opps.filter((o) => o.stage === st);
                  return (
                    <Column key={st} id={st} title={STAGE_LABELS[st]} color={STAGE_COLORS[st]} bg={STAGE_BG_COLORS[st]} count={items.length}>
                      {items.map((o) => {
                        const c = clients.find((x) => x.id === o.clientId);
                        return (
                          <DraggableCard key={o.id} id={o.id}>
                            {c?.referred_by && <Badge variant="outline" className="mb-1 gap-1 text-[10px]"><UserPlus className="h-3 w-3" />Indicado por {c.referred_by}</Badge>}
                            <p className="font-semibold text-foreground">{c?.name}</p>
                            <p className="text-sm text-muted-foreground">{o.destination}</p>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{o.pax} pax · {fmtDate(o.start)}</span>
                              <span className="font-semibold text-foreground">{brl(o.value)}</span>
                            </div>
                          </DraggableCard>
                        );
                      })}
                    </Column>
                  );
                })}
              </div>
            </DndContext>
          </TabsContent>

          <TabsContent value="operacoes">
            <DndContext sensors={sensors} onDragEnd={onOpsDrop}>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {OPERATION_STAGES.map((st) => {
                  const items = ops.filter((o) => o.stage === st.key);
                  return (
                    <Column key={st.key} id={st.key} title={st.label} color={st.color} bg={st.bg} count={items.length}>
                      {items.map((o) => {
                        const list = STAGE_CHECKLISTS[o.stage] ?? [];
                        const done = list.filter((l) => o.done.includes(l)).length;
                        return (
                          <DraggableCard key={o.id} id={o.id} onClick={() => setOpDetail(o.id)}>
                            <div className={highlightOp === o.id ? "animate-pulse" : ""}>
                              {highlightOp === o.id && <Badge className="mb-1">Nova operação</Badge>}
                              <p className="font-semibold text-foreground">{o.title}</p>
                              <p className="text-sm text-muted-foreground">{clientName(o.clientId)}</p>
                              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(o.start)}</span>
                                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{done}/{list.length}</span>
                              </div>
                            </div>
                          </DraggableCard>
                        );
                      })}
                    </Column>
                  );
                })}
              </div>
            </DndContext>
          </TabsContent>

          <TabsContent value="clientes">
            <div className="mb-3 flex justify-end"><Button onClick={() => setClientModal("new")}><Plus className="mr-1.5 h-4 w-4" />Novo cliente</Button></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clients.map((c) => (
                <button key={c.id} onClick={() => setClientModal(c)} className="rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <Badge variant="secondary">{CLIENT_STATUS_LABELS[c.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.phone} · {c.city}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{opps.filter((o) => o.clientId === c.id).length} oportunidade(s)</p>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-2xl border bg-card p-8 text-center shadow-xl animate-in zoom-in-95">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
            <p className="text-xl font-bold text-foreground">Venda fechada!</p>
            <p className="mt-1 text-muted-foreground">{celebrate} segue agora para Operações…</p>
          </div>
        </div>
      )}

      <NewOppDialog open={oppOpen} onOpenChange={setOppOpen} clients={clients}
        onSave={(o, newClient) => {
          if (newClient) setClients((l) => [...l, newClient]);
          setOpps((l) => [...l, o]);
          toast.success("Oportunidade criada em Novo Contato");
        }} />

      <ClientDialog client={clientModal} onClose={() => setClientModal(null)}
        onSave={(c) => { setClients((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c])); toast.success("Cliente salvo (somente nesta demonstração)"); }} />

      <Dialog open={!!currentOp} onOpenChange={(v) => !v && setOpDetail(null)}>
        <DialogContent className="max-w-md">
          {currentOp && (
            <>
              <DialogHeader><DialogTitle>{currentOp.title}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">{clientName(currentOp.clientId)} · {currentOp.pax} pax · {brl(currentOp.value)}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{OPERATION_STAGES.find((s) => s.key === currentOp.stage)?.label}</p>
              <div className="space-y-2">
                {(STAGE_CHECKLISTS[currentOp.stage] ?? []).map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={currentOp.done.includes(item)} onCheckedChange={(v) => setOps((l) => l.map((o) => o.id === currentOp.id ? { ...o, done: v ? [...o.done, item] : o.done.filter((d) => d !== item) } : o))} />
                    {item}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Arraste o card para a próxima etapa quando concluir.</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewOppDialog({ open, onOpenChange, clients, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; clients: DemoClient[]; onSave: (o: DemoOpp, c?: DemoClient) => void }) {
  const [clientName, setClientName] = useState("");
  const [destination, setDestination] = useState("");
  const [pax, setPax] = useState("2");
  const [value, setValue] = useState("");
  const [start, setStart] = useState("");
  const fillExample = () => { setClientName("Ana Beatriz Costa"); setDestination("Japão na Primavera"); setPax("2"); setValue("36000"); setStart("2027-04-01"); };
  const save = () => {
    if (!clientName.trim() || !destination.trim()) { toast.error("Informe o cliente e o destino"); return; }
    const existing = clients.find((c) => c.name.toLowerCase() === clientName.trim().toLowerCase());
    const client = existing ?? { id: nid("c"), name: clientName.trim(), phone: "", email: "", city: "", status: "lead" as ClientStatus };
    onSave({ id: nid("o"), clientId: client.id, destination: destination.trim(), pax: Number(pax) || 1, value: Number(value) || 0, start: start || "2027-01-15", stage: "new_contact" }, existing ? undefined : client);
    setClientName(""); setDestination(""); setValue(""); setStart(""); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>
        <Button variant="outline" size="sm" onClick={fillExample} className="w-fit"><Sparkles className="mr-1.5 h-4 w-4" />Preencher com exemplo</Button>
        <div className="space-y-3">
          <div><Label>Cliente</Label><Input list="demo-clients" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
            <datalist id="demo-clients">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist></div>
          <div><Label>Destino</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Passageiros</Label><Input type="number" min={1} value={pax} onChange={(e) => setPax(e.target.value)} /></div>
            <div className="col-span-2"><Label>Valor estimado (R$)</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          </div>
          <div><Label>Data de embarque</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientDialog({ client, onClose, onSave }: { client: DemoClient | "new" | null; onClose: () => void; onSave: (c: DemoClient) => void }) {
  const [form, setForm] = useState<DemoClient | null>(null);
  useEffect(() => {
    if (client === "new") setForm({ id: nid("c"), name: "", phone: "", email: "", city: "", status: "lead" });
    else setForm(client);
  }, [client]);
  if (!form) return null;
  const set = (k: keyof DemoClient, v: string) => setForm({ ...form, [k]: v });
  return (
    <Dialog open={!!client} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{client === "new" ? "Novo cliente" : "Editar cliente"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="dados">Dados Cadastrais</TabsTrigger><TabsTrigger value="docs">Documentos & Vistos</TabsTrigger></TabsList>
          <TabsContent value="dados" className="space-y-3 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Nome Completo</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><Label>Indicado por</Label><Input value={form.referred_by ?? ""} onChange={(e) => set("referred_by", e.target.value)} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>CPF</Label><Input placeholder="000.000.000-00" /></div>
              <div><Label>Nº do Passaporte</Label><Input /></div>
              <div><Label>Validade do Passaporte</Label><Input type="date" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>E-mail</Label><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
              <div><Label>Status</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {Object.entries(CLIENT_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
            </div>
          </TabsContent>
          <TabsContent value="docs" className="space-y-3 pt-3">
            {["Vistos", "Documentos"].map((t) => (
              <div key={t} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">{t} (0)</span>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Na versão completa você anexa e acompanha os vencimentos aqui.")}><Plus className="mr-1 h-4 w-4" />{t === "Vistos" ? "Adicionar visto" : "Enviar documento"}</Button></div>
                <p className="mt-3 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">{t === "Vistos" ? "Vistos com alerta automático de vencimento." : "Passaporte, RG, vacinas e outros (PDF, PNG, JPG)."}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
        <DialogFooter><Button variant="outline" onClick={onClose}><X className="mr-1 h-4 w-4" />Cancelar</Button>
          <Button onClick={() => { if (!form.name.trim()) { toast.error("Informe o nome"); return; } onSave(form); onClose(); }}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
