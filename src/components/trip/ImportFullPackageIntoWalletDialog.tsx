import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FullPackageImportModal,
  type FullPackageImportResult,
} from "@/components/quote/full-package-import/FullPackageImportModal";
import { insertPackageServiceIntoTrip } from "@/lib/walletPackageImport";

/**
 * “Importar pacote com IA” dentro de uma carteira existente.
 *
 * Reutiliza integralmente o pipeline `import-full-package` (uma única chamada
 * de IA por documento) e a interface de conferência do modal de orçamentos.
 * Cada serviço confirmado é gravado diretamente em `trip_services` — nenhum
 * orçamento intermediário é criado.
 */
export function ImportFullPackageIntoWalletDialog({
  open,
  onOpenChange,
  tripId,
  currentServiceCount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  currentServiceCount: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inserted, setInserted] = useState(0);
  /** Fila serial: evita duplicar serviço em duplo clique / reenvio. */
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const nextIndexRef = useRef(currentServiceCount);
  const inFlightRef = useRef<Set<string>>(new Set());

  const handleConfirmService = useCallback(
    (svc: FullPackageImportResult) => {
      const key = `${svc.service_type}:${svc.option_label || ""}:${JSON.stringify(svc.service_data)}`;
      if (inFlightRef.current.has(key)) return queueRef.current;
      inFlightRef.current.add(key);

      queueRef.current = queueRef.current.then(async () => {
        try {
          const ok = await insertPackageServiceIntoTrip(
            supabase,
            tripId,
            {
              service_type: svc.service_type,
              service_data: svc.service_data,
              option_label: svc.option_label ?? null,
              description: svc.description ?? null,
            },
            nextIndexRef.current,
          );
          if (!ok) {
            toast({
              title: "Serviço não suportado",
              description: "Este item não pôde ser convertido para a carteira. Os demais continuam válidos.",
              variant: "destructive",
            });
            return;
          }
          nextIndexRef.current += 1;
          setInserted((n) => n + 1);
          await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
          toast({ title: "Serviço adicionado à carteira" });
        } catch (e: any) {
          toast({
            title: "Erro ao adicionar serviço",
            description: e?.message || "Não foi possível salvar este item. Os demais continuam válidos.",
            variant: "destructive",
          });
        }
      });
      return queueRef.current;
    },
    [queryClient, toast, tripId],
  );

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      if (inserted > 0) {
        toast({
          title: "Importação concluída",
          description: `${inserted} serviço${inserted !== 1 ? "s" : ""} adicionado${inserted !== 1 ? "s" : ""} à carteira.`,
        });
      }
      setInserted(0);
      inFlightRef.current.clear();
      nextIndexRef.current = currentServiceCount;
    }
    onOpenChange(v);
  };

  return (
    <FullPackageImportModal
      open={open}
      onOpenChange={handleOpenChange}
      onConfirmService={handleConfirmService}
    />
  );
}
