/**
 * Carrinho de solicitação da DMC Portugal (100 Limites).
 * Cada serviço da página abre um popup com os dados básicos; os itens se
 * acumulam (persistidos no navegador) e o fechamento envia UMA solicitação
 * pelo fluxo público existente (`submit-agency-site-request`, serviço
 * "pacotes"), que grava no CRM e dispara os avisos da agência.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, MessageCircle, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { flyToCart } from "@/lib/bookingCartFly";

export type DmcKind = "assistencia";

export interface DmcItem {
  id: string;
  kind: DmcKind;
  title: string;
  values: Record<string, string>;
}

interface Ctx {
  items: DmcItem[];
  open: (kind: DmcKind, title: string, origin?: HTMLElement | null) => void;
  openCart: () => void;
  countFor: (title: string) => number;
}

const DmcCartContext = createContext<Ctx | null>(null);
// A new, tenant-scoped draft excludes old transport/tour offers without deleting them.
export const dmcStorageKey = (hostname: string) => `dmc-portugal-assistance:v2:${hostname.trim().toLowerCase().replace(/^www\./, "")}`;
const ITEM_FIELDS = new Set(["data", "data_fim", "local", "interesses", "adultos", "criancas", "idades", "obs"]);

export function readAssistanceDraft(hostname: string): DmcItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(dmcStorageKey(hostname)) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is DmcItem =>
      item && item.kind === "assistencia" && typeof item.id === "string" && typeof item.title === "string" &&
      item.values && typeof item.values === "object" && !Array.isArray(item.values) &&
      Object.entries(item.values).every(([key, value]) => ITEM_FIELDS.has(key) && typeof value === "string"),
    );
  } catch { return []; }
}

export function useDmcCart() {
  return useContext(DmcCartContext);
}

type FieldDef = { name: string; label: string; type: "date" | "time" | "number" | "text" | "select" | "textarea"; options?: string[]; required?: boolean; min?: number };

const PAX: FieldDef[] = [
  { name: "adultos", label: "Adultos", type: "number", required: true, min: 1 },
  { name: "criancas", label: "Crianças", type: "number", min: 0 },
  { name: "idades", label: "Idades das crianças", type: "text" },
];

function fieldsFor(): FieldDef[] {
  return [
    { name: "data", label: "Data ou início do período", type: "date", required: true },
    { name: "data_fim", label: "Fim do período", type: "date" },
    ...PAX,
    { name: "local", label: "Cidade ou locais de interesse", type: "text" },
    { name: "interesses", label: "Assistência desejada", type: "text" },
  ];
}

const LABELS: Record<string, string> = {
  adultos: "Adultos", criancas: "Crianças", idades: "Idades das crianças",
  data: "Início", data_fim: "Fim do período", local: "Locais de interesse", interesses: "Assistência desejada", obs: "Observações",
};

function fmt(name: string, v: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }
  return v;
}

export function describeItem(item: DmcItem): string {
  const parts = Object.entries(item.values)
    .filter(([key, v]) => ITEM_FIELDS.has(key) && v && v !== "0")
    .map(([k, v]) => `${LABELS[k] ?? k}: ${fmt(k, v)}`);
  return `${item.title} — ${parts.join("; ")}`;
}

export function DmcRequestCartProvider({ hostname, whatsapp, children }: { hostname: string; whatsapp: string | null; children: React.ReactNode }) {
  const [items, setItems] = useState<DmcItem[]>(() => {
    return readAssistanceDraft(hostname);
  });
  const [editing, setEditing] = useState<{ kind: DmcKind; title: string; values: Record<string, string>; id?: string } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const originRef = useRef<HTMLElement | null>(null);
  const cartBtn = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem(dmcStorageKey(hostname), JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, hostname]);

  const open = useCallback((kind: DmcKind, title: string, origin?: HTMLElement | null) => {
    originRef.current = origin ?? null;
    setEditing({ kind, title, values: { adultos: "2", criancas: "0" } });
  }, []);

  const save = (values: Record<string, string>) => {
    if (!editing) return;
    if (editing.id) {
      setItems((list) => list.map((i) => (i.id === editing.id ? { ...i, values } : i)));
    } else {
      setItems((list) => [...list, { id: crypto.randomUUID(), kind: editing.kind, title: editing.title, values }]);
      const from = originRef.current?.getBoundingClientRect() ?? null;
      const to = cartBtn.current?.getBoundingClientRect() ?? null;
      requestAnimationFrame(() => flyToCart(from, to));
      setBump(true);
      window.setTimeout(() => setBump(false), 600);
    }
    setEditing(null);
  };

  const value = useMemo<Ctx>(() => ({
    items,
    open,
    openCart: () => setCartOpen(true),
    countFor: (title) => items.filter((i) => i.title === title).length,
  }), [items, open]);

  return (
    <DmcCartContext.Provider value={value}>
      {children}
      <Button
        ref={cartBtn}
        type="button"
        onClick={() => setCartOpen(true)}
        aria-label={`Minha solicitação: ${items.length} ${items.length === 1 ? "item" : "itens"}`}
        className={`fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 ${bump ? "scale-110" : ""}`}
      >
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        {items.length ? "Finalizar solicitação" : "Minha solicitação"}
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-background px-1.5 text-xs font-bold text-foreground">{items.length}</span>
      </Button>

      <ItemDialog editing={editing} onClose={() => setEditing(null)} onSave={save} />
      <CartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={items}
        hostname={hostname}
        whatsapp={whatsapp}
        onEdit={(i) => { setCartOpen(false); setEditing({ kind: i.kind, title: i.title, values: i.values, id: i.id }); }}
        onRemove={(id) => setItems((l) => l.filter((i) => i.id !== id))}
        onClear={() => setItems([])}
      />
    </DmcCartContext.Provider>
  );
}

function ItemDialog({ editing, onClose, onSave }: { editing: { kind: DmcKind; title: string; values: Record<string, string>; id?: string } | null; onClose: () => void; onSave: (v: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (editing) { setValues(editing.values); setError(null); } }, [editing]);
  if (!editing) return null;
  const fields = fieldsFor();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.name]?.trim());
    if (missing) return setError(`Informe: ${missing.label}.`);
    if (values.data && values.data_fim && values.data_fim < values.data) return setError("O fim do período deve ser igual ou posterior ao início.");
    if (!Number.isInteger(Number(values.adultos)) || Number(values.adultos) < 1) return setError("Informe ao menos um adulto.");
    if (!Number.isInteger(Number(values.criancas || "0")) || Number(values.criancas || "0") < 0) return setError("Informe um número válido de crianças.");
    const allowed = new Set([...fields.map((f) => f.name), "obs"]);
    onSave(Object.fromEntries(Object.entries(values).filter(([k]) => allowed.has(k))));
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing.title}</DialogTitle>
          <DialogDescription>Informe os dados básicos. A Amanda confirma valores e disponibilidade na proposta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.type === "select" || f.name === "idades" || f.name === "local" || f.name === "interesses" ? "sm:col-span-2" : ""}>
              <Label htmlFor={`dmc-${f.name}`} className="text-xs">{f.label}{f.required ? " *" : ""}</Label>
              {f.type === "select" ? (
                <select
                  id={`dmc-${f.name}`}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {f.options?.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <Input
                  id={`dmc-${f.name}`}
                  type={f.type}
                  min={f.min}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className="mt-1"
                />
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="dmc-obs" className="text-xs">Observações deste serviço</Label>
            <Textarea id="dmc-obs" rows={2} maxLength={300} value={values.obs ?? ""} onChange={(e) => setValues((v) => ({ ...v, obs: e.target.value }))} className="mt-1" />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">{error}</p>}
          <Button type="submit" size="lg" className="sm:col-span-2">
            {editing.id ? "Salvar alterações" : <><Plus className="mr-2 h-4 w-4" />Adicionar à solicitação</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CartDialog({ open, onOpenChange, items, hostname, whatsapp, onEdit, onRemove, onClear }: {
  open: boolean; onOpenChange: (o: boolean) => void; items: DmcItem[]; hostname: string; whatsapp: string | null;
  onEdit: (i: DmcItem) => void; onRemove: (id: string) => void; onClear: () => void;
}) {
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);
  const [c, setC] = useState({ name: "", phone: "", email: "", agency: "", notes: "", consent: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string[] | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!items.length) return setFormError("Adicione ao menos um serviço.");
    if (c.name.trim().length < 2) return setFormError("Informe seu nome.");
    const digits = c.phone.replace(/\D/g, "");
    if (!digits && !c.email.trim()) return setFormError("Informe um WhatsApp ou e-mail.");
    if (digits && (digits.length < 10 || digits.length > 15)) return setFormError("Informe um WhatsApp válido com código do país/DDD.");
    if (!c.consent) return setFormError("É necessário aceitar o uso dos seus dados para contato.");
    const lines = items.map(describeItem);
    const details: Record<string, string> = { origem_pagina: "Assistência personalizada em Portugal", total_itens: String(items.length) };
    if (c.agency.trim()) details.agencia = c.agency.trim();
    lines.slice(0, 35).forEach((l, i) => { details[`item_${i + 1}`] = l.slice(0, 400); });
    const adults = Math.max(...items.map((i) => Number(i.values.adultos) || 0));
    const kids = Math.max(...items.map((i) => Number(i.values.criancas) || 0));
    details.adultos = String(adults);
    details.criancas = String(kids);
    const res = await submit({
      service_key: "pacotes",
      service_label: "Assistência personalizada em Portugal",
      lead_name: c.name.trim(),
      lead_phone: c.phone.trim(),
      lead_email: c.email.trim(),
      destination: "Portugal",
      summary: ["Solicitação de assistência personalizada em Portugal", ...lines.map((l, i) => `${i + 1}. ${l}`)].join(" | ").slice(0, 2000),
      notes: [c.agency.trim() && `Agência: ${c.agency.trim()}`, c.notes.trim()].filter(Boolean).join("\n").slice(0, 2000),
      consent: true,
      consent_version: "v1",
      details,
    });
    if ("success" in res) { setSent(lines); onClear(); }
  };

  const waText = sent
    ? `Olá, Amanda! Acabei de enviar uma solicitação de assistência personalizada em Portugal pelo site:\n\n${sent.map((l) => `• ${l}`).join("\n")}\n\nNome: ${c.name}${c.agency ? `\nAgência: ${c.agency}` : ""}`
    : "";

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o && sent) { setSent(null); reset(); setC((v) => ({ ...v, notes: "" })); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {sent ? (
          <div className="py-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-6 w-6" /></div>
            <DialogTitle className="mt-4">Solicitação enviada!</DialogTitle>
            <DialogDescription className="mt-2">A Amanda recebeu os {sent.length} serviços e retorna com a proposta.</DialogDescription>
            {whatsapp && (
              <Button asChild size="lg" className="mt-6">
                <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />Continuar no WhatsApp
                </a>
              </Button>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Minha solicitação</DialogTitle>
              <DialogDescription>Revise os serviços e envie seus dados. Nada é cobrado agora.</DialogDescription>
            </DialogHeader>
            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma assistência adicionada.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((i, idx) => (
                  <li key={i.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground text-xs font-bold text-background">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{i.title}</p>
                      <p className="text-xs text-muted-foreground">{describeItem(i).split(" — ")[1]}</p>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(i)}>Editar</Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Remover ${i.title}`} onClick={() => onRemove(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={send} className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="dmc-n" className="text-xs">Nome completo *</Label><Input id="dmc-n" className="mt-1" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
              <div><Label htmlFor="dmc-p" className="text-xs">WhatsApp (com DDD)</Label><Input id="dmc-p" type="tel" className="mt-1" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></div>
              <div><Label htmlFor="dmc-e" className="text-xs">E-mail</Label><Input id="dmc-e" type="email" className="mt-1" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label htmlFor="dmc-a" className="text-xs">Agência de viagens (se for agente)</Label><Input id="dmc-a" className="mt-1" value={c.agency} onChange={(e) => setC({ ...c, agency: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label htmlFor="dmc-o" className="text-xs">Observações gerais</Label><Textarea id="dmc-o" rows={3} maxLength={1500} className="mt-1" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} /></div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                <Checkbox checked={c.consent} onCheckedChange={(v) => setC({ ...c, consent: v === true })} className="mt-0.5" />
                Autorizo o uso dos meus dados para receber o retorno desta solicitação.
              </label>
              {(formError || error) && <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">{formError || error}</p>}
              <Button type="submit" size="lg" className="sm:col-span-2" disabled={state === "submitting" || !items.length}>
                {state === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar solicitação ({items.length} {items.length === 1 ? "item" : "itens"})
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Botão "Solicitar" usado em cada serviço da página. */
export function DmcRequestButton({ kind, title, className = "" }: { kind: DmcKind; title: string; className?: string }) {
  const cart = useDmcCart();
  if (!cart) return null;
  const n = cart.countFor(title);
  return (
    <Button
      type="button"
      size="sm"
      variant={n ? "secondary" : "default"}
      className={`h-auto min-h-9 whitespace-normal text-left ${className}`}
      onClick={(e) => cart.open(kind, title, e.currentTarget)}
      aria-label={`Solicitar assistência personalizada: ${title}`}
    >
      {n ? <><Check className="mr-1.5 h-4 w-4" />Adicionado ({n}) · +</> : <><Plus className="mr-1.5 h-4 w-4 shrink-0" /><span>Solicitar assistência personalizada</span></>}
    </Button>
  );
}
