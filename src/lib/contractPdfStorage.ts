import { supabase } from '@/integrations/supabase/client';

export const CONTRACT_PDF_BUCKET = 'sale-contracts';

/** SHA-256 dos bytes exatos do arquivo entregue (hex minúsculo). */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function contractPdfPath(agencyId: string, saleId: string, contractId: string) {
  return `${agencyId}/${saleId}/${contractId}.pdf`;
}

/** Sobe o arquivo definitivo. `upsert: false` garante que a versão nunca é sobrescrita. */
export async function uploadContractPdf(args: {
  agencyId: string;
  saleId: string;
  contractId: string;
  blob: Blob;
}): Promise<string> {
  const path = contractPdfPath(args.agencyId, args.saleId, args.contractId);
  const { error } = await supabase.storage
    .from(CONTRACT_PDF_BUCKET)
    .upload(path, args.blob, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(`Falha ao armazenar o PDF do contrato: ${error.message}`);
  return path;
}

/** Baixa o arquivo originalmente entregue (mesmos bytes, mesmo hash). */
export async function downloadStoredContractPdf(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(CONTRACT_PDF_BUCKET).download(path);
  if (error || !data) throw new Error(`Não foi possível recuperar o PDF armazenado: ${error?.message ?? 'arquivo ausente'}`);
  return data;
}
