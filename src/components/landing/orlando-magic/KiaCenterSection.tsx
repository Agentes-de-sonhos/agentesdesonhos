import arenaExterior from "@/assets/orlando-magic/arena-exterior.jpg";
import { Clock, Utensils, MapPin, HeartHandshake } from "lucide-react";
import { KIA_ITEMS } from "./content";

const ICONS = [Clock, Utensils, MapPin, HeartHandshake];

export function KiaCenterSection() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-20">
        <div className="overflow-hidden rounded-2xl">
          <img
            src={arenaExterior}
            alt="Fachada do Kia Center em Downtown Orlando"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
            Uma noite completa no Kia Center
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {KIA_ITEMS.map((item, i) => {
              const Icon = ICONS[i];
              return (
                <div key={item.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-700">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.text}</p>
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
