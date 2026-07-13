import { Button } from "@/components/ui/button";
import arenaInterior from "@/assets/orlando-magic/arena-interior.jpg";
import { FINAL_CTA, scrollToForm } from "./content";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <img src={arenaInterior} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/60" />
      <div className="relative mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:py-20">
        <div>
          <h2 className="font-display text-[28px] font-bold leading-tight sm:text-[36px] lg:text-[42px]">
            {FINAL_CTA.title}
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-[1.65] text-slate-200 sm:text-[18px]">
            {FINAL_CTA.text}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <Button
            onClick={scrollToForm}
            className="h-[54px] w-full rounded-xl bg-blue-600 px-7 text-[15px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 sm:w-auto sm:text-base"
          >
            {FINAL_CTA.button}
          </Button>
          <p className="max-w-xs text-[13px] leading-relaxed text-slate-300 lg:text-right">{FINAL_CTA.note}</p>
        </div>
      </div>
    </section>
  );
}
