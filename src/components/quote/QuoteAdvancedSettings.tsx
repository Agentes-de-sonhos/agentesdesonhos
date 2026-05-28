import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CURRENCY_OPTIONS,
  getCurrencySymbol,
  getQuoteCurrencyInfo,
  type QuoteCurrency,
  type CurrencyMode,
} from "@/lib/quoteCurrency";

interface Props {
  quote: any;
  onUpdated?: () => void;
}

export function QuoteAdvancedSettings({ quote, onUpdated }: Props) {
  const { toast } = useToast();
  const initial = getQuoteCurrencyInfo(quote);
  const [currency, setCurrency] = useState<QuoteCurrency>(initial.currency);
  const [mode, setMode] = useState<CurrencyMode>(initial.currencyMode);
  const [rate, setRate] = useState<number | null>(initial.exchangeRate);
  const [saving, setSaving] = useState(false);

  async function persist(next: { currency: QuoteCurrency; mode: CurrencyMode; rate: number | null }) {
    if (!quote?.id) return;
    setSaving(true);
    const payload: any = {
      currency: next.currency,
      currency_mode: next.currency === "BRL" ? "fixed" : next.mode,
      exchange_rate: next.currency !== "BRL" && next.mode === "conversion" ? next.rate : null,
    };
    const { error } = await supabase.from("quotes").update(payload).eq("id", quote.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Moeda atualizada", description: "A exibição do orçamento foi atualizada." });
    onUpdated?.();
  }

  function handleCurrency(value: QuoteCurrency) {
    const nextMode = value === "BRL" ? "fixed" : mode;
    setCurrency(value);
    setMode(nextMode);
    persist({ currency: value, mode: nextMode, rate });
  }

  function handleMode(value: CurrencyMode) {
    setMode(value);
    persist({ currency, mode: value, rate });
  }

  function handleRateBlur() {
    persist({ currency, mode, rate });
  }

  const showConversion = currency !== "BRL";
  const showRate = showConversion && mode === "conversion";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/20 p-4 space-y-1">
        <p className="text-sm font-semibold">Moeda do orçamento</p>
        <p className="text-xs text-muted-foreground">
          Altere a moeda a qualquer momento. Os valores cadastrados nos serviços não são modificados —
          apenas a forma como eles são apresentados no link público, no PDF e no total do orçamento.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Selecione a moeda</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {CURRENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleCurrency(opt.value)}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                currency === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30 text-primary"
                  : "border-border hover:border-border/80 hover:bg-muted/30 text-foreground"
              )}
            >
              <span>{opt.flag}</span>
              <span>{opt.label} ({opt.symbol})</span>
            </button>
          ))}
        </div>
      </div>

      {showConversion && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Modo de cálculo</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleMode("fixed")}
              disabled={saving}
              className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                mode === "fixed"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              )}
            >
              <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", mode === "fixed" ? "border-primary" : "border-muted-foreground/40")}>
                {mode === "fixed" && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium">Moeda fixa</p>
                <p className="text-xs text-muted-foreground">Valores inseridos direto em {getCurrencySymbol(currency)}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleMode("conversion")}
              disabled={saving}
              className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                mode === "conversion"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              )}
            >
              <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", mode === "conversion" ? "border-primary" : "border-muted-foreground/40")}>
                {mode === "conversion" && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium">Conversão automática</p>
                <p className="text-xs text-muted-foreground">Base em R$, convertido para {getCurrencySymbol(currency)}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {showRate && (
        <div className="space-y-1.5">
          <Label className="text-xs">Taxa de câmbio (1 {getCurrencySymbol(currency)} = ? R$)</Label>
          <Input
            type="number"
            min={0.01}
            step="0.01"
            placeholder="Ex: 5.20"
            value={rate ?? ""}
            onChange={(e) => setRate(parseFloat(e.target.value) || null)}
            onBlur={handleRateBlur}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {CURRENCY_OPTIONS.find((c) => c.value === currency)?.flag}{" "}
          {mode === "fixed" || currency === "BRL" ? "Moeda fixa" : "Conversão ativa"} — {getCurrencySymbol(currency)}
        </Badge>
        {saving && <span className="text-xs text-muted-foreground">Salvando…</span>}
      </div>
    </div>
  );
}