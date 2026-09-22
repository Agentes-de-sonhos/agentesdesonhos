import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTravelFile } from "@/hooks/useTravelFiles";
import { assessTravelFileReadiness } from "@/lib/travelFileConversion";
import type { ConfirmSaleResult } from "@/hooks/useUnifiedWorkflow";
import { ConfirmSaleDialog } from "./ConfirmSaleDialog";

/**
 * Único ponto de partida da confirmação de venda do fluxo unificado V2.
 *
 * O funil de oportunidades e a Central de Reservas usam ESTE componente: as duas
 * entradas compartilham o mesmo diálogo, a mesma avaliação de prontidão e a
 * mesma chamada transacional (`confirm_travel_file_sale`). Não existe caminho
 * paralelo que grave a etapa de venda direto.
 */
export function ConfirmSaleLauncher({
  fileId,
  open,
  onOpenChange,
  onConfirmed,
  processHref,
  supplierExceptions = {},
}: {
  fileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: (result: ConfirmSaleResult) => void;
  processHref?: string;
  supplierExceptions?: Record<string, string>;
}) {
  const { data, isLoading, isError } = useTravelFile(open && fileId ? fileId : undefined);
  const file = data?.file;
  const services = data?.services ?? [];

  const readiness = useMemo(
    () => (file ? assessTravelFileReadiness(file, services, supplierExceptions) : null),
    [file, services, supplierExceptions],
  );

  if (!open || !fileId) return null;

  if (!file || !readiness) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>Confirmar venda e iniciar operação</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando o processo de reserva desta oportunidade.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isError
                  ? "Não conseguimos carregar o processo de reserva agora. Tente novamente em instantes."
                  : "Este processo de reserva não está disponível para a sua agência."}
              </p>
              <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ConfirmSaleDialog
      open={open}
      onOpenChange={onOpenChange}
      file={file}
      readiness={readiness}
      supplierExceptions={supplierExceptions}
      onConfirmed={onConfirmed}
      processHref={processHref}
    />
  );
}
