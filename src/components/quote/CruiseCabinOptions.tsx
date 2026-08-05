import { Ship } from "lucide-react";
import { cabinOptionLabel, type CruiseCabinOption } from "@/lib/cruiseCabins";
import { getRoomPaymentSimulation } from "@/lib/servicePayment";

interface Props {
  cabins: CruiseCabinOption[];
  /** Serviço do cruzeiro — usado apenas para reaproveitar as condições de pagamento já configuradas. */
  service?: any;
  quote?: any;
  showPrices?: boolean;
  formatValue: (v: number) => string;
}

/**
 * Seção pública "Opções de cabine".
 * As opções são ALTERNATIVAS — os valores nunca são somados entre si.
 * O parcelamento de cada opção reaproveita a configuração de pagamento do serviço/orçamento.
 */
export default function CruiseCabinOptions({ cabins, service, quote, showPrices = true, formatValue }: Props) {
  if (!cabins || cabins.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {cabins.length > 1 ? "Opções de cabine" : "Cabine"}
      </div>
      {cabins.length > 1 && (
        <p className="text-[11px] text-muted-foreground">
          Alternativas para a mesma viagem — escolha apenas uma.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {cabins.map((cabin, i) => {
          const total = Number(cabin.price) || 0;
          const sim = showPrices && total > 0 ? getRoomPaymentSimulation(total, service || {}, quote) : null;
          return (
            <div key={cabin.id || i} className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <Ship className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground break-words">{cabinOptionLabel(cabin)}</div>
                </div>
              </div>
              {sim && (
                <div className="pl-6 pt-1.5 border-t border-border/30 space-y-0.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatValue(sim.total)}</span>
                  </div>
                  {sim.installmentValue != null && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">ou {sim.installmentsCount}x de</span>
                      <span className="font-medium text-primary tabular-nums">{formatValue(sim.installmentValue)}</span>
                    </div>
                  )}
                  {sim.hasCashDiscount && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">à vista</span>
                      <span className="font-medium text-primary tabular-nums">{formatValue(sim.cashValue)}</span>
                    </div>
                  )}
                  {sim.method && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Forma de pagamento</span>
                      <span className="font-medium text-foreground">{sim.method}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
