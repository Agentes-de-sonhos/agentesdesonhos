import { Check, MapPin, Utensils } from "lucide-react";
import { hotelPriceDelta } from "@/lib/quoteHotelChoice";
import { mealPlanLabel } from "@/lib/hotelRates";

export function ModernHotelChoice({ options, selectedId, onSelect, fmt, totalFor, showPrices }: {
  options: any[]; selectedId: string; onSelect: (id: string) => void; fmt: (v: number) => string;
  totalFor: (id: string) => number; showPrices: boolean;
}) {
  const selected = options.find((o) => o.id === selectedId);
  return (
    <section className="space-y-4 animate-fade-up">
      <div className="text-center space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Hospedagem</p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Escolha sua hospedagem</h2>
        <p className="text-sm text-muted-foreground">Toque em uma opção para ver o valor da viagem com ela.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => {
          const d = o.service_data || {};
          const active = o.id === selectedId;
          const delta = hotelPriceDelta(o, selected);
          const img = o.image_url || o.image_urls?.[0];
          return (
            <button key={o.id} type="button" onClick={() => onSelect(o.id)} aria-pressed={active}
              className={`group overflow-hidden rounded-2xl border bg-card text-left transition-all ${active ? "border-primary ring-2 ring-primary shadow-lg" : "border-border/50 hover:border-primary/50 hover:shadow-md"}`}>
              <div className="relative aspect-[16/10] bg-muted">
                {img && <img src={img} alt={d.hotel_name || o.option_label || "Hotel"} className="h-full w-full object-cover" loading="lazy" />}
                {active && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                    <Check className="h-3 w-3" /> Sua escolha
                  </span>
                )}
              </div>
              <div className="space-y-1.5 p-4">
                <p className="font-semibold leading-tight">{d.hotel_name || o.option_label}</p>
                {d.city && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{d.city}</p>}
                {d.meal_plan && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Utensils className="h-3 w-3" />{mealPlanLabel(d.meal_plan) || d.meal_plan}</p>}
                {showPrices && (
                  <div className="pt-2">
                    {active ? (
                      <p className="text-sm font-semibold text-primary">Incluída no valor</p>
                    ) : (
                      <p className={`text-sm font-semibold ${delta > 0 ? "text-foreground" : "text-primary"}`}>
                        {delta > 0 ? `+ ${fmt(delta)}` : delta < 0 ? `− ${fmt(-delta)} a menos` : "Mesmo valor"}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Viagem: {fmt(totalFor(o.id))}</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
