import apt from "@/assets/landing/comandatuba/acc-apartment.jpg";
import suite from "@/assets/landing/comandatuba/acc-suite.jpg";
import bung from "@/assets/landing/comandatuba/acc-bungalow.jpg";
import { ACCOMMODATIONS, type AgencyConfig } from "./content";

const IMAGES: Record<string, string> = {
  apartamento: apt,
  suite,
  bangalo: bung,
};

export function AccommodationsSection({
  agency,
  onSelect,
}: {
  agency: AgencyConfig;
  onSelect: (key: string, name: string) => void;
}) {
  return (
    <section id="acomodacoes" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[26px] font-bold leading-tight text-slate-900 sm:text-[34px]">
            🛏️ {ACCOMMODATIONS.title} 🛏️
          </h2>
          <p className="mt-3 text-[14px] text-slate-500">{ACCOMMODATIONS.subtitle}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {ACCOMMODATIONS.items.map((a) => (
            <article key={a.key} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={IMAGES[a.key]}
                  alt={a.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  width={1200}
                  height={800}
                />
              </div>
              <div className="p-5">
                <p className="font-display text-[18px] font-semibold text-slate-900">{a.name}</p>
                <p className="mt-1.5 text-[13px] leading-snug text-slate-500">{a.text}</p>
                <button
                  type="button"
                  onClick={() => onSelect(a.key, a.name)}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border text-[13px] font-semibold transition-colors"
                  style={{ borderColor: agency.primaryColor, color: agency.primaryColor }}
                >
                  {ACCOMMODATIONS.cta}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}