import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  type QuoteEntryExtra,
  type QuoteEntryExtraType,
  type QuoteEntryExtraCalculationMode,
  ENTRY_EXTRA_TYPE_LABELS,
  computeExtraAmount,
  computeExtrasTotal,
} from "@/lib/quoteEntryExtras";

function fmtBRL(v: number) {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

interface QuoteEntryExtrasManagerProps {
  quoteId: string;
  /** Total dos serviços (base para cálculo de percentuais). */
  totalServicos: number;
  /** Entrada base já configurada (% sobre o total dos serviços). */
  baseEntryValue: number;
  /** Quantidade de parcelas configurada (para preview do impacto). */
  installmentsCount: number;
  /** Extras carregados inicialmente (via useQuote). */
  initial: QuoteEntryExtra[] | undefined;
  /** Notifica o pai quando a lista local mudou (para o snapshot). */
  onChange?: (extras: QuoteEntryExtra[]) => void;
}

export function QuoteEntryExtrasManager({
  quoteId,
  totalServicos,
  baseEntryValue,
  installmentsCount,
  initial,
  onChange,
}: QuoteEntryExtrasManagerProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<QuoteEntryExtra[]>(initial || []);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Sincroniza quando o quote terminar de carregar.
  useEffect(() => {
    setItems(initial || []);
  }, [initial]);

  const notify = useCallback((next: QuoteEntryExtra[]) => {
    setItems(next);
    onChange?.(next);
  }, [onChange]);

  async function handleAdd() {
    setAdding(true);
    const nextOrder = items.length;
    const payload = {
      quote_id: quoteId,
      type: "rav" as QuoteEntryExtraType,
      description: null,
      calculation_mode: "fixed" as QuoteEntryExtraCalculationMode,
      value: 0,
      visible_to_client: false,
      sort_order: nextOrder,
    };
    const { data, error } = await (supabase as any)
      .from("quote_entry_extras")
      .insert(payload)
      .select()
      .single();
    setAdding(false);
    if (error) {
      toast({ title: "Não foi possível adicionar o item", description: error.message, variant: "destructive" });
      return;
    }
    notify([...items, data as QuoteEntryExtra]);
  }

  async function handleUpdate(id: string, patch: Partial<QuoteEntryExtra>) {
    const prev = items;
    const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    notify(next);
    setSavingId(id);
    const { error } = await (supabase as any)
      .from("quote_entry_extras")
      .update(patch)
      .eq("id", id);
    setSavingId(null);
    if (error) {
      notify(prev);
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    const prev = items;
    notify(items.filter((it) => it.id !== id));
    const { error } = await (supabase as any).from("quote_entry_extras").delete().eq("id", id);
    if (error) {
      notify(prev);
      toast({ title: "Não foi possível remover", description: error.message, variant: "destructive" });
    }
  }

  const extrasTotal = computeExtrasTotal(items, totalServicos);
  const investimentoTotal = totalServicos + extrasTotal;
  const entradaExibida = baseEntryValue + extrasTotal;
  const saldo = Math.max(0, investimentoTotal - entradaExibida);
  const parcela = installmentsCount > 0 ? saldo / installmentsCount : 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-sm font-semibold">Valores adicionais na entrada</Label>
          <p className="text-xs text-muted-foreground max-w-xl">
            Inclua RAV, taxas, fees ou encargos que devem compor a entrada consolidada do orçamento.
            Percentuais são calculados sobre o total dos serviços.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd} disabled={adding}>
          {adding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
          Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum valor adicional configurado.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const amount = computeExtraAmount(it, totalServicos);
            return (
              <li key={it.id} className="rounded-lg border border-border bg-background p-3">
                <div className="grid gap-2 sm:grid-cols-[140px_1fr_140px_140px_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={it.type}
                      onChange={(e) => handleUpdate(it.id, { type: e.target.value as QuoteEntryExtraType })}
                    >
                      {Object.entries(ENTRY_EXTRA_TYPE_LABELS).map(([k, l]) => (
                        <option key={k} value={k}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Descrição</Label>
                    <Input
                      value={it.description || ""}
                      placeholder="Ex.: RAV agência"
                      onChange={(e) => handleUpdate(it.id, { description: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Cálculo</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={it.calculation_mode}
                      onChange={(e) => handleUpdate(it.id, { calculation_mode: e.target.value as QuoteEntryExtraCalculationMode })}
                    >
                      <option value="fixed">Fixo (R$)</option>
                      <option value="percent">Percentual (%)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Valor {it.calculation_mode === "percent" ? "(%)" : "(R$)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={it.value}
                      onChange={(e) => handleUpdate(it.id, { value: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(it.id)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Switch
                      checked={it.visible_to_client}
                      onCheckedChange={(checked) => handleUpdate(it.id, { visible_to_client: checked })}
                    />
                    Exibir descrição para o cliente
                  </label>
                  <div className="text-foreground/80">
                    Impacto: <span className="font-semibold">{fmtBRL(amount)}</span>
                    {savingId === it.id && (
                      <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/85">
          <p>Total dos serviços: <span className="font-semibold">{fmtBRL(totalServicos)}</span></p>
          <p>Adicionais na entrada: <span className="font-semibold">{fmtBRL(extrasTotal)}</span></p>
          <p>Investimento total: <span className="font-semibold">{fmtBRL(investimentoTotal)}</span></p>
          <p>
            Entrada exibida: <span className="font-semibold">{fmtBRL(entradaExibida)}</span>
            {" "}+ {installmentsCount}x de <span className="font-semibold">{fmtBRL(parcela)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default QuoteEntryExtrasManager;