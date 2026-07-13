import { AGENT, AGENT_PRESENTATION, scrollToForm } from "./content";
import { Button } from "@/components/ui/button";

export function AgentPresentationSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1000px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center shadow-sm ring-1 ring-slate-100 sm:p-12">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-3xl font-bold text-white shadow-lg ring-4 ring-white"
            role="img"
            aria-label={AGENT.avatarAlt}
          >
            {AGENT.avatarInitials}
          </div>
          <div className="max-w-2xl">
            <h2 className="font-display text-[26px] font-bold leading-tight text-slate-900 sm:text-[34px]">
              {AGENT_PRESENTATION.title}
            </h2>
            <p className="mx-auto mt-5 text-[16px] leading-[1.65] text-slate-600 sm:text-[17px]">
              {AGENT_PRESENTATION.paragraph1}
            </p>
            <p className="mx-auto mt-3 text-[16px] leading-[1.65] text-slate-600 sm:text-[17px]">
              {AGENT_PRESENTATION.paragraph2}
            </p>
          </div>
          <div className="pt-2">
            <p className="font-display text-[20px] font-bold text-slate-900">{AGENT.name}</p>
            <p className="text-[14px] text-slate-500">{AGENT.role}</p>
            <p className="mt-0.5 text-[13px] font-semibold uppercase tracking-wide text-blue-700">{AGENT.agency}</p>
          </div>
          <Button
            onClick={scrollToForm}
            className="mt-2 h-12 rounded-xl bg-blue-600 px-7 text-[14px] font-bold uppercase tracking-wide text-white hover:bg-blue-700"
          >
            {AGENT.secondaryCta}
          </Button>
        </div>
      </div>
    </section>
  );
}
