import { MessageCircle, Plane } from "lucide-react";
import { FOOTER } from "./content";

export function LandingFooter() {
  const handlePendingLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
  };

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:gap-12">
        <div>
          <p className="font-display text-[18px] font-bold text-slate-900">{FOOTER.brand.title}</p>
          <p className="mt-3 text-[13px] leading-[1.6] text-slate-500">{FOOTER.brand.text}</p>
        </div>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-wide text-slate-900">{FOOTER.important.title}</p>
          <p className="mt-3 text-[13px] leading-[1.6] text-slate-500">{FOOTER.important.text}</p>
        </div>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-wide text-slate-900">{FOOTER.agent.title}</p>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-600">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            <span>{FOOTER.agent.line1}</span>
          </div>
          <p className="mt-3 text-[15px] font-semibold text-slate-800">{FOOTER.agent.line2}</p>
          <p className="text-[13px] text-slate-500">{FOOTER.agent.line3}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <Plane className="h-4 w-4" />
            <span className="font-display text-[15px] font-bold">{FOOTER.company.title}</span>
          </div>
          <ul className="mt-3 space-y-2 text-[13px] text-slate-500">
            {FOOTER.company.links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={l.pending ? handlePendingLink : undefined}
                  data-pending-config={l.pending ? "true" : undefined}
                  className="hover:text-blue-600"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-6 text-center">
        <p className="mx-auto max-w-3xl px-5 text-[12px] leading-relaxed text-slate-500">
          {FOOTER.legal}
        </p>
        <p className="mt-2 text-[12px] text-slate-400">{FOOTER.copyright}</p>
      </div>
    </footer>
  );
}
