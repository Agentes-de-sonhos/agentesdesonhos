import { Button } from "@/components/ui/button";
import { Trophy, Music, Users, MapPin } from "lucide-react";
import { BENEFITS, scrollToForm } from "./content";
import arenaInterior from "@/assets/orlando-magic/arena-interior.jpg";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";

const ICONS = [Trophy, Music, Users, MapPin];

export function BenefitsSection() {
  return (
    <section className="bg-white pt-24 lg:pt-32">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
              Mais do que basquete.
            </h2>
            <p className="mt-1 font-display text-2xl font-bold text-blue-600 sm:text-3xl">
              Um espetáculo para lembrar.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              A emoção começa antes de a bola subir. Da entrada no Kia Center ao último lance, música, telões, apresentações, brincadeiras e a energia da torcida transformam o jogo em um dos programas mais diferentes da viagem.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
              {BENEFITS.map((b, i) => {
                const Icon = ICONS[i];
                return (
                  <div key={b.tag} className="text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center text-blue-600">
                      <Icon className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-900">
                      {b.tag}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{b.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <Button
                onClick={scrollToForm}
                variant="outline"
                className="h-11 rounded-xl border-blue-600 text-blue-700 hover:bg-blue-50"
              >
                VER JOGOS NAS DATAS DA MINHA VIAGEM
              </Button>
            </div>
          </div>

          {/* Video card */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl">
            <img src={arenaInterior} alt="Kia Center durante evento" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="relative z-10 flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[340px] sm:p-7">
              <h3 className="font-display text-xl font-bold sm:text-2xl">Dê o play e sinta o clima do Kia Center</h3>
              <p className="mt-2 text-sm text-slate-200">
                Veja por que assistir ao Orlando Magic pode se tornar uma das experiências mais comentadas da sua viagem.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Vídeo será conectado em uma próxima etapa.")}
                className="absolute inset-0 z-20 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                aria-label="Reproduzir vídeo"
              >
                <PlayCircle className="h-16 w-16 text-white/90 transition-transform hover:scale-110" strokeWidth={1.2} />
              </button>
              <span className="absolute bottom-4 right-5 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold">1:35</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
