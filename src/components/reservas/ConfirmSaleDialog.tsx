import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ExternalLink, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TravelFile } from "@/types/travelFile";
import {
  V2_ACCEPTANCE_CHANNELS,
  type TravelFileReadiness,
} from "@/lib/travelFileConversion";
import {
  useConfirmTravelFileSale,
  isConfirmSaleFailure,
  type ConfirmSaleResult,
} from "@/hooks/useUnifiedWorkflow";

import { extractWorkflowCode, humanizeWorkflowError } from "@/lib/confirmSaleMessages";
import { useAdminNav } from "@/lib/agencyAdminNav";


/** Formatação monetária local (mesma regra usada na página do processo). */
const money = (value: number | null | undefined, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(value ?? 0);

interface ConfirmSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: TravelFile;
  readiness: TravelFileReadiness;
  /** Justificativas de exceção de fornecedor por id de serviço. */
  supplierExceptions: Record<string, string>;
  /** Chamado após confirmação bem-sucedida (inclusive replay idempotente). */
  onConfirmed?: (result: ConfirmSaleResult) => void;
  /** Link para abrir o processo e corrigir o que falta (funil/Central). */
  processHref?: string;
}


/**
 * Aceite do cliente + confirmação transacional da venda (fluxo unificado V2).
 * A chave de idempotência é gerada uma vez por abertura do diálogo: duplo
 * clique ou repetição após falha de rede reenviam a MESMA chave e o servidor
 * devolve o resultado original sem duplicar nada.
 */
export function ConfirmSaleDialog({
  open,
  onOpenChange,
  file,
  readiness,
  supplierExceptions,
  onConfirmed,
  processHref,
}: ConfirmSaleDialogProps) {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const confirmSale = useConfirmTravelFileSale(file.id);

  const [channel, setChannel] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ConfirmSaleResult | null>(null);
  const idempotencyKeyRef = useRef<string>("");

  useEffect(() => {
    if (open) {
      idempotencyKeyRef.current = crypto.randomUUID();
      setChannel("");
      setNote("");
      setResult(null);
    }
  }, [open]);

  const nowLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(),
      ),
    // Recalcula a cada abertura do diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  const submit = async () => {
    if (confirmSale.isPending) return;
    try {
      const data = await confirmSale.mutateAsync({
        idempotencyKey: idempotencyKeyRef.current,
        acceptance: {
          channel,
          note: note.trim() || null,
          supplier_exceptions: supplierExceptions,
        },
        expectedUpdatedAt: file.updated_at,
      });
      // Defesa extra: nenhuma resposta com erro estruturado vira sucesso.
      if (isConfirmSaleFailure(data)) {
        toast.error(humanizeWorkflowError(data.message || data.error));
        return;
      }
      setResult(data);
      toast.success(
        data.replayed
          ? "Esta confirmação já havia sido registrada — nada foi duplicado."
          : "Venda confirmada e operação iniciada.",
      );
      onConfirmed?.(data);
    } catch (error: any) {
      // Código interno fica só na telemetria; a pessoa vê texto claro.
      console.error("confirm_travel_file_sale falhou:", extractWorkflowCode(error));
      toast.error(humanizeWorkflowError(error));
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88svh] w-[calc(100vw-1.5rem)] max-w-lg flex-col overflow-hidden p-0 sm:w-full">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Confirmar venda e iniciar operação</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 [padding-bottom:calc(1.25rem+env(safe-area-inset-bottom))]">


        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-foreground">
              <p className="font-semibold">Venda registrada com sucesso.</p>
              <p className="mt-1 text-muted-foreground">
                Total {money(result.total, result.currency)} ·{" "}
                {result.created.length > 0
                  ? "Novos registros criados."
                  : "Registros existentes reutilizados (nada duplicado)."}
              </p>
              {result.warnings.length > 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                  Informações financeiras pendentes — configure na Gestão Financeira.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {result.operation_id && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`${nav.crm("operacoes")}?operation=${result.operation_id}`);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir operação
                </Button>
              )}
              {result.sale_id && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`${nav.financeiro}?tab=vendas&sale=${result.sale_id}`);
                  }}
                >
                  <Wallet className="h-4 w-4" />
                  Abrir financeiro
                </Button>
              )}

              <Button onClick={() => onOpenChange(false)}>Concluir</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
              <p className="font-medium text-foreground">
                {readiness.eligible.length} serviço(s) · Total {money(readiness.total, readiness.currency || file.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A oportunidade será marcada como ganha, a operação e a venda financeira
                serão criadas com os serviços escolhidos, e o recebimento do cliente
                nascerá como pendente.
              </p>
            </div>

            {readiness.blockers.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-sm font-medium text-foreground">
                  Falta isto para confirmar a venda:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {readiness.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
                {processHref && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 gap-2"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(processHref);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir o processo para ajustar
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="acceptance-channel">Canal do aceite *</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger id="acceptance-channel" className="mt-1 min-h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {V2_ACCEPTANCE_CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="acceptance-date">Data e hora do aceite</Label>
                <Input id="acceptance-date" value={nowLabel} readOnly className="mt-1 h-11 bg-muted/30" />
              </div>
            </div>

            <div>
              <Label htmlFor="acceptance-note">Observação / evidência do aceite</Label>
              <Textarea
                id="acceptance-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Ex.: cliente confirmou por mensagem às 14h32; print anexado ao processo."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
                disabled={confirmSale.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={!channel || confirmSale.isPending || !readiness.ready}
                className="min-h-11 gap-2"
              >
                {confirmSale.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar venda
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

