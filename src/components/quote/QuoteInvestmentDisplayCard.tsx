import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { QuotePricingModeCard } from "@/components/quote/QuotePricingModeCard";
import type { QuotePricingMode } from "@/lib/quotePricing";

interface Props {
  quote: any;
  /** true = total do investimento oculto no público/PDF. */
  hideTotal: boolean;
  onChangeHideTotal: (hide: boolean) => void | Promise<unknown>;
  onSavePricing: (input: { pricingMode: QuotePricingMode; packageTotal?: number | null }) => void | Promise<unknown>;
  savingPricing?: boolean;
}

/**
 * Item "Investimento" do wizard de apresentação.
 *
 * A escolha de exibição (mostrar/ocultar o total) e a forma de cálculo
 * (soma dos serviços x valor fechado de pacote) são estados independentes:
 * ocultar o total nunca apaga o modo nem o valor fechado do pacote.
 */
export function QuoteInvestmentDisplayCard({
  quote, hideTotal, onChangeHideTotal, onSavePricing, savingPricing,
}: Props) {
  const options = [
    {
      value: false,
      title: "Valor total do orçamento",
      description: "O cliente vê o valor total do investimento no orçamento público e no PDF.",
      Icon: Eye,
    },
    {
      value: true,
      title: "Ocultar valor total do investimento",
      description: "O total não é exibido ao cliente. A forma de cálculo e os valores continuam salvos.",
      Icon: EyeOff,
    },
  ];

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <Label className="text-sm font-semibold">Exibição do investimento</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const active = hideTotal === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChangeHideTotal(opt.value)}
              className={cn(
                "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-border/80 hover:bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                  active ? "border-primary" : "border-muted-foreground/40",
                )}
              >
                {active && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <opt.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {opt.title}
                </p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {!hideTotal && (
        <div className="border-t pt-3">
          <QuotePricingModeCard
            embedded
            quote={quote}
            onSave={onSavePricing}
            saving={savingPricing}
          />
        </div>
      )}
    </section>
  );
}