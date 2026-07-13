import arenaExterior from "@/assets/orlando-magic/arena-exterior.jpg";
import { Clock, Utensils, MapPin, HeartHandshake } from "lucide-react";
import { KIA_ITEMS, KIA_SECTION } from "./content";

const ICONS = [Clock, Utensils, MapPin, HeartHandshake];

export function KiaCenterSection() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-20">
        <div className="overflow-hidden rounded-2xl shadow-sm">
          <img
            src={arenaExterior}
            alt={KIA_SECTION.imageAlt}
            className="aspect-[4/3] h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-blue-600">
            {KIA_SECTION.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[30px] font-bold leading-tight text-slate-900 sm:text-[38px]">
            {KIA_SECTION.title}
          </h2>
          <p className="mt-4 max-w-xl text-[16px] leading-[1.65] text-slate-600 sm:text-[17px]">
            {KIA_SECTION.description}
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {KIA_ITEMS.map((item, i) => {
              const Icon = ICONS[i];
              return (
                <div key={item.title} className="flex gap-3.5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold uppercase tracking-wide text-blue-700">{item.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-[1.6] text-slate-600">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
