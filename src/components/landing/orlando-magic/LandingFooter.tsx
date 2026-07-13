import { MessageCircle, Plane } from "lucide-react";
import { AGENT } from "./content";

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold text-slate-900">Orlando Magic</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Experiência oficial de NBA em Orlando. Atendimento em português pelo seu agente antes, durante e depois da viagem.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-900">Importante</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Jogos, horários, setores, valores, atrações, benefícios e disponibilidade estão sujeitos a alterações. A participação de atletas específicos não é garantida. Imagens meramente ilustrativas.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-900">Fale com seu agente</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            <span>Atendimento em português</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800">{AGENT.name}</p>
          <p className="text-xs text-slate-500">{AGENT.agency}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <Plane className="h-4 w-4" />
            <span className="font-display text-sm font-bold">Agentes de Sonhos</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
            <li><a href="#" className="hover:text-blue-600">Política de Privacidade</a></li>
            <li><a href="#" className="hover:text-blue-600">Termos de Uso</a></li>
            <li><a href="#" className="hover:text-blue-600">Política de Cancelamento</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} Agentes de Sonhos. Todos os direitos reservados.
      </div>
    </footer>
  );
}
