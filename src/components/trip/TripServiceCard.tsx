import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, FileText, TrainFront,
  Trash2, Download, ExternalLink, Pencil, Upload, X, RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { TripService, TripServiceType } from "@/types/trip";

const SERVICE_ICONS: Record<TripServiceType, any> = {
  flight: Plane, hotel: Hotel, car_rental: Car, transfer: Bus,
  attraction: Ticket, insurance: Shield, cruise: Ship, train: TrainFront, other: FileText,
};

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", train: "Trem", other: "Outros",
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
    case "flight": return `${data.origin_city} → ${data.destination_city} (${data.airline})`;
    case "hotel": return `${data.hotel_name} - ${data.city}`;
    case "car_rental": return `${data.car_type} - ${data.pickup_location}`;
    case "transfer": return `${data.transfer_type === "arrival" ? "Chegada" : "Saída"} - ${data.location}`;
    case "attraction": return `${data.name} (${data.quantity}x)`;
    case "insurance": return `${data.provider} - ${data.coverage}`;
    case "cruise": return `${data.ship_name} - ${data.route}`;
    case "train": return `${data.origin_city} → ${data.destination_city}${data.train_company ? ` (${data.train_company})` : ''}`;
    case "other": return data.description;
    default: return "Serviço";
  }
}

function getServiceDates(service: TripService): string {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return `${formatDate(data.departure_date)} - ${formatDate(data.return_date)}`;
    case "hotel": return `${formatDate(data.check_in)} - ${formatDate(data.check_out)}`;
    case "transfer":
    case "attraction": return formatDate(data.date);
    case "insurance":
    case "cruise": return `${formatDate(data.start_date)} - ${formatDate(data.end_date)}`;
    case "train": return data.travel_date ? `${formatDate(data.travel_date)}${data.departure_time ? ` • ${data.departure_time} → ${data.arrival_time || ''}` : ''}` : '';
    default: return "";
  }
}

function getServiceNotes(service: TripService): string | undefined {
  const data = service.service_data as any;
  return data.notes;
}

interface TripServiceCardProps {
  service: TripService;
  onDelete?: (id: string) => void;
  onEdit?: (service: TripService) => void;
  onReplaceVoucher?: (serviceId: string, file: File) => void;
  onRemoveVoucher?: (serviceId: string) => void;
  showActions?: boolean;
}

export function TripServiceCard({ 
  service, onDelete, onEdit, onReplaceVoucher, onRemoveVoucher, showActions = true 
}: TripServiceCardProps) {
  const Icon = SERVICE_ICONS[service.service_type] || FileText;
  const label = SERVICE_LABELS[service.service_type] || "Serviço";
  const dates = getServiceDates(service);
  const notes = getServiceNotes(service);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReplaceVoucher) {
      onReplaceVoucher(service.id, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
              <p className="font-medium truncate">{getServiceDescription(service)}</p>
              {dates && <p className="text-sm text-muted-foreground">{dates}</p>}
              {notes && <p className="text-xs text-muted-foreground mt-1 italic">{notes}</p>}
              
              {/* Voucher section */}
              {service.voucher_name && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
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
                  {showActions && onReplaceVoucher && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Substituir
                      </Button>
                    </>
                  )}
                  {showActions && onRemoveVoucher && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                      onClick={() => onRemoveVoucher(service.id)}
                    >
                      <X className="h-3 w-3 mr-1" /> Remover
                    </Button>
                  )}
                </div>
              )}

              {/* Upload voucher if none exists */}
              {!service.voucher_name && showActions && onReplaceVoucher && (
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Anexar voucher
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(service)}
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover serviço?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Este serviço será removido permanentemente da carteira.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(service.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TripServiceListProps {
  services: TripService[];
  onDeleteService?: (id: string) => void;
  onEditService?: (service: TripService) => void;
  onReplaceVoucher?: (serviceId: string, file: File) => void;
  onRemoveVoucher?: (serviceId: string) => void;
  showActions?: boolean;
  groupByType?: boolean;
}

export function TripServiceList({ 
  services, onDeleteService, onEditService, onReplaceVoucher, onRemoveVoucher, 
  showActions = true, groupByType = false 
}: TripServiceListProps) {
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
                  onEdit={onEditService}
                  onReplaceVoucher={onReplaceVoucher}
                  onRemoveVoucher={onRemoveVoucher}
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
          onEdit={onEditService}
          onReplaceVoucher={onReplaceVoucher}
          onRemoveVoucher={onRemoveVoucher}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
