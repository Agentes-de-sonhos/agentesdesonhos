import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyOwnerId } from '@/hooks/useAgencyOwnerId';
import { PRODUCT_TYPES, type Sale } from '@/types/financial';
import { sanitizeServiceData, type ScopeSourceService } from '@/lib/contractScope';

/**
 * Reúne os serviços de escopo da venda atual e — apenas quando houver vínculo
 * por ID já persistido (opportunity_id / operations) — do orçamento e da
 * carteira digital da MESMA agência. Nunca busca por nome.
 * Só roda quando `enabled` (clique explícito no botão de IA).
 */
export function useContractScopeSources(sale: Sale | null, enabled: boolean) {
  const { agencyOwnerId } = useAgencyOwnerId();

  const query = useQuery({
    queryKey: ['contract-scope-sources', sale?.id, agencyOwnerId],
    enabled: enabled && !!sale?.id && !!agencyOwnerId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ScopeSourceService[]> => {
      const out: ScopeSourceService[] = [];
      const saleRow = sale!;

      const { data: products } = await supabase
        .from('sale_products')
        .select('id, product_type, description, supplier_name, expected_date, operator_id')
        .eq('sale_id', saleRow.id);

      const operatorIds = Array.from(
        new Set(((products ?? []) as { operator_id: string | null }[]).map((p) => p.operator_id).filter(Boolean)),
      ) as string[];
      const operatorNames: Record<string, string> = {};
      if (operatorIds.length) {
        const { data: ops } = await supabase.from('tour_operators').select('id,name').in('id', operatorIds);
        (ops ?? []).forEach((o: { id: string; name: string }) => {
          operatorNames[o.id] = o.name;
        });
      }

      (products ?? []).forEach(
        (p: {
          id: string;
          product_type: string;
          description: string | null;
          supplier_name: string | null;
          expected_date: string | null;
          operator_id: string | null;
        }) => {
          const details: Record<string, string> = {};
          if (p.expected_date) details.data_prevista = p.expected_date;
          out.push({
            id: p.id,
            origin: 'sale',
            origin_label: 'Venda',
            type: PRODUCT_TYPES[p.product_type] ?? p.product_type,
            description: p.description ?? undefined,
            supplier: p.supplier_name ?? undefined,
            operator: p.operator_id ? operatorNames[p.operator_id] : undefined,
            details,
          });
        },
      );

      const opportunityId = (saleRow as { opportunity_id?: string | null }).opportunity_id ?? null;
      if (opportunityId) {
        const tripIds = new Set<string>();
        const quoteIds = new Set<string>();
        const [trips, quotes, operations] = await Promise.all([
          supabase.from('trips').select('id').eq('user_id', agencyOwnerId!).eq('opportunity_id', opportunityId),
          supabase.from('quotes').select('id').eq('user_id', agencyOwnerId!).eq('opportunity_id', opportunityId),
          supabase
            .from('operations')
            .select('trip_id, quote_id')
            .eq('user_id', agencyOwnerId!)
            .eq('opportunity_id', opportunityId),
        ]);
        (trips.data ?? []).forEach((t: { id: string }) => tripIds.add(t.id));
        (quotes.data ?? []).forEach((q: { id: string }) => quoteIds.add(q.id));
        (operations.data ?? []).forEach((o: { trip_id: string | null; quote_id: string | null }) => {
          if (o.trip_id) tripIds.add(o.trip_id);
          if (o.quote_id) quoteIds.add(o.quote_id);
        });

        if (tripIds.size) {
          const { data: tripServices } = await supabase
            .from('trip_services')
            .select('id, service_type, service_data')
            .in('trip_id', Array.from(tripIds));
          (tripServices ?? []).forEach((s: { id: string; service_type: string; service_data: unknown }) => {
            out.push({
              id: s.id,
              origin: 'wallet',
              origin_label: 'Carteira vinculada',
              type: s.service_type,
              details: sanitizeServiceData(s.service_data),
            });
          });
        }

        if (quoteIds.size) {
          const { data: quoteServices } = await supabase
            .from('quote_services')
            .select('id, service_type, service_data, description, option_label')
            .in('quote_id', Array.from(quoteIds));
          (quoteServices ?? []).forEach(
            (s: {
              id: string;
              service_type: string;
              service_data: unknown;
              description: string | null;
              option_label: string | null;
            }) => {
              out.push({
                id: s.id,
                origin: 'quote',
                origin_label: 'Orçamento vinculado',
                type: s.option_label || s.service_type,
                description: s.description ?? undefined,
                details: sanitizeServiceData(s.service_data),
              });
            },
          );
        }
      }

      return out;
    },
  });

  return {
    services: query.data ?? [],
    isLoading: query.isLoading || query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}