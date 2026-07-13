import { Button } from "@/components/ui/button";
import { Trophy, Music, Users, MapPin } from "lucide-react";
import { BENEFITS, scrollToForm } from "./content";
import arenaInterior from "@/assets/orlando-magic/arena-interior.jpg";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";

const ICONS = [Trophy, Music, Users, MapPin];

export function BenefitsSection() {
  return (
    <section className="bg-white pt-20 lg:pt-24">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-[30px] font-bold leading-tight text-slate-900 sm:text-[38px]">
              Mais do que basquete.
            </h2>
            <p className="mt-1 font-display text-[24px] font-bold text-blue-600 sm:text-[32px]">
              Um espetáculo para lembrar.
            </p>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.65] text-slate-600 sm:text-[17px]">
              A emoção começa antes de a bola subir. Da entrada no Kia Center ao último lance, música, telões, apresentações, brincadeiras e a energia da torcida transformam o jogo em um dos programas mais diferentes da viagem.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-8">
              {BENEFITS.map((b, i) => {
                const Icon = ICONS[i];
                return (
                  <div key={b.tag} className="text-left">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-[13px] font-bold uppercase tracking-wide text-slate-900">
                      {b.tag}
                    </p>
                    <p className="mt-2 text-[14px] leading-[1.6] text-slate-600">{b.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10">
              <Button
                onClick={scrollToForm}
                variant="outline"
                className="h-12 rounded-xl border-blue-600 px-6 text-[14px] font-semibold text-blue-700 hover:bg-blue-50"
              >
                VER JOGOS NAS DATAS DA MINHA VIAGEM
              </Button>
            </div>
          </div>

          {/* Video card */}
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg ring-1 ring-slate-200">
            <img src={arenaInterior} alt="Kia Center durante evento" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
              <h3 className="font-display text-[22px] font-bold leading-tight sm:text-[26px]">Dê o play e sinta o clima do Kia Center</h3>
              <p className="mt-2 max-w-md text-[14px] leading-relaxed text-slate-200 sm:text-[15px]">
                Veja por que assistir ao Orlando Magic pode se tornar uma das experiências mais comentadas da sua viagem.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Vídeo será conectado em uma próxima etapa.")}
                className="absolute inset-0 z-20 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                aria-label="Reproduzir vídeo"
              >
                <PlayCircle className="h-20 w-20 text-white/95 transition-transform hover:scale-110 drop-shadow-lg" strokeWidth={1.2} />
              </button>
              <span className="absolute bottom-4 right-5 z-10 rounded-md bg-black/70 px-2 py-0.5 text-[12px] font-semibold">1:35</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
