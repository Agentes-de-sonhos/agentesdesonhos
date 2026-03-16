import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { 
  CalendarEvent, 
  AgencyEventType, 
  eventTypeLabels, 
  eventTypeColors,
  defaultAgencyEventTypes,
  CustomEventType,
} from "@/types/agenda";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, EyeOff, Loader2, Plus, Star, CalendarPlus } from "lucide-react";
import { CreateCustomTypeDialog } from "./CreateCustomTypeDialog";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null;
  event?: CalendarEvent | null;
  customEventTypes?: CustomEventType[];
  onSave: (event: {
    title: string;
    description: string | null;
    event_type: string;
    event_date: string;
    event_time: string | null;
    color: string | null;
  }) => void;
  onUpdate?: (id: string, event: Partial<CalendarEvent>) => void;
  onDelete?: (id: string) => void;
  onHide?: (id: string) => void;
  onHighlight?: (eventId: string, source: string) => void;
  onUnhighlight?: (eventId: string) => void;
  highlightedEventIds?: Set<string>;
  onCreateCustomType?: (name: string, color: string) => void;
  isLoading?: boolean;
  isCreatingCustomType?: boolean;
}

function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || "");
  
  // Format date for Google Calendar (YYYYMMDD or YYYYMMDDTHHmmSS)
  const dateStr = event.event_date.replace(/-/g, "");
  let dates: string;
  if (event.event_time) {
    const time = event.event_time.replace(/:/g, "").slice(0, 4) + "00";
    dates = `${dateStr}T${time}/${dateStr}T${time}`;
  } else {
    // All-day event
    dates = `${dateStr}/${dateStr}`;
  }
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
}

export function EventModal({
  open,
  onOpenChange,
  selectedDate,
  event,
  customEventTypes = [],
  onSave,
  onUpdate,
  onDelete,
  onHide,
  onHighlight,
  onUnhighlight,
  highlightedEventIds = new Set(),
  onCreateCustomType,
  isLoading,
  isCreatingCustomType,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<string>("compromisso");
  const [eventTime, setEventTime] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [showCreateTypeDialog, setShowCreateTypeDialog] = useState(false);

  const isEditing = !!event;
  const isPresetEvent = event?.isPreset;
  const isHighlighted = event ? highlightedEventIds.has(event.id) : false;

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setEventType(event.event_type);
      setEventTime(event.event_time || "");
      setCustomColor(event.color || "");
    } else {
      setTitle("");
      setDescription("");
      setEventType("compromisso");
      setEventTime("");
      setCustomColor("");
    }
  }, [event, open]);

  const handleSave = () => {
    if (!title.trim() || !selectedDate) return;

    let color = customColor;
    if (!color) {
      if (eventTypeColors[eventType]) {
        color = eventTypeColors[eventType];
      } else {
        const customType = customEventTypes.find(t => t.id === eventType);
        color = customType?.color || '#6b7280';
      }
    }

    const eventData = {
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      event_date: selectedDate,
      event_time: eventTime || null,
      color,
    };

    if (isEditing && event && onUpdate) {
      onUpdate(event.id, eventData);
    } else {
      onSave(eventData);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
      onOpenChange(false);
    }
  };

  const handleHide = () => {
    if (event && onHide) {
      onHide(event.id);
      onOpenChange(false);
    }
  };

  const handleToggleHighlight = () => {
    if (!event) return;
    if (isHighlighted) {
      onUnhighlight?.(event.id);
    } else {
      onHighlight?.(event.id, event.isPreset ? "preset" : "agency");
    }
  };

  const handleGoogleCalendar = () => {
    if (!event) return;
    const url = generateGoogleCalendarUrl(event);
    window.open(url, "_blank");
  };

  const handleCreateCustomType = (name: string, color: string) => {
    if (onCreateCustomType) {
      onCreateCustomType(name, color);
      setShowCreateTypeDialog(false);
    }
  };

  const formattedDate = selectedDate
    ? format(parseISO(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const allEventTypes = [
    ...defaultAgencyEventTypes.map(type => ({
      id: type,
      name: eventTypeLabels[type],
      color: eventTypeColors[type],
    })),
    ...customEventTypes.map(type => ({
      id: type.id,
      name: type.name,
      color: type.color,
    })),
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isPresetEvent
                ? event?.title
                : isEditing
                ? "Editar Evento"
                : "Novo Evento"}
            </DialogTitle>
            <DialogDescription className="capitalize">{formattedDate}</DialogDescription>
          </DialogHeader>

          {isPresetEvent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: event?.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {eventTypeLabels[event?.event_type || ""] || event?.event_type}
                </span>
              </div>
              {event?.description && (
                <p className="text-sm text-muted-foreground">{event.description}</p>
              )}
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleGoogleCalendar}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Google Calendar
                </Button>
                <Button
                  variant={isHighlighted ? "secondary" : "outline"}
                  size="sm"
                  onClick={handleToggleHighlight}
                >
                  <Star className={`h-4 w-4 mr-2 ${isHighlighted ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  {isHighlighted ? "Destacado" : "Destacar no Dashboard"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleHide}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ocultar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do evento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Tipo de Evento</Label>
                <div className="flex gap-2">
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEventTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCreateTypeDialog(true)}
                    title="Criar novo tipo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventTime">Horário (opcional)</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes do evento..."
                  rows={3}
                />
              </div>

              {/* Actions for user events */}
              {isEditing && event && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={handleGoogleCalendar}>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Google Calendar
                  </Button>
                  <Button
                    variant={isHighlighted ? "secondary" : "outline"}
                    size="sm"
                    onClick={handleToggleHighlight}
                  >
                    <Star className={`h-4 w-4 mr-2 ${isHighlighted ? "fill-yellow-400 text-yellow-400" : ""}`} />
                    {isHighlighted ? "Destacado" : "Destacar no Dashboard"}
                  </Button>
                </div>
              )}

              <div className="flex justify-between pt-4">
                {isEditing ? (
                  <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={!title.trim() || isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isEditing ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateCustomTypeDialog
        open={showCreateTypeDialog}
        onOpenChange={setShowCreateTypeDialog}
        onSave={handleCreateCustomType}
        isLoading={isCreatingCustomType}
      />
    </>
  );
}
