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
import { CalendarEvent, AgencyEventType, eventTypeLabels, eventTypeColors } from "@/types/agenda";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, EyeOff, Eye, Loader2 } from "lucide-react";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null;
  event?: CalendarEvent | null;
  onSave: (event: {
    title: string;
    description: string | null;
    event_type: AgencyEventType;
    event_date: string;
    event_time: string | null;
    color: string | null;
  }) => void;
  onUpdate?: (id: string, event: Partial<CalendarEvent>) => void;
  onDelete?: (id: string) => void;
  onHide?: (id: string) => void;
  onUnhide?: (id: string) => void;
  isLoading?: boolean;
}

const agencyEventTypes: AgencyEventType[] = ['compromisso', 'trade', 'venda', 'lembrete'];

export function EventModal({
  open,
  onOpenChange,
  selectedDate,
  event,
  onSave,
  onUpdate,
  onDelete,
  onHide,
  isLoading,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<AgencyEventType>("compromisso");
  const [eventTime, setEventTime] = useState("");
  const [customColor, setCustomColor] = useState("");

  const isEditing = !!event;
  const isPresetEvent = event?.isPreset;

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setEventType(event.event_type as AgencyEventType);
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

    const eventData = {
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      event_date: selectedDate,
      event_time: eventTime || null,
      color: customColor || eventTypeColors[eventType],
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

  const formattedDate = selectedDate
    ? format(parseISO(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  return (
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
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleHide}>
                <EyeOff className="h-4 w-4 mr-2" />
                Ocultar este evento
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
              <Select value={eventType} onValueChange={(v) => setEventType(v as AgencyEventType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {agencyEventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: eventTypeColors[type] }}
                        />
                        {eventTypeLabels[type]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  );
}
