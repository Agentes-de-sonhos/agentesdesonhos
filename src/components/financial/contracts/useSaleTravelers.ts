import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyOwnerId } from '@/hooks/useAgencyOwnerId';
import type { TravelerRow } from '@/lib/saleContractData';
import type { Sale } from '@/types/financial';

export interface ClientCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface SaleTravelersResult {
  /** Cliente efetivamente usado para buscar os viajantes. */
  clientId: string | null;
  /** Origem da resolução: da venda, por nome (único) ou escolhido manualmente. */
  source: 'sale' | 'resolved_by_name' | 'manual' | 'none';
  /** Homônimos encontrados quando a venda não tem client_id. */
  candidates: ClientCandidate[];
  travelers: TravelerRow[];
}

/**
 * Resolve o cliente da venda e carrega seus viajantes (tabela oficial `travelers`).
 * - Prioriza `sale.client_id`.
 * - Vendas antigas sem `client_id`: tenta casar pelo nome exato dentro da MESMA agência.
 *   Só resolve automaticamente quando houver exatamente 1 correspondência (sem homônimos).
 * - `manualClientId` permite ao agente desambiguar sem sair do contrato.
 */
export function useSaleTravelers(sale: Sale | null, open: boolean, manualClientId?: string | null) {
  const { agencyOwnerId } = useAgencyOwnerId();
  const queryClient = useQueryClient();
  const queryKey = ['sale-contract-travelers', sale?.id, agencyOwnerId, manualClientId ?? null];

  const query = useQuery<SaleTravelersResult>({
    queryKey,
    enabled: open && !!sale?.id && !!agencyOwnerId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let clientId: string | null = manualClientId || sale?.client_id || null;
      let source: SaleTravelersResult['source'] = manualClientId
        ? 'manual'
        : sale?.client_id
          ? 'sale'
          : 'none';
      let candidates: ClientCandidate[] = [];

      if (!clientId && sale?.client_name?.trim()) {
        const { data } = await supabase
          .from('clients')
          .select('id,name,email,phone')
          .eq('user_id', agencyOwnerId!)
          .ilike('name', sale.client_name.trim())
          .limit(10);
        candidates = (data ?? []) as ClientCandidate[];
        if (candidates.length === 1) {
          clientId = candidates[0].id;
          source = 'resolved_by_name';
        }
      }

      if (!clientId) return { clientId: null, source, candidates, travelers: [] };

      const { data: travelers } = await supabase
        .from('travelers')
        .select('id,nome_completo,data_nascimento,cpf,passaporte,validade_passaporte,nacionalidade,observacoes,is_responsavel')
        .eq('client_id', clientId)
        .order('is_responsavel', { ascending: false })
        .order('nome_completo');

      return { clientId, source, candidates, travelers: (travelers ?? []) as TravelerRow[] };
    },
  });

  return {
    clientId: query.data?.clientId ?? null,
    source: query.data?.source ?? 'none',
    candidates: query.data?.candidates ?? [],
    travelers: query.data?.travelers ?? [],
    isLoading: query.isLoading,
    refetch: async () => {
      await query.refetch();
      await queryClient.invalidateQueries({ queryKey: ['travelers'] });
    },
  };
}
