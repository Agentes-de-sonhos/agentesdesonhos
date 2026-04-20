import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItineraryForm } from "@/components/itinerary/ItineraryForm";
import { AIGeneratingOverlay } from "@/components/itinerary/AIGeneratingOverlay";
import { useItineraries } from "@/hooks/useItineraries";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { ItineraryFormData } from "@/types/itinerary";
import { toast } from "sonner";

export function RoteiroIACard() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    canUse: canCreateItinerary,
    remaining,
    dailyLimit,
    usageCount,
    incrementUsage,
    isLoading: limitLoading,
  } = useDailyLimit("itinerary");

  const {
    createItinerary,
    generateWithAI,
    saveGeneratedItinerary,
    deleteItinerary,
  } = useItineraries();

  const handleCreateItinerary = async (data: ItineraryFormData) => {
    if (!canCreateItinerary) {
      toast.error("Limite diário atingido. Faça upgrade para gerar mais roteiros.");
      return;
    }

    let createdItineraryId: string | null = null;
    setIsGenerating(true);

    try {
      const itinerary = await createItinerary.mutateAsync(data);
      createdItineraryId = itinerary.id;

      const generatedData = await generateWithAI(data);
      await saveGeneratedItinerary(itinerary.id, generatedData, data.startDate);

      await incrementUsage();

      toast.success("Roteiro gerado com sucesso!");
      navigate(`/ferramentas-ia/criar-roteiro/${itinerary.id}`);
    } catch (error) {
      console.error("Error creating itinerary:", error);
      if (createdItineraryId) {
        try {
          await deleteItinerary.mutateAsync(createdItineraryId);
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }
      const message = error instanceof Error ? error.message : "Erro ao gerar roteiro";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Roteiro por IA
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-violet-600" />
          </div>

          {!limitLoading && dailyLimit !== null && (
            <Badge
              variant="outline"
              className={
                canCreateItinerary
                  ? "bg-violet-50 text-violet-700 border-violet-200"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }
            >
              {canCreateItinerary ? (
                <>
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  {usageCount}/{dailyLimit} hoje
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Limite atingido ({dailyLimit}/{dailyLimit})
                </>
              )}
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Preencha os dados da viagem e gere um roteiro personalizado em segundos.
          {dailyLimit !== null && (
            <span className="ml-1">
              No plano Start você tem <strong>{dailyLimit} roteiros por dia</strong>.
            </span>
          )}
        </p>

        {!canCreateItinerary && dailyLimit !== null ? (
          <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/50 p-6 text-center space-y-3">
            <Lock className="h-8 w-8 mx-auto text-violet-600" />
            <div>
              <h3 className="font-semibold text-foreground">
                Você atingiu o limite diário ({dailyLimit}/{dailyLimit})
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Faça upgrade para o plano Profissional ou Premium para gerar roteiros sem limites.
              </p>
            </div>
            <Button
              onClick={() => navigate("/planos")}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              Ver planos
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <ItineraryForm onSubmit={handleCreateItinerary} isLoading={isGenerating} />
          </div>
        )}

        {isGenerating && <AIGeneratingOverlay />}
      </CardContent>
    </Card>
  );
}
