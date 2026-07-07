import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, MoreHorizontal, Trash2, Tag, Pencil, ChevronDown, Map, TramFront, GripVertical,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { QuoteService, ServiceType } from "@/types/quote";
import { FLIGHT_STATUS_CLASS, FLIGHT_STATUS_LABEL, computeFlightStatus, type FlightStatus } from "./flight-wizard/flightStatus";
import { segmentLabel, splitFlightLegs } from "@/lib/flightSegments";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SERVICE_ICONS: Record<ServiceType, any> = {
  flight: Plane, hotel: Hotel, car_rental: Car, transfer: Bus,
  attraction: Ticket, insurance: Shield, cruise: Ship, rail_transport: TramFront, circuit: Map, other: MoreHorizontal,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", rail_transport: "Transporte Ferroviário", circuit: "Circuitos", other: "Outros Serviços",
};
import { formatQuoteCurrency, type QuoteCurrency } from "@/lib/quoteCurrency";

function getServiceLabel(service: QuoteService): string {
  if (service.service_type === "other") {
    const customTitle = (service.service_data as any)?.custom_title?.trim();
    if (customTitle) return customTitle;
  }
  return SERVICE_LABELS[service.service_type as ServiceType] || "Serviço";
}

function formatCurrency(value: number, currency: QuoteCurrency = 'BRL') {
  return formatQuoteCurrency(value, currency);
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
    case "transfer": return `${data.transfer_type === "round_trip" ? "Ida e Volta" : data.transfer_type === "arrival" ? "Chegada" : "Saída"} - ${data.location}`;
    case "attraction": return `${data.name} (${data.quantity || 1}x)`;
    case "insurance": return `${data.provider} - ${data.coverage}`;
    case "cruise": return `${data.ship_name} - ${data.route}`;
    case "rail_transport": return `${data.origin_city || ""} → ${data.destination_city || ""}`;
    case "circuit": return data.circuit_name || "Circuito";
    case "other": return data.description;
    default: return "Serviço";
  }
}

function getServiceDetails(service: QuoteService, currency: QuoteCurrency = 'BRL'): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  switch (service.service_type) {
    case "flight":
      details.push(`Ida: ${formatDate(data.departure_date)}`);
      if (data.return_date && !data.is_one_way) details.push(`Volta: ${formatDate(data.return_date)}`);
      // Multi-leg support (with backward compat for single outbound_detail/return_detail)
      const { outbound: outLegs, internal: intLegs, return_: retLegs } = splitFlightLegs(data);
      outLegs.forEach((ob: any, i: number) => {
        const label = ob.segment_type ? segmentLabel(ob.segment_type) : (outLegs.length > 1 ? `Voo ida (trecho ${i + 1})` : `Voo ida`);
        if (ob.flight_number) details.push(`${label}: ${ob.flight_number}`);
        const legParts: string[] = [];
        if (ob.leg_date) legParts.push(formatDate(ob.leg_date));
        if (ob.airport_origin || ob.airport_destination) legParts.push(`${ob.airport_origin || ''} → ${ob.airport_destination || ''}`);
        if (legParts.length) details.push(legParts.join(' | '));
        if (ob.departure_time || ob.arrival_time) details.push(`Saída: ${ob.departure_time || '-'} | Chegada: ${ob.arrival_time || '-'}`);
      });
      intLegs.forEach((it: any, i: number) => {
        const label = intLegs.length > 1 ? `Trecho interno (${i + 1})` : `Trecho interno`;
        if (it.flight_number) details.push(`${label}: ${it.flight_number}`);
        const legParts: string[] = [];
        if (it.leg_date) legParts.push(formatDate(it.leg_date));
        if (it.airport_origin || it.airport_destination) legParts.push(`${it.airport_origin || ''} → ${it.airport_destination || ''}`);
        if (legParts.length) details.push(legParts.join(' | '));
        if (it.departure_time || it.arrival_time) details.push(`Saída: ${it.departure_time || '-'} | Chegada: ${it.arrival_time || '-'}`);
      });
      retLegs.forEach((rt: any, i: number) => {
        const label = rt.segment_type ? segmentLabel(rt.segment_type) : (retLegs.length > 1 ? `Voo volta (trecho ${i + 1})` : `Voo volta`);
        if (rt.flight_number) details.push(`${label}: ${rt.flight_number}`);
        const legParts: string[] = [];
        if (rt.leg_date) legParts.push(formatDate(rt.leg_date));
        if (rt.airport_origin || rt.airport_destination) legParts.push(`${rt.airport_origin || ''} → ${rt.airport_destination || ''}`);
        if (legParts.length) details.push(legParts.join(' | '));
        if (rt.departure_time || rt.arrival_time) details.push(`Saída: ${rt.departure_time || '-'} | Chegada: ${rt.arrival_time || '-'}`);
      });
      if (data.includes_baggage) details.push("✓ Bagagem");
      if (data.includes_boarding_fee) details.push("✓ Taxa de embarque");
      break;
    case "hotel":
      details.push(`Check-in: ${formatDate(data.check_in)}`);
      details.push(`Check-out: ${formatDate(data.check_out)}`);
      if (data.meal_plan) details.push(`Alimentação: ${data.meal_plan}`);
      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        const hasMulti = data.rooms.length > 1;
        data.rooms.forEach((r: any) => {
          const paxParts: string[] = [];
          if (r.adults) paxParts.push(`${r.adults} adulto${r.adults > 1 ? "s" : ""}`);
          if (r.children) {
            const ages = Array.isArray(r.children_ages) && r.children_ages.length
              ? ` (${r.children_ages.join(", ")} ${r.children_ages.length > 1 ? "anos" : "ano"})`
              : "";
            paxParts.push(`${r.children} criança${r.children > 1 ? "s" : ""}${ages}`);
          }
          const qty = Number(r.quantity) || 1;
          const unit = Number(r.unit_price) || 0;
          const total = Number(r.total_price) || unit * qty;
          const priceLabel = hasMulti && total > 0 ? ` — ${formatQuoteCurrency(total, currency)}` : "";
          details.push(`${qty}x ${r.room_type}${paxParts.length ? ` — ${paxParts.join(" + ")}` : ""}${priceLabel}`);
        });
      } else if (data.room_type) {
        details.push(`Quarto: ${data.room_type}`);
      }
      break;
    case "car_rental":
      if (data.pickup_date) details.push(`Retirada: ${formatDate(data.pickup_date)}${data.pickup_time ? ` às ${data.pickup_time}` : ''} — ${data.pickup_location}`);
      else details.push(`Retirada: ${data.pickup_location}`);
      if (data.dropoff_date) details.push(`Devolução: ${formatDate(data.dropoff_date)}${data.dropoff_time ? ` às ${data.dropoff_time}` : ''} — ${data.dropoff_location}`);
      else details.push(`Devolução: ${data.dropoff_location}`);
      break;
    case "transfer":
      if (data.transfer_type === "round_trip") {
        details.push(`Chegada: ${formatDate(data.arrival_date || data.date)}`);
        if (data.departure_date) details.push(`Saída: ${formatDate(data.departure_date)}`);
      } else {
        details.push(`Data: ${formatDate(data.date)}`);
      }
      break;
    case "attraction":
      details.push(`Data: ${formatDate(data.date)}`);
      if (data.adult_price > 0) details.push(`Adulto: ${formatQuoteCurrency(data.adult_price, currency)}`);
      if (data.child_price > 0) details.push(`Criança: ${formatQuoteCurrency(data.child_price, currency)}`);
      break;
    case "insurance":
      details.push(`${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      break;
    case "cruise":
      details.push(`${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      details.push(`Cabine: ${data.cabin_type}`);
      break;
    case "rail_transport": {
      const railTypeLbl: Record<string, string> = { high_speed: "Trem de alta velocidade", regional: "Trem regional", night: "Trem noturno", panoramic: "Trem panorâmico", other: "Outro" };
      const railClassLbl: Record<string, string> = { economy: "Classe Econômica", second: "Segunda Classe", first: "Primeira Classe", executive: "Executiva", sleeper: "Cabine Leito" };
      if (data.travel_date) details.push(`Data: ${formatDate(data.travel_date)}`);
      if (data.departure_time || data.arrival_time) {
        details.push(`Horário: ${data.departure_time || "—"} → ${data.arrival_time || "—"}`);
      }
      if (data.operator) details.push(`Operadora: ${data.operator}`);
      if (data.rail_type) details.push(railTypeLbl[data.rail_type] || data.rail_type);
      if (data.travel_class) details.push(railClassLbl[data.travel_class] || data.travel_class);
      const pax = (Number(data.adults_count) || 0) + (Number(data.children_count) || 0) + (Number(data.infants_count) || 0);
      if (pax > 0) details.push(`${pax} passageiro(s)`);
      if (data.origin_station) details.push(`Estação origem: ${data.origin_station}`);
      if (data.destination_station) details.push(`Estação destino: ${data.destination_station}`);
      break;
    }
    case "circuit":
      if (data.duration) details.push(`Duração: ${data.duration}`);
      if (data.itinerary) details.push(data.itinerary);
      if (data.notes) details.push(data.notes);
      break;
  }
  return details;
}

interface ServiceCardProps {
  service: QuoteService;
  onDelete: (id: string) => void;
  onEdit: (service: QuoteService) => void;
  isDeleting?: boolean;
  dragHandle?: React.ReactNode;
  currency?: QuoteCurrency;
}

export function ServiceCard({ service, onDelete, onEdit, isDeleting, dragHandle, currency = 'BRL' }: ServiceCardProps) {
  const [open, setOpen] = useState(false);
  const Icon = SERVICE_ICONS[service.service_type as ServiceType] || MoreHorizontal;
  const label = getServiceLabel(service);
  const details = getServiceDetails(service, currency);
  const images = service.image_urls?.length ? service.image_urls : (service.image_url ? [service.image_url] : []);
  const hasExpandableContent = details.length > 0 || service.description || images.length > 0;

  return (
    <Card>
      <CardContent className="p-0">
        <Collapsible open={open} onOpenChange={setOpen}>
          {/* Header — always visible */}
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {dragHandle}
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
                  {service.service_type === "flight" && (() => {
                    const raw = (service.service_data as any)?.flight_status as FlightStatus | undefined;
                    const status: FlightStatus = raw || computeFlightStatus(service.service_data);
                    return (
                      <Badge variant="outline" className={cn("text-[10px] py-0 h-5", FLIGHT_STATUS_CLASS[status])}>
                        {FLIGHT_STATUS_LABEL[status]}
                      </Badge>
                    );
                  })()}
                </div>
                <p className="font-medium break-words whitespace-pre-wrap">{getServiceDescription(service)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-semibold text-primary mr-1 whitespace-nowrap">{formatCurrency(service.amount, currency)}</span>
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
              <ConfirmDeleteDialog
                onConfirm={() => onDelete(service.id)}
                title="Remover serviço?"
                description="Este serviço será removido permanentemente do orçamento. Tem certeza?"
              >
                <Button variant="ghost" size="icon" disabled={isDeleting} className="text-muted-foreground hover:text-destructive h-8 w-8">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </ConfirmDeleteDialog>
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

      </CardContent>
    </Card>
  );
}

interface ServiceListProps {
  services: QuoteService[];
  onDeleteService: (id: string) => void;
  onEditService: (service: QuoteService) => void;
  onReorder?: (orderedIds: string[]) => void;
  currency?: QuoteCurrency;
}

export function ServiceList({ services, onDeleteService, onEditService, onReorder, currency = 'BRL' }: ServiceListProps) {
  if (services.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhum serviço adicionado ainda</div>;
  }
  if (onReorder && services.length > 1) {
    return (
      <SortableServiceList
        services={services}
        onDeleteService={onDeleteService}
        onEditService={onEditService}
        onReorder={onReorder}
        currency={currency}
      />
    );
  }
  return (
    <div className="space-y-3">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onDelete={onDeleteService}
          onEdit={onEditService}
          currency={currency}
        />
      ))}
    </div>
  );
}

function SortableServiceList({
  services, onDeleteService, onEditService, onReorder, currency,
}: {
  services: QuoteService[];
  onDeleteService: (id: string) => void;
  onEditService: (service: QuoteService) => void;
  onReorder: (orderedIds: string[]) => void;
  currency?: QuoteCurrency;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = services.map((s) => s.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {services.map((service) => (
            <SortableServiceItem
              key={service.id}
              service={service}
              onDelete={onDeleteService}
              onEdit={onEditService}
              currency={currency}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableServiceItem({
  service, onDelete, onEdit, currency,
}: {
  service: QuoteService;
  onDelete: (id: string) => void;
  onEdit: (service: QuoteService) => void;
  currency?: QuoteCurrency;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: service.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ServiceCard
        service={service}
        onDelete={onDelete}
        onEdit={onEdit}
        currency={currency}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -m-1 rounded shrink-0"
            aria-label="Arrastar para reordenar"
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}
