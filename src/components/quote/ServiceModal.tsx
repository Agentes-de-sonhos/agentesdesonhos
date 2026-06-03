import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ServiceForm } from "@/components/quote/ServiceForms";
import { ServicePaymentForm } from "@/components/quote/ServicePaymentForm";
import type { ServiceType, ServiceData, QuoteService } from "@/types/quote";
import { SERVICE_TYPE_LABELS, MULTI_OPTION_TYPES } from "@/types/quote";
import type { ServicePaymentConfig } from "@/lib/servicePayment";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
            onSubmit={onSubmit}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}