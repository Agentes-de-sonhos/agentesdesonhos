import { Users, Heart, Baby, Users2, Plane, ShipWheel } from "lucide-react";
import familyImg from "@/assets/landing/comandatuba/family-beach.jpg";
import { AUDIENCE, HOW_TO_GET, type AgencyConfig } from "./content";

const AUD_ICONS = [Users, Heart, Baby, Users2];

export function AudienceAndAccessSection({ agency }: { agency: AgencyConfig }) {
  return (
    <section id="comochegar" className="bg-[#faf8f3] py-16 sm:py-20">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          <div>
            <h2 className="font-display text-[22px] font-bold text-slate-900 sm:text-[26px]">
              {AUDIENCE.title}
            </h2>
            <ul className="mt-5 space-y-4">
              {AUDIENCE.items.map((it, i) => {
                const Icon = AUD_ICONS[i] ?? Users;
                return (
                  <li key={it} className="flex items-start gap-3 text-[14px] text-slate-700">
                    <span
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${agency.primaryColor}18`, color: agency.primaryColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-snug">{it}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <img
              src={familyImg}
              alt="Família na praia da Ilha de Comandatuba"
              className="h-full w-full rounded-2xl object-cover shadow-md"
              loading="lazy"
              width={1200}
              height={1200}
            />
          </div>

          <div>
            <h2 className="font-display text-[22px] font-bold text-slate-900 sm:text-[26px]">
              {HOW_TO_GET.title}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-slate-600">{HOW_TO_GET.intro}</p>
            <ul className="mt-5 space-y-4">
              {HOW_TO_GET.items.map((it, i) => {
                const Icon = i === 0 ? Plane : ShipWheel;
                return (
                  <li key={it} className="flex items-start gap-3 text-[14px] text-slate-700">
                    <span
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${agency.primaryColor}18`, color: agency.primaryColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-snug">{it}</span>
                  </li>
                );
              })}
            </ul>
            <p
              className="mt-6 rounded-xl border p-3 text-[12px] leading-snug"
              style={{
                borderColor: `${agency.primaryColor}40`,
                backgroundColor: `${agency.primaryColor}0d`,
                color: "#475569",
              }}
            >
              {HOW_TO_GET.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}