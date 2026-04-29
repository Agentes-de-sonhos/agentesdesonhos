import { useState, useRef } from "react";
import { SecureFileLink } from "@/components/trip/SecureFileLink";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, FileText, TrainFront,
  Trash2, Download, ExternalLink, Pencil, Upload, X, RefreshCw, Camera, Image as ImageIcon,
  GripVertical, ChevronUp, ChevronDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { TripService, TripServiceType } from "@/types/trip";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SERVICE_ICONS: Record<TripServiceType, any> = {
  flight: Plane, hotel: Hotel, car_rental: Car, transfer: Bus,
  attraction: Ticket, insurance: Shield, cruise: Ship, train: TrainFront, other: FileText,
};

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", train: "Trem", other: "Outros Serviços",
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
    case "flight": {
      const origin = data.origin_city || '';
      const dest = data.destination_city || '';
      const airline = data.main_airline || data.airline || '';
      const segs = data.segments?.length || 0;
      const segInfo = segs > 1 ? ` (${segs} trechos)` : '';
      return `${origin} → ${dest} (${airline})${segInfo}`;
    }
    case "hotel": {
      const cat = data.hotel_category ? (data.hotel_category === '3' ? '⭐⭐⭐' : data.hotel_category === '4' ? '⭐⭐⭐⭐' : data.hotel_category === '5' ? '⭐⭐⭐⭐⭐' : data.hotel_category) : '';
      return `${data.hotel_name}${cat ? ` ${cat}` : ''} - ${data.city}${data.country ? `, ${data.country}` : ''}`;
    }
    case "car_rental": {
      const company = data.rental_company || '';
      const city1 = data.pickup_city || data.pickup_location || '';
      const city2 = data.dropoff_city || data.dropoff_location || '';
      const model = data.car_model || data.car_type || '';
      return `${company ? company + ' • ' : ''}${model} — ${city1}${city2 && city2 !== city1 ? ` → ${city2}` : ''}`;
    }
    case "transfer": {
      const typeMap: Record<string, string> = { arrival: 'Transfer IN', departure: 'Transfer OUT', inter_hotel: 'Inter-hotel' };
      const typeLbl = typeMap[data.transfer_type] || data.transfer_type;
      const route = data.origin_location && data.destination_location 
        ? `${data.origin_location} → ${data.destination_location}` 
        : data.location || '';
      const company = data.company_name ? `${data.company_name} • ` : '';
      return `${company}${typeLbl} — ${route}`;
    }
    case "attraction": {
      const typeMap: Record<string, string> = { parque: '🎢', show: '🎭', passeio: '🚤', museu: '🏛️', tour: '🗺️', evento: '📅', experiencia: '✨' };
      const typeIcon = data.attraction_type ? (typeMap[data.attraction_type] || '') + ' ' : '';
      const city = data.city ? ` — ${data.city}` : '';
      return `${typeIcon}${data.name} (${data.quantity}x)${city}`;
    }
    case "insurance": {
      const plan = data.plan_name ? ` • ${data.plan_name}` : '';
      const cov = data.coverage ? ` — ${data.coverage}` : '';
      return `${data.provider}${plan}${cov}`;
    }
    case "cruise": return `${data.cruise_company ? data.cruise_company + ' • ' : ''}${data.ship_name} - ${data.route}`;
    case "train": return `${data.origin_city} → ${data.destination_city}${data.train_company ? ` (${data.train_company})` : ''}`;
    case "other": {
      const typeMap: Record<string, string> = { restaurante: '🍽️', guia_turistico: '🧭', chip_internet: '📶', experiencia: '✨', evento: '📅', spa_wellness: '🧘', servico_vip: '👑', concierge: '🛎️', personalizado: '⭐' };
      const typeIcon = data.other_service_type ? (typeMap[data.other_service_type] || '📋') + ' ' : '';
      const name = data.service_name || data.description || 'Serviço';
      const city = data.city ? ` — ${data.city}` : '';
      return `${typeIcon}${name}${city}`;
    }
    default: return "Serviço";
  }
}

function getServiceDates(service: TripService): string {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": {
      if (data.segments?.length > 0) {
        const first = data.segments[0];
        const last = data.segments[data.segments.length - 1];
        return `${first.flight_date ? formatDate(first.flight_date) : ''} - ${last.flight_date ? formatDate(last.flight_date) : ''}`;
      }
      return data.departure_date ? `${formatDate(data.departure_date)} - ${formatDate(data.return_date)}` : '';
    }
    case "hotel": {
      const nights = (() => {
        try {
          const [sy,sm,sd] = data.check_in.split('-').map(Number);
          const [ey,em,ed] = data.check_out.split('-').map(Number);
          return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24));
        } catch { return null; }
      })();
      return `${formatDate(data.check_in)} - ${formatDate(data.check_out)}${nights ? ` (${nights} noites)` : ''}`;
    }
    case "car_rental": {
      if (data.pickup_date && data.dropoff_date) {
        const days = (() => {
          try {
            const [sy,sm,sd] = data.pickup_date.split('-').map(Number);
            const [ey,em,ed] = data.dropoff_date.split('-').map(Number);
            return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24));
          } catch { return null; }
        })();
        return `${formatDate(data.pickup_date)} - ${formatDate(data.dropoff_date)}${days ? ` (${days} dias)` : ''}`;
      }
      return '';
    }
    case "transfer": {
      const dateStr = data.date ? formatDate(data.date) : '';
      const timeStr = data.time ? ` às ${data.time}` : '';
      const modeMap: Record<string, string> = { privativo: 'Privativo', compartilhado: 'Compartilhado', shuttle: 'Shuttle' };
      const mode = data.transfer_mode ? ` • ${modeMap[data.transfer_mode] || data.transfer_mode}` : '';
      return `${dateStr}${timeStr}${mode}`;
    }
    case "attraction": {
      const statusMap: Record<string, string> = { confirmado: '✅', reservado: '📅', flexivel: '🔄', utilizado: '☑️' };
      const statusIcon = data.status ? ` ${statusMap[data.status] || ''}` : '';
      return `${formatDate(data.date)}${data.entry_time ? ` às ${data.entry_time}` : ''}${statusIcon}`;
    }
    case "insurance": {
      const statusMap: Record<string, string> = { ativo: '🟢', expirado: '🔴', futuro: '🔵' };
      const statusIcon = data.status ? ` ${statusMap[data.status] || ''}` : '';
      const days = (() => { try { const [sy,sm,sd] = data.start_date.split('-').map(Number); const [ey,em,ed] = data.end_date.split('-').map(Number); return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24)); } catch { return null; } })();
      return `${formatDate(data.start_date)} - ${formatDate(data.end_date)}${days ? ` (${days} dias)` : ''}${statusIcon}`;
    }
    case "cruise": {
      const nights = (() => {
        try {
          const [sy,sm,sd] = data.start_date.split('-').map(Number);
          const [ey,em,ed] = data.end_date.split('-').map(Number);
          return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24));
        } catch { return null; }
      })();
      return `${formatDate(data.start_date)} - ${formatDate(data.end_date)}${nights ? ` (${nights} noites)` : ''}`;
    }
    case "train": return data.travel_date ? `${formatDate(data.travel_date)}${data.departure_time ? ` • ${data.departure_time} → ${data.arrival_time || ''}` : ''}` : '';
    case "other": {
      const dateStr = data.date ? formatDate(data.date) : '';
      const timeStr = data.time ? ` às ${data.time}` : '';
      const statusMap: Record<string, string> = { confirmado: '✅', agendado: '📅', opcional: '🔄' };
      const statusIcon = data.status ? ` ${statusMap[data.status] || ''}` : '';
      return `${dateStr}${timeStr}${statusIcon}`;
    }
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
  onAddAttachment?: (serviceId: string, file: File) => void;
  onRemoveAttachment?: (serviceId: string, index: number) => void;
  onUploadServiceImage?: (serviceId: string, file: File) => void;
  onRemoveServiceImage?: (serviceId: string) => void;
  showActions?: boolean;
  dragHandle?: React.ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function TripServiceCard({ 
  service, onDelete, onEdit, onReplaceVoucher, onRemoveVoucher, 
  onAddAttachment, onRemoveAttachment, onUploadServiceImage, onRemoveServiceImage,
  showActions = true, dragHandle, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: TripServiceCardProps) {
  const Icon = SERVICE_ICONS[service.service_type] || FileText;
  const label = SERVICE_LABELS[service.service_type] || "Serviço";
  const dates = getServiceDates(service);
  const notes = getServiceNotes(service);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReplaceVoucher) {
      onReplaceVoucher(service.id, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddAttachment) {
      onAddAttachment(service.id, file);
    }
    if (addFileInputRef.current) addFileInputRef.current.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadServiceImage) {
      onUploadServiceImage(service.id, file);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const attachments = service.attachments || [];
  
  return (
    <Card>
      <CardContent className="p-4">
        {/* Service image banner — only render if URL is a valid http(s) URL */}
        {service.image_url && /^https?:\/\//i.test(service.image_url) && (
          <div className="relative mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
            <img
              src={service.image_url}
              alt={label}
              className="w-full max-h-64 object-contain"
              onError={(e) => {
                // Hide entire banner if image fails to load
                const wrapper = e.currentTarget.parentElement;
                if (wrapper) wrapper.style.display = "none";
              }}
            />
            {showActions && onRemoveServiceImage && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100"
                onClick={() => onRemoveServiceImage(service.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

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
              
              {/* Attachments section */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                      <SecureFileLink
                        filePath={att.url}
                        fileName={att.name}
                        mode="authenticated"
                      />
                      {showActions && onRemoveAttachment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                          onClick={() => onRemoveAttachment(service.id, idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy single voucher (if no attachments but has voucher) */}
              {attachments.length === 0 && service.voucher_name && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <SecureFileLink
                    filePath={service.voucher_url || ""}
                    fileName={service.voucher_name}
                    mode="authenticated"
                  />
                </div>
              )}

              {/* Action buttons row */}
              {showActions && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {onAddAttachment && (
                    <>
                      <input
                        ref={addFileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleAddFile}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => addFileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" /> {attachments.length > 0 ? "Adicionar arquivo" : "Anexar arquivo"}
                      </Button>
                    </>
                  )}
                  {onUploadServiceImage && (
                    <>
                      <input
                        ref={imageInputRef}
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Camera className="h-3 w-3 mr-1" /> {service.image_url ? "Trocar imagem" : "Adicionar imagem"}
                      </Button>
                    </>
                  )}
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
  onAddAttachment?: (serviceId: string, file: File) => void;
  onRemoveAttachment?: (serviceId: string, index: number) => void;
  onUploadServiceImage?: (serviceId: string, file: File) => void;
  onRemoveServiceImage?: (serviceId: string) => void;
  showActions?: boolean;
  groupByType?: boolean;
}

export function TripServiceList({ 
  services, onDeleteService, onEditService, onReplaceVoucher, onRemoveVoucher, 
  onAddAttachment, onRemoveAttachment, onUploadServiceImage, onRemoveServiceImage,
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
                  onAddAttachment={onAddAttachment}
                  onRemoveAttachment={onRemoveAttachment}
                  onUploadServiceImage={onUploadServiceImage}
                  onRemoveServiceImage={onRemoveServiceImage}
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
          onAddAttachment={onAddAttachment}
          onRemoveAttachment={onRemoveAttachment}
          onUploadServiceImage={onUploadServiceImage}
          onRemoveServiceImage={onRemoveServiceImage}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
