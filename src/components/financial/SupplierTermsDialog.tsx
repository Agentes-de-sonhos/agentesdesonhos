import { useEffect, useState } from "react";
import { Plus, Trash2, Info } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUpsertSupplierTerms, type SupplierTerms } from "@/hooks/useAgencySupplierTerms";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { saveSupplierServiceRules, useSupplierServiceRules, type RuleDraft } from "@/hooks/useSupplierServiceCatalog";
import { ServiceSelect } from "@/components/financial/commission/ServiceSelect";
import { validateRule, type CommissionKind } from "@/lib/supplierCommissionRules";

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

type Row = { _id: string; service_key: string | null; commission_type: CommissionKind; value: string };

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function SupplierTermsDialog({ open, onOpenChange, operatorId, operatorName, existing }: Props) {
  const upsert = useUpsertSupplierTerms();
  const { agencyOwnerId } = useAgencyOwnerId();
  const { data: allRules = [], isLoading: rulesLoading } = useSupplierServiceRules();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [keepLegacy, setKeepLegacy] = useState(true);
  const [paymentRule, setPaymentRule] = useState<string>("after_sale");
  const [paymentDays, setPaymentDays] = useState<string>("30");
  const [requiresInvoice, setRequiresInvoice] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const legacyLabel = existing?.default_commission_type === "percentage" && existing.default_commission_percent != null
    ? `${Number(existing.default_commission_percent)}%`
    : existing?.default_commission_type === "fixed" && existing.default_commission_fixed != null
      ? fmtBRL(Number(existing.default_commission_fixed)) : null;

  useEffect(() => {
    if (!open || rulesLoading) return;
    setRows(allRules.filter((r) => r.operator_id === operatorId).map((r) => ({
      _id: r.id, service_key: r.service_key, commission_type: r.commission_type,
      value: r.commission_value == null ? "" : String(r.commission_value),
    })));
    setKeepLegacy(true);
    setTouched(false);
    setPaymentRule(existing?.payment_rule || "after_sale");
    setPaymentDays(existing?.payment_days != null ? String(existing.payment_days) : "30");
    setRequiresInvoice(!!existing?.requires_invoice);
    setNotes(existing?.notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id, operatorId, rulesLoading]);

  const updateRow = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  const rowError = (r: Row): string | null => {
    if (!r.service_key) return "Escolha o serviço.";
    const v = r.value.trim() === "" ? null : Number(r.value.replace(",", "."));
    return validateRule(r.commission_type, v);
  };
  const usedKeys = rows.map((r) => r.service_key).filter(Boolean) as string[];
  const hasErrors = rows.some((r) => rowError(r));

  const handleSave = async () => {
    setTouched(true);
    if (hasErrors || !agencyOwnerId) return;
    setSaving(true);
    try {
      const drafts: RuleDraft[] = rows.map((r) => ({
        service_key: r.service_key!, commission_type: r.commission_type,
        commission_value: r.commission_type === "none" || r.value.trim() === "" ? null : Number(r.value.replace(",", ".")),
      }));
      await saveSupplierServiceRules(agencyOwnerId, operatorId, drafts);
      await upsert.mutateAsync({
        operator_id: operatorId,
        ...(keepLegacy ? {} : { default_commission_type: null, default_commission_percent: null, default_commission_fixed: null }),
        payment_rule: paymentRule as any,
        payment_days: paymentDays !== "" ? Number(paymentDays) : null,
        requires_invoice: requiresInvoice,
        notes: notes || null,
      });
      qc.invalidateQueries({ queryKey: ["agency_supplier_service_commissions"] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras comerciais — {operatorName}</DialogTitle>
          <DialogDescription>
            Padrões sugeridos ao cadastrar produtos deste fornecedor na Gestão Financeira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Comissões por serviço</h4>
              <Button type="button" size="sm" variant="outline" onClick={() => setRows((rs) => [...rs, { _id: crypto.randomUUID(), service_key: null, commission_type: "percentage", value: "" }])}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar serviço
              </Button>
            </div>

            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Nenhuma comissão por serviço cadastrada. Use “Adicionar serviço” para criar a primeira regra.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="hidden grid-cols-[1fr_170px_150px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                  <span>Serviço</span><span>Tipo de comissão</span><span>Comissão</span><span />
                </div>
                {rows.map((r) => {
                  const err = touched ? rowError(r) : null;
                  return (
                    <div key={r._id} className="rounded-md border p-2 sm:border-0 sm:p-0">
                      <div className="grid gap-2 sm:grid-cols-[1fr_170px_150px_40px] sm:items-center">
                        <ServiceSelect value={r.service_key} disabledKeys={usedKeys} onChange={(o) => updateRow(r._id, { service_key: o.key })} />
                        <Select value={r.commission_type} onValueChange={(v) => updateRow(r._id, { commission_type: v as CommissionKind, ...(v === "none" ? { value: "" } : {}) })}>
                          <SelectTrigger aria-label="Tipo de comissão"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                            <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                            <SelectItem value="none">Sem comissão</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          aria-label="Comissão" type="number" step="0.01" min="0" max={r.commission_type === "percentage" ? 100 : undefined}
                          disabled={r.commission_type === "none"} value={r.value}
                          onChange={(e) => updateRow(r._id, { value: e.target.value })}
                          placeholder={r.commission_type === "fixed" ? "Definir na venda" : r.commission_type === "none" ? "—" : "%"}
                        />
                        <Button type="button" variant="ghost" size="icon" aria-label="Remover regra" onClick={() => setRows((rs) => rs.filter((x) => x._id !== r._id))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              A comissão sugerida pode ser ajustada em cada venda sem alterar este cadastro. Valor fixo vazio = informar o valor na venda.
              Taxas não comissionáveis são informadas em cada venda.
            </p>

            {legacyLabel && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <div>
                  <p className="font-medium">Comissão geral antiga: {legacyLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {keepLegacy
                      ? "Usada só como sugestão provisória para serviços sem regra específica."
                      : "Será removida ao salvar. Serviços sem regra passarão a exigir definição na venda."}
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setKeepLegacy((k) => !k)}>
                  {keepLegacy ? "Deixar de usar" : "Manter"}
                </Button>
              </div>
            )}
          </section>

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
                <Input type="number" min="0" value={paymentDays} onChange={(e) => setPaymentDays(e.target.value)} placeholder="30" />
              </div>
            </div>
          </section>

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

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Observações</h4>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações internas e fiscais sobre este fornecedor" rows={4} />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || (touched && hasErrors)}>
            {saving ? "Salvando..." : "Salvar regras"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
