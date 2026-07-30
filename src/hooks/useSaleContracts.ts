import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgencyOwnerId } from '@/hooks/useAgencyOwnerId';
import type {
  AgencyContractTemplate,
  ContractPayload,
  ContractTemplateSection,
  SaleContract,
} from '@/types/contracts';
import { toast } from 'sonner';

/** Active contract template (+ sections) configured by the platform admin for this agency. */
export function useAgencyContractTemplate() {
  const { agencyOwnerId } = useAgencyOwnerId();

  return useQuery({
    queryKey: ['agency-contract-template', agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: template, error } = await supabase
        .from('agency_contract_templates')
        .select('*')
        .eq('agency_id', agencyOwnerId!)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      if (!template) return { template: null, sections: [] as ContractTemplateSection[] };

      const { data: sections } = await supabase
        .from('agency_contract_template_sections')
        .select('*')
        .eq('template_id', template.id)
        .order('display_order');

      return {
        template: template as unknown as AgencyContractTemplate,
        sections: (sections ?? []) as unknown as ContractTemplateSection[],
      };
    },
  });
}

export function useSaleContracts(saleId?: string) {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: ['sale-contracts', saleId],
    enabled: !!saleId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_contracts')
        .select('*')
        .eq('sale_id', saleId!)
        .order('revision', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SaleContract[];
    },
  });

  const createContract = useMutation({
    mutationFn: async (input: {
      payload: ContractPayload;
      templateId: string | null;
      templateVersion: number | null;
      revision: number;
      supersedesId?: string | null;
      documentHash: string;
    }) => {
      if (!saleId || !agencyOwnerId) throw new Error('Venda ou agência não identificada.');
      const p = input.payload;

      const row = {
          agency_id: agencyOwnerId,
          sale_id: saleId,
          template_id: input.templateId,
          template_version: input.templateVersion,
          contract_number: p.contract_number,
          revision: input.revision,
          status: 'generated',
          generated_payload_json: p as unknown as Record<string, unknown>,
          generated_by: user?.id ?? null,
          client_snapshot_json: p.client as unknown as Record<string, unknown>,
          passengers_snapshot_json: p.passengers as unknown as Record<string, unknown>,
          services_snapshot_json: p.services as unknown as Record<string, unknown>,
          financial_snapshot_json: p.financial as unknown as Record<string, unknown>,
          agency_snapshot_json: p.agency as unknown as Record<string, unknown>,
          attachments_json: p.attachments as unknown as Record<string, unknown>,
          document_hash: input.documentHash,
          supersedes_contract_id: input.supersedesId ?? null,
      };

      const { data, error } = await (supabase.from('sale_contracts') as any)
        .insert(row)
        .select()
        .single();
      if (error) throw error;

      if (input.supersedesId) {
        await supabase.from('sale_contracts').update({ status: 'superseded' }).eq('id', input.supersedesId);
      }

      await (supabase.from('sale_contract_audit_logs') as any).insert({
        contract_id: data.id,
        agency_id: agencyOwnerId,
        sale_id: saleId,
        action: input.supersedesId ? 'regenerated' : 'generated',
        actor_id: user?.id ?? null,
        details: { contract_number: p.contract_number, revision: input.revision },
      });

      return data as unknown as SaleContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-contracts', saleId] });
      toast.success('Contrato gerado com sucesso');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao gerar contrato'),
  });

  /**
   * Registra o arquivo PDF efetivamente entregue (hash dos bytes, tamanho, caminho).
   * Nunca sobrescreve: o banco bloqueia alteração de um PDF já registrado.
   */
  const attachPdf = useMutation({
    mutationFn: async (input: {
      contractId: string;
      sha256: string;
      sizeBytes: number;
      storagePath: string | null;
      fileName: string;
      generatorVersion: string;
      storageError?: string | null;
    }) => {
      const { error } = await (supabase.from('sale_contracts') as any)
        .update({
          pdf_sha256: input.sha256,
          pdf_size_bytes: input.sizeBytes,
          pdf_generated_at: new Date().toISOString(),
          pdf_generator_version: input.generatorVersion,
          pdf_storage_path: input.storagePath,
          pdf_mime_type: 'application/pdf',
          pdf_file_name: input.fileName,
        })
        .eq('id', input.contractId);
      if (error) throw error;

      await (supabase.from('sale_contract_audit_logs') as any).insert({
        contract_id: input.contractId,
        agency_id: agencyOwnerId,
        sale_id: saleId ?? null,
        action: 'pdf_registered',
        actor_id: user?.id ?? null,
        details: {
          pdf_sha256: input.sha256,
          pdf_size_bytes: input.sizeBytes,
          pdf_storage_path: input.storagePath,
          pdf_generator_version: input.generatorVersion,
          storage_error: input.storageError ?? null,
        },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sale-contracts', saleId] }),
  });

  const logAction = async (contractId: string, action: 'viewed' | 'downloaded') => {
    if (!agencyOwnerId) return;
    await (supabase.from('sale_contract_audit_logs') as any).insert({
      contract_id: contractId,
      agency_id: agencyOwnerId,
      sale_id: saleId ?? null,
      action,
      actor_id: user?.id ?? null,
    });
  };

  return {
    contracts: contractsQuery.data ?? [],
    isLoading: contractsQuery.isLoading,
    createContract,
    attachPdf,
    logAction,
  };
}