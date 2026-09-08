import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, Thermometer, Footprints, Shirt, Weight, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizePublicLocale, type PublicLocale } from "@/i18n/publicMaterials/locale";
import { tWallet } from "@/i18n/publicMaterials/wallet";

function ResultCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--wallet-brand-soft))] border border-[hsl(var(--wallet-brand)/0.18)] p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground">
        {value}
        {unit ? <span className="text-sm font-medium text-foreground/70 ml-1">{unit}</span> : null}
      </p>
    </div>
  );
}

function fmt(n: number, locale: PublicLocale, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(normalizePublicLocale(locale), { maximumFractionDigits: digits });
}

/* Temperature */
function TemperatureTab({ locale }: { locale: PublicLocale }) {
  const t = tWallet(locale);
  const [value, setValue] = useState("25");
  const [from, setFrom] = useState<"C" | "F">("C");
  const num = parseFloat(value.replace(",", ".")) || 0;
  const c = from === "C" ? num : (num - 32) * (5 / 9);
  const f = from === "F" ? num : num * (9 / 5) + 32;
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-foreground/70">{t("measTemperatura")}</label>
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="space-y-1.5 w-28">
          <label className="text-xs font-medium text-foreground/70">{t("measUnidade")}</label>
          <Select value={from} onValueChange={(v) => setFrom(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="C">°C</SelectItem>
              <SelectItem value="F">°F</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setFrom((d) => (d === "C" ? "F" : "C"))} title={t("measInverter")}>
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultCard label={t("measCelsius")} value={fmt(c, locale, 1)} unit="°C" />
        <ResultCard label={t("measFahrenheit")} value={fmt(f, locale, 1)} unit="°F" />
      </div>
    </div>
  );
}

/* Distance */
function DistanceTab({ locale }: { locale: PublicLocale }) {
  const t = tWallet(locale);
  const [value, setValue] = useState("10");
  const [from, setFrom] = useState<"KM" | "MI">("KM");
  const num = parseFloat(value.replace(",", ".")) || 0;
  const km = from === "KM" ? num : num * 1.609344;
  const mi = from === "MI" ? num : num / 1.609344;
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-foreground/70">{t("measDistancia")}</label>
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="space-y-1.5 w-28">
          <label className="text-xs font-medium text-foreground/70">{t("measUnidade")}</label>
          <Select value={from} onValueChange={(v) => setFrom(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="KM">{t("measUnitKm")}</SelectItem>
              <SelectItem value="MI">{t("measUnitMilhas")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setFrom((d) => (d === "KM" ? "MI" : "KM"))} title={t("measInverter")}>
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultCard label={t("measQuilometros")} value={fmt(km, locale)} unit="km" />
        <ResultCard label={t("measMilhas")} value={fmt(mi, locale)} unit="mi" />
      </div>
    </div>
  );
}

/* Weight */
function WeightTab({ locale }: { locale: PublicLocale }) {
  const t = tWallet(locale);
  const [value, setValue] = useState("23");
  const [from, setFrom] = useState<"KG" | "LB">("KG");
  const num = parseFloat(value.replace(",", ".")) || 0;
  const kg = from === "KG" ? num : num * 0.45359237;
  const lb = from === "LB" ? num : num / 0.45359237;
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-foreground/70">{t("measPeso")}</label>
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="space-y-1.5 w-28">
          <label className="text-xs font-medium text-foreground/70">{t("measUnidade")}</label>
          <Select value={from} onValueChange={(v) => setFrom(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="KG">{t("measUnitKg")}</SelectItem>
              <SelectItem value="LB">{t("measUnitLibras")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setFrom((d) => (d === "KG" ? "LB" : "KG"))} title={t("measInverter")}>
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultCard label={t("measQuilogramas")} value={fmt(kg, locale)} unit="kg" />
        <ResultCard label={t("measLibras")} value={fmt(lb, locale)} unit="lb" />
      </div>
    </div>
  );
}

/* Shoes */
type ShoeRow = { br: number; eu: number; us: number };
const SHOES_M: ShoeRow[] = [
  { br: 37, eu: 38, us: 6 }, { br: 38, eu: 39, us: 7 }, { br: 39, eu: 40, us: 7.5 },
  { br: 40, eu: 41, us: 8 }, { br: 41, eu: 42, us: 9 }, { br: 42, eu: 43, us: 10 },
  { br: 43, eu: 44, us: 10.5 }, { br: 44, eu: 45, us: 11 }, { br: 45, eu: 46, us: 12 },
  { br: 46, eu: 47, us: 13 },
];
const SHOES_F: ShoeRow[] = [
  { br: 33, eu: 34, us: 4.5 }, { br: 34, eu: 35, us: 5 }, { br: 35, eu: 36, us: 5.5 },
  { br: 36, eu: 37, us: 6.5 }, { br: 37, eu: 38, us: 7.5 }, { br: 38, eu: 39, us: 8.5 },
  { br: 39, eu: 40, us: 9 }, { br: 40, eu: 41, us: 9.5 }, { br: 41, eu: 42, us: 10.5 },
];
const SHOES_K: ShoeRow[] = [
  { br: 18, eu: 19, us: 3.5 }, { br: 19, eu: 20, us: 4 }, { br: 20, eu: 21, us: 5 },
  { br: 21, eu: 22, us: 5.5 }, { br: 22, eu: 23, us: 6.5 }, { br: 23, eu: 24, us: 7 },
  { br: 24, eu: 25, us: 8 }, { br: 25, eu: 26, us: 8.5 }, { br: 26, eu: 27, us: 9.5 },
  { br: 27, eu: 28, us: 10 }, { br: 28, eu: 29, us: 11 }, { br: 29, eu: 30, us: 11.5 },
  { br: 30, eu: 31, us: 12.5 }, { br: 31, eu: 32, us: 13 }, { br: 32, eu: 33, us: 1 },
];

function ShoeBlock({ table, defaultBr, locale }: { table: ShoeRow[]; defaultBr: number; locale: PublicLocale }) {
  const t = tWallet(locale);
  const [br, setBr] = useState<number>(defaultBr);
  const row = useMemo(() => table.find((r) => r.br === br) ?? table[0], [table, br]);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/70">{t("measNumBrasil")}</label>
        <Select value={String(br)} onValueChange={(v) => setBr(Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {table.map((r) => <SelectItem key={r.br} value={String(r.br)}>BR {r.br}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label={t("measBrasil")} value={String(row.br)} />
        <ResultCard label={t("measEUA")} value={String(row.us)} />
        <ResultCard label={t("measEuropa")} value={String(row.eu)} />
      </div>
    </div>
  );
}

function ShoesTab({ locale }: { locale: PublicLocale }) {
  const tr = tWallet(locale);
  const [g, setG] = useState<"M" | "F" | "K">("F");
  const tables: Record<string, { table: ShoeRow[]; def: number }> = {
    M: { table: SHOES_M, def: 41 },
    F: { table: SHOES_F, def: 36 },
    K: { table: SHOES_K, def: 25 },
  };
  const t = tables[g];
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[
          { v: "F", l: tr("measFeminino") }, { v: "M", l: tr("measMasculino") }, { v: "K", l: tr("measInfantil") },
        ].map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => setG(opt.v as any)}
            className={`flex-1 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
              g === opt.v
                ? "bg-[hsl(var(--wallet-brand))] text-white border-transparent"
                : "bg-card text-foreground/70 hover:bg-muted"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
      <ShoeBlock key={g} table={t.table} defaultBr={t.def} locale={locale} />
      <p className="text-[11px] text-muted-foreground text-center">{tr("measShoeNote")}</p>
    </div>
  );
}

/* Apparel */
type ApparelRow = { br: string; us: string; eu: string };
const TSHIRT: ApparelRow[] = [
  { br: "PP", us: "XS", eu: "42" },
  { br: "P", us: "S", eu: "44" },
  { br: "M", us: "M", eu: "46" },
  { br: "G", us: "L", eu: "48" },
  { br: "GG", us: "XL", eu: "50" },
  { br: "XGG", us: "XXL", eu: "52" },
];
const PANTS: ApparelRow[] = [
  { br: "36", us: "28", eu: "44" },
  { br: "38", us: "30", eu: "46" },
  { br: "40", us: "32", eu: "48" },
  { br: "42", us: "34", eu: "50" },
  { br: "44", us: "36", eu: "52" },
  { br: "46", us: "38", eu: "54" },
  { br: "48", us: "40", eu: "56" },
];
const JACKETS: ApparelRow[] = [
  { br: "P", us: "36", eu: "46" },
  { br: "M", us: "38", eu: "48" },
  { br: "G", us: "40", eu: "50" },
  { br: "GG", us: "42", eu: "52" },
  { br: "XGG", us: "44", eu: "54" },
];

function ApparelBlock({ table, locale }: { table: ApparelRow[]; locale: PublicLocale }) {
  const t = tWallet(locale);
  const [br, setBr] = useState<string>(table[Math.floor(table.length / 2)].br);
  const row = useMemo(() => table.find((r) => r.br === br) ?? table[0], [table, br]);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/70">{t("measTamanhoBrasil")}</label>
        <Select value={br} onValueChange={setBr}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {table.map((r) => <SelectItem key={r.br} value={r.br}>BR {r.br}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label={t("measBrasil")} value={row.br} />
        <ResultCard label={t("measEUA")} value={row.us} />
        <ResultCard label={t("measEuropa")} value={row.eu} />
      </div>
    </div>
  );
}

function ApparelTab({ locale }: { locale: PublicLocale }) {
  const t = tWallet(locale);
  const [g, setG] = useState<"T" | "P" | "J">("T");
  const map: Record<string, ApparelRow[]> = { T: TSHIRT, P: PANTS, J: JACKETS };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[
          { v: "T", l: t("measCamiseta") }, { v: "P", l: t("measCalca") }, { v: "J", l: t("measJaqueta") },
        ].map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => setG(opt.v as any)}
            className={`flex-1 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
              g === opt.v
                ? "bg-[hsl(var(--wallet-brand))] text-white border-transparent"
                : "bg-card text-foreground/70 hover:bg-muted"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
      <ApparelBlock key={g} table={map[g]} locale={locale} />
      <p className="text-[11px] text-muted-foreground text-center">{t("measApparelNote")}</p>
    </div>
  );
}

export function MeasurementsConverterDialog({ open, onOpenChange, locale = "pt-BR" }: { open: boolean; onOpenChange: (v: boolean) => void; locale?: PublicLocale }) {
  const t = tWallet(locale);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" style={{ color: "hsl(var(--wallet-brand))" }} />
            {t("measTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("measDesc")}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="temp" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-auto p-1">
            <TabsTrigger value="temp" className="flex flex-col gap-0.5 py-2 text-[10px]">
              <Thermometer className="h-4 w-4" /> {t("measTabTemp")}
            </TabsTrigger>
            <TabsTrigger value="dist" className="flex flex-col gap-0.5 py-2 text-[10px]">
              <Ruler className="h-4 w-4" /> {t("measTabDist")}
            </TabsTrigger>
            <TabsTrigger value="weight" className="flex flex-col gap-0.5 py-2 text-[10px]">
              <Weight className="h-4 w-4" /> {t("measTabWeight")}
            </TabsTrigger>
            <TabsTrigger value="shoes" className="flex flex-col gap-0.5 py-2 text-[10px]">
              <Footprints className="h-4 w-4" /> {t("measTabShoes")}
            </TabsTrigger>
            <TabsTrigger value="apparel" className="flex flex-col gap-0.5 py-2 text-[10px]">
              <Shirt className="h-4 w-4" /> {t("measTabApparel")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="temp" className="mt-4"><TemperatureTab locale={locale} /></TabsContent>
          <TabsContent value="dist" className="mt-4"><DistanceTab locale={locale} /></TabsContent>
          <TabsContent value="weight" className="mt-4"><WeightTab locale={locale} /></TabsContent>
          <TabsContent value="shoes" className="mt-4"><ShoesTab locale={locale} /></TabsContent>
          <TabsContent value="apparel" className="mt-4"><ApparelTab locale={locale} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default MeasurementsConverterDialog;
