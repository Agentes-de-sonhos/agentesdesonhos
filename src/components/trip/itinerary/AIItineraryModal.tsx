import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TripProfile,
  TravelInterest,
  TravelPace,
  TRIP_PROFILE_LABELS,
  TRAVEL_INTEREST_LABELS,
  TRAVEL_INTEREST_ICONS,
  TRAVEL_PACE_LABELS,
  ItineraryFormData,
  AIGeneratedItinerary,
} from "@/types/itinerary";
import { useItineraries } from "@/hooks/useItineraries";
import { AIGeneratingOverlay } from "@/components/itinerary/AIGeneratingOverlay";
import { toast } from "sonner";
import type { CreateActivityData } from "@/hooks/useItineraryActivities";

interface AIItineraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  existingActivitiesCount: number;
  onGenerated: (activities: CreateActivityData[], mode: "replace" | "append") => Promise<void>;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const PERIOD_MAP: Record<string, "morning" | "afternoon" | "evening"> = {
  manha: "morning",
  tarde: "afternoon",
  noite: "evening",
};

export function AIItineraryModal({
  open,
  onOpenChange,
  tripId,
  destination,
  startDate,
  endDate,
  existingActivitiesCount,
  onGenerated,
}: AIItineraryModalProps) {
  const { generateWithAI } = useItineraries();
  const [isGenerating, setIsGenerating] = useState(false);
  const [tripType, setTripType] = useState<TripProfile>("casal");
  const [budgetLevel, setBudgetLevel] = useState<ItineraryFormData["budgetLevel"]>("conforto");
  const [selectedInterests, setSelectedInterests] = useState<TravelInterest[]>([]);
  const [travelPace, setTravelPace] = useState<TravelPace>("moderado");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [localOrTouristy, setLocalOrTouristy] = useState<string>("mix");
  const [exclusiveOrPopular, setExclusiveOrPopular] = useState<string>("mix");
  const [mobilityLimitations, setMobilityLimitations] = useState("");
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [overwriteMode, setOverwriteMode] = useState<"replace" | "append">("replace");
  const [pendingData, setPendingData] = useState<AIGeneratedItinerary | null>(null);

  const toggleInterest = (interest: TravelInterest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const mapAIToActivities = (data: AIGeneratedItinerary): CreateActivityData[] => {
    const activities: CreateActivityData[] = [];
    const start = parseLocalDate(startDate);

    for (const day of data.days) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + day.dayNumber - 1);
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, "0");
      const d = String(dayDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      for (let i = 0; i < day.activities.length; i++) {
        const act = day.activities[i];
        activities.push({
          trip_id: tripId,
          day_date: dateStr,
          period: PERIOD_MAP[act.period] || "morning",
          title: act.title,
          description: act.description || undefined,
          location: act.location || undefined,
          order_index: i,
        });
      }
    }
    return activities;
  };

  const handleGenerate = async () => {
    const formData: ItineraryFormData = {
      destination,
      startDate: parseLocalDate(startDate),
      endDate: parseLocalDate(endDate),
      travelersCount: 2,
      tripType,
      budgetLevel,
      interests: selectedInterests,
      travelPace,
      additionalPreferences: {
        dietaryRestrictions: dietaryRestrictions || undefined,
        localOrTouristy: localOrTouristy as any,
        exclusiveOrPopular: exclusiveOrPopular as any,
        mobilityLimitations: mobilityLimitations || undefined,
      },
    };

    setIsGenerating(true);
    onOpenChange(false);

    try {
      const generatedData = await generateWithAI(formData);
      const activities = mapAIToActivities(generatedData);

      if (existingActivitiesCount > 0) {
        setPendingData(generatedData);
        setShowOverwriteDialog(true);
      } else {
        await onGenerated(activities, "replace");
        toast.success("Roteiro gerado com sucesso! 🎉");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar roteiro");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOverwriteConfirm = async (mode: "replace" | "append") => {
    if (!pendingData) return;
    setShowOverwriteDialog(false);
    const activities = mapAIToActivities(pendingData);
    try {
      await onGenerated(activities, mode);
      toast.success(
        mode === "replace"
          ? "Roteiro substituído com sucesso! 🎉"
          : "Atividades adicionadas ao roteiro! 🎉"
      );
    } catch {
      toast.error("Erro ao salvar roteiro gerado");
    }
    setPendingData(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar Roteiro com IA
            </DialogTitle>
            <DialogDescription>
              Configure as preferências para gerar automaticamente o roteiro dia a dia para{" "}
              <strong>{destination}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Trip Profile */}
            <div className="space-y-2">
              <Label>Perfil do Viajante</Label>
              <Select value={tripType} onValueChange={(v) => setTripType(v as TripProfile)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TRIP_PROFILE_LABELS) as [TripProfile, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label>Nível de Orçamento</Label>
              <Select value={budgetLevel} onValueChange={(v) => setBudgetLevel(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economico">Econômico (3 estrelas)</SelectItem>
                  <SelectItem value="conforto">Conforto (4 estrelas)</SelectItem>
                  <SelectItem value="luxo">Luxo (5 estrelas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label>Interesses da Viagem</Label>
              <p className="text-xs text-muted-foreground">Selecione um ou mais interesses</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TRAVEL_INTEREST_LABELS) as [TravelInterest, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleInterest(value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        selectedInterests.includes(value)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <span>{TRAVEL_INTEREST_ICONS[value]}</span>
                      <span className="truncate">{label}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Travel Pace */}
            <div className="space-y-2">
              <Label>Ritmo da Viagem</Label>
              <Select value={travelPace} onValueChange={(v) => setTravelPace(v as TravelPace)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TRAVEL_PACE_LABELS) as [TravelPace, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced */}
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between text-muted-foreground"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Preferências adicionais
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div className="space-y-2">
                  <Label>Restrições alimentares</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    placeholder="Ex: vegetariano, sem glúten..."
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preferência de experiências</Label>
                  <Select value={localOrTouristy} onValueChange={setLocalOrTouristy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Experiências locais e autênticas</SelectItem>
                      <SelectItem value="touristy">Pontos turísticos clássicos</SelectItem>
                      <SelectItem value="mix">Mistura de ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de locais</Label>
                  <Select value={exclusiveOrPopular} onValueChange={setExclusiveOrPopular}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Locais exclusivos e reservados</SelectItem>
                      <SelectItem value="popular">Locais populares e movimentados</SelectItem>
                      <SelectItem value="mix">Mistura de ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Limitações de mobilidade</Label>
                  <Textarea
                    placeholder="Descreva qualquer limitação..."
                    rows={2}
                    value={mobilityLimitations}
                    onChange={(e) => setMobilityLimitations(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Roteiro com IA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overwrite dialog */}
      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roteiro já possui atividades</AlertDialogTitle>
            <AlertDialogDescription>
              O roteiro dia a dia já possui {existingActivitiesCount} atividade(s). O que deseja fazer com o conteúdo gerado pela IA?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setPendingData(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleOverwriteConfirm("append")}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Adicionar ao existente
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleOverwriteConfirm("replace")}>
              Substituir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AIGeneratingOverlay visible={isGenerating} />
    </>
  );
}
