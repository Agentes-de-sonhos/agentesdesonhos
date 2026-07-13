import { Button } from "@/components/ui/button";
import seatsUpper from "@/assets/orlando-magic/seats-upper.jpg";
import seatsMid from "@/assets/orlando-magic/seats-mid.jpg";
import seatsCourtside from "@/assets/orlando-magic/seats-courtside.jpg";
import { TICKET_CATEGORIES, TICKETS_SECTION, scrollToForm } from "./content";

const IMAGES = { upper: seatsUpper, mid: seatsMid, courtside: seatsCourtside };

export function TicketCategoriesSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-blue-600">
            {TICKETS_SECTION.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[28px] font-bold leading-tight text-slate-900 sm:text-[36px]">
            {TICKETS_SECTION.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.6] text-slate-600 sm:text-[17px]">
            {TICKETS_SECTION.description}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
          {TICKET_CATEGORIES.map((cat, i) => (
            <article
              key={cat.name}
              className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg lg:col-span-2 ${i === 3 ? "lg:col-start-2" : ""}`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={IMAGES[cat.image]}
                  alt={cat.imageAlt}
                  style={cat.objectPosition ? { objectPosition: cat.objectPosition } : undefined}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5 text-center">
                <h3 className={`font-display text-[17px] font-bold tracking-wide sm:text-[18px] ${cat.color}`}>
                  {cat.name}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-slate-600">
                  {cat.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-[14px] text-slate-500">
          {TICKETS_SECTION.notice}
        </p>

        <div className="mt-6 text-center">
          <Button
            onClick={scrollToForm}
            variant="outline"
            className="h-12 rounded-xl border-blue-600 px-6 text-[14px] font-semibold text-blue-700 hover:bg-blue-50"
          >
            {TICKETS_SECTION.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
