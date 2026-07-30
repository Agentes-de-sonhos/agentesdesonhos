import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import aptStandard from "@/assets/landing/comandatuba/acc/apartamento-standard.webp";
import aptLuxo from "@/assets/landing/comandatuba/acc/apartamento-luxo.webp";
import aptPremium from "@/assets/landing/comandatuba/acc/apartamento-premium.webp";
import aptAdaptado from "@/assets/landing/comandatuba/acc/apartamento-adaptado.webp";
import suiteFamilia from "@/assets/landing/comandatuba/acc/suite-familia.webp";
import suitePremium from "@/assets/landing/comandatuba/acc/suite-premium.webp";
import bangaloStandard from "@/assets/landing/comandatuba/acc/bangalo-standard.webp";
import bangaloLuxo from "@/assets/landing/comandatuba/acc/bangalo-luxo.webp";
import bangaloFamilia from "@/assets/landing/comandatuba/acc/bangalo-familia.webp";
import bangaloPremium from "@/assets/landing/comandatuba/acc/bangalo-premium.webp";
import {
  ACCOMMODATIONS,
  ACCOMMODATION_CATEGORIES,
  ACCOMMODATION_GROUPS,
  type AccommodationCategory,
  type AccommodationGroupKey,
  type AgencyConfig,
} from "./content";

/** One official photo per category — never reused between categories. */
const IMAGES: Record<string, string> = {
  "apartamento-standard": aptStandard,
  "apartamento-luxo": aptLuxo,
  "apartamento-premium": aptPremium,
  "apartamento-adaptado": aptAdaptado,
  "suite-familia": suiteFamilia,
  "suite-premium": suitePremium,
  "bangalo-standard": bangaloStandard,
  "bangalo-luxo": bangaloLuxo,
  "bangalo-familia": bangaloFamilia,
  "bangalo-premium": bangaloPremium,
};

const GRID_BY_GROUP: Record<AccommodationGroupKey, string> = {
  apartamentos: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  suites: "grid-cols-1 sm:grid-cols-2 lg:mx-auto lg:max-w-[720px] lg:grid-cols-2",
  bangalos: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function AccommodationsSection({
  agency,
  onSelect,
}: {
  agency: AgencyConfig;
  onSelect: (key: string, name: string) => void;
}) {
  const [group, setGroup] = useState<AccommodationGroupKey>("apartamentos");
  const [openItem, setOpenItem] = useState<AccommodationCategory | null>(null);

  const items = useMemo(
    () => ACCOMMODATION_CATEGORIES.filter((c) => c.group === group),
    [group]
  );

  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const last = ACCOMMODATION_GROUPS.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowRight"
            ? (index + 1) % ACCOMMODATION_GROUPS.length
            : (index - 1 + ACCOMMODATION_GROUPS.length) % ACCOMMODATION_GROUPS.length;
    const target = ACCOMMODATION_GROUPS[next];
    setGroup(target.key);
    document.getElementById(`acc-tab-${target.key}`)?.focus();
  };

  return (
    <section id="acomodacoes" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[26px] font-bold leading-tight text-slate-900 sm:text-[34px]">
            {ACCOMMODATIONS.title}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-500">{ACCOMMODATIONS.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div
            role="tablist"
            aria-label="Categorias de acomodação"
            className="mx-auto flex w-max gap-2 rounded-2xl bg-slate-100 p-1.5 sm:w-fit"
          >
            {ACCOMMODATION_GROUPS.map((g, i) => {
              const active = g.key === group;
              return (
                <button
                  key={g.key}
                  id={`acc-tab-${g.key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`acc-panel-${g.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setGroup(g.key)}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                  className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl px-5 text-[13.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={
                    active
                      ? { backgroundColor: agency.primaryColor, color: "#fff" }
                      : { color: "#334155" }
                  }
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel */}
        <div
          id={`acc-panel-${group}`}
          role="tabpanel"
          aria-labelledby={`acc-tab-${group}`}
          tabIndex={0}
          className="mt-8 focus-visible:outline-none"
        >
          <div className={`grid gap-5 ${GRID_BY_GROUP[group]}`}>
            {items.map((a) => (
              <article
                key={a.key}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={IMAGES[a.key]}
                    alt={a.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    width={1140}
                    height={600}
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-display text-[17px] font-semibold leading-snug text-slate-900">
                    {a.name}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-snug text-slate-500">{a.capacity}</p>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-slate-600">
                    {a.cardText}
                  </p>
                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setOpenItem(a)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {ACCOMMODATIONS.detailsCta}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(a.key, a.name)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ borderColor: agency.primaryColor, color: agency.primaryColor }}
                    >
                      {ACCOMMODATIONS.cta}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[12px] text-slate-400">
          {ACCOMMODATIONS.disclaimer}
        </p>
      </div>

      <Dialog open={!!openItem} onOpenChange={(o) => !o && setOpenItem(null)}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto p-0">
          {openItem && (
            <>
              <img
                src={IMAGES[openItem.key]}
                alt={openItem.imageAlt}
                className="aspect-[16/10] w-full object-cover"
                width={1140}
                height={600}
              />
              <div className="p-6 pt-4">
                <DialogHeader className="space-y-1.5 text-left">
                  <DialogTitle className="font-display text-[20px] text-slate-900">
                    {openItem.name}
                  </DialogTitle>
                  <DialogDescription className="text-[13px] leading-relaxed text-slate-600">
                    {openItem.cardText}
                  </DialogDescription>
                </DialogHeader>

                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {ACCOMMODATIONS.capacityLabel}
                </p>
                <p className="mt-1 text-[13.5px] leading-snug text-slate-700">{openItem.capacity}</p>

                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {ACCOMMODATIONS.detailsLabel}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {openItem.details.map((d) => (
                    <li key={d} className="flex gap-2 text-[13.5px] leading-snug text-slate-700">
                      <span
                        aria-hidden
                        className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: agency.primaryColor }}
                      />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => {
                    const item = openItem;
                    setOpenItem(null);
                    onSelect(item.key, item.name);
                  }}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl text-[13.5px] font-semibold text-white shadow-sm"
                  style={{ backgroundColor: agency.primaryColor }}
                >
                  {ACCOMMODATIONS.cta}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}