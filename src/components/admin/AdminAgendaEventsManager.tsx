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
  CalendarDays,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PresetEvent, eventTypeColors, eventTypeLabels, PresetEventType } from "@/types/agenda";

const presetEventTypes: { value: PresetEventType; label: string }[] = [
  { value: "feriado", label: "Feriado" },
  { value: "comemorativo", label: "Data Comemorativa" },
  { value: "trade", label: "Evento do Trade" },
  { value: "treinamento", label: "Treinamento" },
];

const colorPalette = [
  '#ef4444', // red - feriado
  '#ec4899', // pink - comemorativo
  '#3b82f6', // blue - trade
  '#eab308', // yellow - treinamento
  '#22c55e', // green
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#6b7280', // gray
];

export function AdminAgendaEventsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PresetEvent | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "trade" as PresetEventType,
    event_date: "",
    recurring_yearly: true,
    color: "#3b82f6",
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-preset-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preset_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as PresetEvent[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("preset_events").insert([{
        title: data.title,
        description: data.description || null,
        event_type: data.event_type,
        event_date: data.event_date,
        recurring_yearly: data.recurring_yearly,
        color: data.color,
        is_active: data.is_active,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-preset-events"] });
      queryClient.invalidateQueries({ queryKey: ["preset-events"] });
      toast.success("Evento global criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating preset event:", error);
      toast.error("Erro ao criar evento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("preset_events")
        .update({
          title: data.title,
          description: data.description || null,
          event_type: data.event_type,
          event_date: data.event_date,
          recurring_yearly: data.recurring_yearly,
          color: data.color,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-preset-events"] });
      queryClient.invalidateQueries({ queryKey: ["preset-events"] });
      toast.success("Evento atualizado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating preset event:", error);
      toast.error("Erro ao atualizar evento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("preset_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-preset-events"] });
      queryClient.invalidateQueries({ queryKey: ["preset-events"] });
      toast.success("Evento excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting preset event:", error);
      toast.error("Erro ao excluir evento");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("preset_events")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-preset-events"] });
      queryClient.invalidateQueries({ queryKey: ["preset-events"] });
    },
    onError: (error) => {
      console.error("Error toggling preset event:", error);
      toast.error("Erro ao atualizar evento");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_type: "trade",
      event_date: "",
      recurring_yearly: true,
      color: "#3b82f6",
      is_active: true,
    });
    setEditingEvent(null);
  };

  const handleOpenDialog = (event?: PresetEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        event_type: event.event_type,
        event_date: event.event_date,
        recurring_yearly: event.recurring_yearly,
        color: event.color || eventTypeColors[event.event_type] || "#3b82f6",
        is_active: event.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento global?")) return;
    deleteMutation.mutate(id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Eventos Globais da Agenda
            </CardTitle>
            <CardDescription>
              Gerencie feriados, datas comemorativas e eventos do trade que aparecem para todos os usuários
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento Global
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Editar Evento Global" : "Novo Evento Global"}
                </DialogTitle>
                <DialogDescription>
                  Este evento será exibido na agenda de todos os usuários
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ex: Dia do Turismo"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_type">Tipo *</Label>
                    <Select
                      value={formData.event_type}
                      onValueChange={(value: PresetEventType) => {
                        setFormData({ 
                          ...formData, 
                          event_type: value,
                          color: eventTypeColors[value] || "#3b82f6"
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {presetEventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: eventTypeColors[type.value] }}
                              />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event_date">Data *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) =>
                        setFormData({ ...formData, event_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          formData.color === color
                            ? "border-foreground ring-2 ring-offset-2 ring-primary"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Detalhes do evento..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recurring_yearly"
                      checked={formData.recurring_yearly}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, recurring_yearly: checked })
                      }
                    />
                    <Label htmlFor="recurring_yearly">Repete todo ano</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Ativo</Label>
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
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum evento global cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-4 ${
                  !event.is_active ? "opacity-60 bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: event.color || eventTypeColors[event.event_type] }}
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">{event.title}</h4>
                      <Badge
                        variant="secondary"
                        className="shrink-0"
                      >
                        {eventTypeLabels[event.event_type]}
                      </Badge>
                      {event.recurring_yearly && (
                        <Badge variant="outline" className="shrink-0">
                          <Globe className="h-3 w-3 mr-1" />
                          Anual
                        </Badge>
                      )}
                      {!event.is_active && (
                        <Badge variant="secondary" className="shrink-0">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(event.event_date), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={event.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: event.id, is_active: checked })
                    }
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
