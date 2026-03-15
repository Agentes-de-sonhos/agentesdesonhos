import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  Globe,
} from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  event_type: string;
  organizer: string;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  is_online: boolean;
  registration_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const eventTypes = [
  { value: "treinamento", label: "Treinamento" },
  { value: "feira", label: "Feira" },
  { value: "webinar", label: "Webinar" },
  { value: "workshop", label: "Workshop" },
  { value: "outro", label: "Outro" },
];

const eventTypeColors: Record<string, string> = {
  treinamento: "bg-blue-500",
  feira: "bg-purple-500",
  webinar: "bg-green-500",
  workshop: "bg-orange-500",
  outro: "bg-gray-500",
};

export function AdminEventsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    event_type: "",
    organizer: "",
    start_datetime: "",
    end_datetime: "",
    location: "",
    is_online: false,
    registration_url: "",
    description: "",
    is_active: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_datetime", { ascending: false });

      if (error) throw error;
      return data as Event[];
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      event_type: "",
      organizer: "",
      start_datetime: "",
      end_datetime: "",
      location: "",
      is_online: false,
      registration_url: "",
      description: "",
      is_active: true,
    });
    setEditingEvent(null);
  };

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        event_type: event.event_type,
        organizer: event.organizer,
        start_datetime: event.start_datetime.slice(0, 16),
        end_datetime: event.end_datetime.slice(0, 16),
        location: event.location || "",
        is_online: event.is_online,
        registration_url: event.registration_url || "",
        description: event.description || "",
        is_active: event.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const eventData = {
        title: formData.title,
        event_type: formData.event_type,
        organizer: formData.organizer,
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        location: formData.is_online ? null : formData.location || null,
        is_online: formData.is_online,
        registration_url: formData.registration_url || null,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast({ title: "Evento atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("events").insert([eventData]);

        if (error) throw error;
        toast({ title: "Evento criado com sucesso!" });
      }

      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving event:", error);
      toast({
        title: "Erro ao salvar evento",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (event: Event) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_active: !event.is_active })
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: event.is_active ? "Evento desativado" : "Evento ativado",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error) {
      console.error("Error toggling event:", error);
      toast({
        title: "Erro ao atualizar evento",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Evento excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Erro ao excluir evento",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gerenciar Eventos
            </CardTitle>
            <CardDescription>
              Adicione e gerencie eventos, treinamentos e feiras
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Editar Evento" : "Novo Evento"}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do evento
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="title">Título do Evento *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Ex: Treinamento Vendas Disney"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event_type">Tipo de Evento *</Label>
                    <Select
                      value={formData.event_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, event_type: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organizer">Organizador *</Label>
                    <Input
                      id="organizer"
                      value={formData.organizer}
                      onChange={(e) =>
                        setFormData({ ...formData, organizer: e.target.value })
                      }
                      placeholder="Ex: Educatravel Academy"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_datetime">Data/Hora Início *</Label>
                    <Input
                      id="start_datetime"
                      type="datetime-local"
                      value={formData.start_datetime}
                      onChange={(e) =>
                        setFormData({ ...formData, start_datetime: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_datetime">Data/Hora Fim *</Label>
                    <Input
                      id="end_datetime"
                      type="datetime-local"
                      value={formData.end_datetime}
                      onChange={(e) =>
                        setFormData({ ...formData, end_datetime: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center space-x-2">
                    <Switch
                      id="is_online"
                      checked={formData.is_online}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_online: checked })
                      }
                    />
                    <Label htmlFor="is_online">Evento Online</Label>
                  </div>

                  {!formData.is_online && (
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="location">Local</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder="Ex: Hotel Copacabana Palace, Rio de Janeiro"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="registration_url">Link de Inscrição</Label>
                    <Input
                      id="registration_url"
                      type="url"
                      value={formData.registration_url}
                      onChange={(e) =>
                        setFormData({ ...formData, registration_url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Detalhes do evento..."
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Evento Ativo</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingEvent ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum evento cadastrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-4 ${
                  !event.is_active ? "opacity-60 bg-muted/50" : ""
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge
                      className={`${eventTypeColors[event.event_type] || "bg-gray-500"} text-white border-0`}
                    >
                      {eventTypes.find((t) => t.value === event.event_type)?.label || event.event_type}
                    </Badge>
                    {!event.is_active && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.organizer} •{" "}
                    {format(parseISO(event.start_datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {event.is_online ? (
                      <>
                        <Globe className="h-3 w-3" />
                        <span>Online</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span>{event.location || "Local a definir"}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={event.is_active}
                    onCheckedChange={() => handleToggleActive(event)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
