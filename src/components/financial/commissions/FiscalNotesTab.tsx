import { Loader2 } from "lucide-react";
import { useCommissionsReceivable } from "@/hooks/useCommissionsReceivable";
import { InvoicesCenter } from "./InvoicesCenter";

/**
 * Aba superior "Notas Fiscais": reutiliza integralmente o InvoicesCenter
 * que antes ficava dentro do submenu de Comissões. Sem lógica concorrente.
 */
export function FiscalNotesTab() {
  const { data: commissions = [], isLoading } = useCommissionsReceivable();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <InvoicesCenter commissions={commissions} />;
}
