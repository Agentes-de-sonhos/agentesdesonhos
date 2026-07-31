import { useMemo } from "react";
import {
  buildPrivacyPolicy,
  buildTermsOfUse,
  normalizeLegalInfo,
  type AgencyLegalInfo,
  type LegalDocument,
} from "@/lib/landingLegalDocuments";

export type LegalAgencyLike = {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  legal?: Partial<AgencyLegalInfo> | null;
};

/** Merges the landing agency config with its legal block, without inventing data. */
export function legalInfoFromAgency(agency: LegalAgencyLike): AgencyLegalInfo {
  const legal = agency.legal ?? {};
  return normalizeLegalInfo({
    ...legal,
    name: legal.name || agency.name || "",
    phone: legal.phone || agency.phone || "",
    whatsapp: legal.whatsapp || agency.whatsapp || "",
    email: legal.email || agency.email || "",
    city: legal.city || agency.city || "",
    privacyEmail: legal.privacyEmail || legal.email || agency.email || "",
  });
}

export function useLandingLegalDocuments(
  agency: LegalAgencyLike,
  productName: string
): { info: AgencyLegalInfo; privacy: LegalDocument; terms: LegalDocument } {
  return useMemo(() => {
    const info = legalInfoFromAgency(agency);
    return {
      info,
      privacy: buildPrivacyPolicy(info, productName),
      terms: buildTermsOfUse(info, productName),
    };
  }, [agency, productName]);
}
