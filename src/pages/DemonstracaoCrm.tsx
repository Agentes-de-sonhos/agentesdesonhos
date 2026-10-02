import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import {
  ArrowLeft, Briefcase, Cake, Calendar, CheckCircle2, ClipboardList, Clock, DollarSign, Download, Edit2, Eye, FileText,
  History, Kanban, LayoutDashboard, ListChecks, Luggage, Mail, MapPin, MessageSquare, MoreVertical, Paperclip, Pencil,
  Phone, Plane, Plus, RotateCcw, Search, Sparkles, Tag, Target, Trash2, TrendingUp, Upload, UserPlus, Users, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientAvatar } from "@/components/shared/ClientAvatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fireCelebrationConfetti } from "@/lib/celebrationConfetti";
import { STAGE_LABELS, STAGE_COLORS, STAGE_BG_COLORS, CLIENT_STATUS_LABELS, type OpportunityStage, type ClientStatus } from "@/types/crm";
import { OPERATION_STAGES, STAGE_CHECKLISTS, type OperationStage } from "@/types/operations";

/**
 * Demonstração pública da Gestão de Relacionamento com Clientes.
 * Reproduz as telas reais com dados fictícios em memória: nenhuma leitura
 * ou escrita no backend. Recarregar ou "Reiniciar" restaura o cenário.
 */

const FUNNEL: OpportunityStage[] = ["new_contact", "in_service", "quote_creating", "quote_sent", "negotiation", "follow_up", "closed", "lost"];
const DAY = 86400000;
const now = Date.now();

type Traveler = { name: string; birth: string; passport: string; validity: string };
type Trip = { destination: string; date: string; value: number };
type DemoClient = {
  id: string; name: string; phone: string; email: string; city: string; status: ClientStatus; referred_by?: string;
  cpf?: string; passport?: string; passportValidity?: string; birthday?: string; preferences?: string; notes?: string;
  lastInteraction: number; travelers: Traveler[]; trips: Trip[]; quotes: { destination: string; value: number; sent: boolean }[];
};
type Note = { text: string; at: number };
type DemoOpp = {
  id: string; clientId: string; destination: string; adults: number; children: number; value: number; start: string; end: string;
  stage: OpportunityStage; enteredAt: number; labels: string[]; notes: Note[]; history: { to: string; at: number }[]; followUp?: string;
};
type DemoOp = {
  id: string; clientId: string; title: string; pax: number; value: number; start: string; end: string; stage: OperationStage;
  priority: "normal" | "alta" | "urgente"; payment: "pendente" | "parcial" | "pago"; done: string[]; timeline: { text: string; at: number }[];
  notes: Note[]; isNew?: boolean;
};

const LABELS: Record<string, string> = { VIP: "#7c3aed", "Lua de mel": "#e11d48", Família: "#0284c7", Grupo: "#059669", Urgente: "#dc2626" };

const initialClients = (): DemoClient[] => [
  { id: "c1", name: "Roberta Mendes", phone: "(11) 98888-1020", email: "roberta.mendes@exemplo.com", city: "São Paulo, SP", status: "lead", birthday: "12/03",
    preferences: "Prefere resorts com kids club e voos diretos.", lastInteraction: now - 2 * 3600000,
    travelers: [{ name: "Roberta Mendes", birth: "12/03/1986", passport: "FX123456", validity: "10/08/2029" }, { name: "Theo Mendes", birth: "05/06/2016", passport: "FX654321", validity: "18/02/2027" }],
    trips: [], quotes: [{ destination: "Orlando em Família", value: 38500, sent: false }] },
  { id: "c2", name: "Lucas e Mariana Prado", phone: "(21) 97777-3344", email: "lucas.prado@exemplo.com", city: "Rio de Janeiro, RJ", status: "em_negociacao", referred_by: "Roberta Mendes",
    cpf: "123.456.789-00", passport: "GA908172", passportValidity: "2031-04-20", preferences: "Lua de mel. Bangalô sobre a água.", lastInteraction: now - DAY,
    travelers: [{ name: "Lucas Prado", birth: "22/09/1993", passport: "GA908172", validity: "20/04/2031" }, { name: "Mariana Prado", birth: "14/01/1995", passport: "GA908173", validity: "20/04/2031" }],
    trips: [], quotes: [] },
  { id: "c3", name: "Carlos Eduardo Lima", phone: "(31) 96666-5566", email: "carlos.lima@exemplo.com", city: "Belo Horizonte, MG", status: "em_negociacao", lastInteraction: now - 3 * DAY,
    preferences: "Enoturismo, hotéis boutique.", travelers: [{ name: "Carlos Eduardo Lima", birth: "02/11/1978", passport: "FH443322", validity: "01/12/2026" }],
    trips: [{ destination: "Mendoza", date: "2025-05-10", value: 14200 }], quotes: [{ destination: "Rota dos Vinhos Portugal", value: 28900, sent: false }] },
  { id: "c4", name: "Família Silveira", phone: "(51) 95555-7788", email: "silveira@exemplo.com", city: "Porto Alegre, RS", status: "cliente_ativo", lastInteraction: now - 5 * DAY,
    travelers: [{ name: "André Silveira", birth: "30/07/1980", passport: "—", validity: "—" }], trips: [{ destination: "Gramado", date: "2025-07-15", value: 9800 }],
    quotes: [{ destination: "Férias Serra Gaúcha", value: 16800, sent: true }] },
  { id: "c5", name: "Patrícia Oliveira", phone: "(41) 94444-9900", email: "patricia.oliveira@exemplo.com", city: "Curitiba, PR", status: "fidelizado", birthday: "08/10",
    lastInteraction: now - 7 * DAY, travelers: [{ name: "Patrícia Oliveira", birth: "08/10/1975", passport: "FP112233", validity: "15/03/2030" }],
    trips: [{ destination: "Lisboa e Porto", date: "2024-09-02", value: 21500 }, { destination: "Nova York", date: "2025-12-01", value: 26700 }],
    quotes: [{ destination: "Cruzeiro pelo Caribe", value: 24500, sent: true }] },
];

const opp = (o: Omit<DemoOpp, "notes" | "history" | "labels"> & Partial<DemoOpp>): DemoOpp => ({ labels: [], notes: [], history: [{ to: o.stage, at: o.enteredAt }], ...o });
const initialOpps = (): DemoOpp[] => [
  opp({ id: "o1", clientId: "c1", destination: "Orlando em Família", adults: 2, children: 2, value: 38500, start: "2027-07-10", end: "2027-07-22", stage: "new_contact", enteredAt: now - 2 * 3600000, labels: ["Família"] }),
  opp({ id: "o2", clientId: "c2", destination: "Lua de Mel Maldivas", adults: 2, children: 0, value: 42000, start: "2027-03-02", end: "2027-03-12", stage: "in_service", enteredAt: now - DAY, labels: ["Lua de mel", "VIP"], notes: [{ text: "Querem bangalô sobre a água e traslado em hidroavião.", at: now - DAY }] }),
  opp({ id: "o3", clientId: "c3", destination: "Rota dos Vinhos Portugal", adults: 2, children: 0, value: 28900, start: "2027-05-15", end: "2027-05-25", stage: "quote_creating", enteredAt: now - 3 * DAY }),
  opp({ id: "o4", clientId: "c4", destination: "Férias Serra Gaúcha", adults: 3, children: 2, value: 16800, start: "2026-12-20", end: "2026-12-27", stage: "quote_sent", enteredAt: now - 4 * DAY, labels: ["Família"] }),
  opp({ id: "o5", clientId: "c5", destination: "Cruzeiro pelo Caribe", adults: 2, children: 0, value: 24500, start: "2027-01-08", end: "2027-01-15", stage: "negotiation", enteredAt: now - 6 * DAY, labels: ["VIP"] }),
  opp({ id: "o6", clientId: "c3", destination: "Buenos Aires Gastronômico", adults: 2, children: 0, value: 9800, start: "2026-11-12", end: "2026-11-16", stage: "follow_up", enteredAt: now - 9 * DAY, followUp: "2026-09-28" }),
];
const initialOps = (): DemoOp[] => [
  { id: "p1", clientId: "c5", title: "Paris e Londres", pax: 2, value: 32000, start: "2026-11-03", end: "2026-11-15", stage: "documentacao", priority: "alta", payment: "pago",
    done: ["Passaporte"], timeline: [{ text: "Venda confirmada", at: now - 20 * DAY }, { text: "Aéreo emitido", at: now - 15 * DAY }, { text: "Movida para Documentação", at: now - 6 * DAY }], notes: [] },
  { id: "p2", clientId: "c4", title: "Gramado Natal Luz", pax: 4, value: 12400, start: "2026-12-05", end: "2026-12-10", stage: "emissao_reservas", priority: "normal", payment: "parcial",
    done: ["Hotel confirmado"], timeline: [{ text: "Venda confirmada", at: now - 10 * DAY }], notes: [] },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDate = (s: string) => parse(s).toLocaleDateString("pt-BR");
const fmtShort = (s: string) => parse(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const ago = (t: number) => { const h = Math.max(1, Math.round((now - t) / 3600000)); return h < 24 ? `${h}h` : `${Math.round(h / 24)} dia${Math.round(h / 24) > 1 ? "s" : ""}`; };
const fmtTime = (t: number) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
let seq = 100;
const nid = (p: string) => `${p}${++seq}`;
const demoOnly = (what: string) => toast.info(`${what} — disponível na versão completa.`);

const STATUS_TONE: Record<ClientStatus, string> = {
  lead: "bg-blue-50 text-blue-700 ring-blue-200/70", em_negociacao: "bg-amber-50 text-amber-700 ring-amber-200/70",
  cliente_ativo: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", fidelizado: "bg-purple-50 text-purple-700 ring-purple-200/70",
};
function StatusPill({ status }: { status: ClientStatus }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", STATUS_TONE[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{CLIENT_STATUS_LABELS[status]}</span>;
}

function Column({ id, title, color, bg, count, total, children }: { id: string; title: string; color: string; bg: string; count: number; total?: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("flex w-[290px] shrink-0 flex-col rounded-xl border", bg, isOver && "ring-2 ring-primary")}>
      <div className={cn("h-1.5 rounded-t-xl", color)} />
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between"><span className="text-sm font-semibold text-foreground">{title}</span><Badge variant="secondary" className="text-[11px]">{count}</Badge></div>
        {total !== undefined && <p className="mt-0.5 text-xs text-muted-foreground">{brl(total)}</p>}
      </div>
      <div className="flex min-h-[140px] flex-col gap-2 px-2 pb-3">{children}</div>
    </div>
  );
}

function Draggable({ id, children, onClick }: { id: string; children: React.ReactNode; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined} {...listeners} {...attributes} onClick={onClick}
      className={cn("cursor-grab rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing", isDragging && "relative z-50 opacity-90 shadow-lg")}>
      {children}
    </div>
  );
}

function LabelChips({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return <div className="mb-2 flex flex-wrap gap-1">{labels.map((l) => <span key={l} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary-foreground" style={{ backgroundColor: LABELS[l] }}>{l}</span>)}</div>;
}

export default function DemonstracaoCrm() {
  const [clients, setClients] = useState(initialClients);
  const [opps, setOpps] = useState(initialOpps);
  const [ops, setOps] = useState(initialOps);
  const [tab, setTab] = useState("clientes");
  const [search, setSearch] = useState("");
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<DemoClient | "new" | null>(null);
  const [oppForm, setOppForm] = useState<{ clientId?: string; edit?: DemoOpp } | null>(null);
  const [oppDialog, setOppDialog] = useState<{ id: string; kind: "notes" | "labels" | "history" } | null>(null);
  const [opDetail, setOpDetail] = useState<{ id: string; tab: string } | null>(null);
  const [contactView, setContactView] = useState<"pessoas" | "empresas" | "documentos">("pessoas");

  useEffect(() => {
    document.title = "Demonstração | Gestão de Relacionamento com Clientes";
    const meta = document.createElement("meta"); meta.name = "robots"; meta.content = "noindex";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));
  const client = (id: string) => clients.find((c) => c.id === id);
  const q = search.trim().toLowerCase();

  const reset = () => { setClients(initialClients()); setOpps(initialOpps()); setOps(initialOps()); setTab("clientes"); setProfileId(null); toast.success("Demonstração reiniciada"); };

  const moveOpp = (id: string, to: OpportunityStage) => {
    const o = opps.find((x) => x.id === id);
    if (!o || o.stage === to) return;
    setOpps((l) => l.map((x) => x.id === id ? { ...x, stage: to, enteredAt: Date.now(), history: [...x.history, { to, at: Date.now() }] } : x));
    if (to === "closed") {
      const opId = nid("p");
      setOps((l) => [{ id: opId, clientId: o.clientId, title: o.destination, pax: o.adults + o.children, value: o.value, start: o.start, end: o.end, stage: "venda_confirmada",
        priority: "normal", payment: "pendente", done: [], timeline: [{ text: "Operação criada a partir da oportunidade fechada", at: Date.now() }], notes: [], isNew: true }, ...l]);
      setClients((l) => l.map((c) => c.id === o.clientId ? { ...c, status: "cliente_ativo", trips: [...c.trips, { destination: o.destination, date: o.start, value: o.value }] } : c));
      setCelebrate(o.destination);
      try { fireCelebrationConfetti(); } catch { /* opcional */ }
      setTimeout(() => { setCelebrate(null); setTab("operacoes"); setSearch(""); }, 2200);
      setTimeout(() => setOps((l) => l.map((x) => x.id === opId ? { ...x, isNew: false } : x)), 7000);
    } else toast.success(`Movida para ${STAGE_LABELS[to]}`);
  };
  const moveOp = (id: string, to: OperationStage) => {
    setOps((l) => l.map((x) => x.id === id && x.stage !== to ? { ...x, stage: to, timeline: [...x.timeline, { text: `Movida para ${OPERATION_STAGES.find((s) => s.key === to)?.label}`, at: Date.now() }] } : x));
  };

  const filteredClients = clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.includes(q) || c.phone.includes(q));
  const filteredOpps = opps.filter((o) => !q || o.destination.toLowerCase().includes(q) || client(o.clientId)?.name.toLowerCase().includes(q));
  const filteredOps = ops.filter((o) => !q || o.title.toLowerCase().includes(q) || client(o.clientId)?.name.toLowerCase().includes(q));
  const profile = profileId ? client(profileId) : undefined;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-4 py-2.5">
          <Badge className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/10"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Ambiente de demonstração</Badge>
          <p className="hidden text-xs text-muted-foreground md:block">Experimente à vontade: nada é salvo. Ao sair ou reiniciar, tudo volta ao modelo.</p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Reiniciar</Button>
            <Button size="sm" asChild><a href="/planos">Quero usar na minha agência</a></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setProfileId(null); }}>
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5"><Users className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Relacionamento com Clientes</h1>
              <p className="text-sm text-muted-foreground">Centralize clientes, oportunidades, operações e metas de vendas em um só lugar.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TabsList className="inline-flex w-max gap-0.5">
              <TabsTrigger value="clientes" className="gap-1.5 px-2.5 text-xs"><Users className="h-4 w-4" />Clientes</TabsTrigger>
              <TabsTrigger value="funil" className="gap-1.5 px-2.5 text-xs"><Kanban className="h-4 w-4" />Oportunidades</TabsTrigger>
              <TabsTrigger value="operacoes" className="gap-1.5 px-2.5 text-xs"><Briefcase className="h-4 w-4" />Operações</TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-1.5 px-2.5 text-xs"><LayoutDashboard className="h-4 w-4" />Visão Geral</TabsTrigger>
            </TabsList>
            {tab !== "dashboard" && !profile && (
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                <div className="relative w-full sm:w-[190px]">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
                </div>
                {tab === "clientes" && <>
                  <Button size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => setClientForm("new")}><Plus className="h-3.5 w-3.5" />Novo cliente</Button>
                  <Button size="sm" variant="outline" className="ml-auto h-8 gap-1.5 px-2.5 text-xs" onClick={() => demoOnly("Importar contatos")}><Upload className="h-3.5 w-3.5" />Importar</Button>
                </>}
                {tab === "funil" && <>
                  <Button size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => setOppForm({})}><Plus className="h-3.5 w-3.5" />Nova oportunidade</Button>
                  <Button size="sm" variant="outline" className="ml-auto h-8 gap-1.5 px-2.5 text-xs" onClick={() => demoOnly("Importar orçamento como oportunidade")}><Download className="h-3.5 w-3.5" />Importar orçamento</Button>
                </>}
                {tab === "operacoes" && <Button size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => demoOnly("Nova operação manual")}><Plus className="h-3.5 w-3.5" />Nova operação</Button>}
              </div>
            )}
          </div>

          {/* CLIENTES */}
          <TabsContent value="clientes" className="mt-4 space-y-4">
            {profile ? (
              <ClientProfileView c={profile} opps={opps.filter((o) => o.clientId === profile.id)} onBack={() => setProfileId(null)} onEdit={() => setClientForm(profile)}
                onNewOpp={() => { setOppForm({ clientId: profile.id }); }} />
            ) : (
              <>
                <div className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
                  {([["pessoas", "Pessoas"], ["empresas", "Empresas"], ["documentos", "Validade de documentos"]] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setContactView(k)} className={contactView === k ? "rounded-lg bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm" : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"}>{l}</button>
                  ))}
                </div>
                {contactView === "documentos" ? <DocumentRadar clients={clients} /> : contactView === "empresas" ? (
                  <Card className="rounded-2xl"><CardContent className="py-12 text-center text-sm text-muted-foreground">Cadastre empresas contratantes (PJ) e vincule colaboradores como viajantes.<div className="mt-3"><Button size="sm" variant="outline" onClick={() => demoOnly("Cadastro de empresas")}><Plus className="mr-1 h-4 w-4" />Nova empresa</Button></div></CardContent></Card>
                ) : (
                  <Card className="overflow-hidden rounded-2xl border-border/60">
                    <div className="hidden grid-cols-[1fr_140px_180px] items-center gap-6 border-b border-border/60 bg-muted/20 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
                      <div>Cliente</div><div>Status</div><div className="justify-self-end pr-1">Ações</div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {filteredClients.map((c) => (
                        <div key={c.id} onClick={() => setProfileId(c.id)} className="group grid cursor-pointer grid-cols-1 items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:grid-cols-[1fr_140px_180px] md:items-center md:gap-6 md:px-5">
                          <div className="flex min-w-0 items-start gap-3">
                            <ClientAvatar name={c.name} className="h-10 w-10" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-medium leading-5 text-foreground">{c.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{c.email}</span>
                                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{c.phone}</span>
                                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.city}</span>
                                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />há {ago(c.lastInteraction)}</span>
                              </div>
                            </div>
                          </div>
                          <div><StatusPill status={c.status} /></div>
                          <div className="flex items-center gap-0.5 md:justify-self-end" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar" onClick={() => setProfileId(c.id)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => setClientForm(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir" onClick={() => demoOnly("Excluir cliente")}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* OPORTUNIDADES */}
          <TabsContent value="funil" className="mt-4">
            <p className="mb-3 text-xs text-muted-foreground">Dica: arraste um card até <strong className="text-foreground">Fechado</strong> e veja a viagem seguir para Operações.</p>
            <DndContext sensors={sensors} onDragEnd={(e: DragEndEvent) => e.over && moveOpp(String(e.active.id), e.over.id as OpportunityStage)}>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {FUNNEL.map((st) => {
                  const items = filteredOpps.filter((o) => o.stage === st);
                  return (
                    <Column key={st} id={st} title={STAGE_LABELS[st]} color={STAGE_COLORS[st]} bg={STAGE_BG_COLORS[st]} count={items.length} total={items.reduce((s, o) => s + o.value, 0)}>
                      {items.map((o) => {
                        const c = client(o.clientId);
                        const overdue = o.followUp && parse(o.followUp).getTime() < now;
                        return (
                          <Draggable key={o.id} id={o.id}>
                            <LabelChips labels={o.labels} />
                            <div className="mb-2.5 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {c?.referred_by && <span className="mb-1 inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"><UserPlus className="h-3 w-3" /><span className="truncate">Indicado por {c.referred_by}</span></span>}
                                <p className="truncate text-sm font-bold leading-tight text-foreground">{c?.name}</p>
                                <div className="mt-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /><span className="truncate text-xs font-medium text-foreground/80">{o.destination}</span></div>
                              </div>
                              <OppMenu o={o} onMove={(s) => moveOpp(o.id, s)} onEdit={() => setOppForm({ edit: o })} onOpen={(kind) => setOppDialog({ id: o.id, kind })}
                                onDelete={() => { setOpps((l) => l.filter((x) => x.id !== o.id)); toast.success("Oportunidade excluída"); }} />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{fmtShort(o.start)} → {fmtShort(o.end)}</div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{o.adults} adulto{o.adults === 1 ? "" : "s"}{o.children > 0 && ` + ${o.children} criança${o.children === 1 ? "" : "s"}`}
                                  {overdue && <span title="Follow-up atrasado" className="ml-1 font-semibold text-destructive">⚠</span>}</div>
                                <span className="text-sm font-bold text-foreground">{brl(o.value)}</span>
                              </div>
                              <div className="flex items-center justify-between border-t border-border/50 pt-1.5 text-[11px] text-muted-foreground/80">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Há {ago(o.enteredAt)} nesta etapa</span>
                                {o.notes.length > 0 && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{o.notes.length}</span>}
                              </div>
                            </div>
                          </Draggable>
                        );
                      })}
                    </Column>
                  );
                })}
              </div>
            </DndContext>
          </TabsContent>

          {/* OPERAÇÕES */}
          <TabsContent value="operacoes" className="mt-4">
            <DndContext sensors={sensors} onDragEnd={(e: DragEndEvent) => e.over && moveOp(String(e.active.id), e.over.id as OperationStage)}>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {OPERATION_STAGES.map((st) => {
                  const items = filteredOps.filter((o) => o.stage === st.key);
                  return (
                    <Column key={st.key} id={st.key} title={st.label} color={st.color} bg={st.bg} count={items.length}>
                      {items.map((o) => {
                        const list = STAGE_CHECKLISTS[o.stage] ?? [];
                        const done = list.filter((l) => o.done.includes(l)).length;
                        const days = Math.ceil((parse(o.start).getTime() - now) / DAY);
                        return (
                          <Draggable key={o.id} id={o.id} onClick={() => setOpDetail({ id: o.id, tab: "overview" })}>
                            <div className={cn(o.isNew && "rounded-lg ring-2 ring-primary ring-offset-4 ring-offset-card")}>
                              {o.isNew && <Badge className="mb-2 gap-1"><Sparkles className="h-3 w-3" />Nova operação</Badge>}
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <h4 className="line-clamp-2 flex-1 text-sm font-semibold leading-tight">{o.title}</h4>
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                  {o.priority !== "normal" && <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">{o.priority === "urgente" ? "Urgente" : "Alta"}</Badge>}
                                  <OpMenu onOpen={(t) => setOpDetail({ id: o.id, tab: t })} onMove={(s) => moveOp(o.id, s)} />
                                </div>
                              </div>
                              <p className="mb-2 text-xs text-muted-foreground">{client(o.clientId)?.name}</p>
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtShort(o.start)} → {fmtShort(o.end)}</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{o.pax} pax</span>
                                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{brl(o.value)}</span>
                                <span className="flex items-center gap-1"><Plane className="h-3 w-3" />{days > 0 ? `Faltam ${days} dias` : "Em andamento"}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
                                <Badge variant="outline" className={cn("text-[10px]", o.payment === "pago" ? "border-emerald-300 text-emerald-700" : o.payment === "parcial" ? "border-amber-300 text-amber-700" : "border-slate-300 text-slate-600")}>
                                  {o.payment === "pago" ? "Pago" : o.payment === "parcial" ? "Pagamento parcial" : "Pagamento pendente"}</Badge>
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><ListChecks className="h-3 w-3" />{done}/{list.length}</span>
                              </div>
                            </div>
                          </Draggable>
                        );
                      })}
                    </Column>
                  );
                })}
              </div>
            </DndContext>
          </TabsContent>

          {/* VISÃO GERAL */}
          <TabsContent value="dashboard" className="mt-4"><Overview clients={clients} opps={opps} ops={ops} /></TabsContent>
        </Tabs>
      </main>

      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-2xl border bg-card p-8 text-center shadow-xl animate-in zoom-in-95">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
            <p className="text-xl font-bold text-foreground">Venda fechada! 🎉</p>
            <p className="mt-1 text-muted-foreground">"{celebrate}" agora segue para Operações.</p>
            <p className="mt-1 text-xs text-muted-foreground">O cliente passou a "Cliente Ativo" e a viagem entrou no histórico.</p>
          </div>
        </div>
      )}

      <OppFormDialog state={oppForm} clients={clients} onClose={() => setOppForm(null)}
        onSave={(o, isEdit) => {
          setOpps((l) => isEdit ? l.map((x) => x.id === o.id ? o : x) : [...l, o]);
          if (!isEdit) { setTab("funil"); setProfileId(null); }
          toast.success(isEdit ? "Oportunidade atualizada" : "Oportunidade criada em Novo Contato");
        }} />

      <ClientFormDialog state={clientForm} onClose={() => setClientForm(null)}
        onSave={(c) => { setClients((l) => l.some((x) => x.id === c.id) ? l.map((x) => x.id === c.id ? c : x) : [c, ...l]); toast.success("Cliente salvo nesta demonstração"); }} />

      <OppSideDialog state={oppDialog} opps={opps} onClose={() => setOppDialog(null)} setOpps={setOpps} />

      <OpDetailDialog state={opDetail} ops={ops} clientName={(id) => client(id)?.name ?? ""} onClose={() => setOpDetail(null)} setOps={setOps} setTab={(t) => setOpDetail((s) => s && { ...s, tab: t })} />
    </div>
  );
}

function OppMenu({ o, onMove, onEdit, onOpen, onDelete }: { o: DemoOpp; onMove: (s: OpportunityStage) => void; onEdit: () => void; onOpen: (k: "notes" | "labels" | "history") => void; onDelete: () => void }) {
  return (
    <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ações da oportunidade"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mover para etapa</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>{FUNNEL.map((s) => <DropdownMenuItem key={s} disabled={s === o.stage} onClick={() => onMove(s)}>{STAGE_LABELS[s]}</DropdownMenuItem>)}</DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={onEdit}><Edit2 className="mr-2 h-4 w-4" />Editar oportunidade</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpen("notes")}><MessageSquare className="mr-2 h-4 w-4" />Anotações</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpen("labels")}><Tag className="mr-2 h-4 w-4" />Etiquetas</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpen("history")}><History className="mr-2 h-4 w-4" />Histórico</DropdownMenuItem>
          <DropdownMenuItem onClick={() => demoOnly("Gerar orçamento a partir da oportunidade")}><FileText className="mr-2 h-4 w-4" />Gerar / vincular orçamento</DropdownMenuItem>
          <DropdownMenuItem onClick={() => demoOnly("Gerar carteira digital")}><Wallet className="mr-2 h-4 w-4" />Gerar carteira digital</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function OpMenu({ onOpen, onMove }: { onOpen: (t: string) => void; onMove: (s: OperationStage) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" aria-label="Ações"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Mover para etapa</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>{OPERATION_STAGES.map((s) => <DropdownMenuItem key={s.key} onClick={() => onMove(s.key)}>{s.label}</DropdownMenuItem>)}</DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => onOpen("overview")}><Edit2 className="mr-2 h-4 w-4" />Editar viagem</DropdownMenuItem>
        <DropdownMenuItem onClick={() => demoOnly("Conferir serviços")}><Luggage className="mr-2 h-4 w-4" />Conferir serviços</DropdownMenuItem>
        <DropdownMenuItem onClick={() => demoOnly("Importar serviços do orçamento")}><Download className="mr-2 h-4 w-4" />Importar serviços</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen("checklist")}><ListChecks className="mr-2 h-4 w-4" />Fazer checklist</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen("timeline")}><MessageSquare className="mr-2 h-4 w-4" />Criar anotações</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen("attachments")}><Paperclip className="mr-2 h-4 w-4" />Anexar arquivos</DropdownMenuItem>
        <DropdownMenuItem onClick={() => demoOnly("Gerar carteira digital")}><Wallet className="mr-2 h-4 w-4" />Gerar carteira digital</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen("timeline")}><History className="mr-2 h-4 w-4" />Histórico</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientProfileView({ c, opps, onBack, onEdit, onNewOpp }: { c: DemoClient; opps: DemoOpp[]; onBack: () => void; onEdit: () => void; onNewOpp: () => void }) {
  const total = c.trips.reduce((s, t) => s + t.value, 0);
  const Empty = ({ text }: { text: string }) => <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <ClientAvatar name={c.name} className="h-14 w-14" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">{c.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{c.phone}</span>
              <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{c.email}</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{c.city}</span>
              {c.birthday && <span className="flex items-center gap-1"><Cake className="h-4 w-4" />{c.birthday}</span>}
            </div>
            <div className="mt-2"><StatusPill status={c.status} /></div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNewOpp}><Target className="mr-2 h-4 w-4" />Nova oportunidade</Button>
          <Button variant="outline" onClick={onEdit}><Edit2 className="mr-2 h-4 w-4" />Editar</Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: DollarSign, label: "Total Gasto", value: brl(total), tone: "bg-green-100 text-green-600" },
          { icon: Plane, label: "Viagens", value: String(c.trips.length), tone: "bg-blue-100 text-blue-600" },
          { icon: TrendingUp, label: "Ticket Médio", value: brl(c.trips.length ? total / c.trips.length : 0), tone: "bg-purple-100 text-purple-600" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="flex items-center gap-3 p-4"><div className={cn("rounded-lg p-2", s.tone)}><s.icon className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div></CardContent></Card>
        ))}
      </div>
      <Tabs defaultValue="dados">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="viajantes"><Users className="mr-1 h-3.5 w-3.5" />Acompanhantes / Documentos</TabsTrigger>
          <TabsTrigger value="historico">Viagens {c.trips.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{c.trips.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades {opps.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{opps.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos {c.quotes.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{c.quotes.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="roteiros">Roteiros</TabsTrigger>
          <TabsTrigger value="carteiras">Carteiras</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>
        <TabsContent value="dados" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Preferências de viagem</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{c.preferences || "Nenhuma preferência registrada."}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{c.notes || (c.referred_by ? `Indicado por ${c.referred_by}.` : "Sem observações.")}</CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="viajantes" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {c.travelers.map((t) => (
              <Card key={t.name}><CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ClientAvatar name={t.name} className="h-9 w-9" /><p className="font-semibold">{t.name}</p></div>
                  <Button size="sm" variant="outline" onClick={() => demoOnly("Vistos e documentos")}><FileText className="mr-1 h-3.5 w-3.5" />Vistos e documentos</Button></div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground"><span>Nascimento<br /><b className="text-foreground">{t.birth}</b></span><span>Passaporte<br /><b className="text-foreground">{t.passport}</b></span><span>Validade<br /><b className="text-foreground">{t.validity}</b></span></div>
              </CardContent></Card>
            ))}
            <button onClick={() => demoOnly("Adicionar viajante")} className="flex min-h-[110px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted/40"><Plus className="mr-1 h-4 w-4" />Adicionar viajante</button>
          </div>
        </TabsContent>
        <TabsContent value="historico" className="mt-4"><Card><CardHeader><CardTitle className="text-lg">Histórico de Viagens</CardTitle></CardHeader><CardContent className="space-y-3">
          {c.trips.length === 0 ? <Empty text="Nenhuma viagem registrada. Feche uma oportunidade no funil." /> : c.trips.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4"><div className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-2"><Plane className="h-5 w-5 text-primary" /></div>
              <div><p className="font-medium">{t.destination}</p><p className="text-sm text-muted-foreground">{fmtDate(t.date)}</p></div></div><p className="font-medium text-green-600">{brl(t.value)}</p></div>
          ))}</CardContent></Card></TabsContent>
        <TabsContent value="oportunidades" className="mt-4"><Card><CardContent className="space-y-3 p-4">
          {opps.length === 0 ? <Empty text="Nenhuma oportunidade." /> : opps.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border p-4"><div><p className="font-medium">{o.destination}</p><p className="text-sm text-muted-foreground">{STAGE_LABELS[o.stage]}</p></div><p className="font-medium">{brl(o.value)}</p></div>
          ))}</CardContent></Card></TabsContent>
        <TabsContent value="orcamentos" className="mt-4"><Card><CardContent className="space-y-3 p-4">
          {c.quotes.length === 0 ? <Empty text="Nenhum orçamento vinculado." /> : c.quotes.map((q, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4"><div className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div><p className="font-medium">{q.destination}</p></div>
              <div className="text-right"><p className="font-medium text-primary">{brl(q.value)}</p><Badge variant={q.sent ? "default" : "secondary"} className="text-[10px]">{q.sent ? "Enviado" : "Rascunho"}</Badge></div></div>
          ))}</CardContent></Card></TabsContent>
        {["roteiros", "carteiras", "financeiro"].map((k) => <TabsContent key={k} value={k} className="mt-4"><Card><CardContent><Empty text={k === "financeiro" ? "Recebimentos, comissões e faturas do cliente aparecem aqui." : `Os ${k} criados para este cliente aparecem aqui.`} /></CardContent></Card></TabsContent>)}
      </Tabs>
    </div>
  );
}

function DocumentRadar({ clients }: { clients: DemoClient[] }) {
  const rows = clients.flatMap((c) => c.travelers.filter((t) => t.validity.includes("/")).map((t) => {
    const [d, m, y] = t.validity.split("/").map(Number); const days = Math.round((new Date(y, m - 1, d).getTime() - now) / DAY);
    return { client: c.name, ...t, days };
  })).sort((a, b) => a.days - b.days);
  return (
    <Card className="overflow-hidden rounded-2xl"><div className="divide-y">
      {rows.map((r) => (
        <div key={r.name + r.passport} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">Passaporte {r.passport} · cliente {r.client}</p></div>
          <Badge variant="outline" className={cn(r.days < 90 ? "border-red-300 text-red-700" : r.days < 180 ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700")}>Vence em {r.validity} {r.days < 180 && `· ${r.days} dias`}</Badge>
        </div>
      ))}
    </div></Card>
  );
}

function Overview({ clients, opps, ops }: { clients: DemoClient[]; opps: DemoOpp[]; ops: DemoOp[] }) {
  const open = opps.filter((o) => !["closed", "lost"].includes(o.stage));
  const closed = opps.filter((o) => o.stage === "closed");
  const stats = [
    { label: "Clientes", value: String(clients.length), icon: Users },
    { label: "Oportunidades em aberto", value: `${open.length} · ${brl(open.reduce((s, o) => s + o.value, 0))}`, icon: Target },
    { label: "Vendas fechadas", value: `${closed.length} · ${brl(closed.reduce((s, o) => s + o.value, 0))}`, icon: CheckCircle2 },
    { label: "Operações em andamento", value: String(ops.filter((o) => o.stage !== "finalizado").length), icon: Briefcase },
  ];
  const max = Math.max(1, ...FUNNEL.map((s) => opps.filter((o) => o.stage === s).length));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map((s) => (
        <Card key={s.label}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2"><s.icon className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div></CardContent></Card>
      ))}</div>
      <Card><CardHeader><CardTitle className="text-base">Funil por etapa</CardTitle></CardHeader><CardContent className="space-y-2">
        {FUNNEL.map((s) => { const n = opps.filter((o) => o.stage === s).length; return (
          <div key={s} className="flex items-center gap-3 text-sm"><span className="w-44 shrink-0 text-muted-foreground">{STAGE_LABELS[s]}</span><div className="h-3 flex-1 rounded-full bg-muted"><div className={cn("h-3 rounded-full", STAGE_COLORS[s])} style={{ width: `${(n / max) * 100}%` }} /></div><span className="w-6 text-right font-semibold">{n}</span></div>
        ); })}
      </CardContent></Card>
    </div>
  );
}

function OppFormDialog({ state, clients, onClose, onSave }: { state: { clientId?: string; edit?: DemoOpp } | null; clients: DemoClient[]; onClose: () => void; onSave: (o: DemoOpp, isEdit: boolean) => void }) {
  const blank = { clientId: "", destination: "", adults: "2", children: "0", value: "", start: "", end: "", notes: "" };
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (!state) return;
    const e = state.edit;
    setF(e ? { clientId: e.clientId, destination: e.destination, adults: String(e.adults), children: String(e.children), value: String(e.value), start: e.start, end: e.end, notes: "" } : { ...blank, clientId: state.clientId ?? "" });
  }, [state]);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const example = () => setF((p) => ({ ...p, clientId: p.clientId || "c2", destination: "Japão na Primavera", adults: "2", children: "0", value: "36000", start: "2027-04-01", end: "2027-04-14", notes: "Querem ver as cerejeiras em Kyoto." }));
  const save = () => {
    if (!f.clientId || !f.destination.trim()) { toast.error("Selecione o cliente e informe o destino"); return; }
    const e = state?.edit;
    const base: DemoOpp = e ?? { id: nid("o"), clientId: f.clientId, destination: "", adults: 2, children: 0, value: 0, start: "", end: "", stage: "new_contact", enteredAt: Date.now(), labels: [], notes: [], history: [{ to: "new_contact", at: Date.now() }] };
    onSave({ ...base, clientId: f.clientId, destination: f.destination.trim(), adults: Number(f.adults) || 1, children: Number(f.children) || 0, value: Number(f.value) || 0,
      start: f.start || "2027-02-01", end: f.end || f.start || "2027-02-08", notes: f.notes.trim() ? [...base.notes, { text: f.notes.trim(), at: Date.now() }] : base.notes }, !!e);
    onClose();
  };
  return (
    <Dialog open={!!state} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{state?.edit ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle><DialogDescription>Toda oportunidade nasce vinculada a um cliente cadastrado.</DialogDescription></DialogHeader>
        {!state?.edit && <Button variant="outline" size="sm" className="w-fit" onClick={example}><Sparkles className="mr-1.5 h-4 w-4" />Preencher com exemplo</Button>}
        <div className="space-y-4">
          <div><Label>Cliente *</Label>
            <Select value={f.clientId} onValueChange={(v) => set("clientId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label>Destino *</Label><Input value={f.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Ex.: Orlando, Maldivas, Europa" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Data de ida</Label><Input type="date" value={f.start} onChange={(e) => set("start", e.target.value)} /></div>
            <div><Label>Data de volta</Label><Input type="date" value={f.end} onChange={(e) => set("end", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Adultos</Label><Input type="number" min={1} value={f.adults} onChange={(e) => set("adults", e.target.value)} /></div>
            <div><Label>Crianças</Label><Input type="number" min={0} value={f.children} onChange={(e) => set("children", e.target.value)} /></div>
            <div><Label>Valor estimado (R$)</Label><Input type="number" value={f.value} onChange={(e) => set("value", e.target.value)} /></div>
          </div>
          <div><Label>Observações</Label><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Preferências, orçamento-alvo, ocasião especial..." /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>{state?.edit ? "Salvar" : "Criar oportunidade"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientFormDialog({ state, onClose, onSave }: { state: DemoClient | "new" | null; onClose: () => void; onSave: (c: DemoClient) => void }) {
  const [f, setF] = useState<DemoClient | null>(null);
  useEffect(() => {
    setF(state === "new" ? { id: nid("c"), name: "", phone: "", email: "", city: "", status: "lead", lastInteraction: Date.now(), travelers: [], trips: [], quotes: [] } : state);
  }, [state]);
  if (!f) return null;
  const set = (k: keyof DemoClient, v: string) => setF({ ...f, [k]: v });
  const example = () => setF({ ...f, name: "Ana Beatriz Costa", phone: "(48) 99123-4567", email: "ana.costa@exemplo.com", city: "Florianópolis, SC", referred_by: "Patrícia Oliveira", cpf: "987.654.321-00", passport: "GB123987", passportValidity: "2032-06-30", preferences: "Viagens culturais, hotéis 5 estrelas." });
  return (
    <Dialog open={!!state} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto md:max-w-lg">
        <DialogHeader><DialogTitle>{state === "new" ? "Novo Cliente" : "Editar Cliente"}</DialogTitle>
          <DialogDescription>{state === "new" ? "Informe os dados de contato do novo cliente." : "Atualize os dados de contato deste cliente."}</DialogDescription></DialogHeader>
        {state === "new" && <Button variant="outline" size="sm" className="w-fit" onClick={example}><Sparkles className="mr-1.5 h-4 w-4" />Preencher com exemplo</Button>}
        <Tabs defaultValue="dados">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="dados">Dados Cadastrais</TabsTrigger><TabsTrigger value="docs">Documentos &amp; Vistos</TabsTrigger></TabsList>
          <TabsContent value="dados" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Nome Completo *</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome do cliente" /></div>
              <div><Label>Indicado por</Label><Input value={f.referred_by ?? ""} onChange={(e) => set("referred_by", e.target.value)} placeholder="Ex.: Primo da Roberta" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>CPF</Label><Input value={f.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div><Label>Nº do Passaporte</Label><Input value={f.passport ?? ""} onChange={(e) => set("passport", e.target.value)} placeholder="AB123456" /></div>
              <div><Label>Validade do Passaporte</Label><Input type="date" value={f.passportValidity ?? ""} onChange={(e) => set("passportValidity", e.target.value)} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>E-mail</Label><Input value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" /></div>
              <div><Label>Telefone/WhatsApp</Label><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" /></div>
              <div><Label>Cidade</Label><Input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="São Paulo, SP" /></div>
              <div><Label>Status</Label>
                <Select value={f.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CLIENT_STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="flex items-center gap-1.5"><Cake className="h-4 w-4" />Data de Aniversário (dd/mm)</Label><Input value={f.birthday ?? ""} onChange={(e) => set("birthday", e.target.value)} placeholder="12/03" /></div>
            <div><Label>Preferências de Viagem</Label><Textarea value={f.preferences ?? ""} onChange={(e) => set("preferences", e.target.value)} placeholder="Destinos favoritos, tipo de hospedagem, restrições..." /></div>
          </TabsContent>
          <TabsContent value="docs" className="mt-4 space-y-3">
            {(["Vistos", "Documentos"] as const).map((t) => (
              <div key={t} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">{t} (0)</span>
                  <Button size="sm" variant="outline" onClick={() => demoOnly(t === "Vistos" ? "Cadastro de vistos" : "Envio de documentos")}><Plus className="mr-1 h-4 w-4" />{t === "Vistos" ? "Adicionar visto" : "Enviar documento"}</Button></div>
                <button onClick={() => demoOnly("Envio de documentos")} className="mt-3 flex w-full flex-col items-center gap-1 rounded-md border border-dashed p-5 text-xs text-muted-foreground hover:bg-background">
                  <Upload className="h-5 w-5" />{t === "Vistos" ? "Vistos com alerta automático de vencimento na agenda." : "Clique para enviar passaporte, RG, vacinas e outros (PDF, PNG, JPG)."}
                </button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (!f.name.trim()) { toast.error("Informe o nome completo"); return; } onSave({ ...f, lastInteraction: Date.now() }); onClose(); }}>{state === "new" ? "Criar" : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OppSideDialog({ state, opps, onClose, setOpps }: { state: { id: string; kind: "notes" | "labels" | "history" } | null; opps: DemoOpp[]; onClose: () => void; setOpps: React.Dispatch<React.SetStateAction<DemoOpp[]>> }) {
  const [text, setText] = useState("");
  const o = opps.find((x) => x.id === state?.id);
  const upd = (fn: (x: DemoOpp) => DemoOpp) => setOpps((l) => l.map((x) => x.id === o?.id ? fn(x) : x));
  return (
    <Dialog open={!!o} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {o && state && <>
          <DialogHeader><DialogTitle>{state.kind === "notes" ? "Anotações" : state.kind === "labels" ? "Etiquetas" : "Histórico"}</DialogTitle><DialogDescription>{o.destination}</DialogDescription></DialogHeader>
          {state.kind === "notes" && <div className="space-y-3">
            <div className="flex gap-2"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma anotação..." className="min-h-[70px]" /></div>
            <Button size="sm" onClick={() => { if (!text.trim()) return; upd((x) => ({ ...x, notes: [{ text: text.trim(), at: Date.now() }, ...x.notes] })); setText(""); }}>Adicionar anotação</Button>
            {o.notes.map((n, i) => <div key={i} className="rounded-lg border bg-muted/30 p-3 text-sm"><p>{n.text}</p><p className="mt-1 text-[11px] text-muted-foreground">{fmtTime(n.at)}</p></div>)}
          </div>}
          {state.kind === "labels" && <div className="flex flex-wrap gap-2">{Object.entries(LABELS).map(([l, color]) => {
            const on = o.labels.includes(l);
            return <button key={l} onClick={() => upd((x) => ({ ...x, labels: on ? x.labels.filter((y) => y !== l) : [...x.labels, l] }))} className={cn("rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity", !on && "opacity-40")} style={{ backgroundColor: color }}>{on && "✓ "}{l}</button>;
          })}</div>}
          {state.kind === "history" && <ol className="space-y-2 border-l pl-4">{[...o.history].reverse().map((h, i) => <li key={i} className="text-sm"><p className="font-medium">{STAGE_LABELS[h.to as OpportunityStage] ?? h.to}</p><p className="text-[11px] text-muted-foreground">{fmtTime(h.at)}</p></li>)}</ol>}
        </>}
      </DialogContent>
    </Dialog>
  );
}

function OpDetailDialog({ state, ops, clientName, onClose, setOps, setTab }: { state: { id: string; tab: string } | null; ops: DemoOp[]; clientName: (id: string) => string; onClose: () => void; setOps: React.Dispatch<React.SetStateAction<DemoOp[]>>; setTab: (t: string) => void }) {
  const [note, setNote] = useState("");
  const o = ops.find((x) => x.id === state?.id);
  const upd = (fn: (x: DemoOp) => DemoOp) => setOps((l) => l.map((x) => x.id === o?.id ? fn(x) : x));
  const stage = OPERATION_STAGES.find((s) => s.key === o?.stage);
  return (
    <Dialog open={!!o} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {o && state && <>
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">{o.title}{stage && <Badge className={cn("text-primary-foreground", stage.color)}>{stage.label}</Badge>}</DialogTitle>
            <DialogDescription>{clientName(o.clientId)} · {fmtDate(o.start)} → {fmtDate(o.end)} · {o.pax} passageiros · {brl(o.value)}</DialogDescription>
          </DialogHeader>
          <Tabs value={state.tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="timeline">Linha do tempo</TabsTrigger><TabsTrigger value="attachments">Anexos</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div><Label>Etapa</Label><Select value={o.stage} onValueChange={(v) => upd((x) => ({ ...x, stage: v as OperationStage, timeline: [...x.timeline, { text: `Movida para ${OPERATION_STAGES.find((s) => s.key === v)?.label}`, at: Date.now() }] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPERATION_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Prioridade</Label><Select value={o.priority} onValueChange={(v) => upd((x) => ({ ...x, priority: v as DemoOp["priority"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
                <div><Label>Pagamento do cliente</Label><Select value={o.payment} onValueChange={(v) => upd((x) => ({ ...x, payment: v as DemoOp["payment"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="parcial">Parcial</SelectItem><SelectItem value="pago">Pago</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[{ icon: FileText, l: "Orçamento vinculado" }, { icon: Wallet, l: "Carteira digital" }, { icon: ClipboardList, l: "Serviços da viagem" }].map((x) => (
                  <button key={x.l} onClick={() => demoOnly(x.l)} className="flex items-center gap-2 rounded-lg border p-3 text-left text-sm hover:bg-muted/40"><x.icon className="h-4 w-4 text-primary" />{x.l}</button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="checklist" className="mt-4 space-y-2">
              <p className="text-sm font-semibold">{stage?.label}</p>
              {(STAGE_CHECKLISTS[o.stage] ?? []).map((item) => (
                <label key={item} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Checkbox checked={o.done.includes(item)} onCheckedChange={(v) => upd((x) => ({ ...x, done: v ? [...x.done, item] : x.done.filter((d) => d !== item), timeline: v ? [...x.timeline, { text: `Concluído: ${item}`, at: Date.now() }] : x.timeline }))} />
                  <span className={cn(o.done.includes(item) && "text-muted-foreground line-through")}>{item}</span>
                </label>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">Ao concluir, arraste o card para a próxima etapa ou mude a etapa na Visão geral.</p>
            </TabsContent>
            <TabsContent value="timeline" className="mt-4 space-y-3">
              <div className="flex gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicionar anotação na linha do tempo..." />
                <Button onClick={() => { if (!note.trim()) return; upd((x) => ({ ...x, timeline: [...x.timeline, { text: note.trim(), at: Date.now() }] })); setNote(""); }}>Adicionar</Button></div>
              <ol className="space-y-2 border-l pl-4">{[...o.timeline].reverse().map((t, i) => <li key={i} className="text-sm"><p>{t.text}</p><p className="text-[11px] text-muted-foreground">{fmtTime(t.at)}</p></li>)}</ol>
            </TabsContent>
            <TabsContent value="attachments" className="mt-4">
              <button onClick={() => demoOnly("Anexar vouchers, bilhetes e contratos")} className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed p-8 text-sm text-muted-foreground hover:bg-muted/40">
                <Paperclip className="h-6 w-6" />Vouchers, bilhetes, contratos e comprovantes ficam guardados aqui.
              </button>
            </TabsContent>
          </Tabs>
        </>}
      </DialogContent>
    </Dialog>
  );
}
