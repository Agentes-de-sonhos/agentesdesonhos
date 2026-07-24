import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ, type AgencyConfig } from "./content";

export function FaqSection({ agency }: { agency: AgencyConfig }) {
  const [open, setOpen] = useState<number | null>(0);
  const columns: typeof FAQ[] = [[], []];
  FAQ.forEach((f, i) => columns[i % 2].push(f));

  return (
    <section id="duvidas" className="bg-[#faf8f3] py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <h2 className="font-display text-[26px] font-bold leading-tight text-slate-900 sm:text-[32px]">
          Dúvidas frequentes
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {columns.map((col, cIdx) => (
            <div key={cIdx} className="space-y-3">
              {col.map((item) => {
                const idx = FAQ.indexOf(item);
                const isOpen = open === idx;
                return (
                  <div key={item.q} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        style={{ color: agency.primaryColor }}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 px-4 py-3 text-[13.5px] leading-relaxed text-slate-600">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}