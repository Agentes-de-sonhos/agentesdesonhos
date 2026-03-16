import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItineraryForm } from "@/components/itinerary/ItineraryForm";
import { ItineraryEditor } from "@/components/itinerary/ItineraryEditor";
import { ItineraryCard } from "@/components/itinerary/ItineraryCard";
import { downloadPDF } from "@/components/itinerary/ItineraryPDF";
import { useItineraries } from "@/hooks/useItineraries";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { ItineraryFormData, Itinerary, ItineraryDay } from "@/types/itinerary";
import { toast } from "sonner";
import { Wand2, ArrowLeft, Check, FileText, Link2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function CriarRoteiro() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<"create" | "list">(id ? "create" : "list");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<(Itinerary & { days: ItineraryDay[] }) | null>(null);
  const [formData, setFormData] = useState<ItineraryFormData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itineraryToDelete, setItineraryToDelete] = useState<string | null>(null);

  const {
    itineraries,
    isLoading,
    createItinerary,
    generateWithAI,
    saveGeneratedItinerary,
    getItineraryWithDetails,
    updateActivity,
    deleteActivity,
    addActivity,
    updateItineraryStatus,
    deleteItinerary,
  } = useItineraries();

  const { canUse: canCreateItinerary, remaining: itinerariesRemaining, hasLimit, incrementUsage } = useDailyLimit("itinerary");

  useEffect(() => {
    if (id) {
      loadItinerary(id);
    }
  }, [id]);

  const loadItinerary = async (itineraryId: string) => {
    try {
      const data = await getItineraryWithDetails(itineraryId);
      setCurrentItinerary(data);
      setActiveTab("create");
    } catch (error) {
      toast.error("Erro ao carregar roteiro");
    }
  };

  const handleCreateItinerary = async (data: ItineraryFormData) => {
    if (!canCreateItinerary) {
      toast.error("Limite diário atingido. Faça upgrade para o Plano Fundador para criar roteiros ilimitados.");
      return;
    }
    setIsGenerating(true);
    setFormData(data);

    try {
      // Create itinerary record
      const itinerary = await createItinerary.mutateAsync(data);

      // Generate with AI
      toast.info("Gerando roteiro com IA...");
      const generatedData = await generateWithAI(data);

      // Save generated data
      await saveGeneratedItinerary(itinerary.id, generatedData, data.startDate);

      // Load complete itinerary
      const completeItinerary = await getItineraryWithDetails(itinerary.id);
      setCurrentItinerary(completeItinerary);

      // Only increment usage AFTER successful creation
      await incrementUsage();

      toast.success("Roteiro gerado com sucesso!");
    } catch (error) {
      console.error("Error creating itinerary:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar roteiro");
    } finally {
      setIsGenerating(false);
    }
  };

  // Apenas campos explicitamente mapeados são enviados ao banco.
  // Novos campos precisam ser adicionados manualmente aqui.
  const handleUpdateActivity = (activityId: string, updates: Partial<Record<string, unknown>>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.estimatedDuration !== undefined) dbUpdates.estimated_duration = updates.estimatedDuration;
    if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
    if (updates.isApproved !== undefined) dbUpdates.is_approved = updates.isApproved;

    updateActivity.mutate(
      { activityId, updates: dbUpdates },
      {
        onSuccess: () => {
          if (currentItinerary) {
            loadItinerary(currentItinerary.id);
          }
          toast.success("Atividade atualizada");
        },
      }
    );
  };

  const handleDeleteActivity = (activityId: string) => {
    deleteActivity.mutate(activityId, {
      onSuccess: () => {
        if (currentItinerary) {
          loadItinerary(currentItinerary.id);
        }
        toast.success("Atividade removida");
      },
    });
  };

  const handleAddActivity = (dayId: string, activity: Parameters<typeof addActivity.mutate>[0]["activity"]) => {
    addActivity.mutate(
      { dayId, activity },
      {
        onSuccess: () => {
          if (currentItinerary) {
            loadItinerary(currentItinerary.id);
          }
          toast.success("Atividade adicionada");
        },
      }
    );
  };

  const handleApproveAll = async () => {
    if (!currentItinerary) return;

    for (const day of currentItinerary.days) {
      for (const activity of day.activities) {
        if (!activity.isApproved && activity.id) {
          await updateActivity.mutateAsync({
            activityId: activity.id,
            updates: { is_approved: true },
          });
        }
      }
    }

    await updateItineraryStatus.mutateAsync({
      itineraryId: currentItinerary.id,
      status: "approved",
    });

    loadItinerary(currentItinerary.id);
    toast.success("Roteiro aprovado!");
  };

  const handleGeneratePDF = async (itineraryId: string) => {
    try {
      const data = await getItineraryWithDetails(itineraryId);
      downloadPDF(data);
    } catch (error) {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handlePublish = async (itineraryId: string) => {
    // Generate cryptographically secure 32-character hex token
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const shareToken = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await updateItineraryStatus.mutateAsync({
      itineraryId,
      status: "published",
      shareToken,
    });

    const url = `${window.location.origin}/roteiro/${shareToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado! O roteiro foi publicado.");
  };

  const handleCopyLink = async (shareToken: string) => {
    const url = `${window.location.origin}/roteiro/${shareToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleDelete = (itineraryId: string) => {
    setItineraryToDelete(itineraryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itineraryToDelete) {
      deleteItinerary.mutate(itineraryToDelete, {
        onSuccess: () => {
          if (currentItinerary?.id === itineraryToDelete) {
            setCurrentItinerary(null);
          }
          setDeleteDialogOpen(false);
          setItineraryToDelete(null);
        },
      });
    }
  };

  const handleBack = () => {
    setCurrentItinerary(null);
    setFormData(null);
    navigate("/ferramentas-ia/criar-roteiro");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="criar-roteiro"
          title="Criar Roteiro"
          subtitle="Gere roteiros personalizados com inteligência artificial"
          icon={Wand2}
        />

        {!currentItinerary ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "list")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="create">Novo Roteiro</TabsTrigger>
              <TabsTrigger value="list">Meus Roteiros</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-6 space-y-4">
              {hasLimit && (
                <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${canCreateItinerary ? 'bg-muted/50 text-muted-foreground' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                  {canCreateItinerary ? (
                    <><Wand2 className="h-4 w-4" /> Você pode criar mais {itinerariesRemaining} roteiro(s) hoje.</>
                  ) : (
                    <><Lock className="h-4 w-4" /> Limite diário atingido. Faça upgrade para o Plano Fundador para roteiros ilimitados.</>
                  )}
                </div>
              )}
              <Card className="max-w-lg">
                <CardHeader>
                  <CardTitle>Novo Roteiro de Viagem</CardTitle>
                  <CardDescription>
                    Preencha os dados e deixe a IA criar um roteiro personalizado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ItineraryForm onSubmit={handleCreateItinerary} isLoading={isGenerating} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : itineraries.length === 0 ? (
                <Card className="p-8 text-center">
                  <Wand2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-display text-lg font-semibold">
                    Nenhum roteiro criado
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Crie seu primeiro roteiro com IA
                  </p>
                  <Button className="mt-4" onClick={() => setActiveTab("create")}>
                    Criar Roteiro
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {itineraries.map((itinerary) => (
                    <ItineraryCard
                      key={itinerary.id}
                      itinerary={itinerary}
                      onView={loadItinerary}
                      onEdit={loadItinerary}
                      onDelete={handleDelete}
                      onGeneratePDF={handleGeneratePDF}
                      onPublish={handlePublish}
                      onCopyLink={handleCopyLink}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleGeneratePDF(currentItinerary.id)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar PDF
                </Button>
                {currentItinerary.status === "approved" && (
                  <Button onClick={() => handlePublish(currentItinerary.id)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Publicar
                  </Button>
                )}
                {currentItinerary.status === "published" && currentItinerary.shareToken && (
                  <Button onClick={() => handleCopyLink(currentItinerary.shareToken!)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Copiar Link
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentItinerary.destination}
                </CardTitle>
                <CardDescription>
                  {currentItinerary.travelersCount} viajante(s) •{" "}
                  {currentItinerary.days?.length || 0} dias
                </CardDescription>
              </CardHeader>
            </Card>

            {currentItinerary.days && currentItinerary.days.length > 0 && (
              <ItineraryEditor
                days={currentItinerary.days}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                onAddActivity={handleAddActivity}
                onApproveAll={handleApproveAll}
              />
            )}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Roteiro</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este roteiro? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
