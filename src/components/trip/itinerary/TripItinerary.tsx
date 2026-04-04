import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Sun, Sunset, Moon, ChevronDown, Loader2, Camera, X, Sparkles, RefreshCw, Plane, Hotel, Bus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItineraryActivities, type ItineraryActivity, type CreateActivityData } from "@/hooks/useItineraryActivities";
import { usePeriodImages } from "@/hooks/usePeriodImages";
import { ItineraryActivityForm } from "./ItineraryActivityForm";
import { ItineraryActivityCard } from "./ItineraryActivityCard";
import { AIItineraryModal, type OverwriteMode } from "./AIItineraryModal";
import { servicesToActivities } from "@/utils/serviceToItinerary";
import type { TripService } from "@/types/trip";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  services: TripService[];
  readOnly?: boolean;
}

type Period = "morning" | "afternoon" | "evening";

const PERIOD_CONFIG: Record<Period, { label: string; icon: typeof Sun; color: string }> = {
  morning: { label: "Manhã", icon: Sun, color: "text-amber-500" },
  afternoon: { label: "Tarde", icon: Sunset, color: "text-orange-500" },
  evening: { label: "Noite", icon: Moon, color: "text-indigo-400" },
};

const ORIGIN_BADGE: Record<string, { label: string; className: string }> = {
  servico: { label: "Serviço", className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  ia: { label: "IA", className: "bg-purple-500/10 text-purple-600 border-purple-200" },
  manual: { label: "Manual", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
};

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function generateDays(startDate: string, endDate: string): { date: Date; dateStr: string; dayNumber: number }[] {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const days: { date: Date; dateStr: string; dayNumber: number }[] = [];
  let current = new Date(start);
  let dayNum = 1;
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    days.push({ date: new Date(current), dateStr: `${y}-${m}-${d}`, dayNumber: dayNum });
    current.setDate(current.getDate() + 1);
    dayNum++;
  }
  return days;
}

function PeriodImageUpload({
  imageUrl,
  onUpload,
  onRemove,
  isUploading,
  readOnly,
}: {
  imageUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
  readOnly: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (readOnly && !imageUrl) return null;

  return (
    <div className="ml-6 mb-2">
      {imageUrl ? (
        <div className="relative inline-block">
          <img src={imageUrl} alt="" className="h-24 w-full max-w-[280px] rounded-lg border border-border object-cover" />
          {!readOnly && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        !readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Camera className="mr-1 h-3 w-3" />}
              Adicionar imagem do período
            </Button>
          </>
        )
      )}
    </div>
  );
}

export function TripItinerary({ tripId, destination, startDate, endDate, services, readOnly = false }: Props) {
  const { activities, isLoading, addActivity, updateActivity, deleteActivity, isAdding, uploadPhoto, uploadDocument } = useItineraryActivities(tripId);
  const { getImageForPeriod, setPeriodImage, removePeriodImage, isUploading: isPeriodUploading } = usePeriodImages(tripId);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [addingFor, setAddingFor] = useState<{ dateStr: string; period: Period } | null>(null);
  const [editingActivity, setEditingActivity] = useState<ItineraryActivity | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serviceEditWarning, setServiceEditWarning] = useState<ItineraryActivity | null>(null);

  const days = useMemo(() => generateDays(startDate, endDate), [startDate, endDate]);

  // Auto-expand first day and days with activities
  useMemo(() => {
    const initial = new Set<string>();
    if (days.length > 0) initial.add(days[0].dateStr);
    activities.forEach((a) => initial.add(a.day_date));
    setExpandedDays(initial);
  }, [days.length, activities.length]);

  const activitiesByDay = useMemo(() => {
    const map: Record<string, ItineraryActivity[]> = {};
    activities.forEach((a) => {
      if (!map[a.day_date]) map[a.day_date] = [];
      map[a.day_date].push(a);
    });
    return map;
  }, [activities]);

  const toggleDay = (dateStr: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
  };

  const handleAddActivity = async (
    dateStr: string,
    period: Period,
    data: {
      title: string;
      description?: string;
      start_time?: string;
      location?: string;
      notes?: string;
      linked_service_id?: string | null;
      photo_urls?: string[];
      document_urls?: string[];
      maps_url?: string | null;
    },
    files?: File[],
    docFiles?: File[]
  ) => {
    let photoUrls: string[] = [...(data.photo_urls || [])];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await uploadPhoto(file);
        photoUrls.push(url);
      }
    }
    let documentUrls: string[] = [...(data.document_urls || [])];
    if (docFiles && docFiles.length > 0) {
      for (const file of docFiles) {
        const { url } = await uploadDocument(file);
        documentUrls.push(url);
      }
    }
    await addActivity({
      trip_id: tripId,
      day_date: dateStr,
      period,
      title: data.title,
      description: data.description,
      start_time: data.start_time,
      location: data.location,
      notes: data.notes,
      linked_service_id: data.linked_service_id,
      photo_urls: photoUrls,
      document_urls: documentUrls,
      maps_url: data.maps_url,
      origin: "manual",
    });
    setAddingFor(null);
  };

  const handleEditClick = (activity: ItineraryActivity) => {
    if (activity.origin === "servico") {
      setServiceEditWarning(activity);
    } else {
      setEditingActivity(activity);
    }
  };

  const handleUpdateActivity = async (
    data: any,
    files?: File[],
    docFiles?: File[]
  ) => {
    if (!editingActivity) return;
    let photoUrls: string[] = [...(data.photo_urls || [])];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await uploadPhoto(file);
        photoUrls.push(url);
      }
    }
    let documentUrls: string[] = [...(data.document_urls || [])];
    if (docFiles && docFiles.length > 0) {
      for (const file of docFiles) {
        const { url } = await uploadDocument(file);
        documentUrls.push(url);
      }
    }
    await updateActivity({
      id: editingActivity.id,
      title: data.title,
      description: data.description || null,
      start_time: data.start_time || null,
      location: data.location || null,
      notes: data.notes || null,
      linked_service_id: data.linked_service_id,
      photo_urls: photoUrls,
      document_urls: documentUrls,
      maps_url: data.maps_url ?? null,
    });
    setEditingActivity(null);
  };

  const handleSyncServices = async () => {
    setIsSyncing(true);
    try {
      const serviceActs = servicesToActivities(services, tripId);
      
      // Remove all existing "servico" origin activities
      const existingServiceActs = activities.filter(a => a.origin === "servico");
      for (const act of existingServiceActs) {
        await deleteActivity(act.id);
      }
      
      // Add new service activities
      for (const act of serviceActs) {
        await addActivity(act);
      }
      
      toast.success(`${serviceActs.length} evento(s) de serviços sincronizados! ✅`);
    } catch (error) {
      toast.error("Erro ao sincronizar serviços");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAIGenerated = async (newActivities: CreateActivityData[], mode: OverwriteMode) => {
    if (mode === "replace_all") {
      for (const act of activities) {
        await deleteActivity(act.id);
      }
    } else if (mode === "keep_services_replace_ai") {
      // Delete only IA-origin activities
      const iaActs = activities.filter(a => a.origin === "ia");
      for (const act of iaActs) {
        await deleteActivity(act.id);
      }
    }
    // "append" mode: don't delete anything
    
    for (const act of newActivities) {
      await addActivity(act);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Roteiro Dia a Dia
          </CardTitle>
          {!readOnly && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncServices}
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                Sincronizar serviços
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAiModalOpen(true)}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Gerar roteiro com IA
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {days.map((day) => {
          const isExpanded = expandedDays.has(day.dateStr);
          const dayActivities = activitiesByDay[day.dateStr] || [];
          const activityCount = dayActivities.length;
          const serviceCount = dayActivities.filter(a => a.origin === "servico").length;

          return (
            <div key={day.dateStr} className="border border-border rounded-lg overflow-hidden">
              {/* Day header */}
              <button
                type="button"
                onClick={() => toggleDay(day.dateStr)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">Dia {day.dayNumber}</span>
                  <span className="text-sm text-muted-foreground">
                    — {format(day.date, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  {activityCount > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {activityCount} {activityCount === 1 ? "atividade" : "atividades"}
                    </span>
                  )}
                  {serviceCount > 0 && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                      {serviceCount} serviço{serviceCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
              </button>

              {/* Day content */}
              {isExpanded && (
                <div className="px-4 py-3 space-y-4">
                  {(["morning", "afternoon", "evening"] as Period[]).map((period) => {
                    const PeriodIcon = PERIOD_CONFIG[period].icon;
                    const periodActivities = dayActivities
                      .filter((a) => a.period === period)
                      .sort((a, b) => a.order_index - b.order_index);
                    const isAddingHere = addingFor?.dateStr === day.dateStr && addingFor?.period === period;
                    const periodImageUrl = getImageForPeriod(day.dateStr, period);

                    return (
                      <div key={period}>
                        <div className="flex items-center gap-2 mb-2">
                          <PeriodIcon className={cn("h-4 w-4", PERIOD_CONFIG[period].color)} />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {PERIOD_CONFIG[period].label}
                          </span>
                        </div>

                        {/* Period image */}
                        <PeriodImageUpload
                          imageUrl={periodImageUrl}
                          onUpload={(file) => setPeriodImage({ dayDate: day.dateStr, period, file })}
                          onRemove={() => removePeriodImage({ dayDate: day.dateStr, period })}
                          isUploading={isPeriodUploading}
                          readOnly={readOnly}
                        />

                        {/* Activities */}
                        {periodActivities.map((activity) => {
                          if (editingActivity?.id === activity.id) {
                            return (
                              <div key={activity.id} className="ml-6 mb-3 p-3 bg-muted/20 rounded-lg border">
                                <ItineraryActivityForm
                                  tripServices={services}
                                  onSubmit={(data, files, docFiles) => handleUpdateActivity(data, files, docFiles)}
                                  onCancel={() => setEditingActivity(null)}
                                  isLoading={false}
                                  defaultValues={activity}
                                />
                              </div>
                            );
                          }
                          const originBadge = ORIGIN_BADGE[activity.origin] || ORIGIN_BADGE.manual;
                          return (
                            <div key={activity.id} className="ml-4 relative">
                              {/* Origin badge */}
                              <div className="absolute -left-1 top-1.5 z-10">
                                <span className={cn(
                                  "text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                                  originBadge.className
                                )}>
                                  {originBadge.label}
                                </span>
                              </div>
                              <ItineraryActivityCard
                                activity={activity}
                                linkedService={activity.linked_service_id ? services.find((s) => s.id === activity.linked_service_id) : undefined}
                                onEdit={() => handleEditClick(activity)}
                                onDelete={() => deleteActivity(activity.id)}
                                readOnly={readOnly}
                              />
                            </div>
                          );
                        })}

                        {/* Empty state for period */}
                        {periodActivities.length === 0 && !isAddingHere && (
                          <p className="text-xs text-muted-foreground/50 ml-6 italic">Nenhuma atividade</p>
                        )}

                        {/* Add form */}
                        {isAddingHere ? (
                          <div className="ml-6 mt-2 p-3 bg-muted/20 rounded-lg border">
                            <ItineraryActivityForm
                              tripServices={services}
                              onSubmit={(data, files, docFiles) => handleAddActivity(day.dateStr, period, data, files, docFiles)}
                              onCancel={() => setAddingFor(null)}
                              isLoading={isAdding}
                            />
                          </div>
                        ) : (
                          !readOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-4 mt-1 text-xs text-muted-foreground h-7"
                              onClick={() => setAddingFor({ dateStr: day.dateStr, period })}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Adicionar atividade
                            </Button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <AIItineraryModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        tripId={tripId}
        destination={destination}
        startDate={startDate}
        endDate={endDate}
        existingActivities={activities}
        services={services}
        onGenerated={handleAIGenerated}
      />

      {/* Service edit warning */}
      <AlertDialog open={!!serviceEditWarning} onOpenChange={(open) => !open && setServiceEditWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Item vinculado a um serviço
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este item foi gerado automaticamente a partir de um serviço cadastrado. Alterações aqui <strong>não atualizam</strong> o serviço original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (serviceEditWarning) setEditingActivity(serviceEditWarning);
              setServiceEditWarning(null);
            }}>
              Editar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
