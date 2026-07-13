import { MessageCircle } from "lucide-react";
import { AGENT } from "./content";

export function AgentRecommendationBar() {
  return (
    <div className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-bold text-white">
            {AGENT.avatarInitials}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="hidden text-[11px] text-slate-500 sm:block">
              Esta experiência foi recomendada por
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              <span className="uppercase">{AGENT.name}</span>
              <span className="hidden text-slate-400 sm:inline"> | </span>
              <span className="hidden text-slate-500 sm:inline">{AGENT.agency}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Atendimento em português</p>
            <p className="hidden text-[11px] text-slate-500 sm:block">
              antes, durante e depois da sua viagem
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
