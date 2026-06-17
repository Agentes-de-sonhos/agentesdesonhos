import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Plus, Trash2, RotateCcw, Eye, EyeOff, ListChecks, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceLike = { service_type?: string | null; other_service_type?: string | null };

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  source: "default" | "auto" | "manual";
  hidden?: boolean;
  category: string;
};

type ChecklistState = {
  items: ChecklistItem[];
  collapsed: Record<string, boolean>;
};

const CATEGORIES = ["Documentos", "Financeiro", "Tecnologia", "Bagagem", "Pré-embarque", "Inteligente"] as const;

const DEFAULTS: Array<{ category: string; label: string }> = [
  { category: "Documentos", label: "Passaporte" },
  { category: "Documentos", label: "Visto" },
  { category: "Documentos", label: "Seguro viagem" },
  { category: "Documentos", label: "Documento de identidade" },
  { category: "Documentos", label: "Autorização para menor, se aplicável" },
  { category: "Financeiro", label: "Cartão internacional" },
  { category: "Financeiro", label: "Dinheiro em espécie" },
  { category: "Financeiro", label: "Limite do cartão conferido" },
  { category: "Financeiro", label: "Aviso de viagem/cartão, se necessário" },
  { category: "Tecnologia", label: "eSIM/chip ativado" },
  { category: "Tecnologia", label: "Carregadores" },
  { category: "Tecnologia", label: "Adaptador de tomada" },
  { category: "Tecnologia", label: "Power bank" },
  { category: "Tecnologia", label: "Apps úteis instalados" },
  { category: "Bagagem", label: "Roupas" },
  { category: "Bagagem", label: "Remédios" },
  { category: "Bagagem", label: "Necessaire" },
  { category: "Bagagem", label: "Casaco" },
  { category: "Bagagem", label: "Óculos/boné/protetor solar" },
  { category: "Pré-embarque", label: "Check-in do voo" },
  { category: "Pré-embarque", label: "Bagagem conferida" },
  { category: "Pré-embarque", label: "Voucher dos serviços salvo" },
  { category: "Pré-embarque", label: "Endereço do hotel salvo" },
  { category: "Pré-embarque", label: "Horário do transfer conferido" },
];

const SMART_RULES: Array<{ match: (s: ServiceLike) => boolean; items: string[] }> = [
  { match: (s) => s.service_type === "flight", items: ["Conferir horário do voo", "Fazer check-in do voo", "Conferir franquia de bagagem", "Separar documentos de embarque"] },
  { match: (s) => s.service_type === "hotel", items: ["Confirmar endereço do hotel", "Separar cartão para caução", "Conferir horário de check-in/check-out"] },
  { match: (s) => s.service_type === "transfer", items: ["Conferir horário do transfer", "Conferir ponto de encontro", "Salvar contato do motorista/empresa, se disponível"] },
  { match: (s) => s.service_type === "insurance", items: ["Salvar apólice do seguro", "Salvar contato de emergência da seguradora"] },
  { match: (s) => s.service_type === "car_rental", items: ["Separar CNH", "Verificar necessidade de PID", "Separar cartão no nome do condutor", "Conferir caução da locadora"] },
  { match: (s) => s.service_type === "cruise", items: ["Fazer check-in do cruzeiro", "Conferir documentos exigidos pelo cruzeiro", "Conferir etiquetas de bagagem do cruzeiro", "Separar traje para noite especial, se aplicável"] },
  { match: (s) => s.service_type === "train", items: ["Conferir horário do trem", "Conferir estação de embarque", "Separar bilhetes do trem"] },
  { match: (s) => s.service_type === "attraction", items: ["Conferir ingressos e reservas", "Salvar QR Codes dos ingressos, se houver"] },
  { match: (s) => s.service_type === "other" && s.other_service_type === "chip_internet", items: ["Instalar eSIM antes do embarque", "Testar instruções de ativação"] },
];

function slug(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function buildAutoItems(services: ServiceLike[]): Array<{ category: string; label: string }> {
  const out: Array<{ category: string; label: string }> = [];
  const seen = new Set<string>();
  for (const s of services) {
    for (const rule of SMART_RULES) {
      if (rule.match(s)) {
        for (const label of rule.items) {
          if (!seen.has(label)) { seen.add(label); out.push({ category: "Inteligente", label }); }
        }
      }
    }
  }
  return out;
}

function mergeItems(prev: ChecklistItem[], services: ServiceLike[]): ChecklistItem[] {
  const byKey = new Map<string, ChecklistItem>();
  for (const it of prev) byKey.set(`${it.source}:${slug(it.label)}`, it);

  const result: ChecklistItem[] = [];
  // defaults
  for (const d of DEFAULTS) {
    const key = `default:${slug(d.label)}`;
    const existing = byKey.get(key);
    if (existing) { result.push({ ...existing, category: d.category, label: d.label }); byKey.delete(key); }
    else result.push({ id: key, label: d.label, done: false, source: "default", category: d.category });
  }
  // auto
  for (const a of buildAutoItems(services)) {
    const key = `auto:${slug(a.label)}`;
    const existing = byKey.get(key);
    if (existing) { result.push({ ...existing, category: "Inteligente", label: a.label }); byKey.delete(key); }
    else result.push({ id: key, label: a.label, done: false, source: "auto", category: "Inteligente" });
  }
  // manual (and any leftover defaults/auto previously stored)
  for (const [, it] of byKey) {
    if (it.source === "manual") result.push(it);
  }
  return result;
}

export function TripChecklistDialog({ open, onOpenChange, tripId, services }: { open: boolean; onOpenChange: (v: boolean) => void; tripId: string; services: ServiceLike[] }) {
  const storageKey = `trip_checklist_${tripId}`;
  const [state, setState] = useState<ChecklistState>({ items: [], collapsed: {} });
  const [showHidden, setShowHidden] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newCat, setNewCat] = useState<string>("Documentos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: ChecklistState = raw ? JSON.parse(raw) : { items: [], collapsed: {} };
      const merged = mergeItems(parsed.items || [], services);
      setState({ items: merged, collapsed: parsed.collapsed || {} });
    } catch {
      setState({ items: mergeItems([], services), collapsed: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, open]);

  useEffect(() => {
    if (!state.items.length) return;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }, [state, storageKey]);

  const visible = useMemo(() => state.items.filter((i) => showHidden || !i.hidden), [state.items, showHidden]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const c of CATEGORIES) map.set(c, []);
    for (const it of visible) {
      const cat = map.get(it.category) ? it.category : "Documentos";
      map.get(cat)!.push(it);
    }
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0);
  }, [visible]);

  const totalCounted = state.items.filter((i) => !i.hidden);
  const doneCount = totalCounted.filter((i) => i.done).length;
  const totalCount = totalCounted.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  function toggle(id: string) {
    setState((s) => ({ ...s, items: s.items.map((i) => i.id === id ? { ...i, done: !i.done } : i) }));
  }
  function toggleHidden(id: string) {
    setState((s) => ({ ...s, items: s.items.map((i) => i.id === id ? { ...i, hidden: !i.hidden } : i) }));
  }
  function removeItem(id: string) {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  }
  function addManual() {
    const label = newItem.trim();
    if (!label) return;
    const id = `manual:${slug(label)}:${Date.now()}`;
    setState((s) => ({ ...s, items: [...s.items, { id, label, done: false, source: "manual", category: newCat }] }));
    setNewItem("");
  }
  function startEdit(it: ChecklistItem) { setEditingId(it.id); setEditText(it.label); }
  function saveEdit() {
    if (!editingId) return;
    const t = editText.trim();
    if (!t) { setEditingId(null); return; }
    setState((s) => ({ ...s, items: s.items.map((i) => i.id === editingId ? { ...i, label: t } : i) }));
    setEditingId(null);
  }
  function toggleCollapse(cat: string) {
    setState((s) => ({ ...s, collapsed: { ...s.collapsed, [cat]: !s.collapsed[cat] } }));
  }
  function resetAll() {
    if (!confirm("Resetar checklist? Itens manuais serão removidos e os marcados serão desmarcados.")) return;
    setState({ items: mergeItems([], services).map((i) => ({ ...i, done: false, hidden: false })), collapsed: {} });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" style={{ color: "hsl(var(--wallet-brand))" }} />
            Checklist da viagem
          </DialogTitle>
          <DialogDescription>Organize tudo que você precisa antes e durante a viagem.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span>{doneCount} de {totalCount} itens concluídos</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {showHidden ? "Ocultar itens ocultos" : "Mostrar itens ocultos"}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={resetAll}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Resetar
            </Button>
          </div>

          {grouped.map(([cat, items]) => {
            const done = items.filter((i) => i.done).length;
            const collapsed = !!state.collapsed[cat];
            return (
              <div key={cat} className="rounded-xl border border-border/50 bg-white overflow-hidden">
                <button type="button" onClick={() => toggleCollapse(cat)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{cat}</span>
                    <span className="text-[11px] text-muted-foreground">{done}/{items.length}</span>
                  </div>
                  {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                </button>
                {!collapsed && (
                  <ul className="divide-y divide-border/40">
                    {items.map((it) => (
                      <li key={it.id} className={cn("flex items-center gap-3 px-3 py-2.5", it.hidden && "opacity-50")}>
                        <Checkbox
                          checked={it.done}
                          onCheckedChange={() => toggle(it.id)}
                          className="h-5 w-5"
                        />
                        {editingId === it.id ? (
                          <Input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }} className="h-8 flex-1" autoFocus />
                        ) : (
                          <button type="button" onClick={() => toggle(it.id)} className={cn("flex-1 text-left text-sm", it.done && "line-through text-muted-foreground")}>
                            {it.label}
                            {it.source === "auto" && <span className="ml-2 text-[10px] uppercase tracking-wider text-primary/70">auto</span>}
                            {it.source === "manual" && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">meu</span>}
                          </button>
                        )}
                        <div className="flex items-center gap-0.5">
                          {editingId === it.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}><Check className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                            </>
                          ) : it.source === "manual" ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(it)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleHidden(it.id)} title={it.hidden ? "Mostrar" : "Ocultar"}>
                              {it.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <div className="rounded-xl border border-dashed border-border/60 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Adicionar item personalizado</p>
            <div className="flex gap-2">
              <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                {CATEGORIES.filter((c) => c !== "Inteligente").map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addManual(); }} placeholder="Ex.: Levar travesseiro de pescoço" className="h-9 flex-1" />
              <Button size="sm" className="h-9" onClick={addManual}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TripChecklistDialog;