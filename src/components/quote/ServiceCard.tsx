import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, MoreHorizontal, Trash2, Tag, Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  try { return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR }); } catch { return dateStr; }
}

function getServiceDescription(service: QuoteService): string {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return `${data.origin_city} → ${data.destination_city} (${data.airline})`;
    case "hotel": return `${data.hotel_name} - ${data.city}`;
    case "car_rental": return `${data.car_type} - ${data.days} diária(s)`;
    case "transfer": return `${data.transfer_type === "arrival" ? "Chegada" : "Saída"} - ${data.location}`;
    case "attraction": return `${data.name} (${data.quantity}x)`;
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
    case "attraction": details.push(`Data: ${formatDate(data.date)}`); break;
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
}

export function ServiceCard({ service, onDelete, onEdit, isDeleting }: ServiceCardProps) {
  const Icon = SERVICE_ICONS[service.service_type as ServiceType] || MoreHorizontal;
  const label = SERVICE_LABELS[service.service_type as ServiceType] || "Serviço";
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {service.image_url ? (
              <img src={service.image_url} alt={label} className="h-14 w-20 rounded-lg border border-border object-cover shrink-0" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
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
              <p className="font-medium">{getServiceDescription(service)}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {getServiceDetails(service).map((detail, i) => (
                  <span key={i} className="text-xs text-muted-foreground">{detail}</span>
                ))}
              </div>
              {service.description && (
                <p className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/20 pl-2 italic">
                  {service.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-primary mr-1">{formatCurrency(service.amount)}</span>
            <Button variant="ghost" size="icon" onClick={() => onEdit(service)} className="text-muted-foreground hover:text-primary h-8 w-8">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(service.id)} disabled={isDeleting} className="text-muted-foreground hover:text-destructive h-8 w-8">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ServiceListProps {
  services: QuoteService[];
  onDeleteService: (id: string) => void;
  onEditService: (service: QuoteService) => void;
}

export function ServiceList({ services, onDeleteService, onEditService }: ServiceListProps) {
  if (services.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhum serviço adicionado ainda</div>;
  }
  return (
    <div className="space-y-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} onDelete={onDeleteService} onEdit={onEditService} />
      ))}
    </div>
  );
}
