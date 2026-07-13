import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import arenaInterior from "@/assets/orlando-magic/arena-interior.jpg";
import { HERO, scrollToForm } from "./content";
import { TripDatesForm } from "./TripDatesForm";

export function HeroSection() {
  return (
    <section className="relative bg-slate-950 text-white">
      <div className="absolute inset-0">
        <img
          src={arenaInterior}
          alt={HERO.imageAlt}
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/30" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.5fr_minmax(380px,420px)] lg:gap-14">
          {/* Left: text */}
          <div className="max-w-2xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-sky-400 sm:text-sm">
              {HERO.eyebrow}
            </p>
            <h1 className="mt-5 font-display text-[36px] font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[60px]">
              {HERO.titleLead}{" "}
              <span className="text-sky-400">{HERO.titleHighlight}</span>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-[1.6] text-slate-200 sm:text-[19px]">
              {HERO.description}
            </p>

            <Button
              onClick={scrollToForm}
              className="mt-8 h-[52px] gap-2 rounded-xl bg-blue-600 px-7 text-[15px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 sm:text-base"
            >
              {HERO.cta}
            </Button>

            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5 text-[13px] text-slate-200 sm:text-sm">
              {HERO.indicators.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[12px] leading-relaxed text-slate-400 sm:text-[13px]">
              {HERO.disclaimer}
            </p>
          </div>

          {/* Right: form */}
          <div className="lg:-mb-16">
            <TripDatesForm />
          </div>
        </div>
      </div>
    </section>
  );
}
