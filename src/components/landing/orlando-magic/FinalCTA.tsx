import { Button } from "@/components/ui/button";
import arenaInterior from "@/assets/orlando-magic/arena-interior.jpg";
import { FINAL_CTA, scrollToForm } from "./content";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <img src={arenaInterior} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/60" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:py-20">
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
            {FINAL_CTA.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
            {FINAL_CTA.text}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <Button
            onClick={scrollToForm}
            className="h-14 rounded-xl bg-blue-600 px-6 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-700 sm:text-base"
          >
            {FINAL_CTA.button}
          </Button>
          <p className="max-w-xs text-xs text-slate-300 lg:text-right">{FINAL_CTA.note}</p>
        </div>
      </div>
    </section>
  );
}
