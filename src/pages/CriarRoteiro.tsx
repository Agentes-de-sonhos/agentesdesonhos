import { useState, useEffect } from "react";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { buildRoteiroLink } from "@/lib/roteiro-domain";
import { useAuth } from "@/hooks/useAuth";
import { fetchAgentProfile, type AgentProfile } from "@/hooks/useAgentProfile";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItineraryForm } from "@/components/itinerary/ItineraryForm";
import { ItineraryEditor } from "@/components/itinerary/ItineraryEditor";
import { AIGeneratingOverlay } from "@/components/itinerary/AIGeneratingOverlay";
import { CriticalErrorState } from "@/components/common/CriticalErrorState";
import { ItineraryCard } from "@/components/itinerary/ItineraryCard";
import { downloadPDF } from "@/components/itinerary/ItineraryPDF";
import { PublishReviewDialog } from "@/components/itinerary/PublishReviewDialog";
import { useItineraries } from "@/hooks/useItineraries";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { useTripWeather } from "@/hooks/useTripWeather";
import { parseLocalDate } from "@/lib/dateParsing";
import { ItineraryFormData, Itinerary, ItineraryDay } from "@/types/itinerary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, ArrowLeft, Check, FileText, Link2, Loader2, Lock, Pencil, X, ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Copy } from "lucide-react";
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<(Itinerary & { days: ItineraryDay[] }) | null>(null);
  const [formData, setFormData] = useState<ItineraryFormData | null>(null);
  const [publishReviewOpen, setPublishReviewOpen] = useState(false);
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [editPresentationOpen, setEditPresentationOpen] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastFormData, setLastFormData] = useState<ItineraryFormData | null>(null);
  const [approvalPromptOpen, setApprovalPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"pdf" | "link" | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);

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
    updateItineraryDetails,
    deleteItinerary,
  } = useItineraries();

  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [editDestination, setEditDestination] = useState("");

  const { canUse: canCreateItinerary, remaining: itinerariesRemaining, hasLimit, incrementUsage } = useDailyLimit("itinerary");

  // Weather for current itinerary (used for PDF + future UI)
  const wxStart = currentItinerary ? parseLocalDate(currentItinerary.startDate) : new Date();
  const wxEnd = currentItinerary ? parseLocalDate(currentItinerary.endDate) : new Date();
  const { weatherByDate } = useTripWeather(currentItinerary?.destination, wxStart, wxEnd);

  useEffect(() => {
    if (user?.id) {
      fetchAgentProfile(user.id, supabase).then(setAgentProfile);
    }
  }, [user?.id]);

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
      if (data.status === "published" && data.shareToken) {
        setGeneratedLinkUrl(buildItineraryUrl(data));
      }
    } catch (error) {
      toast.error("Erro ao carregar roteiro");
    }
  };

  const handleCreateItinerary = async (data: ItineraryFormData) => {
    let createdItineraryId: string | null = null;

    if (!canCreateItinerary) {
      toast.error("Limite diário atingido. Faça upgrade para o Plano Fundador para criar roteiros ilimitados.");
      return;
    }
    setIsGenerating(true);
    setFormData(data);
    setLastFormData(data);
    setGenerationError(null);

    try {
      // Create itinerary record
      const itinerary = await createItinerary.mutateAsync(data);
      createdItineraryId = itinerary.id;

      // Generate with AI
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

      if (createdItineraryId) {
        try {
          await deleteItinerary.mutateAsync(createdItineraryId);
        } catch (cleanupError) {
          console.error("Error cleaning up failed itinerary:", cleanupError);
        }
      }

      const message = error instanceof Error ? error.message : "Erro ao gerar roteiro";
      setGenerationError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryGeneration = () => {
    if (lastFormData) {
      setGenerationError(null);
      handleCreateItinerary(lastFormData);
    } else {
      setGenerationError(null);
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
    if (updates.photo_url !== undefined) dbUpdates.photo_url = updates.photo_url;
    if (updates.document_urls !== undefined) dbUpdates.document_urls = updates.document_urls;

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
      downloadPDF(data, agentProfile, weatherByDate);
    } catch (error) {
      toast.error("Erro ao gerar PDF");
    }
  };

  const buildItineraryUrl = (itinerary: Itinerary) => {
    const code = itinerary.publicAccessCode;
    const agencyName = agentProfile?.agency_name;
    if (code && agencyName) {
      return buildRoteiroLink(agencyName, code);
    }
    return `${PUBLIC_DOMAIN}/roteiro/${itinerary.shareToken}`;
  };

  const openPublishReview = async (itineraryId: string) => {
    // Ensure currentItinerary is loaded for the dialog
    if (!currentItinerary || currentItinerary.id !== itineraryId) {
      await loadItinerary(itineraryId);
    }
    setPendingPublishId(itineraryId);
    setPublishReviewOpen(true);
  };

  const handlePublish = async (itineraryId: string) => {
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

    // Refetch to get public_access_code
    const { data: refreshed } = await supabase
      .from("itineraries")
      .select("public_access_code, share_token")
      .eq("id", itineraryId)
      .single();

    const code = (refreshed as any)?.public_access_code;
    const agencyName = agentProfile?.agency_name;
    const url = code && agencyName
      ? buildRoteiroLink(agencyName, code)
      : `${PUBLIC_DOMAIN}/roteiro/${shareToken}`;

    await navigator.clipboard.writeText(url);
    toast.success("Link copiado! O roteiro foi publicado.");
    setGeneratedLinkUrl(url);
    return url;
  };

  const handleConfirmPublish = async (data: {
    introText: string | null;
    images: string[];
    coverUrl: string | null;
    showIntro: boolean;
  }) => {
    if (!pendingPublishId) return;
    await updateItineraryDetails.mutateAsync({
      itineraryId: pendingPublishId,
      updates: {
        destination_intro_text: data.introText,
        destination_intro_images: data.images,
        cover_image_url: data.coverUrl,
        show_destination_intro: data.showIntro,
      },
    });
    await handlePublish(pendingPublishId);
    if (currentItinerary?.id === pendingPublishId) {
      await loadItinerary(pendingPublishId);
    }
    setPendingPublishId(null);
  };

  const handleCopyLink = async (shareToken: string) => {
    // Find itinerary by shareToken to use new URL if available
    const found = itineraries.find(i => i.shareToken === shareToken);
    const url = found ? buildItineraryUrl(found) : `${PUBLIC_DOMAIN}/roteiro/${shareToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleDelete = (itineraryId: string) => {
    // Confirmation is handled inside ItineraryCard's own AlertDialog
    deleteItinerary.mutate(itineraryId, {
      onSuccess: () => {
        if (currentItinerary?.id === itineraryId) {
          setCurrentItinerary(null);
        }
      },
    });
  };

  const handleBack = () => {
    setCurrentItinerary(null);
    setFormData(null);
    setGeneratedLinkUrl(null);
    navigate("/ferramentas-ia/criar-roteiro");
  };

  const areAllActivitiesApproved = (itinerary: Itinerary & { days: ItineraryDay[] }) => {
    if (!itinerary.days || itinerary.days.length === 0) return false;
    return itinerary.days.every((d) =>
      d.activities.length === 0 ? true : d.activities.every((a) => a.isApproved)
    );
  };

  const proceedWithAction = async (action: "pdf" | "link") => {
    if (!currentItinerary) return;
    if (action === "pdf") {
      await handleGeneratePDF(currentItinerary.id);
      return;
    }
    // link
    if (currentItinerary.status === "published" && currentItinerary.shareToken) {
      const url = buildItineraryUrl(currentItinerary);
      setGeneratedLinkUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      } catch {}
      return;
    }
    setPendingPublishId(currentItinerary.id);
    setPublishReviewOpen(true);
  };

  const handleActionClick = (action: "pdf" | "link") => {
    if (!currentItinerary) return;
    if (!areAllActivitiesApproved(currentItinerary)) {
      setPendingAction(action);
      setApprovalPromptOpen(true);
      return;
    }
    proceedWithAction(action);
  };

  const handleConfirmApprovalAndProceed = async () => {
    if (!currentItinerary || !pendingAction) return;
    setIsProcessingAction(true);
    try {
      await handleApproveAll();
      // Reload to get fresh approved state
      const fresh = await getItineraryWithDetails(currentItinerary.id);
      setCurrentItinerary(fresh);
      const action = pendingAction;
      setApprovalPromptOpen(false);
      setPendingAction(null);
      if (action === "pdf") {
        await handleGeneratePDF(fresh.id);
      } else {
        if (fresh.status === "published" && fresh.shareToken) {
          const url = buildItineraryUrl(fresh);
          setGeneratedLinkUrl(url);
          try { await navigator.clipboard.writeText(url); } catch {}
          toast.success("Link copiado!");
        } else {
          setPendingPublishId(fresh.id);
          setPublishReviewOpen(true);
        }
      }
    } finally {
      setIsProcessingAction(false);
    }
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
              {generationError ? (
                <CriticalErrorState
                  title="Não foi possível gerar o roteiro"
                  description="A geração foi interrompida. Você pode tentar novamente. Se o erro persistir, resete sua sessão para limpar dados temporários do navegador."
                  errorMessage={generationError}
                  onRetry={lastFormData ? handleRetryGeneration : undefined}
                  retryLabel="Tentar novamente"
                />
              ) : null}
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
                      onPublish={openPublishReview}
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
                <Button variant="outline" onClick={() => handleActionClick("pdf")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar PDF
                </Button>
                <Button onClick={() => handleActionClick("link")}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Gerar Link
                </Button>
              </div>
            </div>

            {generatedLinkUrl && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      Link público do roteiro
                    </div>
                    <div className="text-sm font-mono break-all text-foreground">
                      {generatedLinkUrl}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(generatedLinkUrl, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(generatedLinkUrl);
                          toast.success("Link copiado!");
                        } catch {
                          toast.error("Não foi possível copiar");
                        }
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isEditingDestination ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editDestination}
                        onChange={(e) => setEditDestination(e.target.value)}
                        className="text-lg font-semibold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateItineraryDetails.mutate(
                              { itineraryId: currentItinerary.id, updates: { destination: editDestination } },
                              {
                                onSuccess: () => {
                                  setCurrentItinerary({ ...currentItinerary, destination: editDestination });
                                  setIsEditingDestination(false);
                                  toast.success("Destino atualizado!");
                                },
                              }
                            );
                          }
                          if (e.key === "Escape") setIsEditingDestination(false);
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          updateItineraryDetails.mutate(
                            { itineraryId: currentItinerary.id, updates: { destination: editDestination } },
                            {
                              onSuccess: () => {
                                setCurrentItinerary({ ...currentItinerary, destination: editDestination });
                                setIsEditingDestination(false);
                                toast.success("Destino atualizado!");
                              },
                            }
                          );
                        }}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setIsEditingDestination(false)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      {currentItinerary.destination}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          setEditDestination(currentItinerary.destination);
                          setIsEditingDestination(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentItinerary.travelersCount} viajante(s) •{" "}
                  {currentItinerary.days?.length || 0} dias
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Cover thumbnail */}
                  <div className="md:w-48 shrink-0">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
                      {currentItinerary.coverImageUrl || currentItinerary.destinationIntroImages?.[0] ? (
                        <img
                          src={currentItinerary.coverImageUrl || currentItinerary.destinationIntroImages?.[0]}
                          alt="Capa do destino"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1">
                          <ImageIcon className="h-6 w-6" />
                          <span className="text-[10px] uppercase tracking-wider">Sem capa</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setEditPresentationOpen(true)}
                    >
                      <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                      Capa e fotos
                    </Button>
                  </div>

                  {/* Intro text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Apresentação do destino
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setEditPresentationOpen(true)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                    </div>
                    {currentItinerary.destinationIntroText ? (
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line line-clamp-6">
                        {currentItinerary.destinationIntroText}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum texto gerado ainda. Clique em "Editar" para criar a apresentação do destino.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentItinerary.days && currentItinerary.days.length > 0 && (
              <ItineraryEditor
                itineraryId={currentItinerary.id}
                days={currentItinerary.days}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                onAddActivity={handleAddActivity}
                onApproveAll={handleApproveAll}
                aiContext={{
                  destination: currentItinerary.destination,
                  tripType: currentItinerary.tripType,
                  budgetLevel: currentItinerary.budgetLevel,
                  travelersCount: currentItinerary.travelersCount,
                  travelPace: lastFormData?.travelPace,
                  interests: lastFormData?.interests,
                  observations: lastFormData?.additionalPreferences?.serviceContext,
                }}
              />
            )}
          </div>
        )}

      </div>

      {currentItinerary && publishReviewOpen && (
        <PublishReviewDialog
          open={publishReviewOpen}
          onOpenChange={setPublishReviewOpen}
          itinerary={currentItinerary}
          onConfirm={handleConfirmPublish}
        />
      )}

      {currentItinerary && editPresentationOpen && (
        <PublishReviewDialog
          open={editPresentationOpen}
          onOpenChange={setEditPresentationOpen}
          itinerary={currentItinerary}
          mode="edit"
          onConfirm={async (data) => {
            await updateItineraryDetails.mutateAsync({
              itineraryId: currentItinerary.id,
              updates: {
                destination_intro_text: data.introText,
                destination_intro_images: data.images,
                cover_image_url: data.coverUrl,
                show_destination_intro: data.showIntro,
              },
            });
            setCurrentItinerary({
              ...currentItinerary,
              destinationIntroText: data.introText || undefined,
              destinationIntroImages: data.images,
              coverImageUrl: data.coverUrl || undefined,
              showDestinationIntro: data.showIntro,
            });
            toast.success("Apresentação atualizada!");
          }}
        />
      )}

      <AIGeneratingOverlay visible={isGenerating} />

      <AlertDialog open={approvalPromptOpen} onOpenChange={(o) => { if (!o && !isProcessingAction) { setApprovalPromptOpen(false); setPendingAction(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar todas as atividades?</AlertDialogTitle>
            <AlertDialogDescription>
              Para {pendingAction === "pdf" ? "gerar o PDF" : "gerar o link público"} é necessário aprovar todas as atividades do roteiro. Deseja aprovar agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>Não</AlertDialogCancel>
            <AlertDialogAction
              disabled={isProcessingAction}
              onClick={(e) => { e.preventDefault(); handleConfirmApprovalAndProceed(); }}
            >
              {isProcessingAction ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aprovando...</>
              ) : (
                "Sim, aprovar e continuar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
