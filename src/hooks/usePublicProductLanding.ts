import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TIMEZONE, normalizeOfficeHours } from "@/lib/officeHours";
import type { AgencyConfig, LandingContext } from "@/components/landing/comandatuba/content";
import { DEFAULT_AGENCY } from "@/components/landing/comandatuba/content";

export interface PublicProductLanding {
  agency: AgencyConfig;
  context: LandingContext;
}

function sessionHash(landingId: string): string {
  const key = `plv_${landingId}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const value =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, value);
    return value;
  } catch {
    return `${Date.now()}`;
  }
}

/**
 * Agency phones are stored in local Brazilian format ("(35) 99954-0212").
 * wa.me requires E.164 digits, so prefix the country code when the number
 * clearly lacks it. Numbers already carrying a country code are untouched.
 */
export function normalizeWhatsappDigits(raw: string | null | undefined): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) return digits;
  return digits;
}

export function usePublicProductLanding(productKey: string, slug: string | undefined) {
  const [data, setData] = useState<PublicProductLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setError("Página não encontrada");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: raw, error: rpcError } = await supabase.rpc(
          "get_public_product_landing" as any,
          { p_product_key: productKey, p_slug: slug }
        );
        if (cancelled) return;
        const res = raw as any;
        if (rpcError || !res || res.error) {
          setError(res?.error || "Página não encontrada");
          setLoading(false);
          return;
        }

        const consultantName: string = res.consultant_name || "";
        const agency: AgencyConfig = {
          ...DEFAULT_AGENCY,
          name: String(res.agency_name || DEFAULT_AGENCY.name).trim(),
          logoUrl: res.logo_url || null,
          primaryColor: DEFAULT_AGENCY.primaryColor,
          consultantName,
          consultantFirstName: consultantName.split(" ")[0] || "",
          consultantRole: res.consultant_role || DEFAULT_AGENCY.consultantRole,
          consultantPhotoUrl: res.consultant_photo_url || null,
          whatsapp: normalizeWhatsappDigits(res.whatsapp),
          phone: res.phone || "",
          email: res.email || "",
          city: res.city || "",
          hours: DEFAULT_AGENCY.hours,
          privacyUrl: DEFAULT_AGENCY.privacyUrl,
        };

        const context: LandingContext = {
          landingId: res.landing_id,
          productKey,
          slug: res.slug,
          isDemo: false,
          officeHours: normalizeOfficeHours(res.office_hours),
          timezone: res.timezone || DEFAULT_TIMEZONE,
          serverNowIso: res.server_now || null,
          whatsappMessageTemplate: res.whatsapp_message_template || null,
        };

        setData({ agency, context });
        setLoading(false);

        // Fire-and-forget view tracking (deduped per session by the RPC).
        if (res.landing_id) {
          supabase
            .rpc("track_product_landing_view" as any, {
              p_landing_id: res.landing_id,
              p_session_hash: sessionHash(res.landing_id),
            })
            .then(() => undefined, () => undefined);
        }
      } catch {
        if (!cancelled) {
          setError("Página não encontrada");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productKey, slug]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}