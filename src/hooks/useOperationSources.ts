import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeService, type NormalizedService, type RawService } from "@/lib/saleImport";

export interface OperationCandidate {
  /** Link key: opportunity id when available, otherwise `${kind}:${id}` */
  key: string;
  opportunityId: string | null;
  clientId: string | null;
  clientName: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  estimatedValue: number;
  /** Which entities were found for this key */
  hasOpportunity: boolean;
  tripIds: string[];
  quoteIds: string[];
  operationId: string | null;
  updatedAt: string | null;
}

const like = (term: string) => `%${term.replace(/[%_]/g, "")}%`;

function upsert(map: Map<string, OperationCandidate>, key: string, patch: Partial<OperationCandidate>) {
  const current = map.get(key) || {
    key,
    opportunityId: null,
    clientId: null,
    clientName: "",
    destination: "",
    startDate: null,
    endDate: null,
    estimatedValue: 0,
    hasOpportunity: false,
    tripIds: [],
    quoteIds: [],
    operationId: null,
    updatedAt: null,
  };
  const merged: OperationCandidate = {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== null && v !== "")),
    tripIds: Array.from(new Set([...current.tripIds, ...(patch.tripIds || [])])),
    quoteIds: Array.from(new Set([...current.quoteIds, ...(patch.quoteIds || [])])),
    hasOpportunity: current.hasOpportunity || !!patch.hasOpportunity,
  } as OperationCandidate;
  map.set(key, merged);
}

/**
 * Unified search across CRM opportunities, Digital Wallets (trips), Quotes and
 * Operations. Results are grouped by their shared link (opportunity_id) so the
 * agent sees ONE operation with all its sources instead of duplicated rows.
 */
export function useOperationSearch(term: string) {
  const { user } = useAuth();
  const q = term.trim();

  return useQuery({
    queryKey: ["operation-sources-search", user?.id, q],
    enabled: !!user?.id && q.length >= 2,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<OperationCandidate[]> => {
      const uid = user!.id;
      const pattern = like(q);
      const [opps, trips, quotes, operations] = await Promise.all([
        supabase.from("opportunities")
          .select("id, client_id, destination, start_date, end_date, estimated_value, updated_at, client:clients(name)")
          .eq("user_id", uid)
          .or(`destination.ilike.${pattern}`)
          .order("updated_at", { ascending: false })
          .limit(25),
        supabase.from("trips")
          .select("id, client_id, client_name, trip_title, destination, start_date, end_date, opportunity_id, updated_at")
          .eq("user_id", uid)
          .or(`client_name.ilike.${pattern},destination.ilike.${pattern},trip_title.ilike.${pattern}`)
          .order("updated_at", { ascending: false })
          .limit(25),
        supabase.from("quotes")
          .select("id, client_id, client_name, trip_title, destination, start_date, end_date, total_amount, opportunity_id, updated_at")
          .eq("user_id", uid)
          .or(`client_name.ilike.${pattern},destination.ilike.${pattern},trip_title.ilike.${pattern}`)
          .order("updated_at", { ascending: false })
          .limit(25),
        supabase.from("operations")
          .select("id, client_id, opportunity_id, quote_id, trip_id, title, destination, travel_start_date, travel_end_date, sale_amount, updated_at, client:clients(name)")
          .eq("user_id", uid)
          .or(`title.ilike.${pattern},destination.ilike.${pattern}`)
          .order("updated_at", { ascending: false })
          .limit(25),
      ]);

      const map = new Map<string, OperationCandidate>();

      (opps.data || []).forEach((o: any) => {
        upsert(map, o.id, {
          opportunityId: o.id,
          clientId: o.client_id,
          clientName: o.client?.name || "",
          destination: o.destination || "",
          startDate: o.start_date,
          endDate: o.end_date,
          estimatedValue: Number(o.estimated_value) || 0,
          hasOpportunity: true,
          updatedAt: o.updated_at,
        });
      });

      (trips.data || []).forEach((t: any) => {
        upsert(map, t.opportunity_id || `trip:${t.id}`, {
          opportunityId: t.opportunity_id,
          clientId: t.client_id,
          clientName: t.client_name || "",
          destination: t.destination || t.trip_title || "",
          startDate: t.start_date,
          endDate: t.end_date,
          tripIds: [t.id],
          updatedAt: t.updated_at,
        });
      });

      (quotes.data || []).forEach((qt: any) => {
        upsert(map, qt.opportunity_id || `quote:${qt.id}`, {
          opportunityId: qt.opportunity_id,
          clientId: qt.client_id,
          clientName: qt.client_name || "",
          destination: qt.destination || qt.trip_title || "",
          startDate: qt.start_date,
          endDate: qt.end_date,
          estimatedValue: Number(qt.total_amount) || 0,
          quoteIds: [qt.id],
          updatedAt: qt.updated_at,
        });
      });

      (operations.data || []).forEach((op: any) => {
        upsert(map, op.opportunity_id || `operation:${op.id}`, {
          opportunityId: op.opportunity_id,
          operationId: op.id,
          clientId: op.client_id,
          clientName: op.client?.name || "",
          destination: op.destination || op.title || "",
          startDate: op.travel_start_date,
          endDate: op.travel_end_date,
          estimatedValue: Number(op.sale_amount) || 0,
          tripIds: op.trip_id ? [op.trip_id] : [],
          quoteIds: op.quote_id ? [op.quote_id] : [],
          updatedAt: op.updated_at,
        });
      });

      return Array.from(map.values()).sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || ""),
      );
    },
  });
}

export interface SourceOption {
  id: string;
  kind: "wallet" | "quote";
  label: string;
  subtitle: string;
  total: number;
  updatedAt: string | null;
  services: NormalizedService[];
}

export interface OperationBundle {
  candidate: OperationCandidate;
  wallets: SourceOption[];
  quotes: SourceOption[];
  clientId: string | null;
  clientName: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  hasSale: boolean;
  existingSaleId: string | null;
}

/**
 * Resolves every source linked to a candidate (all wallets and all quotes for
 * the same opportunity), loading their services already normalized.
 */
export function useOperationBundle(candidate: OperationCandidate | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["operation-source-bundle", user?.id, candidate?.key],
    enabled: !!user?.id && !!candidate,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<OperationBundle> => {
      const uid = user!.id;
      const c = candidate!;

      const tripQuery = c.opportunityId
        ? supabase.from("trips").select("*").eq("user_id", uid).eq("opportunity_id", c.opportunityId)
        : supabase.from("trips").select("*").eq("user_id", uid).in("id", c.tripIds.length ? c.tripIds : ["00000000-0000-0000-0000-000000000000"]);
      const quoteQuery = c.opportunityId
        ? supabase.from("quotes").select("*").eq("user_id", uid).eq("opportunity_id", c.opportunityId)
        : supabase.from("quotes").select("*").eq("user_id", uid).in("id", c.quoteIds.length ? c.quoteIds : ["00000000-0000-0000-0000-000000000000"]);

      const [tripRes, quoteRes, oppRes, saleRes] = await Promise.all([
        tripQuery,
        quoteQuery,
        c.opportunityId
          ? supabase.from("opportunities").select("*, client:clients(name)").eq("id", c.opportunityId).eq("user_id", uid).maybeSingle()
          : Promise.resolve({ data: null } as any),
        c.opportunityId
          ? supabase.from("sales").select("id").eq("user_id", uid).eq("opportunity_id", c.opportunityId).limit(1)
          : Promise.resolve({ data: [] } as any),
      ]);

      const extraTripIds = c.tripIds.filter((id) => !(tripRes.data || []).some((t: any) => t.id === id));
      const extraQuoteIds = c.quoteIds.filter((id) => !(quoteRes.data || []).some((t: any) => t.id === id));
      const [extraTrips, extraQuotes] = await Promise.all([
        extraTripIds.length
          ? supabase.from("trips").select("*").eq("user_id", uid).in("id", extraTripIds)
          : Promise.resolve({ data: [] } as any),
        extraQuoteIds.length
          ? supabase.from("quotes").select("*").eq("user_id", uid).in("id", extraQuoteIds)
          : Promise.resolve({ data: [] } as any),
      ]);

      const trips = [...(tripRes.data || []), ...(extraTrips.data || [])];
      const quotes = [...(quoteRes.data || []), ...(extraQuotes.data || [])];

      const [tripServices, quoteServices] = await Promise.all([
        trips.length
          ? supabase.from("trip_services").select("*").in("trip_id", trips.map((t: any) => t.id)).order("order_index")
          : Promise.resolve({ data: [] } as any),
        quotes.length
          ? supabase.from("quote_services").select("*").in("quote_id", quotes.map((t: any) => t.id)).order("order_index")
          : Promise.resolve({ data: [] } as any),
      ]);

      const wallets: SourceOption[] = trips.map((t: any) => {
        const services = ((tripServices.data || []) as any[])
          .filter((s) => s.trip_id === t.id)
          .map((s) => normalizeService(s as RawService, "wallet"));
        return {
          id: t.id,
          kind: "wallet",
          label: t.trip_title || t.destination || "Carteira Digital",
          subtitle: [t.client_name, t.start_date].filter(Boolean).join(" · "),
          total: services.reduce((sum, s) => sum + s.price, 0),
          updatedAt: t.updated_at || null,
          services,
        };
      });

      const quoteOptions: SourceOption[] = quotes.map((qt: any) => {
        const services = ((quoteServices.data || []) as any[])
          .filter((s) => s.quote_id === qt.id)
          .map((s) => normalizeService(s as RawService, "quote"));
        return {
          id: qt.id,
          kind: "quote",
          label: qt.trip_title || qt.destination || "Orçamento",
          subtitle: [qt.client_name, qt.status, qt.created_at?.slice(0, 10)].filter(Boolean).join(" · "),
          total: Number(qt.total_amount) || services.reduce((sum, s) => sum + s.price, 0),
          updatedAt: qt.updated_at || null,
          services,
        };
      });

      const opp: any = oppRes?.data;
      const firstTrip: any = trips[0];
      const firstQuote: any = quotes[0];

      return {
        candidate: c,
        wallets,
        quotes: quoteOptions,
        clientId: opp?.client_id || firstTrip?.client_id || firstQuote?.client_id || c.clientId,
        clientName: opp?.client?.name || firstTrip?.client_name || firstQuote?.client_name || c.clientName,
        destination: opp?.destination || firstTrip?.destination || firstQuote?.destination || c.destination,
        startDate: opp?.start_date || firstTrip?.start_date || firstQuote?.start_date || c.startDate,
        endDate: opp?.end_date || firstTrip?.end_date || firstQuote?.end_date || c.endDate,
        notes: opp?.notes || null,
        hasSale: ((saleRes as any)?.data || []).length > 0,
        existingSaleId: ((saleRes as any)?.data || [])[0]?.id || null,
      };
    },
  });
}