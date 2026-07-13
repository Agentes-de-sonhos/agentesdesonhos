import arenaExterior from "@/assets/orlando-magic/arena-exterior.jpg";
import { Clock, Utensils, MapPin, HeartHandshake } from "lucide-react";
import { KIA_ITEMS } from "./content";

const ICONS = [Clock, Utensils, MapPin, HeartHandshake];

export function KiaCenterSection() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-20">
        <div className="overflow-hidden rounded-2xl shadow-sm">
          <img
            src={arenaExterior}
            alt="Fachada do Kia Center em Downtown Orlando"
            className="aspect-[4/3] h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <h2 className="font-display text-[30px] font-bold leading-tight text-slate-900 sm:text-[38px]">
            Uma noite completa no Kia Center
          </h2>
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
