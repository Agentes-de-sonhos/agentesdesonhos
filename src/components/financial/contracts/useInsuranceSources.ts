import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyOwnerId } from '@/hooks/useAgencyOwnerId';
import type { Sale } from '@/types/financial';
import {
  candidateFromTripPeriod,
  candidatesFromQuoteServices,
  candidatesFromSaleProducts,
  candidatesFromTripServices,
  sortCandidates,
  type InsuranceCandidate,
} from '@/lib/insuranceSources';

/**
 * Busca dados de seguro APENAS em registros da mesma agência vinculados à venda
 * por identificadores persistidos (opportunity_id / operations). Nunca por nome do cliente.
 * A busca só roda quando `enabled` — nada é carregado ao abrir o contrato.
 */
export function useInsuranceSources(sale: Sale | null, enabled: boolean) {
  const { agencyOwnerId } = useAgencyOwnerId();

  const query = useQuery({
    queryKey: ['contract-insurance-sources', sale?.id, agencyOwnerId],
    enabled: enabled && !!sale?.id && !!agencyOwnerId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<InsuranceCandidate[]> => {
      const out: InsuranceCandidate[] = [];
      const saleRow = sale!;

      // 1) Serviço de seguro da própria venda
      const { data: products } = await supabase
        .from('sale_products')
        .select('id, product_type, description, supplier_name, updated_at')
        .eq('sale_id', saleRow.id)
        .eq('product_type', 'seguro');
      out.push(...candidatesFromSaleProducts((products ?? []) as never));

      // Vínculos inequívocos: oportunidade da venda e a operação derivada dela.
      const opportunityId = (saleRow as { opportunity_id?: string | null }).opportunity_id ?? null;
      const tripIds = new Set<string>();
      const quoteIds = new Set<string>();

      if (opportunityId) {
        const [trips, quotes, operations] = await Promise.all([
          supabase
            .from('trips')
            .select('id, trip_title, destination, opportunity_id')
            .eq('user_id', agencyOwnerId!)
            .eq('opportunity_id', opportunityId),
          supabase
            .from('quotes')
            .select('id, trip_title, destination, opportunity_id')
            .eq('user_id', agencyOwnerId!)
            .eq('opportunity_id', opportunityId),
          supabase
            .from('operations')
            .select('id, trip_id, quote_id')
            .eq('user_id', agencyOwnerId!)
            .eq('opportunity_id', opportunityId),
        ]);

        const tripLabels = new Map<string, string>();
        const quoteLabels = new Map<string, string>();
        (trips.data ?? []).forEach((t: { id: string; trip_title: string | null; destination: string | null }) => {
          tripIds.add(t.id);
          tripLabels.set(t.id, t.trip_title || t.destination || 'Carteira digital vinculada');
        });
        (quotes.data ?? []).forEach((q: { id: string; trip_title: string | null; destination: string | null }) => {
          quoteIds.add(q.id);
          quoteLabels.set(q.id, q.trip_title || q.destination || 'Orçamento vinculado');
        });
        (operations.data ?? []).forEach((o: { trip_id: string | null; quote_id: string | null }) => {
          if (o.trip_id) tripIds.add(o.trip_id);
          if (o.quote_id) quoteIds.add(o.quote_id);
        });

        // 2) Seguro da carteira digital vinculada
        if (tripIds.size) {
          const { data: tripServices } = await supabase
            .from('trip_services')
            .select('id, trip_id, service_type, service_data, updated_at')
            .in('trip_id', Array.from(tripIds))
            .eq('service_type', 'insurance');
          out.push(
            ...candidatesFromTripServices(
              ((tripServices ?? []) as { trip_id: string }[]).map((r) => ({
                ...(r as never as Record<string, unknown>),
                trip_label: tripLabels.get(r.trip_id) ?? 'Carteira digital vinculada',
              })) as never,
            ),
          );
        }

        // 3) Item de seguro do orçamento vinculado
        if (quoteIds.size) {
          const { data: quoteServices } = await supabase
            .from('quote_services')
            .select('id, quote_id, service_type, service_data, description, option_label, updated_at')
            .in('quote_id', Array.from(quoteIds))
            .eq('service_type', 'insurance');
          out.push(
            ...candidatesFromQuoteServices(
              ((quoteServices ?? []) as { quote_id: string }[]).map((r) => ({
                ...(r as never as Record<string, unknown>),
                quote_label: quoteLabels.get(r.quote_id) ?? 'Orçamento vinculado',
              })) as never,
            ),
          );
        }
      }

      // 4) Fallback exclusivo de vigência
      const period = candidateFromTripPeriod(saleRow.id, saleRow.start_date, saleRow.end_date);
      if (period) out.push(period);

      return sortCandidates(out);
    },
  });

  return {
    candidates: query.data ?? [],
    isLoading: query.isFetching,
    isError: query.isError,
    hasLink: !!(sale as { opportunity_id?: string | null } | null)?.opportunity_id,
    refetch: query.refetch,
  };
}