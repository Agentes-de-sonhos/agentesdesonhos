import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Footprints, Ruler, Receipt, ArrowRightLeft } from "lucide-react";
import { MeasurementsConverterDialog } from "@/components/wallet/MeasurementsConverterDialog";
import { TipCalculatorDialog } from "@/components/wallet/TipCalculatorDialog";
import { TripChecklistDialog } from "@/components/wallet/TripChecklistDialog";

// Simple destination -> currency inference (best-effort)
const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  "portugal": { code: "EUR", symbol: "€", name: "Euro" },
  "espanha": { code: "EUR", symbol: "€", name: "Euro" },
  "spain": { code: "EUR", symbol: "€", name: "Euro" },
  "frança": { code: "EUR", symbol: "€", name: "Euro" },
  "franca": { code: "EUR", symbol: "€", name: "Euro" },
  "france": { code: "EUR", symbol: "€", name: "Euro" },
  "itália": { code: "EUR", symbol: "€", name: "Euro" },
  "italia": { code: "EUR", symbol: "€", name: "Euro" },
  "italy": { code: "EUR", symbol: "€", name: "Euro" },
  "alemanha": { code: "EUR", symbol: "€", name: "Euro" },
  "germany": { code: "EUR", symbol: "€", name: "Euro" },
  "holanda": { code: "EUR", symbol: "€", name: "Euro" },
  "países baixos": { code: "EUR", symbol: "€", name: "Euro" },
  "grécia": { code: "EUR", symbol: "€", name: "Euro" },
  "grecia": { code: "EUR", symbol: "€", name: "Euro" },
  "irlanda": { code: "EUR", symbol: "€", name: "Euro" },
  "estados unidos": { code: "USD", symbol: "$", name: "Dólar Americano" },
  "eua": { code: "USD", symbol: "$", name: "Dólar Americano" },
  "usa": { code: "USD", symbol: "$", name: "Dólar Americano" },
  "united states": { code: "USD", symbol: "$", name: "Dólar Americano" },
  "miami": { code: "USD", symbol: "$", name: "Dólar Americano" },
  "new york": { code: "USD", symbol: "$", name: "Dólar Americano" },
  "orlando": { code: "USD", symbol: "$", name: "Dólar Americano" },
  "reino unido": { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  "inglaterra": { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  "londres": { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  "uk": { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  "japão": { code: "JPY", symbol: "¥", name: "Iene" },
  "japao": { code: "JPY", symbol: "¥", name: "Iene" },
  "japan": { code: "JPY", symbol: "¥", name: "Iene" },
  "argentina": { code: "ARS", symbol: "$", name: "Peso Argentino" },
  "chile": { code: "CLP", symbol: "$", name: "Peso Chileno" },
  "méxico": { code: "MXN", symbol: "$", name: "Peso Mexicano" },
  "mexico": { code: "MXN", symbol: "$", name: "Peso Mexicano" },
  "canadá": { code: "CAD", symbol: "C$", name: "Dólar Canadense" },
  "canada": { code: "CAD", symbol: "C$", name: "Dólar Canadense" },
  "suíça": { code: "CHF", symbol: "CHF", name: "Franco Suíço" },
  "suica": { code: "CHF", symbol: "CHF", name: "Franco Suíço" },
  "switzerland": { code: "CHF", symbol: "CHF", name: "Franco Suíço" },
};

const CURRENCIES = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "Dólar Americano" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  { code: "JPY", symbol: "¥", name: "Iene Japonês" },
  { code: "CHF", symbol: "CHF", name: "Franco Suíço" },
  { code: "CAD", symbol: "C$", name: "Dólar Canadense" },
  { code: "AUD", symbol: "A$", name: "Dólar Australiano" },
  { code: "ARS", symbol: "$", name: "Peso Argentino" },
  { code: "CLP", symbol: "$", name: "Peso Chileno" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano" },
];

function inferCurrency(destination: string): string {
  const d = destination.toLowerCase();
  for (const key of Object.keys(COUNTRY_CURRENCY)) {
    if (d.includes(key)) return COUNTRY_CURRENCY[key].code;
  }
  return "EUR";
}

function CurrencyConverterDialog({ destination, open, onOpenChange }: { destination: string; open: boolean; onOpenChange: (v: boolean) => void; }) {
  const [target, setTarget] = useState(() => inferCurrency(destination || ""));
  const [amount, setAmount] = useState("100");
  const [direction, setDirection] = useState<"BRL_TO" | "TO_BRL">("TO_BRL");

  const { data: rate, isLoading, isError } = useQuery({
    queryKey: ["fx", target],
    queryFn: async () => {
      if (target === "BRL") return 1;
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?from=${target}&to=BRL`);
      if (!res.ok) throw new Error("fx");
      const j = await res.json();
      return j.rates.BRL as number; // 1 target = X BRL
    },
    staleTime: 1000 * 60 * 60,
    enabled: open,
  });

  const num = parseFloat(amount.replace(",", ".")) || 0;
  const result = rate ? (direction === "BRL_TO" ? num / rate : num * rate) : 0;
  const targetInfo = CURRENCIES.find((c) => c.code === target);

  const fmt = (v: number, code: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: code }).format(v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Conversor de moedas
          </DialogTitle>
          <DialogDescription>
            Cotação comercial atualizada (referência).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Moeda do destino</label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">
                {direction === "BRL_TO" ? "Valor em Real (BRL)" : `Valor em ${target}`}
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setDirection((d) => (d === "BRL_TO" ? "TO_BRL" : "BRL_TO"))}
              title="Inverter"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando cotação...</p>
            ) : isError ? (
              <p className="text-sm text-destructive">Não foi possível carregar a cotação.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-1">Equivale a</p>
                <p className="text-2xl font-bold">
                  {direction === "BRL_TO"
                    ? fmt(result, target)
                    : fmt(result, "BRL")}
                </p>
                {rate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    1 {target} = {fmt(rate, "BRL")}
                  </p>
                )}
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Valores de referência. Consulte sua casa de câmbio para a cotação final.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shoe size conversion tables (BR <-> EU/US-Men/US-Women/UK)
// BR sizing roughly = EU - 6 (women) / EU - 6 (men); approximations widely used.
const SHOE_TABLE: { br: number; eu: number; usM: number; usW: number; uk: number }[] = [
  { br: 33, eu: 34, usM: 3, usW: 4.5, uk: 2 },
  { br: 34, eu: 35, usM: 3.5, usW: 5, uk: 2.5 },
  { br: 35, eu: 36, usM: 4, usW: 5.5, uk: 3 },
  { br: 36, eu: 37, usM: 5, usW: 6.5, uk: 4 },
  { br: 37, eu: 38, usM: 6, usW: 7.5, uk: 5 },
  { br: 38, eu: 39, usM: 7, usW: 8.5, uk: 6 },
  { br: 39, eu: 40, usM: 7.5, usW: 9, uk: 6.5 },
  { br: 40, eu: 41, usM: 8, usW: 9.5, uk: 7 },
  { br: 41, eu: 42, usM: 9, usW: 10.5, uk: 8 },
  { br: 42, eu: 43, usM: 10, usW: 11.5, uk: 9 },
  { br: 43, eu: 44, usM: 10.5, usW: 12, uk: 9.5 },
  { br: 44, eu: 45, usM: 11, usW: 12.5, uk: 10 },
  { br: 45, eu: 46, usM: 12, usW: 13.5, uk: 11 },
  { br: 46, eu: 47, usM: 13, usW: 14.5, uk: 12 },
];

function ShoeSizeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void; }) {
  const [br, setBr] = useState<number>(39);
  const row = SHOE_TABLE.find((r) => r.br === br) ?? SHOE_TABLE[6];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-primary" />
            Conversor de calçados
          </DialogTitle>
          <DialogDescription>
            Selecione o número do Brasil para ver a numeração internacional.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Numeração no Brasil</label>
            <Select value={String(br)} onValueChange={(v) => setBr(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHOE_TABLE.map((r) => (
                  <SelectItem key={r.br} value={String(r.br)}>BR {r.br}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">Europa (EU)</p>
              <p className="text-2xl font-bold">{row.eu}</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">Reino Unido (UK)</p>
              <p className="text-2xl font-bold">{row.uk}</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">EUA Masculino</p>
              <p className="text-2xl font-bold">{row.usM}</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">EUA Feminino</p>
              <p className="text-2xl font-bold">{row.usW}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Tabela de referência. A numeração pode variar conforme a marca.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TripConverters({ destination }: { destination: string }) {
  const [openCur, setOpenCur] = useState(false);
  const [openMeasure, setOpenMeasure] = useState(false);
  const [openTip, setOpenTip] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto py-2.5 flex-col gap-1"
          onClick={() => setOpenCur(true)}
        >
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-medium leading-tight text-center">Moeda</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto py-2.5 flex-col gap-1"
          onClick={() => setOpenMeasure(true)}
        >
          <Ruler className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-medium leading-tight text-center">Medidas</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto py-2.5 flex-col gap-1"
          onClick={() => setOpenTip(true)}
        >
          <Receipt className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-medium leading-tight text-center">Gorjetas</span>
        </Button>
      </div>
      <CurrencyConverterDialog destination={destination} open={openCur} onOpenChange={setOpenCur} />
      <MeasurementsConverterDialog open={openMeasure} onOpenChange={setOpenMeasure} />
      <TipCalculatorDialog open={openTip} onOpenChange={setOpenTip} />
    </>
  );
}