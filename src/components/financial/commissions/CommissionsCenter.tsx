import { CommissionsReceivable } from "@/components/financial/CommissionsReceivable";

/**
 * Comissões: conteúdo principal direto (sem submenu interno).
 * Notas Fiscais migrou para a aba superior própria (InvoicesCenter).
 * Fluxo Futuro e Ranking de Fornecedores foram removidos da interface (dados preservados).
 */
export function CommissionsCenter({ viewMonth, viewYear }: { viewMonth?: number; viewYear?: number }) {
  return <CommissionsReceivable viewMonth={viewMonth} viewYear={viewYear} />;
}
