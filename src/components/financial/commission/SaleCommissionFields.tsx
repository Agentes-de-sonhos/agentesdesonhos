import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAgencySupplierTerms } from "@/hooks/useAgencySupplierTerms";
import { useSupplierServiceRules } from "@/hooks/useSupplierServiceCatalog";
import {
  calcCommission, resolveCommissionSuggestion, validateSaleCommission,
  type CommissionKind, type RuleSource, type Suggestion,
} from "@/lib/supplierCommissionRules";
import type { SaleProductFormData } from "@/types/financial";

type Data = Pick<SaleProductFormData, "operator_id" | "service_key" | "commission_kind" | "commission_value" | "commission_rule_source" | "sale_price" | "non_commissionable_taxes">;
type Patch = Partial<SaleProductFormData>;

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function suggestionToPatch(s: Suggestion): Patch | null {
  if (s.status === "incomplete") return null;
  if (s.status === "no_rule") return { commission_kind: null, commission_value: 0, commission_rule_source: null };
  return { commission_kind: s.kind, commission_value: s.value ?? (null as any), commission_rule_source: s.status as RuleSource };
}

/**
 * Sugere a comissão quando fornecedor ou serviço mudam (em qualquer ordem). Não reaplica ao abrir
 * um produto existente; pede confirmação se a comissão foi ajustada manualmente.
 */
export function useCommissionSuggestion(data: Data, onPatch: (p: Patch) => void, identity: string = "") {
  const { data: rules = [] } = useSupplierServiceRules();
  const { data: terms } = useAgencySupplierTerms();
  const key = `${data.operator_id || ""}|${data.service_key || ""}`;
  const prevKey = useRef(key);
  const prevIdentity = useRef(identity);
  const [pending, setPending] = useState<Patch | null>(null);

  useEffect(() => {
    // Abrir outro produto (ou um produto gravado) define nova linha de base: nada é reaplicado.
    if (prevIdentity.current !== identity) {
      prevIdentity.current = identity;
      prevKey.current = key;
      return;
    }
    if (prevKey.current === key) return;
    prevKey.current = key;
    const s = resolveCommissionSuggestion({
      operatorId: data.operator_id, serviceKey: data.service_key, rules,
      legacy: data.operator_id ? terms?.byOperator.get(data.operator_id) ?? null : null,
    });
    const patch = suggestionToPatch(s);
    if (!patch) return;
    if (data.commission_rule_source === "manual") setPending(patch);
    else onPatch(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, identity]);

  const dialog = (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Substituir a comissão ajustada?</AlertDialogTitle>
          <AlertDialogDescription>
            Você alterou a comissão manualmente. Com o novo fornecedor/serviço,
            {pending?.commission_kind ? " existe uma regra cadastrada." : " não há regra cadastrada e a comissão precisará ser definida."} Deseja substituir?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Manter a minha</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (pending) onPatch(pending); setPending(null); }}>Substituir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { dialog };
}

/** Campos de comissão do produto da venda: tipo, valor, taxas da operação, base e comissão. */
export function SaleCommissionFields({ data, onPatch }: { data: Data; onPatch: (p: Patch) => void }) {
  const kind = data.commission_kind ?? null;
  const price = Number(data.sale_price) || 0;
  const taxes = Number(data.non_commissionable_taxes) || 0;
  const { base, amount } = calcCommission(kind, data.commission_value, price, taxes);
  const hasKey = !!data.operator_id && !!data.service_key;
  const error = kind ? validateSaleCommission(kind, data.commission_value, price, taxes) : null;
  const rawValue = data.commission_value as any;

  return (
    <div className="space-y-3">
      {!kind && hasKey && (
        <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>Não há regra de comissão cadastrada para este fornecedor e serviço. Defina abaixo antes de concluir (não assumimos zero).</span>
        </div>
      )}
      {data.commission_rule_source === "specific" && (
        <p className="flex items-center gap-1.5 text-xs text-primary"><Info className="h-3.5 w-3.5" /> Regra do fornecedor para este serviço. Você pode ajustar só nesta venda.</p>
      )}
      {data.commission_rule_source === "legacy_fallback" && (
        <p className="flex items-center gap-1.5 text-xs text-warning"><Info className="h-3.5 w-3.5" /> Comissão geral antiga do fornecedor (provisória). Confira se vale para este serviço.</p>
      )}
      {data.commission_rule_source === "manual" && (
        <p className="text-xs text-muted-foreground">Comissão ajustada nesta venda (o cadastro do fornecedor não muda).</p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Tipo de comissão</Label>
          <Select value={kind ?? undefined} onValueChange={(v) => onPatch({ commission_kind: v as CommissionKind, commission_rule_source: "manual", ...(v === "none" ? { commission_value: 0 } : {}) })}>
            <SelectTrigger><SelectValue placeholder="Definir" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentual (%)</SelectItem>
              <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
              <SelectItem value="none">Sem comissão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{kind === "fixed" ? "Comissão (R$)" : "Comissão (%)"}</Label>
          <Input
            type="number" step="0.01" min="0" max={kind === "percentage" ? 100 : undefined}
            disabled={!kind || kind === "none"}
            value={kind === "none" || rawValue == null || Number.isNaN(rawValue) ? "" : rawValue}
            onChange={(e) => onPatch({ commission_value: e.target.value === "" ? (null as any) : Number(e.target.value), commission_rule_source: "manual" })}
            placeholder={kind === "fixed" ? "Informe nesta venda" : "0"}
          />
        </div>
        <div className="space-y-2">
          <Label>Taxas não comissionáveis (R$)</Label>
          <Input type="number" step="0.01" min="0" value={data.non_commissionable_taxes || ""} onChange={(e) => onPatch({ non_commissionable_taxes: Number(e.target.value) })} placeholder="0,00" />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 sm:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Preço do serviço</p><p className="text-sm font-semibold">{fmt(price)}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Base comissionável</p>
          <p className="text-sm font-semibold">{kind === "percentage" ? fmt(base) : "—"}</p>
        </div>
        <div><p className="text-xs text-muted-foreground">Comissão do fornecedor</p><p className="text-sm font-semibold text-primary">{kind ? fmt(amount) : "A definir"}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">Base = preço do serviço − taxas não comissionáveis desta venda. Valor fixo não depende da base. Honorários cobrados do cliente são lançados à parte.</p>
    </div>
  );
}
