import { Leaf, Users, UtensilsCrossed, Sparkles } from "lucide-react";
import { REFUGE, type AgencyConfig } from "./content";

const icons = [Leaf, Users, UtensilsCrossed, Sparkles];

export function RefugeSection({ agency }: { agency: AgencyConfig }) {
  return (
    <section id="resort" className="bg-[#faf8f3] py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: agency.primaryColor }}>
              {REFUGE.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-[28px] font-bold leading-tight text-slate-900 sm:text-[34px]">
              {REFUGE.title}
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-slate-600 sm:text-[16px]">
              {REFUGE.description}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REFUGE.benefits.map((b, i) => {
              const Icon = icons[i] ?? Sparkles;
              return (
                <div
                  key={b.title}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${agency.primaryColor}18`, color: agency.primaryColor }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-display text-[16px] font-semibold text-slate-900">{b.title}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-slate-500">{b.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}