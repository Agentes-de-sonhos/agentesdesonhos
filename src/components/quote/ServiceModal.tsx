import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ServiceForm } from "@/components/quote/ServiceForms";
import { ServicePaymentForm } from "@/components/quote/ServicePaymentForm";
import type { ServiceType, ServiceData, QuoteService } from "@/types/quote";
import { SERVICE_TYPE_LABELS, MULTI_OPTION_TYPES } from "@/types/quote";
import type { ServicePaymentConfig } from "@/lib/servicePayment";
import { extractFlightFeeInfo } from "@/lib/servicePayment";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { SupplierSelector, type SupplierSelectorValue } from "@/components/financial/SupplierSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Building2, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ServiceFormHeader } from "@/components/quote/ServiceModeChooser";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType: ServiceType | null;
  editingService: QuoteService | null;
  serviceCountByType: Record<string, number>;
  tripStartDate?: Date;
  tripEndDate?: Date;
  adultsCount: number;
  childrenCount: number;
  isLoading: boolean;
  onSubmit: (
    service_data: ServiceData,
    amount: number,
    option_label?: string,
    description?: string,
    image_url?: string,
    image_urls?: string[],
  ) => Promise<void> | void;
  newServicePaymentConfig: ServicePaymentConfig;
  setNewServicePaymentConfig: (cfg: ServicePaymentConfig) => void;
  servicePaymentConfigs: Record<string, ServicePaymentConfig>;
  onServicePaymentChange: (serviceId: string, cfg: ServicePaymentConfig) => void;
}

export function ServiceModal(props: Props) {
  const {
    open, onOpenChange, serviceType, editingService, serviceCountByType,
    tripStartDate, tripEndDate, adultsCount, childrenCount, isLoading, onSubmit,
    newServicePaymentConfig, setNewServicePaymentConfig,
    servicePaymentConfigs, onServicePaymentChange,
  } = props;

  if (!serviceType) return null;

  const title = `${editingService ? "Editar " : "Adicionar "}${SERVICE_TYPE_LABELS[serviceType]}`;
  const isMulti = MULTI_OPTION_TYPES.includes(serviceType);
  const optionNumber = !editingService && isMulti
    ? (serviceCountByType[serviceType] || 0) + 1
    : null;

  const initialSupplier: SupplierSelectorValue = (() => {
    const sd: any = editingService?.service_data || {};
    return {
      operator_id: sd?.supplier_operator_id ?? null,
      supplier_name: sd?.supplier_name ?? "",
    };
  })();
  const [supplier, setSupplier] = useState<SupplierSelectorValue>(initialSupplier);
  useEffect(() => {
    const sd: any = editingService?.service_data || {};
    setSupplier({
      operator_id: sd?.supplier_operator_id ?? null,
      supplier_name: sd?.supplier_name ?? "",
    });
    // Reset when modal closes/opens or target service changes
  }, [editingService?.id, serviceType, open]);

  const pendingSubmitRef = useRef<null | (() => Promise<void> | void)>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [pendingSupplier, setPendingSupplier] = useState<SupplierSelectorValue>({ operator_id: null, supplier_name: "" });

  // Show inline supplier section only when editing a service that already has a linked supplier
  const hasLinkedSupplier = Boolean(
    editingService && (initialSupplier.operator_id || (initialSupplier.supplier_name && initialSupplier.supplier_name.trim())),
  );
  const [editSupplierOpen, setEditSupplierOpen] = useState(false);
  useEffect(() => {
    setEditSupplierOpen(false);
  }, [editingService?.id, serviceType, open]);

  const doSubmit = (
    service_data: ServiceData,
    amount: number,
    option_label?: string,
    description?: string,
    image_url?: string,
    image_urls?: string[],
    overrideSupplier?: SupplierSelectorValue,
  ) => {
    const s = overrideSupplier ?? supplier;
    const merged: any = {
      ...(service_data as any),
      supplier_operator_id: s.operator_id ?? null,
      supplier_name: s.supplier_name || null,
    };
    return onSubmit(merged, amount, option_label, description, image_url, image_urls);
  };

  const handleSubmit = (
    service_data: ServiceData,
    amount: number,
    option_label?: string,
    description?: string,
    image_url?: string,
    image_urls?: string[],
  ) => {
    const hasSupplier = Boolean(supplier.operator_id || (supplier.supplier_name && supplier.supplier_name.trim()));
    if (!hasSupplier) {
      pendingSubmitRef.current = (sup?: SupplierSelectorValue) =>
        doSubmit(service_data, amount, option_label, description, image_url, image_urls, sup);
      setPendingSupplier({ operator_id: null, supplier_name: "" });
      setLinkMode(false);
      setConfirmOpen(true);
      return;
    }
    return doSubmit(service_data, amount, option_label, description, image_url, image_urls);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[calc(100vh-48px)] p-0 flex flex-col gap-0 overflow-hidden border-0 bg-muted">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {title}{optionNumber ? ` (Opção ${optionNumber})` : ""}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do serviço. As alterações são salvas ao clicar em Salvar.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "flex-1 overflow-y-auto px-4 sm:px-6 pt-10 pb-6 space-y-4",
            // Unified visual language for every service form (matches Flight pattern):
            //  • Modal: solid light gray base (set on DialogContent above)
            //  • Main card: white surface with a single solid, soft gray border
            //  • Inputs/Selects/Textareas: solid soft gray fill with discrete border
            "[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:bg-muted",
            "[&_textarea]:bg-muted",
            "[&_button[role=combobox]]:bg-muted",
          )}
        >
          {hasLinkedSupplier && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Fornecedor vinculado</p>
                    <p className="text-sm font-medium truncate">
                      {supplier.supplier_name || "Sem nome"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditSupplierOpen((v) => !v)}
                  >
                    {editSupplierOpen ? "Fechar" : "Alterar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSupplier({ operator_id: null, supplier_name: "" })}
                    title="Remover fornecedor"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Collapsible open={editSupplierOpen} onOpenChange={setEditSupplierOpen}>
                <CollapsibleContent className="pt-3">
                  <SupplierSelector value={supplier} onChange={setSupplier} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    A alteração será aplicada ao salvar o serviço.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
          {editingService && !hasLinkedSupplier && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-card p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Nenhum fornecedor vinculado
                {supplier.supplier_name ? (
                  <span className="text-foreground font-medium">· {supplier.supplier_name}</span>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditSupplierOpen((v) => !v)}
              >
                {editSupplierOpen ? "Fechar" : "Vincular"}
              </Button>
            </div>
          )}
          {editingService && !hasLinkedSupplier && editSupplierOpen && (
            <div className="rounded-xl border border-border bg-card p-4">
              <SupplierSelector value={supplier} onChange={setSupplier} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                A vinculação será aplicada ao salvar o serviço.
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          {!editingService && (
            <ServiceFormHeader serviceType={serviceType} />
          )}
          <ServiceForm
            key={editingService?.id || `new-${serviceType}`}
            serviceType={serviceType}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            showOptionLabel={isMulti}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            adultsCount={adultsCount}
            childrenCount={childrenCount}
            initialData={editingService ? {
              service_data: editingService.service_data,
              amount: editingService.amount,
              option_label: editingService.option_label,
              description: editingService.description,
              image_url: editingService.image_url,
              image_urls: editingService.image_urls || [],
            } : undefined}
            paymentSlot={editingService ? (
              (liveAmount: number) => (
                <ServicePaymentForm
                  amount={liveAmount || editingService.amount}
                  config={servicePaymentConfigs[editingService.id] || { is_custom_payment: false, payment_type: null, installments: null, entry_value: null, discount_type: null, discount_value: null, payment_method: null }}
                  onChange={(config) => onServicePaymentChange(editingService.id, config)}
                  feeInfo={extractFlightFeeInfo(editingService)}
                />
              )
            ) : (
              (liveAmount: number) => (
                <ServicePaymentForm
                  amount={liveAmount}
                  config={newServicePaymentConfig}
                  onChange={setNewServicePaymentConfig}
                />
              )
            )}
          />
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setLinkMode(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {linkMode ? "Vincular fornecedor" : "Deseja vincular este serviço a um fornecedor?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {linkMode
                ? "Busque um fornecedor existente ou crie um novo."
                : "Vincular um fornecedor ajuda no controle financeiro, pagamentos, comissões e acompanhamento operacional. Você pode fazer isso agora ou posteriormente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {linkMode && (
            <div className="py-2">
              <SupplierSelector value={pendingSupplier} onChange={setPendingSupplier} />
            </div>
          )}
          <AlertDialogFooter>
            {linkMode ? (
              <>
                <Button variant="outline" onClick={() => setLinkMode(false)}>Voltar</Button>
                <Button
                  disabled={!pendingSupplier.operator_id && !(pendingSupplier.supplier_name || "").trim()}
                  onClick={async () => {
                    const fn = pendingSubmitRef.current as null | ((s?: SupplierSelectorValue) => Promise<void> | void);
                    pendingSubmitRef.current = null;
                    setSupplier(pendingSupplier);
                    setConfirmOpen(false);
                    setLinkMode(false);
                    if (fn) await fn(pendingSupplier);
                  }}
                >
                  Salvar com fornecedor
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setLinkMode(true)}>
                  Vincular fornecedor
                </Button>
                <Button
                  onClick={async () => {
                    const fn = pendingSubmitRef.current as null | ((s?: SupplierSelectorValue) => Promise<void> | void);
                    pendingSubmitRef.current = null;
                    setConfirmOpen(false);
                    if (fn) await fn();
                  }}
                >
                  Agora não
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}