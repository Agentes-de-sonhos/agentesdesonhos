import { useState, useEffect } from "react";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { buildRoteiroLink } from "@/lib/roteiro-domain";
import { useAuth } from "@/hooks/useAuth";
import { fetchAgentProfile, type AgentProfile } from "@/hooks/useAgentProfile";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItineraryForm } from "@/components/itinerary/ItineraryForm";
import { ItineraryEditor } from "@/components/itinerary/ItineraryEditor";
import { DocumentSignatureCard } from "@/components/quote/QuoteSignatureCard";
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
import { attachItineraryToTrip } from "@/lib/roteiro-domain";
import { Wand2, ArrowLeft, Check, FileText, Link2, Loader2, Lock, Pencil, X, ImageIcon, Sparkles, Star, Users, CalendarIcon, Quote } from "lucide-react";
import { SaveAsTemplateDialog } from "@/components/itinerary/SaveAsTemplateDialog";
import { TemplatesGrid } from "@/components/itinerary/TemplatesGrid";
import { ImportItineraryWizard } from "@/components/itinerary/ImportItineraryWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const [searchParams] = useSearchParams();
  const fromTripId = searchParams.get("fromTrip");
  const prefillDestination = searchParams.get("destination") || undefined;
  const prefillStart = searchParams.get("start") || undefined;
  const prefillEnd = searchParams.get("end") || undefined;
  const prefillClientId = searchParams.get("clientId") || undefined;
  const prefillClientName = searchParams.get("clientName") || undefined;

  const initialFormValues = (prefillDestination || prefillStart || prefillEnd || prefillClientId)
    ? {
        destination: prefillDestination,
        startDate: prefillStart ? parseLocalDate(prefillStart) : undefined,
        endDate: prefillEnd ? parseLocalDate(prefillEnd) : undefined,
        client: prefillClientId && prefillClientName
          ? { id: prefillClientId, name: prefillClientName }
          : null,
      }
    : undefined;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"create" | "list" | "templates">("create");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<(Itinerary & { days: ItineraryDay[] }) | null>(null);
  const [formData, setFormData] = useState<ItineraryFormData | null>(null);
  const [publishReviewOpen, setPublishReviewOpen] = useState(false);
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [editTextOpen, setEditTextOpen] = useState(false);
  const [editPhotosOpen, setEditPhotosOpen] = useState(false);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [editIntroText, setEditIntroText] = useState("");
  const [savingIntro, setSavingIntro] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastFormData, setLastFormData] = useState<ItineraryFormData | null>(null);
  const [approvalPromptOpen, setApprovalPromptOpen] = useState(false);
  const [approveAllConfirmOpen, setApproveAllConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"pdf" | "link" | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);
  const [templateTargetItinerary, setTemplateTargetItinerary] = useState<Itinerary | null>(null);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

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
    moveActivity,
    reorderActivities,
    updateItineraryStatus,
    updateItineraryDetails,
    adjustItineraryDates,
    deleteItinerary,
  } = useItineraries();

  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [editDestination, setEditDestination] = useState("");
  const [travelersPopoverOpen, setTravelersPopoverOpen] = useState(false);
  const [editTravelers, setEditTravelers] = useState(1);
  const [savingTravelers, setSavingTravelers] = useState(false);
  const [datesPopoverOpen, setDatesPopoverOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editEndDate, setEditEndDate] = useState<Date | undefined>(undefined);
  const [savingDates, setSavingDates] = useState(false);
  const [isEditingHeadline, setIsEditingHeadline] = useState(false);
  const [editHeadline, setEditHeadline] = useState("");
  const [savingHeadline, setSavingHeadline] = useState(false);

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

      // Se veio de uma Carteira Digital, vincular o roteiro recém-criado
      if (fromTripId) {
        try {
          await attachItineraryToTrip(fromTripId, itinerary.id);
          toast.success("Roteiro vinculado à Carteira Digital com sucesso!");
        } catch (attachErr) {
          console.error("Erro ao vincular roteiro à carteira:", attachErr);
          toast.error("Erro ao vincular roteiro à Carteira Digital.");
        }
      }

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
    if (updates.linkedTripServiceId !== undefined) dbUpdates.linked_trip_service_id = updates.linkedTripServiceId;
    if (updates.mapsUrl !== undefined) dbUpdates.maps_url = updates.mapsUrl;

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

  const handleMoveActivity = (
    activityId: string,
    dayId: string,
    period: "manha" | "tarde" | "noite"
  ) => {
    moveActivity.mutate(
      { activityId, dayId, period },
      {
        onSuccess: () => {
          if (currentItinerary) {
            loadItinerary(currentItinerary.id);
          }
          toast.success("Atividade movida");
        },
      }
    );
  };

  const handleReorderActivities = (
    updates: { id: string; orderIndex: number }[]
  ) => {
    if (!updates.length) return;
    reorderActivities.mutate(updates, {
      onSuccess: () => {
        if (currentItinerary) {
          loadItinerary(currentItinerary.id);
        }
      },
    });
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "list" | "templates")}>
            <div className="flex items-end justify-between gap-4 border-b border-border/60">
              <TabsList className="h-auto bg-transparent p-0 gap-6 rounded-none justify-start">
                <TabsTrigger
                  value="create"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  Novo Roteiro
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  Meus Roteiros
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  Meus Modelos
                </TabsTrigger>
              </TabsList>

              {activeTab === "list" && (
                <Button
                  size="sm"
                  onClick={() => setActiveTab("create")}
                  className="mb-2 h-9 rounded-lg px-3.5 text-sm shadow-sm"
                >
                  <Wand2 className="h-4 w-4" />
                  Novo Roteiro
                </Button>
              )}
            </div>

            <TabsContent value="create" className="mt-5 space-y-4">
              {hasLimit && (
                <div className={`max-w-3xl p-3 rounded-xl border text-sm flex items-center gap-2 ${canCreateItinerary ? 'bg-muted/40 border-border/60 text-muted-foreground' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                  {canCreateItinerary ? (
                    <><Wand2 className="h-4 w-4" /> Você pode criar mais {itinerariesRemaining} roteiro(s) hoje.</>
                  ) : (
                    <><Lock className="h-4 w-4" /> Limite diário atingido. Faça upgrade para o Plano Fundador para roteiros ilimitados.</>
                  )}
                </div>
              )}
              {generationError ? (
                <div className="max-w-3xl">
                  <CriticalErrorState
                    title="Não foi possível gerar o roteiro"
                    description="A geração foi interrompida. Você pode tentar novamente. Se o erro persistir, resete sua sessão para limpar dados temporários do navegador."
                    errorMessage={generationError}
                    onRetry={lastFormData ? handleRetryGeneration : undefined}
                    retryLabel="Tentar novamente"
                  />
                </div>
              ) : null}
              <Card className="max-w-3xl rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Novo Roteiro de Viagem
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preencha os dados e deixe a IA criar um roteiro personalizado.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <ItineraryForm
                    onSubmit={handleCreateItinerary}
                    isLoading={isGenerating}
                    initialValues={initialFormValues}
                  />
                </CardContent>
              </Card>

              <Card className="max-w-3xl rounded-2xl border-dashed border-border/70 bg-muted/10">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      Já tem um roteiro pronto?
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Importe PDFs, DOCs ou texto colado e a IA monta o roteiro para você.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportWizardOpen(true)}
                    className="shrink-0 h-9 rounded-lg"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Importar roteiro
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="mt-5">
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
                    onSaveTemplate={(id) => {
                      const found = itineraries.find(i => i.id === id);
                      if (found) setTemplateTargetItinerary(found);
                    }}
                  />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="templates" className="mt-5">
              <TemplatesGrid />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (fromTripId) {
                    navigate(`/ferramentas-ia/trip-wallet/${fromTripId}`);
                  } else {
                    handleBack();
                  }
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {fromTripId ? "Voltar para Carteira" : "Voltar"}
              </Button>
              <div className="flex gap-2">
                {currentItinerary && !areAllActivitiesApproved(currentItinerary) && (
                  <Button variant="outline" onClick={() => setApproveAllConfirmOpen(true)}>
                    <Check className="mr-2 h-4 w-4" />
                    Aprovar todas as atividades
                  </Button>
                )}
                {!generatedLinkUrl && (
                  <Button onClick={() => handleActionClick("link")}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Publicar
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleActionClick("pdf")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar PDF
                </Button>
                {currentItinerary && (
                  <Button variant="outline" onClick={() => setTemplateTargetItinerary(currentItinerary)}>
                    <Star className="mr-2 h-4 w-4" />
                    Salvar como modelo
                  </Button>
                )}
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
                <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Configurações do Roteiro
                </CardTitle>
                <CardDescription>
                  Centralize aqui as informações principais que aparecem no topo do roteiro e no link público.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-5">
                {/* Destino */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Destino</div>
                  <div className="flex items-center gap-2">
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
                      <span className="text-lg font-semibold">{currentItinerary.destination}</span>
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
                  </div>
                </div>

                {/* Viajantes + Datas + Duração */}
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Viajantes */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Viajantes</div>
                    <Popover open={travelersPopoverOpen} onOpenChange={(open) => {
                      setTravelersPopoverOpen(open);
                      if (open) setEditTravelers(currentItinerary.travelersCount);
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between rounded-xl">
                          <span className="inline-flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {currentItinerary.travelersCount} viajante(s)
                          </span>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="start">
                        <Label className="text-xs text-muted-foreground">Quantidade de viajantes</Label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={editTravelers}
                          onChange={(e) => setEditTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                          className="mt-1.5"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-3">
                          <Button variant="ghost" size="sm" onClick={() => setTravelersPopoverOpen(false)} disabled={savingTravelers}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            disabled={savingTravelers}
                            onClick={async () => {
                              setSavingTravelers(true);
                              try {
                                await updateItineraryDetails.mutateAsync({
                                  itineraryId: currentItinerary.id,
                                  updates: { travelers_count: editTravelers },
                                });
                                setCurrentItinerary({ ...currentItinerary, travelersCount: editTravelers });
                                setTravelersPopoverOpen(false);
                                toast.success("Viajantes atualizado!");
                              } catch {
                                toast.error("Não foi possível salvar.");
                              } finally {
                                setSavingTravelers(false);
                              }
                            }}
                          >
                            {savingTravelers ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Datas */}
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Datas da viagem</div>
                    <Popover open={datesPopoverOpen} onOpenChange={(open) => {
                      setDatesPopoverOpen(open);
                      if (open) {
                        setEditStartDate(parseLocalDate(currentItinerary.startDate));
                        setEditEndDate(parseLocalDate(currentItinerary.endDate));
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between rounded-xl">
                          <span className="inline-flex items-center gap-2 truncate">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              {format(parseLocalDate(currentItinerary.startDate), "dd MMM", { locale: ptBR })} – {format(parseLocalDate(currentItinerary.endDate), "dd MMM yyyy", { locale: ptBR })}
                              {" • "}
                              {currentItinerary.days?.length || 0} dias
                            </span>
                          </span>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Ida</Label>
                            <CalendarPicker
                              mode="single"
                              selected={editStartDate}
                              onSelect={(d) => {
                                if (!d) return;
                                setEditStartDate(d);
                                if (editEndDate && editEndDate < d) setEditEndDate(d);
                              }}
                              className="pointer-events-auto"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Volta</Label>
                            <CalendarPicker
                              mode="single"
                              selected={editEndDate}
                              onSelect={(d) => d && setEditEndDate(d)}
                              disabled={(d) => !!editStartDate && d < editStartDate}
                              className="pointer-events-auto"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {editStartDate && editEndDate
                              ? `${Math.max(1, Math.round((editEndDate.getTime() - editStartDate.getTime()) / 86400000) + 1)} dias`
                              : ""}
                          </span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setDatesPopoverOpen(false)} disabled={savingDates}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              disabled={savingDates || !editStartDate || !editEndDate}
                              onClick={async () => {
                                if (!editStartDate || !editEndDate) return;
                                setSavingDates(true);
                                try {
                                  await adjustItineraryDates.mutateAsync({
                                    itineraryId: currentItinerary.id,
                                    startDate: editStartDate,
                                    endDate: editEndDate,
                                  });
                                  setDatesPopoverOpen(false);
                                  await loadItinerary(currentItinerary.id);
                                  toast.success("Datas atualizadas!");
                                } catch (err: any) {
                                  toast.error(err?.message || "Não foi possível salvar.");
                                } finally {
                                  setSavingDates(false);
                                }
                              }}
                            >
                              {savingDates ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Frase de destaque */}
                {(() => {
                  const fallbackHeadline = `${currentItinerary.days?.length || 0} ${(currentItinerary.days?.length || 0) === 1 ? "dia" : "dias"} para viver ${currentItinerary.destination} de um jeito único`;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                          <Quote className="h-3.5 w-3.5 text-primary" />
                          Frase de destaque do roteiro
                        </span>
                        {!isEditingHeadline && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditHeadline(currentItinerary.headline || "");
                              setIsEditingHeadline(true);
                            }}
                            title="Editar frase"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      {isEditingHeadline ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editHeadline}
                            onChange={(e) => setEditHeadline(e.target.value)}
                            rows={2}
                            autoFocus
                            placeholder={fallbackHeadline}
                            className="resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setIsEditingHeadline(false);
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={savingHeadline}
                              onClick={async () => {
                                setSavingHeadline(true);
                                try {
                                  const value = editHeadline.trim() || null;
                                  await updateItineraryDetails.mutateAsync({
                                    itineraryId: currentItinerary.id,
                                    updates: { headline: value },
                                  });
                                  setCurrentItinerary({ ...currentItinerary, headline: value });
                                  setIsEditingHeadline(false);
                                  toast.success("Frase atualizada!");
                                } catch {
                                  toast.error("Não foi possível salvar.");
                                } finally {
                                  setSavingHeadline(false);
                                }
                              }}
                            >
                              {savingHeadline ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                              Salvar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingHeadline(false)} disabled={savingHeadline}>
                              Cancelar
                            </Button>
                            {!editHeadline.trim() && (
                              <span className="ml-auto text-[11px] text-muted-foreground italic">
                                Em branco usa a sugestão automática
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className={`text-sm leading-relaxed ${currentItinerary.headline ? "text-foreground/85" : "text-muted-foreground italic"}`}>
                          {currentItinerary.headline || `Sugestão automática: "${fallbackHeadline}"`}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Apresentação do destino + Capa */}
                <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-border/60">
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
                      onClick={() => setEditPhotosOpen(true)}
                    >
                      <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                      Capa e fotos
                    </Button>
                  </div>

                  {/* Intro text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Apresentação do destino
                      </span>
                      {!isEditingIntro && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditIntroText(currentItinerary.destinationIntroText || "");
                            setIsEditingIntro(true);
                          }}
                          title="Editar descrição"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      <div className="ml-auto">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Switch
                                id="show-intro-inline"
                                checked={currentItinerary.showDestinationIntro !== false}
                                onCheckedChange={async (checked) => {
                                  const prev = currentItinerary;
                                  setCurrentItinerary({ ...prev, showDestinationIntro: checked });
                                  try {
                                    await updateItineraryDetails.mutateAsync({
                                      itineraryId: prev.id,
                                      updates: { show_destination_intro: checked },
                                    });
                                  } catch (err) {
                                    setCurrentItinerary(prev);
                                    toast.error("Não foi possível atualizar a visibilidade.");
                                  }
                                }}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="max-w-[220px]">Mostra o texto e a galeria de fotos no topo do roteiro público.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    {isEditingIntro ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editIntroText}
                          onChange={(e) => setEditIntroText(e.target.value)}
                          rows={6}
                          autoFocus
                          placeholder="Apresentação do destino..."
                          className="resize-none text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setIsEditingIntro(false);
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={savingIntro}
                            onClick={async () => {
                              setSavingIntro(true);
                              try {
                                const value = editIntroText.trim() || null;
                                await updateItineraryDetails.mutateAsync({
                                  itineraryId: currentItinerary.id,
                                  updates: { destination_intro_text: value },
                                });
                                setCurrentItinerary({
                                  ...currentItinerary,
                                  destinationIntroText: value || undefined,
                                });
                                setIsEditingIntro(false);
                                toast.success("Descrição atualizada!");
                              } catch {
                                toast.error("Não foi possível salvar.");
                              } finally {
                                setSavingIntro(false);
                              }
                            }}
                          >
                            {savingIntro ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingIntro(false)} disabled={savingIntro}>
                            Cancelar
                          </Button>
                          <span className="ml-auto text-xs text-muted-foreground">{editIntroText.length} caracteres</span>
                        </div>
                      </div>
                    ) : currentItinerary.destinationIntroText ? (
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line line-clamp-6">
                        {currentItinerary.destinationIntroText}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum texto gerado ainda. Clique no lápis para criar a apresentação do destino.
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
                onMoveActivity={handleMoveActivity}
                onReorderActivities={handleReorderActivities}
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

            <DocumentSignatureCard
              table="itineraries"
              docId={currentItinerary.id}
              initialSnapshot={(currentItinerary as any).signature_snapshot ?? (currentItinerary as any).signatureSnapshot ?? null}
              onSaved={() => loadItinerary(currentItinerary.id)}
            />
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

      {currentItinerary && editTextOpen && (
        <PublishReviewDialog
          open={editTextOpen}
          onOpenChange={setEditTextOpen}
          itinerary={currentItinerary}
          mode="edit"
          section="text"
          onConfirm={async (data) => {
            await updateItineraryDetails.mutateAsync({
              itineraryId: currentItinerary.id,
              updates: { destination_intro_text: data.introText },
            });
            setCurrentItinerary({
              ...currentItinerary,
              destinationIntroText: data.introText || undefined,
            });
            toast.success("Descrição atualizada!");
          }}
        />
      )}

      {currentItinerary && editPhotosOpen && (
        <PublishReviewDialog
          open={editPhotosOpen}
          onOpenChange={setEditPhotosOpen}
          itinerary={currentItinerary}
          mode="edit"
          section="photos"
          onConfirm={async (data) => {
            await updateItineraryDetails.mutateAsync({
              itineraryId: currentItinerary.id,
              updates: {
                destination_intro_images: data.images,
                cover_image_url: data.coverUrl,
              },
            });
            setCurrentItinerary({
              ...currentItinerary,
              destinationIntroImages: data.images,
              coverImageUrl: data.coverUrl || undefined,
            });
            toast.success("Fotos atualizadas!");
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

      <AlertDialog open={approveAllConfirmOpen} onOpenChange={setApproveAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja aprovar todas as atividades deste roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará todas as atividades pendentes como aprovadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setApproveAllConfirmOpen(false);
                handleApproveAll();
              }}
            >
              Confirmar aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(currentItinerary || templateTargetItinerary) && (
        <SaveAsTemplateDialog
          open={!!templateTargetItinerary}
          onOpenChange={(open) => !open && setTemplateTargetItinerary(null)}
          itinerary={templateTargetItinerary || currentItinerary!}
        />
      )}

      <ImportItineraryWizard
        open={importWizardOpen}
        onOpenChange={setImportWizardOpen}
      />
    </DashboardLayout>
  );
}
