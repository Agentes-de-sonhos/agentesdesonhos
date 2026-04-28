import { useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sun,
  Sunset,
  Moon,
  Check,
  Pencil,
  Trash2,
  Plus,
  MapPin,
  Clock,
  DollarSign,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ItineraryDay, Activity } from "@/types/itinerary";
import { cn } from "@/lib/utils";
import { useItineraryPeriodImages, type ItineraryPeriod } from "@/hooks/useItineraryPeriodImages";

const periodIcons = {
  manha: Sun,
  tarde: Sunset,
  noite: Moon,
};

const periodLabels = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

interface ItineraryEditorProps {
  itineraryId?: string;
  days: ItineraryDay[];
  onUpdateActivity: (activityId: string, updates: Partial<Activity>) => void;
  onDeleteActivity: (activityId: string) => void;
  onAddActivity: (dayId: string, activity: Omit<Activity, "id" | "orderIndex" | "isApproved">) => void;
  onApproveAll: () => void;
}

export function ItineraryEditor({
  itineraryId,
  days,
  onUpdateActivity,
  onDeleteActivity,
  onAddActivity,
  onApproveAll,
}: ItineraryEditorProps) {
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [addingToDayId, setAddingToDayId] = useState<string | null>(null);
  const { getImageForPeriod, setPeriodImage, removePeriodImage, isUploading } =
    useItineraryPeriodImages(itineraryId);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = async (
    dayDate: string,
    period: ItineraryPeriod,
    file: File | undefined
  ) => {
    if (!file) return;
    const key = `${dayDate}-${period}`;
    setUploadingKey(key);
    try {
      await setPeriodImage({ dayDate, period, file });
    } finally {
      setUploadingKey(null);
    }
  };

  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    period: "manha",
    title: "",
    description: "",
    location: "",
    estimatedDuration: "",
    estimatedCost: "",
  });

  const handleSaveEdit = () => {
    if (editingActivity && editingActivity.id) {
      onUpdateActivity(editingActivity.id, {
        title: editingActivity.title,
        description: editingActivity.description,
        location: editingActivity.location,
        estimatedDuration: editingActivity.estimatedDuration,
        estimatedCost: editingActivity.estimatedCost,
      });
      setEditingActivity(null);
    }
  };

  const handleAddActivity = () => {
    if (addingToDayId && newActivity.title && newActivity.period) {
      onAddActivity(addingToDayId, {
        period: newActivity.period as Activity["period"],
        title: newActivity.title,
        description: newActivity.description || null,
        location: newActivity.location || null,
        estimatedDuration: newActivity.estimatedDuration || null,
        estimatedCost: newActivity.estimatedCost || null,
      });
      setAddingToDayId(null);
      setNewActivity({
        period: "manha",
        title: "",
        description: "",
        location: "",
        estimatedDuration: "",
        estimatedCost: "",
      });
    }
  };

  const allApproved = days.every((day) =>
    day.activities.every((a) => a.isApproved)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">
            Revisar e Editar Roteiro
          </h3>
          <p className="text-sm text-muted-foreground">
            Aprove, edite ou remova atividades
          </p>
        </div>
        {!allApproved && (
          <Button onClick={onApproveAll} variant="outline">
            <Check className="mr-2 h-4 w-4" />
            Aprovar Todas
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {days.map((day) => (
          <Card key={day.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Dia {day.dayNumber}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(day.date), "EEEE, dd 'de' MMMM", {
                      locale: ptBR,
                    })}
                  </CardDescription>
                </div>
                <Dialog
                  open={addingToDayId === day.id}
                  onOpenChange={(open) => !open && setAddingToDayId(null)}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingToDayId(day.id!)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Atividade</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova atividade ao dia {day.dayNumber}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Período</Label>
                        <Select
                          value={newActivity.period}
                          onValueChange={(value) =>
                            setNewActivity({ ...newActivity, period: value as Activity["period"] })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manha">Manhã</SelectItem>
                            <SelectItem value="tarde">Tarde</SelectItem>
                            <SelectItem value="noite">Noite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={newActivity.title}
                          onChange={(e) =>
                            setNewActivity({ ...newActivity, title: e.target.value })
                          }
                          placeholder="Nome da atividade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={newActivity.description || ""}
                          onChange={(e) =>
                            setNewActivity({ ...newActivity, description: e.target.value })
                          }
                          placeholder="Descrição detalhada"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Local</Label>
                          <Input
                            value={newActivity.location || ""}
                            onChange={(e) =>
                              setNewActivity({ ...newActivity, location: e.target.value })
                            }
                            placeholder="Nome do local"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duração</Label>
                          <Input
                            value={newActivity.estimatedDuration || ""}
                            onChange={(e) =>
                              setNewActivity({
                                ...newActivity,
                                estimatedDuration: e.target.value,
                              })
                            }
                            placeholder="Ex: 2 horas"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Custo Estimado</Label>
                        <Input
                          value={newActivity.estimatedCost || ""}
                          onChange={(e) =>
                            setNewActivity({
                              ...newActivity,
                              estimatedCost: e.target.value,
                            })
                          }
                          placeholder="Ex: R$ 50 por pessoa"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddingToDayId(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddActivity}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["manha", "tarde", "noite"] as const).map((period) => {
                const periodActivities = day.activities.filter(
                  (a) => a.period === period
                );
                const Icon = periodIcons[period];
                const periodImage = itineraryId ? getImageForPeriod(day.date, period) : null;
                const inputKey = `${day.date}-${period}`;
                const isThisUploading = uploadingKey === inputKey;

                return (
                  <div key={period} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {periodLabels[period]}
                    </div>
                    {itineraryId && (
                      <div className="ml-6">
                        <input
                          ref={(el) => (fileInputs.current[inputKey] = el)}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileChange(day.date, period, e.target.files?.[0])
                          }
                        />
                        {periodImage ? (
                          <div className="relative w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
                            <img
                              src={periodImage}
                              alt={`${periodLabels[period]} - dia ${day.dayNumber}`}
                              className="h-32 w-full object-cover"
                            />
                            <div className="absolute right-1 top-1 flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-7 w-7"
                                onClick={() => fileInputs.current[inputKey]?.click()}
                                disabled={isThisUploading}
                              >
                                {isThisUploading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Pencil className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="h-7 w-7"
                                onClick={() => removePeriodImage({ dayDate: day.date, period })}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => fileInputs.current[inputKey]?.click()}
                            disabled={isThisUploading}
                          >
                            {isThisUploading ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <ImagePlus className="mr-2 h-3 w-3" />
                            )}
                            Adicionar foto
                          </Button>
                        )}
                      </div>
                    )}
                    {periodActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic pl-6">
                        Nenhuma atividade
                      </p>
                    ) : (
                      periodActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            "ml-6 rounded-lg border p-3",
                            activity.isApproved
                              ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                              : "border-border bg-card"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{activity.title}</h4>
                                {activity.isApproved && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                    <Check className="mr-1 h-3 w-3" />
                                    Aprovada
                                  </Badge>
                                )}
                              </div>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground">
                                  {activity.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {activity.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {activity.location}
                                  </span>
                                )}
                                {activity.estimatedDuration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {activity.estimatedDuration}
                                  </span>
                                )}
                                {activity.estimatedCost && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {activity.estimatedCost}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {!activity.isApproved && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    onUpdateActivity(activity.id!, {
                                      isApproved: true,
                                    } as Partial<Activity>)
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingActivity(activity)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Editar Atividade</DialogTitle>
                                  </DialogHeader>
                                  {editingActivity && (
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label>Título</Label>
                                        <Input
                                          value={editingActivity.title}
                                          onChange={(e) =>
                                            setEditingActivity({
                                              ...editingActivity,
                                              title: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Descrição</Label>
                                        <Textarea
                                          value={editingActivity.description || ""}
                                          onChange={(e) =>
                                            setEditingActivity({
                                              ...editingActivity,
                                              description: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Local</Label>
                                          <Input
                                            value={editingActivity.location || ""}
                                            onChange={(e) =>
                                              setEditingActivity({
                                                ...editingActivity,
                                                location: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Duração</Label>
                                          <Input
                                            value={
                                              editingActivity.estimatedDuration || ""
                                            }
                                            onChange={(e) =>
                                              setEditingActivity({
                                                ...editingActivity,
                                                estimatedDuration: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Custo Estimado</Label>
                                        <Input
                                          value={editingActivity.estimatedCost || ""}
                                          onChange={(e) =>
                                            setEditingActivity({
                                              ...editingActivity,
                                              estimatedCost: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button onClick={handleSaveEdit}>
                                      Salvar
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDeleteActivity(activity.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
