import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TravelFileService } from "@/types/travelFile";
import { useServiceFinancialRule } from "@/hooks/useUnifiedWorkflow";

const NONE_OPERATOR = "__none__";

interface ServiceFinancialRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  service: TravelFileService;
}

/**
 * Edição operacional do fornecedor antes da venda.
 * A Gestão Financeira é o único local para comissão, custo, impostos, nota fiscal
 * e prazos de pagamento depois que a venda é confirmada.
 */
export function ServiceFinancialRuleDialog({
  open,
  onOpenChange,
  fileId,
  service,
}: ServiceFinancialRuleDialogProps) {
  const saveRule = useServiceFinancialRule(fileId);
  const [operatorId, setOperatorId] = useState<string>(service.operator_id ?? NONE_OPERATOR);
  const [supplierName, setSupplierName] = useState(service.supplier_name ?? "");

  useEffect(() => {
    if (!open) return;
    setOperatorId(service.operator_id ?? NONE_OPERATOR);
    setSupplierName(service.supplier_name ?? "");
  }, [open, service]);

  const save = async () => {
    if (saveRule.isPending) return;
    const realOperatorId = operatorId === NONE_OPERATOR ? null : operatorId;
    try {
      await saveRule.mutateAsync({
        serviceId: service.id,
        payload: {
          operator_id: realOperatorId,
          supplier_name: supplierName.trim() || null,
        },
      });
      toast.success("Fornecedor do serviço atualizado.");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        String(error?.message || "Não foi possível salvar o fornecedor.").replace(
          /^[A-Z_]+:\s*/,
          "",
        ),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fornecedor — {service.product_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="rule-operator">Fornecedor / operadora</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger id="rule-operator" className="mt-1">
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPERATOR}>Não vinculado a operadora cadastrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rule-supplier-name">Nome do fornecedor</Label>
            <Input
              id="rule-supplier-name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="mt-1"
              placeholder="Ex.: CVC, RCI, Cia aérea..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveRule.isPending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saveRule.isPending} className="gap-2">
              Salvar fornecedor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
