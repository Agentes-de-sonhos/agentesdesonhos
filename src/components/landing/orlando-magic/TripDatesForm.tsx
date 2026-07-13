import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Minus, Plus, MessageCircle, ShieldCheck } from "lucide-react";
import { FORM, FORM_ANCHOR_ID } from "./content";

function Counter({ value, onChange, min = 0 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[24px] text-center text-sm font-semibold text-slate-900">{value}</span>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TripDatesForm() {
  const [name, setName] = useState("");
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [kidsAges, setKidsAges] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(FORM.demoNotice);
  };

  return (
    <form
      id={FORM_ANCHOR_ID}
      onSubmit={onSubmit}
      className="rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 sm:p-6"
    >
      <h2 className="font-display text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
        {FORM.title}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{FORM.subtitle}</p>

      <div className="mt-5 space-y-4">
        <div>
          <Label htmlFor="om-name" className="text-xs font-semibold text-slate-700">Seu nome</Label>
          <Input id="om-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos chamar você?" className="mt-1" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="om-arr" className="text-xs font-semibold text-slate-700">Data de chegada a Orlando</Label>
            <div className="relative mt-1">
              <Input id="om-arr" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <Label htmlFor="om-dep" className="text-xs font-semibold text-slate-700">Data de saída de Orlando</Label>
            <div className="relative mt-1">
              <Input id="om-dep" type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700">Quantas pessoas vão ao jogo?</p>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-slate-500">Adultos</Label>
              <Counter value={adults} onChange={setAdults} min={1} />
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">Crianças</Label>
              <Counter value={kids} onChange={setKids} />
            </div>
          </div>
        </div>

        {kids > 0 && (
          <div>
            <Label htmlFor="om-ages" className="text-xs font-semibold text-slate-700">Qual é a idade das crianças?</Label>
            <Input id="om-ages" value={kidsAges} onChange={(e) => setKidsAges(e.target.value)} placeholder="Ex.: 5 anos, 10 anos" className="mt-1" />
          </div>
        )}

        <div>
          <Label htmlFor="om-wpp" className="text-xs font-semibold text-slate-700">Seu WhatsApp</Label>
          <Input id="om-wpp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" className="mt-1" />
        </div>

        <Button
          type="submit"
          className="h-12 w-full gap-2 rounded-xl bg-emerald-500 text-sm font-bold uppercase tracking-wide text-white hover:bg-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          {FORM.submit}
        </Button>

        <div className="pt-1 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            {FORM.noCommit}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{FORM.privacy}</p>
        </div>
      </div>
    </form>
  );
}
