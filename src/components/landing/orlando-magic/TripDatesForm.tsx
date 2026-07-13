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
      className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-7"
    >
      <h2 className="font-display text-[22px] font-bold leading-tight text-slate-900 sm:text-2xl">
        {FORM.title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{FORM.subtitle}</p>

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="om-name" className="text-[13px] font-semibold text-slate-700">{FORM.nameLabel}</Label>
          <Input id="om-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={FORM.namePlaceholder} className="mt-1.5 h-11" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="om-arr" className="text-[13px] font-semibold text-slate-700">{FORM.arrivalLabel}</Label>
            <div className="relative mt-1.5">
              <Input id="om-arr" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder={FORM.arrivalPlaceholder} className="h-11" />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <Label htmlFor="om-dep" className="text-[13px] font-semibold text-slate-700">{FORM.departureLabel}</Label>
            <div className="relative mt-1.5">
              <Input id="om-dep" type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} placeholder={FORM.departurePlaceholder} className="h-11" />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-slate-700">{FORM.peopleLabel}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px] text-slate-500">{FORM.adultsLabel}</Label>
              <Counter value={adults} onChange={setAdults} min={1} />
            </div>
            <div>
              <Label className="text-[12px] text-slate-500">{FORM.kidsLabel}</Label>
              <Counter value={kids} onChange={setKids} />
            </div>
          </div>
        </div>

        {kids > 0 && (
          <div>
            <Label htmlFor="om-ages" className="text-[13px] font-semibold text-slate-700">{FORM.kidsAgesLabel}</Label>
            <Input id="om-ages" value={kidsAges} onChange={(e) => setKidsAges(e.target.value)} placeholder={FORM.kidsAgesPlaceholder} className="mt-1.5 h-11" />
          </div>
        )}

        <div>
          <Label htmlFor="om-wpp" className="text-[13px] font-semibold text-slate-700">{FORM.whatsappLabel}</Label>
          <Input id="om-wpp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder={FORM.whatsappPlaceholder} className="mt-1.5 h-11" />
        </div>

        <Button
          type="submit"
          className="h-[52px] w-full gap-2 rounded-xl bg-emerald-500 text-[14px] font-bold uppercase tracking-wide text-white hover:bg-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          {FORM.submit}
        </Button>

        <div className="pt-1.5 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            {FORM.noCommit}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{FORM.privacy}</p>
        </div>
      </div>
    </form>
  );
}
