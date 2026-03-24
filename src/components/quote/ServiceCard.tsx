import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, MoreHorizontal, Trash2, Tag, Pencil, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ServicePaymentForm } from "@/components/quote/ServicePaymentForm";
import type { ServicePaymentConfig } from "@/lib/servicePayment";
import type { QuoteService, ServiceType } from "@/types/quote";

const SERVICE_ICONS: Record<ServiceType, any> = {
  flight: Plane, hotel: Hotel, car_rental: Car, transfer: Bus,
  attraction: Ticket, insurance: Shield, cruise: Ship, other: MoreHorizontal,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", other: "Outros Serviços",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  try { const [y, m, d] = dateStr.split("-").map(Number); return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR }); } catch { return dateStr; }
}

function getServiceDescription(service: QuoteService): string {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return `${data.origin_city} → ${data.destination_city} (${data.airline})`;
    case "hotel": return `${data.hotel_name} - ${data.city}`;
    case "car_rental": return `${data.car_type} - ${data.days} diária(s)`;
    case "transfer": return `${data.transfer_type === "arrival" ? "Chegada" : "Saída"} - ${data.location}`;
    case "attraction": return `${data.name} (${data.quantity || 1}x)`;
    case "insurance": return `${data.provider} - ${data.coverage}`;
    case "cruise": return `${data.ship_name} - ${data.route}`;
    case "other": return data.description;
    default: return "Serviço";
  }
}

function getServiceDetails(service: QuoteService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  switch (service.service_type) {
    case "flight":
      details.push(`Ida: ${formatDate(data.departure_date)}`);
      details.push(`Volta: ${formatDate(data.return_date)}`);
      if (data.outbound_detail) {
        const ob = data.outbound_detail;
        if (ob.flight_number) details.push(`Voo ida: ${ob.flight_number}`);
        if (ob.airport_origin || ob.airport_destination) details.push(`${ob.airport_origin || ''} → ${ob.airport_destination || ''}`);
        if (ob.departure_time || ob.arrival_time) details.push(`Saída: ${ob.departure_time || '-'} | Chegada: ${ob.arrival_time || '-'}`);
      }
      if (data.return_detail) {
        const rt = data.return_detail;
        if (rt.flight_number) details.push(`Voo volta: ${rt.flight_number}`);
        if (rt.airport_origin || rt.airport_destination) details.push(`${rt.airport_origin || ''} → ${rt.airport_destination || ''}`);
        if (rt.departure_time || rt.arrival_time) details.push(`Saída: ${rt.departure_time || '-'} | Chegada: ${rt.arrival_time || '-'}`);
      }
      if (data.includes_baggage) details.push("✓ Bagagem");
      if (data.includes_boarding_fee) details.push("✓ Taxa de embarque");
      break;
    case "hotel":
      details.push(`Check-in: ${formatDate(data.check_in)}`);
      details.push(`Check-out: ${formatDate(data.check_out)}`);
      details.push(`Quarto: ${data.room_type}`);
      details.push(`Alimentação: ${data.meal_plan}`);
      break;
    case "car_rental":
      details.push(`Retirada: ${data.pickup_location}`);
      details.push(`Devolução: ${data.dropoff_location}`);
      break;
    case "transfer": details.push(`Data: ${formatDate(data.date)}`); break;
    case "attraction":
      details.push(`Data: ${formatDate(data.date)}`);
      if (data.adult_price > 0) details.push(`Adulto: R$ ${data.adult_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      if (data.child_price > 0) details.push(`Criança: R$ ${data.child_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      break;
    case "insurance":
      details.push(`${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      break;
    case "cruise":
      details.push(`${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      details.push(`Cabine: ${data.cabin_type}`);
      break;
  }
  return details;
}

interface ServiceCardProps {
  service: QuoteService;
  onDelete: (id: string) => void;
  onEdit: (service: QuoteService) => void;
  isDeleting?: boolean;
  paymentConfig?: ServicePaymentConfig;
  onPaymentChange?: (config: ServicePaymentConfig) => void;
}

export function ServiceCard({ service, onDelete, onEdit, isDeleting, paymentConfig, onPaymentChange }: ServiceCardProps) {
  const [open, setOpen] = useState(false);
  const Icon = SERVICE_ICONS[service.service_type as ServiceType] || MoreHorizontal;
  const label = SERVICE_LABELS[service.service_type as ServiceType] || "Serviço";
  const details = getServiceDetails(service);
  const images = service.image_urls?.length ? service.image_urls : (service.image_url ? [service.image_url] : []);
  const hasExpandableContent = details.length > 0 || service.description || images.length > 0;

  return (
    <Card>
      <CardContent className="p-0">
        <Collapsible open={open} onOpenChange={setOpen}>
          {/* Header — always visible */}
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </span>
                  {service.option_label && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Tag className="h-3 w-3" />
                      {service.option_label}
                    </Badge>
                  )}
                </div>
                <p className="font-medium break-words whitespace-pre-wrap">{getServiceDescription(service)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-semibold text-primary mr-1 whitespace-nowrap">{formatCurrency(service.amount)}</span>
              {hasExpandableContent && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              )}
              <Button variant="ghost" size="icon" onClick={() => onEdit(service)} className="text-muted-foreground hover:text-primary h-8 w-8">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(service.id)} disabled={isDeleting} className="text-muted-foreground hover:text-destructive h-8 w-8">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Expandable content */}
          {hasExpandableContent && (
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-0 border-t border-border/50">
                <div className="pt-3 space-y-3">
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {images.map((url, i) => (
                        <img key={i} src={url} alt={`${label} ${i + 1}`} className="h-24 w-auto max-w-[200px] rounded-lg border border-border object-cover" />
                      ))}
                    </div>
                  )}
                  {details.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {details.map((detail, i) => (
                        <span key={i} className="text-sm text-muted-foreground">{detail}</span>
                      ))}
                    </div>
                  )}
                  {service.description && (
                    <p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3 italic whitespace-pre-wrap break-words">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>

        {/* Per-service payment config — always visible below the card */}
        {onPaymentChange && paymentConfig && (
          <div className="px-4 pb-4 pt-0">
            <ServicePaymentForm
              amount={service.amount}
              config={paymentConfig}
              onChange={onPaymentChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ServiceListProps {
  services: QuoteService[];
  onDeleteService: (id: string) => void;
  onEditService: (service: QuoteService) => void;
  paymentConfigs?: Record<string, ServicePaymentConfig>;
  onPaymentChange?: (serviceId: string, config: ServicePaymentConfig) => void;
}

export function ServiceList({ services, onDeleteService, onEditService, paymentConfigs, onPaymentChange }: ServiceListProps) {
  if (services.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhum serviço adicionado ainda</div>;
  }
  return (
    <div className="space-y-3">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onDelete={onDeleteService}
          onEdit={onEditService}
          paymentConfig={paymentConfigs?.[service.id]}
          onPaymentChange={onPaymentChange ? (config) => onPaymentChange(service.id, config) : undefined}
        />
      ))}
    </div>
  );
}
