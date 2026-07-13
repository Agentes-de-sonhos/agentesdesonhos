import { MessageCircle } from "lucide-react";
import { AGENT } from "./content";

export function AgentRecommendationBar() {
  return (
    <div className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-[52px] max-w-[1200px] items-center justify-between gap-3 px-4 py-2.5 sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-bold text-white"
            role="img"
            aria-label={`${AGENT.name}, da ${AGENT.agency}`}
          >
            {AGENT.avatarInitials}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="hidden text-[12px] text-slate-500 sm:block">
              {AGENT.recommendationLead}
            </p>
            <p className="truncate text-[15px] font-semibold text-slate-900">
              <span className="uppercase">{AGENT.name}</span>
              <span className="hidden text-slate-400 sm:inline"> | </span>
              <span className="hidden text-slate-500 sm:inline font-medium">{AGENT.agency}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
            <MessageCircle className="h-4.5 w-4.5" />
          </div>
          <div className="leading-tight">
            <p className="text-[14px] font-semibold text-slate-900">{AGENT.supportPrimary}</p>
            <p className="hidden text-[12px] text-slate-500 sm:block">
              {AGENT.supportSecondary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
