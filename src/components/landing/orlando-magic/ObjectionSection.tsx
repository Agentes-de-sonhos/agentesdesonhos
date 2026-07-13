import familyFun from "@/assets/orlando-magic/family-fun.jpg";
import { Ticket, Users, Trophy } from "lucide-react";
import { OBJECTIONS } from "./content";

const ICONS = [Ticket, Users, Trophy];

export function ObjectionSection() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-12 lg:py-20">
        <div className="overflow-hidden rounded-2xl">
          <img
            src={familyFun}
            alt="Família curtindo jogo do Orlando Magic com o mascote"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
            Não acompanha a NBA?
          </h2>
          <p className="mt-1 font-display text-2xl font-bold text-blue-600 sm:text-3xl">
            Você vai curtir do mesmo jeito.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Você não precisa conhecer jogadores, regras ou estatísticas para aproveitar. O telão ajuda a acompanhar o jogo, a torcida envolve o público e as atrações mantêm a experiência divertida do começo ao fim.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {OBJECTIONS.map((o, i) => {
              const Icon = ICONS[i];
              return (
                <div key={o.tag} className="text-center sm:text-left">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center text-blue-600 sm:mx-0">
                    <Icon className="h-7 w-7" />
                  </div>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-900">{o.tag}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{o.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
