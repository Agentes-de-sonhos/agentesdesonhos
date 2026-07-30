import { useEffect, useState } from "react";
import { MessageCircle, X, Check } from "lucide-react";
import {
  CONSULTANT_COPY,
  whatsappDefaultMessage,
  type AgencyConfig,
  type LandingContext,
} from "./content";
import { useWhatsAppCta } from "./useWhatsAppCta";

const STORAGE_KEY = "comandatuba_consultant_collapsed";
const BENEFITS = CONSULTANT_COPY.benefits;

export function ConsultantWidget({
  agency,
  context = null,
}: {
  agency: AgencyConfig;
  context?: LandingContext | null;
}) {
  const cta = useWhatsAppCta(agency, context, whatsappDefaultMessage(agency));
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const initials = agency.consultantName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const waHref = cta.href;
  const ctaLabel = cta.available
    ? agency.consultantFirstName
      ? CONSULTANT_COPY.cta
      : CONSULTANT_COPY.ctaNoConsultant
    : "Solicitar contato";

  // Desktop widget
  return (
    <>
      {/* Desktop: floating card / pill */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 hidden justify-end px-4 lg:flex">
        <div className="pointer-events-auto max-w-[320px]">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-xl ring-1 ring-slate-200 transition-transform hover:scale-[1.02]"
            >
              {agency.consultantPhotoUrl ? (
                <img src={agency.consultantPhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-white"
                  style={{ backgroundColor: agency.primaryColor }}
                >
                  {initials}
                </span>
              )}
              <span className="pr-1 text-[13px] font-semibold text-slate-800">
                Falar com {agency.consultantFirstName}
              </span>
            </button>
          ) : (
            <div className="rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
              <div className="flex items-start justify-between">
                <p className="font-display text-[15px] font-semibold text-slate-900">
                  {CONSULTANT_COPY.title}
                </p>
                <button
                  type="button"
                  aria-label="Recolher"
                  onClick={() => setCollapsed(true)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                {agency.consultantPhotoUrl ? (
                  <img src={agency.consultantPhotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: agency.primaryColor }}
                  >
                    {initials}
                  </span>
                )}
                <div className="leading-tight">
                  <p className="text-[14px] font-semibold text-slate-900">{agency.consultantName}</p>
                  <p className="text-[12px] text-slate-500">{agency.consultantRole}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[12.5px] text-slate-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: agency.primaryColor }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {cta.available ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold text-white shadow-sm"
                  style={{ backgroundColor: agency.primaryColor }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {ctaLabel}
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={cta.onFallback}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold text-white shadow-sm"
                    style={{ backgroundColor: agency.primaryColor }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {ctaLabel}
                  </button>
                  <p className="mt-2 text-[11.5px] leading-snug text-slate-500">
                    {cta.outsideHoursNote}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-2xl backdrop-blur lg:hidden">
        <MobileCtaWrapper
          available={cta.available}
          href={waHref}
          onFallback={cta.onFallback}
          background={`${agency.primaryColor}12`}
        >
          {agency.consultantPhotoUrl ? (
            <img src={agency.consultantPhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ backgroundColor: agency.primaryColor }}
            >
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              Falar com {agency.consultantFirstName}
            </p>
            <p className="truncate text-[11px] text-slate-500">{agency.consultantRole}</p>
          </div>
          <span
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-[12px] font-semibold text-white"
            style={{ backgroundColor: agency.primaryColor }}
          >
            <MessageCircle className="h-3.5 w-3.5" /> {cta.available ? "WhatsApp" : "Contato"}
          </span>
        </MobileCtaWrapper>
      </div>
    </>
  );
}

function MobileCtaWrapper({
  available,
  href,
  onFallback,
  background,
  children,
}: {
  available: boolean;
  href?: string;
  onFallback: () => void;
  background: string;
  children: React.ReactNode;
}) {
  const className = "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left";
  if (available && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={{ backgroundColor: background }}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onFallback} className={className} style={{ backgroundColor: background }}>
      {children}
    </button>
  );
}