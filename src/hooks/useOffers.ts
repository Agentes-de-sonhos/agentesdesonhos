import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import type { OfferStatus, OfferPriceMode, OfferIncludedService } from "@/lib/offers";

export interface OfferRow {
  id: string;
  agency_owner_id: string;
  source_quote_id: string | null;
  origin: "quote" | "manual" | "import";
  slug: string;
  status: OfferStatus;
  title: string;
  description: string | null;
  cover_url: string | null;
  gallery: string[];
  destination: string | null;
  category: string;
  service_types: string[];
  included_services: OfferIncludedService[];
  travel_start: string | null;
  travel_end: string | null;
  nights: number | null;
  price_mode: OfferPriceMode;
  price_from: number | null;
  currency: string;
  price_note: string | null;
  base_pax: number | null;
  max_installments: number | null;
  compare_at_price: number | null;
  payment_conditions: string | null;
  customized_fields: string[];
  last_synced_at: string | null;
  sync_warning: string | null;
  reviewed_at: string | null;
  publish_at: string | null;
  expires_at: string | null;
  requests_count: number;
  updated_at: string;
}

export interface OfferSettings {
  agency_owner_id: string;
  enabled: boolean;
  auto_publish_new_quotes: boolean;
  auto_publish_since: string | null;
  default_validity_days: number;
}

export interface OfferRequestRow {
  id: string;
  created_at: string;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
  notes: string | null;
  details: Record<string, string>;
  offer_id: string | null;
  offer_snapshot: Record<string, any> | null;
  converted_quote_id: string | null;
  client_id: string | null;
  opportunity_id: string | null;
  consent_at: string | null;
  consent_version: string | null;
  utm: Record<string, string> | null;
}

const db = supabase as any;

async function rpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) throw new Error(String(data.error));
  return data as T;
}

/** Elegibilidade: só agências com site ativo e módulo liberado (piloto). */
export function useOfferSettings() {
  const { agencyOwnerId } = useAgencyOwnerId();
  return useQuery({
    queryKey: ["offer-settings", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await db
        .from("agency_offer_settings")
        .select("agency_owner_id, enabled, auto_publish_new_quotes, auto_publish_since, default_validity_days")
        .eq("agency_owner_id", agencyOwnerId)
        .maybeSingle();
      if (error) return null;
      return (data as OfferSettings | null) ?? null;
    },
  });
}

export function useOffersEnabled() {
  const { data, isLoading } = useOfferSettings();
  return { enabled: data?.enabled === true, isLoading };
}

export function useOffers(enabled = true) {
  const qc = useQueryClient();
  const { agencyOwnerId } = useAgencyOwnerId();
  const key = ["offers", agencyOwnerId];
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["offer-settings"] });
    qc.invalidateQueries({ queryKey: ["offer-requests"] });
  };

  const list = useQuery({
    queryKey: key,
    enabled: enabled && !!agencyOwnerId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await db
        .from("offers")
        .select("*")
        .eq("agency_owner_id", agencyOwnerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OfferRow[];
    },
  });

  const createFromQuote = useMutation({
    mutationFn: (quoteId: string) => rpc<{ offer_id: string; existing: boolean }>("offer_create_from_quote", { p_quote_id: quoteId }),
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: (p: { id: string; action: "publish" | "pause" | "resume" | "end" | "extend"; days?: number }) =>
      rpc("offer_set_status", { p_offer_id: p.id, p_action: p.action, p_days: p.days ?? null }),
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: (p: { id: string; fields?: string[] | null }) =>
      rpc("offer_restore_fields", { p_offer_id: p.id, p_fields: p.fields ?? null }),
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: async (p: { id?: string; values: Partial<OfferRow> }) => {
      if (p.id) {
        const { error } = await db.from("offers").update(p.values).eq("id", p.id);
        if (error) throw new Error(error.message);
        return p.id;
      }
      const { data, error } = await db
        .from("offers")
        .insert({ ...p.values, agency_owner_id: agencyOwnerId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const saveSettings = useMutation({
    mutationFn: (p: { auto: boolean; days: number }) => rpc("offer_settings_save", { p_auto: p.auto, p_days: p.days }),
    onSuccess: invalidate,
  });

  return { ...list, offers: list.data ?? [], createFromQuote, setStatus, restore, save, saveSettings };
}

export function useOfferRequests(enabled = true) {
  const qc = useQueryClient();
  const { agencyOwnerId } = useAgencyOwnerId();
  const q = useQuery({
    queryKey: ["offer-requests", agencyOwnerId],
    enabled: enabled && !!agencyOwnerId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await db
        .from("agency_site_requests")
        .select("id, created_at, lead_name, lead_phone, lead_email, notes, details, offer_id, offer_snapshot, converted_quote_id, client_id, opportunity_id, consent_at, consent_version, utm")
        .eq("agency_user_id", agencyOwnerId)
        .not("offer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as OfferRequestRow[];
    },
  });
  const convert = useMutation({
    mutationFn: (requestId: string) =>
      rpc<{ quote_id: string; existing: boolean }>("create_quote_from_offer_request", { p_request_id: requestId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offer-requests"] }),
  });
  return { ...q, requests: q.data ?? [], convert };
}
