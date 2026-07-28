import { Check } from "lucide-react";
import img from "@/assets/landing/comandatuba/all-inclusive-asset.jpg.asset.json";
import { ALL_INCLUSIVE, type AgencyConfig } from "./content";

export function AllInclusiveSection({ agency }: { agency: AgencyConfig }) {
  return (
    <section id="allinclusive" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="order-1 lg:order-none">
            <img
              src={img.url}
              alt="Gastronomia e all inclusive no Transamerica Comandatuba"
              className="h-64 w-full rounded-2xl object-cover shadow-md sm:h-[420px]"
              loading="lazy"
              width={1200}
              height={900}
            />
          </div>
          <div className="order-2 flex flex-col justify-center lg:order-none">
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: agency.primaryColor }}
            >
              🌿 {ALL_INCLUSIVE.eyebrow}
            </span>
            <h2 className="mt-4 font-display text-[26px] font-bold leading-tight text-slate-900 sm:text-[34px]">
              {ALL_INCLUSIVE.title}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:text-[16px]">
              {ALL_INCLUSIVE.description}
            </p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">
              {ALL_INCLUSIVE.descriptionExtra}
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ALL_INCLUSIVE.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[14px] text-slate-700">
                  <span
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: agency.primaryColor }}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12px] leading-relaxed text-slate-400">
              {ALL_INCLUSIVE.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}