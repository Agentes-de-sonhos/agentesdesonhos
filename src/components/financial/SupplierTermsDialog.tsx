import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpsertSupplierTerms, type SupplierTerms } from "@/hooks/useAgencySupplierTerms";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  existing?: SupplierTerms | null;
}

const PAYMENT_RULE_LABELS: Record<string, string> = {
  after_sale: "Após a venda",
  after_travel: "Após a viagem",
  after_invoice_issued: "Após emissão da nota fiscal",
  after_invoice_sent: "Após envio da nota fiscal",
  manual: "Data manual",
};

export function SupplierTermsDialog({ open, onOpenChange, operatorId, operatorName, existing }: Props) {
  const upsert = useUpsertSupplierTerms();

  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [commissionPercent, setCommissionPercent] = useState<string>("");
  const [commissionFixed, setCommissionFixed] = useState<string>("");
  const [nonCommissionable, setNonCommissionable] = useState<string>("");
  const [paymentRule, setPaymentRule] = useState<string>("after_sale");
  const [paymentDays, setPaymentDays] = useState<string>("30");
  const [requiresInvoice, setRequiresInvoice] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setCommissionType((existing?.default_commission_type as any) || "percentage");
    setCommissionPercent(existing?.default_commission_percent != null ? String(existing.default_commission_percent) : "");
    setCommissionFixed(existing?.default_commission_fixed != null ? String(existing.default_commission_fixed) : "");
    setNonCommissionable(existing?.default_non_commissionable_fees != null ? String(existing.default_non_commissionable_fees) : "");
    setPaymentRule(existing?.payment_rule || "after_sale");
    setPaymentDays(existing?.payment_days != null ? String(existing.payment_days) : "30");
    setRequiresInvoice(!!existing?.requires_invoice);
    setNotes(existing?.notes || "");
  }, [open, existing?.id]);

  const handleSave = async () => {
    await upsert.mutateAsync({
      operator_id: operatorId,
      default_commission_type: commissionType,
      default_commission_percent: commissionType === "percentage" && commissionPercent !== "" ? Number(commissionPercent) : null,
      default_commission_fixed: commissionType === "fixed" && commissionFixed !== "" ? Number(commissionFixed) : null,
      default_non_commissionable_fees: nonCommissionable !== "" ? Number(nonCommissionable) : null,
      payment_rule: paymentRule as any,
      payment_days: paymentDays !== "" ? Number(paymentDays) : null,
      requires_invoice: requiresInvoice,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras comerciais — {operatorName}</DialogTitle>
          <DialogDescription>
            Padrões que serão sugeridos automaticamente ao cadastrar produtos deste fornecedor na Gestão Financeira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Comissão */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Comissão</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de comissão</Label>
                <Select value={commissionType} onValueChange={(v) => setCommissionType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {commissionType === "percentage" ? (
                <div className="space-y-2">
                  <Label>Percentual da comissão (%)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Valor fixo da comissão (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={commissionFixed}
                    onChange={(e) => setCommissionFixed(e.target.value)}
                    placeholder="Ex: 150,00"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Taxas não comissionáveis padrão (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={nonCommissionable}
                onChange={(e) => setNonCommissionable(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </section>

          {/* Recebimento */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Recebimento</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Regra de recebimento</Label>
                <Select value={paymentRule} onValueChange={setPaymentRule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_RULE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo padrão (dias)</Label>
                <Input
                  type="number" min="0"
                  value={paymentDays}
                  onChange={(e) => setPaymentDays(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
          </section>

          {/* Nota fiscal */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Nota fiscal</h4>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Exige nota fiscal?</p>
                <p className="text-xs text-muted-foreground">Quando ativado, novos produtos com este fornecedor já vêm marcados.</p>
              </div>
              <Switch checked={requiresInvoice} onCheckedChange={setRequiresInvoice} />
            </div>
          </section>

          {/* Observações */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Observações</h4>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações internas e fiscais sobre este fornecedor"
              rows={4}
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Salvando..." : "Salvar regras"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}