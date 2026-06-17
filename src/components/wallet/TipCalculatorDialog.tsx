import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Receipt } from "lucide-react";

const TIPS = [15, 18, 20];

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TipCalculatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [amount, setAmount] = useState("100");
  const num = parseFloat(amount.replace(",", ".")) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" style={{ color: "hsl(var(--wallet-brand))" }} />
            Calculadora de gorjetas
          </DialogTitle>
          <DialogDescription>
            Veja rapidamente a gorjeta e o valor total da conta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Valor da conta</label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold text-center"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TIPS.map((p) => {
              const tip = num * (p / 100);
              const total = num + tip;
              return (
                <div
                  key={p}
                  className="rounded-xl border border-[hsl(var(--wallet-brand)/0.18)] bg-[hsl(var(--wallet-brand-soft))] p-3 text-center"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--wallet-brand))" }}>
                    {p}%
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">Gorjeta</div>
                  <div className="text-base font-bold">{fmt(tip)}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">Total</div>
                  <div className="text-sm font-semibold text-foreground/80">{fmt(total)}</div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Valores na mesma moeda informada. Verifique se a gorjeta já está inclusa na conta.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TipCalculatorDialog;