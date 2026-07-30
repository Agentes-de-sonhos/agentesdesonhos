import { MapPin } from "lucide-react";
import heroImg from "@/assets/landing/comandatuba/hero-aerial.jpg";
import { HERO, scrollToForm, scrollTo, type AgencyConfig } from "./content";

export function HeroSection({ agency }: { agency: AgencyConfig }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt={HERO.imageAlt}
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/50 to-slate-900/25" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/60 to-transparent" />
      </div>

      <div className="relative">
        <div className="mx-auto flex max-w-[1280px] items-start px-5 pt-14 sm:px-8 sm:pt-20 lg:pt-24">
          <div className="max-w-xl text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-slate-800 shadow-sm">
              <MapPin className="h-3.5 w-3.5" style={{ color: agency.primaryColor }} />
              {HERO.badge}
            </span>
            <h1 className="mt-5 font-display text-[34px] font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[56px]">
              {HERO.titleLead} <span className="block">{HERO.titleHighlight}</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-[1.6] text-white/90 sm:text-[17px]">
              {HERO.description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-[14px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: agency.primaryColor }}
              >
                {HERO.ctaPrimary}
              </button>
              <button
                type="button"
                onClick={() => scrollTo("resort")}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/70 bg-white/10 px-6 text-[14px] font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                {HERO.ctaSecondary}
              </button>
            </div>
          </div>
        </div>

        {/* Indicators band — over the hero photo */}
        <div className="mx-auto mt-10 max-w-[1200px] px-5 pb-10 sm:mt-14 sm:px-8 sm:pb-14 lg:mt-16">
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-white/40 backdrop-blur sm:grid-cols-3 sm:p-5">
          {HERO.indicators.map((it) => (
            <div key={it.title} className="flex items-start gap-3 rounded-xl p-2">
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: `${agency.primaryColor}1a`, color: agency.primaryColor }}
                aria-hidden
              >
                <span className="text-lg">✦</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-slate-900">{it.title}</p>
                <p className="text-[12px] leading-snug text-slate-500">{it.text}</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}