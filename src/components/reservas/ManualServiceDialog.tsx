import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { parsePastedCurrency } from "@/lib/currencyMask";
import type { TravelFileService } from "@/types/travelFile";
import { TripPeriodField } from "@/components/shared/TripPeriodField";
import {
  OPERATION_SERVICE_LABELS,
  canonicalOperationServiceType,
} from "@/lib/operationServiceMap";

/**
 * Um único vocabulário de tipos de serviço em toda a plataforma (reserva,
 * operação e financeiro), para que o tipo escolhido seja gravado como escolhido.
 */
const SERVICE_TYPES: { value: string; label: string }[] = Object.entries(
  OPERATION_SERVICE_LABELS,
).map(([value, label]) => ({ value, label }));

export interface ManualServicePayload {
  serviceId?: string | null;
  /** Situação atual do serviço, reenviada na edição para não regredir. */
  status?: TravelFileService["status"];
  serviceType: string;
  productName: string;
  supplierName?: string | null;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  quantity?: number;
  notes?: string | null;
  requestedAmount?: number | null;
}

export interface ManualServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: TravelFileService | null;
  /** Só quem tem permissão financeira vê e envia valores. */
  canEditAmount?: boolean;
  currency?: string;
  onSave: (payload: ManualServicePayload) => Promise<void>;
}

/** Serviço da reserva preenchido à mão, de forma progressiva. */
export function ManualServiceDialog({
  open,
  onOpenChange,
  service,
  canEditAmount = false,
  currency = "BRL",
  onSave,
}: ManualServiceDialogProps) {
  const [serviceType, setServiceType] = useState("other");
  const [productName, setProductName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFieldError(null);
    setServiceType(canonicalOperationServiceType(service?.service_type));
    setProductName(service?.product_name || "");
    setSupplierName(service?.supplier_name || "");
    setDestination(service?.destination || "");
    setStartDate(service?.start_date || "");
    setEndDate(service?.end_date || "");
    setQuantity(String(service?.quantity ?? 1));
    setNotes(((service?.snapshot as any)?.notes as string) || "");
    setAmount(service?.requested_amount == null ? "" : String(service.requested_amount));
  }, [open, service]);

  const submit = async () => {
    setFieldError(null);
    if (!productName.trim()) {
      setFieldError("Informe o nome do serviço.");
      return;
    }
    // Sem permissão financeira o valor nunca é enviado (fica undefined) — o
    // servidor preserva o preço atual. Com permissão, o campo apagado
    // representa "sem valor" e é enviado como 0, pois o preço do serviço não
    // pode ficar vazio no registro.
    let parsedAmount: number | undefined = canEditAmount ? 0 : undefined;
    if (canEditAmount && amount.trim()) {
      // Aceita o jeito brasileiro de escrever ("1.500,00", "R$ 1 500,00") e
      // também "1500.50". Qualquer outra coisa é recusada, nunca convertida.
      const cleaned = amount.replace(/R\$/gi, "").replace(/[\s\u00A0]/g, "").trim();
      const brFormat = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
      const simple = /^\d+([.,]\d{1,2})?$/;
      const valid = brFormat.test(cleaned) || simple.test(cleaned);
      const parsed = valid ? parsePastedCurrency(cleaned) : null;
      parsedAmount = parsed ?? undefined;
      if (parsed == null || !Number.isFinite(parsed) || parsed < 0) {
        setFieldError("Informe um valor válido, por exemplo 1.500,00.");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({
        serviceId: service?.id || null,
        // Editar nome, datas ou observações não altera a situação já registrada.
        status: service?.status,
        serviceType,
        productName: productName.trim(),
        supplierName: supplierName.trim() || null,
        destination: destination.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        // Sempre enviado: vazio significa apagar a observação anterior.
        notes: notes.trim(),
        // Omitido quando não há permissão financeira: o servidor preserva.
        ...(parsedAmount === undefined ? {} : { requestedAmount: parsedAmount }),
      });
      onOpenChange(false);
    } catch (error: any) {
      setFieldError(error?.message || "Não foi possível salvar agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar serviço" : "Acrescentar serviço"}</DialogTitle>
          <DialogDescription>
            Preencha só o que já souber. Datas, fornecedor e observações podem entrar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="servico-nome">Nome do serviço</Label>
            <Input
              id="servico-nome"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex.: Hotel em Lisboa, 4 noites"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="servico-fornecedor">Fornecedor (opcional)</Label>
              <Input
                id="servico-fornecedor"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="servico-destino">Destino (opcional)</Label>
              <Input
                id="servico-destino"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <TripPeriodField
              id="servico-periodo"
              label="Período do serviço (opcional)"
              className="min-w-0 sm:col-span-2"
              start={startDate}
              end={endDate}
              onChange={({ start, end }) => { setStartDate(start); setEndDate(end); }}
            />
            <div className="min-w-0 space-y-2">
              <Label htmlFor="servico-qtd">Quantidade</Label>
              <Input
                id="servico-qtd"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {canEditAmount && (
              <div className="min-w-0 space-y-2">
                <Label htmlFor="servico-valor">Valor ({currency})</Label>
                <Input
                  id="servico-valor"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="servico-obs">Observações (opcional)</Label>
            <Textarea
              id="servico-obs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {fieldError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {fieldError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar serviço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
