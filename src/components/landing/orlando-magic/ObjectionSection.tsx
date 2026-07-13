import familyFun from "@/assets/orlando-magic/family-fun.jpg";
import { Ticket, Users, Trophy } from "lucide-react";
import { OBJECTIONS } from "./content";

const ICONS = [Ticket, Users, Trophy];

export function ObjectionSection() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-20">
        <div className="overflow-hidden rounded-2xl shadow-sm">
          <img
            src={familyFun}
            alt="Família curtindo jogo do Orlando Magic com o mascote"
            className="aspect-[4/3] h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <h2 className="font-display text-[30px] font-bold leading-tight text-slate-900 sm:text-[38px]">
            Não acompanha a NBA?
          </h2>
          <p className="mt-1 font-display text-[24px] font-bold text-blue-600 sm:text-[32px]">
            Você vai curtir do mesmo jeito.
          </p>
          <p className="mt-5 max-w-xl text-[16px] leading-[1.65] text-slate-600 sm:text-[17px]">
            Você não precisa conhecer jogadores, regras ou estatísticas para aproveitar. O telão ajuda a acompanhar o jogo, a torcida envolve o público e as atrações mantêm a experiência divertida do começo ao fim.
          </p>

          <div className="mt-9 grid gap-7 sm:grid-cols-3">
            {OBJECTIONS.map((o, i) => {
              const Icon = ICONS[i];
              return (
                <div key={o.tag} className="text-left">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-[13px] font-bold uppercase tracking-wide text-slate-900">{o.tag}</p>
                  <p className="mt-1.5 text-[14px] leading-[1.6] text-slate-600">{o.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
