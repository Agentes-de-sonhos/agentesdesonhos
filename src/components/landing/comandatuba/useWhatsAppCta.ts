import { useMemo } from "react";
import { isWithinOfficeHours, describeOfficeHours } from "@/lib/officeHours";
import { scrollToForm, whatsappUrl, type AgencyConfig, type LandingContext } from "./content";

/**
 * Decides how a WhatsApp CTA should behave.
 * Inside the agency's service window it opens WhatsApp; outside it sends the
 * visitor to the lead form so the contact is never lost.
 */
export function useWhatsAppCta(
  agency: AgencyConfig,
  ctx: LandingContext | null,
  message: string
) {
  return useMemo(() => {
    const hasWhatsapp = !!agency.whatsapp && agency.whatsapp.replace(/\D/g, "").length >= 10;
    const referenceNow = ctx?.serverNowIso ? new Date(ctx.serverNowIso) : new Date();
    const open =
      !ctx || ctx.isDemo
        ? true
        : isWithinOfficeHours(ctx.officeHours, ctx.timezone, referenceNow);
    const available = hasWhatsapp && open;

    return {
      available,
      open,
      hasWhatsapp,
      href: available ? whatsappUrl(agency, message) : undefined,
      hoursLabel: ctx && !ctx.isDemo ? describeOfficeHours(ctx.officeHours) : agency.hours,
      onFallback: scrollToForm,
      outsideHoursNote: hasWhatsapp
        ? "Fora do horário de atendimento — deixe seus dados e retornamos no próximo horário disponível."
        : "Deixe seus dados e entraremos em contato pelo WhatsApp.",
    };
  }, [agency, ctx, message]);
}