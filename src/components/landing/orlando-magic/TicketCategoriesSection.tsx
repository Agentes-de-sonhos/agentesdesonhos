import { Button } from "@/components/ui/button";
import seatsUpper from "@/assets/orlando-magic/seats-upper.jpg";
import seatsMid from "@/assets/orlando-magic/seats-mid.jpg";
import seatsCourtside from "@/assets/orlando-magic/seats-courtside.jpg";
import { TICKET_CATEGORIES, scrollToForm } from "./content";

const IMAGES = { upper: seatsUpper, mid: seatsMid, courtside: seatsCourtside };

export function TicketCategoriesSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Escolha a experiência que combina com a sua viagem
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Existem opções para diferentes perfis e orçamentos. Seu agente poderá comparar os setores disponíveis e ajudar na escolha.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5">
          {TICKET_CATEGORIES.map((cat) => (
            <article
              key={cat.name}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={IMAGES[cat.image]}
                  alt={`Vista do setor ${cat.name}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-4 text-center">
                <h3 className={`font-display text-sm font-bold tracking-wide sm:text-base ${cat.color}`}>
                  {cat.name}
                </h3>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600 sm:text-xs">
                  {cat.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Os benefícios incluídos variam conforme a categoria, o jogo e o ingresso selecionado.
        </p>

        <div className="mt-6 text-center">
          <Button
            onClick={scrollToForm}
            variant="outline"
            className="h-11 rounded-xl border-blue-600 text-blue-700 hover:bg-blue-50"
          >
            RECEBER UMA RECOMENDAÇÃO DE SETOR
          </Button>
        </div>
      </div>
    </section>
  );
}
