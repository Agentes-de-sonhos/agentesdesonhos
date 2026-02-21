import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, FileText, Trash2, Download, ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TripService, TripServiceType, TRIP_SERVICE_LABELS } from "@/types/trip";

const SERVICE_ICONS: Record<TripServiceType, any> = {
  flight: Plane,
  hotel: Hotel,
  car_rental: Car,
  transfer: Bus,
  attraction: Ticket,
  insurance: Shield,
  cruise: Ship,
  other: FileText,
};

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  other: "Outros",
};

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDescription(service: TripService): string {
  const data = service.service_data as any;
  
  switch (service.service_type) {
    case "flight":
      return `${data.origin_city} → ${data.destination_city} (${data.airline})`;
    case "hotel":
      return `${data.hotel_name} - ${data.city}`;
    case "car_rental":
      return `${data.car_type} - ${data.pickup_location}`;
    case "transfer":
      return `${data.transfer_type === "arrival" ? "Chegada" : "Saída"} - ${data.location}`;
    case "attraction":
      return `${data.name} (${data.quantity}x)`;
    case "insurance":
      return `${data.provider} - ${data.coverage}`;
    case "cruise":
      return `${data.ship_name} - ${data.route}`;
    case "other":
      return data.description;
    default:
      return "Serviço";
  }
}

function getServiceDates(service: TripService): string {
  const data = service.service_data as any;
  
  switch (service.service_type) {
    case "flight":
      return `${formatDate(data.departure_date)} - ${formatDate(data.return_date)}`;
    case "hotel":
      return `${formatDate(data.check_in)} - ${formatDate(data.check_out)}`;
    case "transfer":
    case "attraction":
      return formatDate(data.date);
    case "insurance":
    case "cruise":
      return `${formatDate(data.start_date)} - ${formatDate(data.end_date)}`;
    default:
      return "";
  }
}

interface TripServiceCardProps {
  service: TripService;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export function TripServiceCard({ service, onDelete, showActions = true }: TripServiceCardProps) {
  const Icon = SERVICE_ICONS[service.service_type] || FileText;
  const label = SERVICE_LABELS[service.service_type] || "Serviço";
  const dates = getServiceDates(service);
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
              <p className="font-medium truncate">{getServiceDescription(service)}</p>
              {dates && (
                <p className="text-sm text-muted-foreground">{dates}</p>
              )}
              {service.voucher_name && (
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={service.voucher_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    {service.voucher_name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
          {showActions && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(service.id)}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TripServiceListProps {
  services: TripService[];
  onDeleteService?: (id: string) => void;
  showActions?: boolean;
  groupByType?: boolean;
}

export function TripServiceList({ services, onDeleteService, showActions = true, groupByType = false }: TripServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum serviço adicionado ainda
      </div>
    );
  }

  if (groupByType) {
    const grouped = services.reduce((acc, service) => {
      const type = service.service_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(service);
      return acc;
    }, {} as Record<string, TripService[]>);

    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([type, typeServices]) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              {(() => {
                const Icon = SERVICE_ICONS[type as TripServiceType];
                return Icon ? <Icon className="h-4 w-4" /> : null;
              })()}
              {SERVICE_LABELS[type as TripServiceType]}
            </h3>
            <div className="space-y-2">
              {typeServices.map((service) => (
                <TripServiceCard
                  key={service.id}
                  service={service}
                  onDelete={onDeleteService}
                  showActions={showActions}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <TripServiceCard
          key={service.id}
          service={service}
          onDelete={onDeleteService}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
