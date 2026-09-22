import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TravelFileService } from "@/types/travelFile";
import { useServiceFinancialRule, useSupplierTerms } from "@/hooks/useUnifiedWorkflow";

const NONE_OPERATOR = "__none__";

interface ServiceFinancialRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  service: TravelFileService;
}

/**
 * Regra financeira do serviço (fornecedor + comissão) no fluxo unificado V2.
 * Ao escolher o fornecedor, os termos padrão da agência (agency_supplier_terms)
 * podem ser carregados com um toque, mas nada é inventado: sem termos padrão,
 * os campos ficam em branco e o agente revisa antes de confirmar.
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
  const [commissionType, setCommissionType] = useState(service.commission_type ?? "none");
  const [commissionPercent, setCommissionPercent] = useState(
    service.commission_percent != null ? String(service.commission_percent) : "",
  );
  const [commissionFixed, setCommissionFixed] = useState(
    service.commission_fixed != null ? String(service.commission_fixed) : "",
  );
  const [fees, setFees] = useState(
    service.non_commissionable_fees != null ? String(service.non_commissionable_fees) : "",
  );
  const [paymentRule, setPaymentRule] = useState(service.payment_rule ?? "");
  const [paymentDays, setPaymentDays] = useState(
    service.payment_days != null ? String(service.payment_days) : "",
  );
  const [requiresInvoice, setRequiresInvoice] = useState(!!service.requires_invoice);
  const [status, setStatus] = useState<string>(service.financial_rule_status ?? "confirmed");
  const [justification, setJustification] = useState(
    String(service.financial_rule_snapshot?.justification ?? ""),
  );
  const [termsLoaded, setTermsLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOperatorId(service.operator_id ?? NONE_OPERATOR);
    setSupplierName(service.supplier_name ?? "");
    setCommissionType(service.commission_type ?? "none");
    setCommissionPercent(service.commission_percent != null ? String(service.commission_percent) : "");
    setCommissionFixed(service.commission_fixed != null ? String(service.commission_fixed) : "");
    setFees(service.non_commissionable_fees != null ? String(service.non_commissionable_fees) : "");
    setPaymentRule(service.payment_rule ?? "");
    setPaymentDays(service.payment_days != null ? String(service.payment_days) : "");
    setRequiresInvoice(!!service.requires_invoice);
    setStatus(service.financial_rule_status ?? "confirmed");
    setJustification(String(service.financial_rule_snapshot?.justification ?? ""));
    setTermsLoaded(false);
  }, [open, service]);

  const operatorsQuery = useQuery({
    queryKey: ["tour-operators-options"],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase.from("tour_operators") as any)
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  const realOperatorId = operatorId === NONE_OPERATOR ? null : operatorId;
  const { data: terms, isFetching: termsLoading } = useSupplierTerms(realOperatorId, open);

  const applyTerms = () => {
    if (!terms) {
      toast.info("Esta agência ainda não cadastrou termos padrão para este fornecedor.");
      return;
    }
    setCommissionType(terms.commission_type ?? "none");
    setCommissionPercent(terms.commission_percent != null ? String(terms.commission_percent) : "");
    setCommissionFixed(terms.commission_fixed != null ? String(terms.commission_fixed) : "");
    setFees(terms.non_commissionable_fees != null ? String(terms.non_commissionable_fees) : "");
    setPaymentRule(terms.payment_rule ?? "");
    setPaymentDays(terms.payment_days != null ? String(terms.payment_days) : "");
    setRequiresInvoice(!!terms.requires_invoice);
    setTermsLoaded(true);
  };

  const toNumber = (value: string): number | null => {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const save = async () => {
    if (saveRule.isPending) return;
    try {
      await saveRule.mutateAsync({
        serviceId: service.id,
        payload: {
          operator_id: realOperatorId,
          supplier_name: supplierName.trim() || null,
          commission_type: commissionType || "none",
          commission_percent: toNumber(commissionPercent),
          commission_fixed: toNumber(commissionFixed),
          non_commissionable_fees: toNumber(fees) ?? 0,
          payment_rule: paymentRule.trim() || null,
          payment_days: toNumber(paymentDays),
          requires_invoice: requiresInvoice,
          status,
          justification: justification.trim() || null,
          source: termsLoaded ? "agency_terms" : "manual",
        },
      });
      toast.success("Regra financeira do serviço atualizada.");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        String(error?.message || "Não foi possível salvar a regra financeira.").replace(
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
          <DialogTitle>Regra financeira — {service.product_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="rule-operator">Fornecedor / operadora</Label>
            <Select value={operatorId} onValueChange={(v) => { setOperatorId(v); setTermsLoaded(false); }}>
              <SelectTrigger id="rule-operator" className="mt-1">
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPERATOR}>Não vinculado a operadora cadastrada</SelectItem>
                {(operatorsQuery.data ?? []).map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {realOperatorId && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto px-0 text-xs"
                disabled={termsLoading}
                onClick={applyTerms}
              >
                {termsLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Usar termos padrão da agência
              </Button>
            )}
          </div>

          <div>
            <Label htmlFor="rule-supplier-name">Nome do fornecedor (como aparece na reserva)</Label>
            <Input
              id="rule-supplier-name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="mt-1"
              placeholder="Ex.: CVC, RCI, Cia aérea..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="rule-commission-type">Comissão</Label>
              <Select value={commissionType} onValueChange={setCommissionType}>
                <SelectTrigger id="rule-commission-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem comissão</SelectItem>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {commissionType === "percentage" && (
              <div>
                <Label htmlFor="rule-commission-percent">Percentual (%)</Label>
                <Input
                  id="rule-commission-percent"
                  inputMode="decimal"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            {commissionType === "fixed" && (
              <div>
                <Label htmlFor="rule-commission-fixed">Valor fixo</Label>
                <Input
                  id="rule-commission-fixed"
                  inputMode="decimal"
                  value={commissionFixed}
                  onChange={(e) => setCommissionFixed(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="rule-fees">Taxas não comissionáveis</Label>
              <Input
                id="rule-fees"
                inputMode="decimal"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rule-payment-rule">Regra de pagamento ao fornecedor</Label>
              <Input
                id="rule-payment-rule"
                value={paymentRule}
                onChange={(e) => setPaymentRule(e.target.value)}
                className="mt-1"
                placeholder="Ex.: antecipado, após o check-in..."
              />
            </div>
            <div>
              <Label htmlFor="rule-payment-days">Prazo (dias)</Label>
              <Input
                id="rule-payment-days"
                inputMode="numeric"
                value={paymentDays}
                onChange={(e) => setPaymentDays(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={requiresInvoice}
              onCheckedChange={(v) => setRequiresInvoice(v === true)}
            />
            Fornecedor exige nota fiscal
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rule-status">Situação da regra</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="rule-status" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="not_applicable">Não se aplica</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rule-justification">Justificativa / exceção</Label>
              <Textarea
                id="rule-justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Ex.: fornecedor informado pelo cliente, sem cadastro."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveRule.isPending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saveRule.isPending} className="gap-2">
              {saveRule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar regra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
