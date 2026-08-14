import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Calculator, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPackageTotalAmount,
  getQuotePricingMode,
  sumServiceAmounts,
  type QuotePricingMode,
} from "@/lib/quotePricing";
import { formatQuoteCurrency, getQuoteCurrencyInfo } from "@/lib/quoteCurrency";

interface Props {
  quote: any;
  onSave: (input: { pricingMode: QuotePricingMode; packageTotal?: number | null }) => void | Promise<unknown>;
  saving?: boolean;
}

/**
 * Escolha entre somar os serviços ou usar um valor fechado de pacote.
 * O valor de cada serviço permanece salvo — apenas deixa de compor o total.
 */
export function QuotePricingModeCard({ quote, onSave, saving }: Props) {
  const mode = getQuotePricingMode(quote);
  const { currency } = getQuoteCurrencyInfo(quote);
  const servicesSum = sumServiceAmounts(quote?.services);
  const [packageTotal, setPackageTotal] = useState<number | null>(
    getPackageTotalAmount(quote) || null,
  );

  useEffect(() => {
    setPackageTotal(getPackageTotalAmount(quote) || null);
  }, [quote?.id, quote?.package_total_amount]);

  const options: { value: QuotePricingMode; title: string; description: string; Icon: typeof Calculator }[] = [
    {
      value: "itemized",
      title: "Somar os serviços",
      description: "O total do orçamento é a soma dos valores de cada serviço.",
      Icon: Calculator,
    },
    {
      value: "package",
      title: "Valor fechado de pacote",
      description: "Você informa um único valor final. Os serviços aparecem sem valor individual.",
      Icon: Package,
    },
  ];

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <Label className="text-sm font-semibold">Como calcular o valor do orçamento?</Label>
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
            onClick={() =>
              onSave({
                pricingMode: opt.value,
                packageTotal: opt.value === "package" ? packageTotal ?? servicesSum : null,
              })
            }
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
              mode === opt.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-border/80 hover:bg-muted/30",
            )}
          >
            <div
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                mode === opt.value ? "border-primary" : "border-muted-foreground/40",
              )}
            >
              {mode === opt.value && <div className="h-2 w-2 rounded-full bg-primary" />}
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

      {mode === "package" && (
        <div className="space-y-1.5 rounded-xl border border-dashed bg-muted/30 p-3">
          <Label className="text-xs font-medium">Valor total do pacote</Label>
          <CurrencyInput
            value={packageTotal}
            onValueChange={setPackageTotal}
            onBlur={() => onSave({ pricingMode: "package", packageTotal })}
            aria-label="Valor total do pacote"
          />
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
    </section>
  );
}
