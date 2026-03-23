import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ServicePaymentConfig, ServicePaymentType, ServiceDiscountType } from "@/lib/servicePayment";
import { SERVICE_PAYMENT_TYPE_LABELS, PAYMENT_METHOD_OPTIONS, calculateServicePayment } from "@/lib/servicePayment";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface ServicePaymentFormProps {
  amount: number;
  config: ServicePaymentConfig;
  onChange: (config: ServicePaymentConfig) => void;
}

export function ServicePaymentForm({ amount, config, onChange }: ServicePaymentFormProps) {
  const update = (partial: Partial<ServicePaymentConfig>) => {
    onChange({ ...config, ...partial });
  };

  if (!config.is_custom_payment) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-dashed border-border bg-muted/30">
        <Switch
          checked={false}
          onCheckedChange={(checked) => update({ is_custom_payment: checked, payment_type: 'full_payment' })}
        />
        <Label className="text-sm text-muted-foreground cursor-pointer">
          Personalizar forma de pagamento deste serviço
        </Label>
      </div>
    );
  }

  const paymentType = config.payment_type || 'full_payment';

  // Preview
  const preview = (() => {
    if (!config.payment_type) return null;
    const result = calculateServicePayment(amount, config);
    if (result.type === 'installments') {
      return `${result.installmentCount}x de ${formatCurrency(result.installmentValue)}`;
    }
    if (result.type === 'installments_with_entry') {
      return `Entrada ${formatCurrency(result.entryValue)} + ${result.installmentCount}x de ${formatCurrency(result.installmentValue)}`;
    }
    if (result.hasDiscount) {
      return `${formatCurrency(result.discountedTotal)} à vista`;
    }
    return `${formatCurrency(result.total)} à vista`;
  })();

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Pagamento personalizado</Label>
        <Switch
          checked={true}
          onCheckedChange={(checked) => {
            if (!checked) {
              onChange({
                is_custom_payment: false,
                payment_type: null,
                installments: null,
                entry_value: null,
                discount_type: null,
                discount_value: null,
                payment_method: null,
              });
            }
          }}
        />
      </div>

      {/* Payment type selector */}
      <div className="grid gap-2">
        {(Object.keys(SERVICE_PAYMENT_TYPE_LABELS) as ServicePaymentType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => update({ payment_type: type })}
            className={cn(
              "flex items-start gap-2 rounded-lg border p-2.5 text-left transition-all text-sm",
              paymentType === type
                ? "border-primary bg-background ring-1 ring-primary/30"
                : "border-border/60 hover:border-border hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "mt-0.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
              paymentType === type ? "border-primary" : "border-muted-foreground/40"
            )}>
              {paymentType === type && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </div>
            <span className="font-medium">{SERVICE_PAYMENT_TYPE_LABELS[type]}</span>
          </button>
        ))}
      </div>

      {/* Dynamic fields */}
      {paymentType === 'installments' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Nº de parcelas</Label>
            <Input
              type="number" min={2} max={48}
              value={config.installments || ''}
              onChange={(e) => update({ installments: Number(e.target.value) || null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meio de pagamento</Label>
            <Select value={config.payment_method || ''} onValueChange={(v) => update({ payment_method: v || null })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {paymentType === 'installments_with_entry' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Valor da entrada (R$)</Label>
            <Input
              type="number" min={0} step="0.01"
              value={config.entry_value || ''}
              onChange={(e) => update({ entry_value: Number(e.target.value) || null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nº de parcelas</Label>
            <Input
              type="number" min={1} max={48}
              value={config.installments || ''}
              onChange={(e) => update({ installments: Number(e.target.value) || null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meio de pagamento</Label>
            <Select value={config.payment_method || ''} onValueChange={(v) => update({ payment_method: v || null })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {paymentType === 'full_payment' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Tipo de desconto</Label>
            <Select
              value={config.discount_type || ''}
              onValueChange={(v) => update({ discount_type: (v as ServiceDiscountType) || null })}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentual (%)</SelectItem>
                <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {config.discount_type && (
            <div className="space-y-1">
              <Label className="text-xs">
                {config.discount_type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
              </Label>
              <Input
                type="number" min={0} step="0.01"
                value={config.discount_value || ''}
                onChange={(e) => update({ discount_value: Number(e.target.value) || null })}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Meio de pagamento</Label>
            <Select value={config.payment_method || ''} onValueChange={(v) => update({ payment_method: v || null })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="text-sm font-medium text-primary">
            Exibição: <span className="font-bold">{preview}</span>
            {config.payment_method && <span className="text-muted-foreground font-normal"> no {config.payment_method}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
