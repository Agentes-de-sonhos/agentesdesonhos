import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Pencil, RotateCcw } from "lucide-react";
import { computeQuoteTotalState, type QuotePricingMode } from "@/lib/quotePricing";
import { formatQuoteCurrency, getQuoteCurrencyInfo } from "@/lib/quoteCurrency";

interface Props {
  quote: any;
  onSavePricing: (input: { pricingMode: QuotePricingMode; packageTotal?: number | null }) => void | Promise<unknown>;
  saving?: boolean;
}

/**
 * Bloco "Valor total do orçamento".
 *
 * O total é sempre calculado automaticamente pela soma dos serviços. A agência
 * pode substituir esse valor manualmente (valor fechado de pacote) sem alterar
 * nenhum valor individual dos serviços.
 */
export function QuoteTotalAmountCard({ quote, onSavePricing, saving }: Props) {
  const { currency } = getQuoteCurrencyInfo(quote);
  const state = computeQuoteTotalState(quote, quote?.services);
  const noValues = !state.hasAnyServiceValue && !state.manual;

  const [editing, setEditing] = useState(noValues);
  const [draft, setDraft] = useState<number | null>(state.manual ? state.manualAmount : null);
  const [error, setError] = useState<string | null>(null);
  const quoteIdRef = useRef(quote?.id);

  useEffect(() => {
    if (quoteIdRef.current !== quote?.id) {
      quoteIdRef.current = quote?.id;
      setEditing(false);
      setError(null);
    }
    setDraft(state.manual ? state.manualAmount : null);
  }, [quote?.id, state.manual, state.manualAmount]);

  const fmt = (v: number) => formatQuoteCurrency(v, currency);

  async function handleSave() {
    if (!(Number(draft) > 0)) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setError(null);
    await onSavePricing({ pricingMode: "package", packageTotal: Number(draft) });
    setEditing(false);
  }

  async function handleUseSum() {
    setError(null);
    await onSavePricing({ pricingMode: "itemized" });
    setEditing(false);
  }

  const showEditor = editing || noValues;

  return (
    <section className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
      <Label className="text-sm font-medium">Valor total do orçamento</Label>

      {showEditor ? (
        <div className="space-y-2">
          <CurrencyInput
            value={draft}
            onValueChange={(v) => { setDraft(v); setError(null); }}
            aria-label="Valor total do orçamento"
            placeholder={noValues ? "Informe o valor fechado do pacote" : "R$ 0,00"}
          />
          {noValues && (
            <p className="text-xs text-muted-foreground">
              Nenhum serviço possui valor informado. Digite o valor total que será apresentado ao cliente.
            </p>
          )}
          {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              Salvar valor
            </Button>
            {!noValues && (
              <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setError(null); setDraft(state.manual ? state.manualAmount : null); }}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xl font-semibold tracking-tight">{fmt(state.total)}</p>
              <p className="text-xs text-muted-foreground">
                {state.manual
                  ? "Valor definido manualmente"
                  : state.servicesWithoutValue > 0
                    ? "Soma dos serviços com valor informado"
                    : "Calculado automaticamente pela soma dos serviços"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} disabled={saving}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar valor
              </Button>
              {state.manual && (
                <Button type="button" size="sm" variant="ghost" onClick={handleUseSum} disabled={saving}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Usar soma dos serviços
                </Button>
              )}
            </div>
          </div>

          {state.manual && (
            <p className="text-xs text-muted-foreground">
              Soma atual dos serviços: {fmt(state.servicesSum)}
            </p>
          )}

          {!state.manual && state.servicesWithoutValue > 0 && (
            <p role="alert" className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Atenção: {state.servicesWithoutValue === 1
                ? "existe 1 serviço sem valor que não foi incluído neste total."
                : `existem ${state.servicesWithoutValue} serviços sem valor que não foram incluídos neste total.`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
