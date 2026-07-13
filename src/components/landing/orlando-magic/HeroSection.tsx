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
          alt="Interior do Kia Center durante partida do Orlando Magic"
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/30" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          {/* Left: text */}
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400 sm:text-sm">
              {HERO.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {HERO.titleLead}{" "}
              <span className="text-sky-400">{HERO.titleHighlight}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              {HERO.description}
            </p>

            <Button
              onClick={scrollToForm}
              className="mt-7 h-14 gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-700 sm:text-base"
            >
              {HERO.cta}
            </Button>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-200 sm:text-sm">
              {HERO.indicators.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            <p className="mt-5 text-[11px] leading-relaxed text-slate-400 sm:text-xs">
              {HERO.disclaimer}
            </p>
          </div>

          {/* Right: form */}
          <div className="lg:-mb-24">
            <TripDatesForm />
          </div>
        </div>
      </div>
    </section>
  );
}
