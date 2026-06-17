import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet, Plus, Trash2, Utensils, Bus, ShoppingBag, Camera, MoreHorizontal,
  PiggyBank, TrendingDown, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Currency = "USD" | "EUR" | "GBP";

const CURRENCY_META: Record<Currency, { symbol: string; label: string }> = {
  USD: { symbol: "US$", label: "Dólar Americano" },
  EUR: { symbol: "€", label: "Euro" },
  GBP: { symbol: "£", label: "Libra Esterlina" },
};

type CategoryId = "food" | "transport" | "shopping" | "tours" | "other";

const CATEGORIES: { id: CategoryId; label: string; icon: any }[] = [
  { id: "food", label: "Alimentação", icon: Utensils },
  { id: "transport", label: "Transporte", icon: Bus },
  { id: "shopping", label: "Compras", icon: ShoppingBag },
  { id: "tours", label: "Passeios", icon: Camera },
  { id: "other", label: "Outros", icon: MoreHorizontal },
];

interface BudgetEntry {
  id: string;
  amount: number;
  category: CategoryId;
  note?: string;
  date: string; // ISO
}

interface BudgetState {
  budget: number;
  currency: Currency;
  entries: BudgetEntry[];
}

const QUICK = [5, 10, 20, 50, 100];

function inferCurrency(destination?: string): Currency {
  const d = (destination || "").toLowerCase();
  if (/(uk|reino unido|inglaterra|londres|london|escócia|escocia)/i.test(d)) return "GBP";
  if (/(eua|usa|estados unidos|united states|miami|orlando|new york|los angeles|chicago|las vegas|disney|flórida|florida)/i.test(d)) return "USD";
  if (/(europa|portugal|espanha|spain|frança|franca|france|itália|italia|italy|alemanha|germany|holanda|grécia|grecia|irlanda|áustria|austria|bélgica|belgica|suíça|suica|switzerland)/i.test(d)) return "EUR";
  return "USD";
}

function storageKey(tripId: string) {
  return `trip_budget_${tripId}`;
}

function loadState(tripId: string): BudgetState | null {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!j || typeof j.budget !== "number" || !j.currency) return null;
    return {
      budget: j.budget,
      currency: j.currency as Currency,
      entries: Array.isArray(j.entries) ? j.entries : [],
    };
  } catch {
    return null;
  }
}

function saveState(tripId: string, s: BudgetState) {
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

function formatMoney(amount: number, currency: Currency) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${CURRENCY_META[currency].symbol} ${amount.toFixed(2)}`;
  }
}

function daysRemaining(endDate: Date | null): number {
  if (!endDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000) + 1;
  return Math.max(diff, 0);
}

/* ─── Setup dialog ─── */
function SetupDialog({
  open, onOpenChange, suggestedCurrency, initial, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suggestedCurrency: Currency;
  initial?: { budget: number; currency: Currency };
  onSave: (budget: number, currency: Currency) => void;
}) {
  const [amount, setAmount] = useState<string>(initial ? String(initial.budget) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency || suggestedCurrency);

  useEffect(() => {
    if (open) {
      setAmount(initial ? String(initial.budget) : "");
      setCurrency(initial?.currency || suggestedCurrency);
    }
  }, [open, initial, suggestedCurrency]);

  const n = parseFloat(amount.replace(",", ".")) || 0;
  const valid = n > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" style={{ color: "hsl(var(--wallet-brand))" }} />
            {initial ? "Editar orçamento" : "Definir orçamento"}
          </DialogTitle>
          <DialogDescription>
            Qual seu orçamento para esta viagem?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Valor</label>
            <Input
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 5000"
              className="text-lg font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Moeda</label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["USD", "EUR", "GBP"] as Currency[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CURRENCY_META[c].symbol} — {CURRENCY_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid} onClick={() => { onSave(n, currency); onOpenChange(false); }}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Manual entry dialog ─── */
function ManualEntryDialog({
  open, onOpenChange, currency, onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currency: Currency;
  onAdd: (amount: number, category: CategoryId, note?: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryId>("food");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) { setAmount(""); setCategory("food"); setNote(""); }
  }, [open]);

  const n = parseFloat(amount.replace(",", ".")) || 0;
  const valid = n > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>
            Registre um gasto em {CURRENCY_META[currency].symbol}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Valor</label>
            <Input
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 45,90"
              className="text-lg font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Categoria</label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Descrição (opcional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: Jantar no centro" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid} onClick={() => { onAdd(n, category, note.trim() || undefined); onOpenChange(false); }}>
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main card ─── */
export function MyBudgetCard({
  tripId,
  destination,
  endDate,
}: {
  tripId: string;
  destination?: string;
  endDate: Date | null;
}) {
  const suggested = useMemo(() => inferCurrency(destination), [destination]);
  const [state, setState] = useState<BudgetState | null>(() => loadState(tripId));
  const [setupOpen, setSetupOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (state) saveState(tripId, state);
  }, [tripId, state]);

  const handleSetup = (budget: number, currency: Currency) => {
    setState((prev) => ({
      budget,
      currency,
      entries: prev?.entries || [],
    }));
  };

  const addEntry = (amount: number, category: CategoryId, note?: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const e: BudgetEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount,
        category,
        note,
        date: new Date().toISOString(),
      };
      return { ...prev, entries: [e, ...prev.entries] };
    });
  };

  const removeEntry = (id: string) => {
    setState((prev) => prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) } : prev);
  };

  const resetAll = () => {
    if (!confirm("Tem certeza que deseja zerar este orçamento? Os lançamentos serão removidos.")) return;
    try { localStorage.removeItem(storageKey(tripId)); } catch {}
    setState(null);
  };

  const headerNode = (
    <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "hsl(var(--wallet-brand) / 0.12)" }}>
      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "hsl(var(--wallet-brand-soft))" }}>
        <Wallet className="h-4 w-4" style={{ color: "hsl(var(--wallet-brand))" }} />
      </div>
      <h3 className="text-[13px] font-semibold uppercase tracking-wider text-foreground/70 flex-1">
        Meu orçamento
      </h3>
      {state && (
        <button
          type="button"
          onClick={() => setSetupOpen(true)}
          className="text-[11px] font-medium text-foreground/60 hover:text-foreground transition-colors"
        >
          Editar
        </button>
      )}
    </div>
  );

  if (!state) {
    return (
      <section
        aria-label="Meu orçamento"
        className="rounded-2xl border bg-card shadow-sm overflow-hidden"
        style={{ borderColor: "hsl(var(--wallet-brand) / 0.18)" }}
      >
        {headerNode}
        <div className="px-4 py-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Defina um orçamento e acompanhe seus gastos durante a viagem.
          </p>
          <Button
            onClick={() => setSetupOpen(true)}
            className="bg-[hsl(var(--wallet-brand))] hover:bg-[hsl(var(--wallet-brand)/0.9)] text-white"
          >
            <PiggyBank className="h-4 w-4 mr-1.5" />
            Definir orçamento
          </Button>
        </div>
        <SetupDialog
          open={setupOpen}
          onOpenChange={setSetupOpen}
          suggestedCurrency={suggested}
          onSave={handleSetup}
        />
      </section>
    );
  }

  const total = state.entries.reduce((sum, e) => sum + e.amount, 0);
  const balance = state.budget - total;
  const pct = state.budget > 0 ? Math.min(100, (total / state.budget) * 100) : 0;
  const overspent = balance < 0;

  const byCategory: Record<CategoryId, number> = {
    food: 0, transport: 0, shopping: 0, tours: 0, other: 0,
  };
  state.entries.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  const remainingDays = daysRemaining(endDate);
  const dailySuggestion = remainingDays > 0 && balance > 0 ? balance / remainingDays : 0;

  const recent = state.entries.slice(0, 10);

  return (
    <section
      aria-label="Meu orçamento"
      className="rounded-2xl border bg-card shadow-sm overflow-hidden"
      style={{ borderColor: "hsl(var(--wallet-brand) / 0.18)" }}
    >
      {headerNode}

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/40 bg-card p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orçamento</p>
            <p className="text-sm font-bold mt-1">{formatMoney(state.budget, state.currency)}</p>
          </div>
          <div
            className={cn(
              "rounded-xl border p-3 text-center",
              overspent ? "border-destructive/30 bg-destructive/5" : "border-[hsl(var(--wallet-brand)/0.18)] bg-[hsl(var(--wallet-brand-soft))]"
            )}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</p>
            <p className={cn("text-sm font-bold mt-1", overspent ? "text-destructive" : "text-foreground")}>
              {formatMoney(balance, state.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Utilizado</p>
            <p className="text-sm font-bold mt-1">{formatMoney(total, state.currency)}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                overspent ? "bg-destructive" : "bg-[hsl(var(--wallet-brand))]"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{pct.toFixed(0)}% utilizado</span>
            {dailySuggestion > 0 && (
              <span>
                Sugestão diária:{" "}
                <strong className="text-foreground/80">{formatMoney(dailySuggestion, state.currency)}</strong>
                <span className="text-muted-foreground/70"> · {remainingDays}d</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick entries */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Lançamento rápido
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  if (!confirm(`Descontar ${formatMoney(v, state.currency)} do seu orçamento?`)) return;
                  addEntry(v, "other");
                }}
                className="rounded-lg border border-[hsl(var(--wallet-brand)/0.25)] bg-[hsl(var(--wallet-brand-soft))] hover:bg-[hsl(var(--wallet-brand)/0.18)] text-[hsl(var(--wallet-brand))] text-sm font-semibold py-2 transition-colors active:scale-95"
              >
                −{v}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManualOpen(true)}
            className="mt-2 w-full"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Outro valor
          </Button>
        </div>

        {/* History */}
        {recent.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Últimos lançamentos
            </p>
            <ul className="divide-y divide-border/40 rounded-lg border border-border/40 overflow-hidden">
              {recent.map((e) => {
                const cat = CATEGORIES.find((c) => c.id === e.category)!;
                const Icon = cat.icon;
                return (
                  <li key={e.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted shrink-0">
                      <Icon className="h-3.5 w-3.5 text-foreground/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground leading-tight truncate">
                        {e.note || cat.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {cat.label} · {format(new Date(e.date), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold text-destructive shrink-0">
                      −{formatMoney(e.amount, state.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEntry(e.id)}
                      aria-label="Remover lançamento"
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* By category */}
        {total > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Por categoria
            </p>
            <div className="space-y-1.5">
              {CATEGORIES.map((c) => {
                const v = byCategory[c.id] || 0;
                const p = total > 0 ? (v / total) * 100 : 0;
                if (v === 0) return null;
                const Icon = c.icon;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[12px] text-foreground/80 w-24 shrink-0">{c.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-[hsl(var(--wallet-brand))]" style={{ width: `${p}%` }} />
                    </div>
                    <span className="text-[12px] font-medium text-foreground/80 shrink-0 w-20 text-right">
                      {formatMoney(v, state.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Dados salvos somente neste dispositivo.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="text-[11px] font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Zerar
          </button>
        </div>
      </div>

      <SetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        suggestedCurrency={suggested}
        initial={{ budget: state.budget, currency: state.currency }}
        onSave={handleSetup}
      />
      <ManualEntryDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        currency={state.currency}
        onAdd={addEntry}
      />
    </section>
  );
}

export default MyBudgetCard;