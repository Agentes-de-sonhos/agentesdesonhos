import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Calculator, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPackageTotalAmount,
  getQuotePricingMode,
  isValidPricingDecision,
  PACKAGE_TOTAL_REQUIRED_MESSAGE,
  sumServiceAmounts,
  type QuotePricingMode,
} from "@/lib/quotePricing";
import { formatQuoteCurrency, getQuoteCurrencyInfo } from "@/lib/quoteCurrency";

interface Props {
  quote: any;
  onSave: (input: { pricingMode: QuotePricingMode; packageTotal?: number | null }) => void | Promise<unknown>;
  saving?: boolean;
  /** Renderiza sem o container de card (usado dentro do item Investimento do wizard). */
  embedded?: boolean;
}

/**
 * Escolha entre somar os serviços ou usar um valor fechado de pacote.
 * O valor de cada serviço permanece salvo — apenas deixa de compor o total.
 */
export function QuotePricingModeCard({ quote, onSave, saving, embedded }: Props) {
  const mode = getQuotePricingMode(quote);
  const { currency } = getQuoteCurrencyInfo(quote);
  const servicesSum = sumServiceAmounts(quote?.services);
  const [packageTotal, setPackageTotal] = useState<number | null>(
    getPackageTotalAmount(quote) || null,
  );
  /** Opção selecionada localmente — só é gravada quando válida. */
  const [draftMode, setDraftMode] = useState<QuotePricingMode>(mode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPackageTotal(getPackageTotalAmount(quote) || null);
  }, [quote?.id, quote?.package_total_amount]);

  useEffect(() => {
    setDraftMode(mode);
    setError(null);
  }, [mode, quote?.id]);

  const canApplyPackage = isValidPricingDecision({ pricingMode: "package", packageTotal });
  const pendingPackage = draftMode === "package" && (mode !== "package" || getPackageTotalAmount(quote) !== (packageTotal ?? 0));

  async function handleSelect(value: QuotePricingMode) {
    setError(null);
    setDraftMode(value);
    // Voltar para "somar os serviços" pode salvar de imediato (recalcula pela soma).
    if (value === "itemized" && mode !== "itemized") {
      await onSave({ pricingMode: "itemized" });
    }
  }

  async function handleApplyPackage() {
    if (!canApplyPackage) {
      setError(PACKAGE_TOTAL_REQUIRED_MESSAGE);
      return;
    }
    setError(null);
    await onSave({ pricingMode: "package", packageTotal });
  }

  const options: { value: QuotePricingMode; title: string; description: string; Icon: typeof Calculator }[] = [
    {
      value: "itemized",
      title: "Somar os serviços",
      description: "O total do orçamento será calculado pela soma dos valores de todos os serviços.",
      Icon: Calculator,
    },
    {
      value: "package",
      title: "Valor fechado de pacote",
      description: "Você informa um único valor final. Os serviços aparecem sem valor individual.",
      Icon: Package,
    },
  ];

  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper className={cn("space-y-3", !embedded && "rounded-xl border bg-card p-4 shadow-sm")}>
      <div className="space-y-1">
        <Label className="text-sm font-semibold">
          {embedded ? "Como calcular o valor total?" : "Como calcular o valor do orçamento?"}
        </Label>
        <p className="text-xs text-muted-foreground">
          Você pode somar os serviços ou apresentar um valor fechado de pacote. Trocar o modo não apaga
          os valores já cadastrados nos serviços.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            aria-pressed={draftMode === opt.value}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
              draftMode === opt.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-border/80 hover:bg-muted/30",
            )}
          >
            <div
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                draftMode === opt.value ? "border-primary" : "border-muted-foreground/40",
              )}
            >
              {draftMode === opt.value && <div className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <opt.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {opt.title}
              </p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>

      {draftMode === "package" && (
        <div className="space-y-1.5 rounded-xl border border-dashed bg-muted/30 p-3">
          <Label className="text-xs font-medium">Valor total do pacote</Label>
          <CurrencyInput
            value={packageTotal}
            onValueChange={(v) => { setPackageTotal(v); setError(null); }}
            aria-label="Valor total do pacote"
            placeholder="R$ 0,00"
          />
          <p className="text-xs text-muted-foreground">
            Informe o valor final que será apresentado ao cliente. Os valores cadastrados nos serviços
            serão preservados.
          </p>
          {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleApplyPackage}
              disabled={saving || !canApplyPackage}
            >
              Aplicar valor fechado
            </Button>
            {pendingPackage && canApplyPackage && (
              <span className="text-xs text-amber-700 dark:text-amber-300">Alteração não aplicada.</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Soma atual dos serviços cadastrados: {formatQuoteCurrency(servicesSum, currency)} — apenas
            referência, não é usada no total.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 border-t pt-3">
        <Badge variant="secondary" className="text-xs">
          {mode === "package" ? "Valor fechado de pacote" : "Soma dos serviços"}
        </Badge>
        {saving && <span className="text-xs text-muted-foreground">Salvando…</span>}
      </div>
    </Wrapper>
  );
}
