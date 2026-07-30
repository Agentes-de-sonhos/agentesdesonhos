import { MessageCircle } from "lucide-react";
import bg from "@/assets/landing/comandatuba/cta-aerial-ilha.webp";
import {
  FINAL_CTA,
  scrollToForm,
  whatsappDefaultMessage,
  type AgencyConfig,
  type LandingContext,
} from "./content";
import { useWhatsAppCta } from "./useWhatsAppCta";

export function FinalCTASection({
  agency,
  context = null,
}: {
  agency: AgencyConfig;
  context?: LandingContext | null;
}) {
  const cta = useWhatsAppCta(agency, context, whatsappDefaultMessage(agency));
  return (
    <section className="relative overflow-hidden">
      <div className="relative">
        <img
          src={bg}
          alt="Vista aérea do resort e da Ilha de Comandatuba com piscinas, coqueiros e a praia ao fundo"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          width={1920}
          height={900}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-slate-900/30" />
        <div className="relative mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl text-white">
            <h2 className="font-display text-[26px] font-bold leading-tight sm:text-[36px]">
              {FINAL_CTA.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85 sm:text-[16px]">
              {FINAL_CTA.text(agency.name)}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-[14px] font-semibold text-white shadow-lg"
                style={{ backgroundColor: agency.primaryColor }}
              >
                {FINAL_CTA.primary}
              </button>
              {cta.available ? (
                <a
                  href={cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/10 px-6 text-[14px] font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  {FINAL_CTA.secondary}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={cta.onFallback}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/10 px-6 text-[14px] font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  Solicitar contato
                </button>
              )}
            </div>
            {!cta.available && (
              <p className="mt-3 text-[12.5px] text-white/75">{cta.outsideHoursNote}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}