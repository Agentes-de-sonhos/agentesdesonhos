import { MapPin } from "lucide-react";
import heroImg from "@/assets/landing/comandatuba/hero-aerial.jpg";
import { HERO, scrollToForm, scrollTo, type AgencyConfig } from "./content";

export function HeroSection({ agency }: { agency: AgencyConfig }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[520px] w-full sm:h-[600px] lg:h-[640px]">
        <img
          src={heroImg}
          alt={HERO.imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-[1280px] items-start px-5 pt-14 sm:px-8 sm:pt-20 lg:pt-24">
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
      </div>

      {/* Indicators band */}
      <div className="mx-auto -mt-16 max-w-[1200px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-100 sm:grid-cols-3 sm:p-5">
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
    </section>
  );
}