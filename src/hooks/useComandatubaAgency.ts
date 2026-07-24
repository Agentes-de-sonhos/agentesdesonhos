import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_AGENCY, type AgencyConfig } from "@/components/landing/comandatuba/content";

/**
 * White-label agency resolver for the Comandatuba landing page.
 * For now, values may come from URL query params. In a future iteration
 * they can be resolved from a subdomain / database lookup.
 */
export function useComandatubaAgency(): AgencyConfig {
  const [params] = useSearchParams();
  return useMemo(() => {
    const get = (k: string) => params.get(k) || undefined;
    const merged: AgencyConfig = {
      ...DEFAULT_AGENCY,
      name: get("agencia") ?? DEFAULT_AGENCY.name,
      logoUrl: get("logo") ?? DEFAULT_AGENCY.logoUrl,
      primaryColor: get("cor") ?? DEFAULT_AGENCY.primaryColor,
      consultantName: get("consultor") ?? DEFAULT_AGENCY.consultantName,
      consultantFirstName:
        (get("consultor") ?? DEFAULT_AGENCY.consultantName).split(" ")[0] ||
        DEFAULT_AGENCY.consultantFirstName,
      consultantRole: get("cargo") ?? DEFAULT_AGENCY.consultantRole,
      consultantPhotoUrl: get("foto") ?? DEFAULT_AGENCY.consultantPhotoUrl,
      whatsapp: (get("whatsapp") ?? DEFAULT_AGENCY.whatsapp).replace(/\D/g, ""),
      phone: get("telefone") ?? DEFAULT_AGENCY.phone,
      email: get("email") ?? DEFAULT_AGENCY.email,
      city: get("cidade") ?? DEFAULT_AGENCY.city,
      hours: get("horario") ?? DEFAULT_AGENCY.hours,
      privacyUrl: get("privacidade") ?? DEFAULT_AGENCY.privacyUrl,
    };
    return merged;
  }, [params]);
}