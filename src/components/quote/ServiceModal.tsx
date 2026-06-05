import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ServiceForm } from "@/components/quote/ServiceForms";
import { ServicePaymentForm } from "@/components/quote/ServicePaymentForm";
import type { ServiceType, ServiceData, QuoteService } from "@/types/quote";
import { SERVICE_TYPE_LABELS, MULTI_OPTION_TYPES } from "@/types/quote";
import type { ServicePaymentConfig } from "@/lib/servicePayment";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Building2 } from "lucide-react";

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

  const [supplierOpen, setSupplierOpen] = useState<boolean>(
    Boolean(initialSupplier.operator_id || initialSupplier.supplier_name),
  );
  useEffect(() => {
    setSupplierOpen(Boolean(initialSupplier.operator_id || initialSupplier.supplier_name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingService?.id, serviceType, open]);

  const supplierRef = useRef<HTMLDivElement | null>(null);
  const pendingSubmitRef = useRef<null | (() => Promise<void> | void)>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doSubmit = (
    service_data: ServiceData,
    amount: number,
    option_label?: string,
    description?: string,
    image_url?: string,
    image_urls?: string[],
  ) => {
    const merged: any = {
      ...(service_data as any),
      supplier_operator_id: supplier.operator_id ?? null,
      supplier_name: supplier.supplier_name || null,
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
      pendingSubmitRef.current = () =>
        doSubmit(service_data, amount, option_label, description, image_url, image_urls);
      setConfirmOpen(true);
      return;
    }
    return doSubmit(service_data, amount, option_label, description, image_url, image_urls);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[calc(100vh-48px)] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {title}{optionNumber ? ` (Opção ${optionNumber})` : ""}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do serviço. As alterações são salvas ao clicar em Salvar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4">
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
          <div ref={supplierRef} className="mt-6 border-t pt-4">
            <Collapsible open={supplierOpen} onOpenChange={setSupplierOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Fornecedor <span className="text-xs">(opcional)</span>
                  {(supplier.operator_id || supplier.supplier_name) && (
                    <span className="text-xs text-foreground font-medium ml-1">
                      · {supplier.supplier_name}
                    </span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${supplierOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-1.5">
                <SupplierSelector value={supplier} onChange={setSupplier} />
                <p className="text-xs text-muted-foreground">
                  Vincular um fornecedor ajuda no controle financeiro, pagamentos e comissões.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja vincular este serviço a um fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Vincular um fornecedor ajuda no controle financeiro, pagamentos, comissões e acompanhamento operacional. Você pode fazer isso agora ou posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmOpen(false);
                setSupplierOpen(true);
                setTimeout(() => {
                  supplierRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 50);
                pendingSubmitRef.current = null;
              }}
            >
              Vincular fornecedor
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const fn = pendingSubmitRef.current;
                pendingSubmitRef.current = null;
                setConfirmOpen(false);
                if (fn) await fn();
              }}
            >
              Agora não
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}