import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, FileText, Copy, Loader2, Wallet, Lock, RefreshCw, Eye, EyeOff, Pencil, Archive, Trash2, Share2, ShieldAlert, Unlock } from "lucide-react";
import { TripItinerary } from "@/components/trip/itinerary/TripItinerary";
import { TripForm } from "@/components/trip/TripForm";
import { TripServiceForm } from "@/components/trip/TripServiceForms";
import { PassengerPoolProvider } from "@/components/trip/PassengerPoolContext";
import { TravelImporter } from "@/components/trip/TravelImporter";
import { TripServiceList } from "@/components/trip/TripServiceCard";
import { TripWalletList } from "@/components/trip/TripWalletList";
import { TripEditForm } from "@/components/trip/TripEditForm";
import { TripEditHistory } from "@/components/trip/TripEditHistory";
import { generateTripPDF, type ItineraryActivityForPDF } from "@/components/trip/TripPDF";
import { useItineraryActivities } from "@/hooks/useItineraryActivities";
import { ShareTripModal } from "@/components/trip/ShareTripModal";
import { AIImportServiceModal, type AIImportResult } from "@/components/shared/AIImportServiceModal";
import { Sparkles } from "lucide-react";
import { useTrips, useTrip } from "@/hooks/useTrips";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentProfile, AgentProfile } from "@/hooks/useAgentProfile";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
import { ptBR } from "date-fns/locale";
import type { TripServiceType, TripFormData, TripService } from "@/types/trip";

const SERVICE_TYPE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", train: "Trem", other: "Outros",
};

export default function TripWallet() {
  return (
    <SubscriptionGuard feature="trip_wallet">
      <TripWalletContent />
    </SubscriptionGuard>
  );
}

function TripWalletContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createTrip, isCreating, updateTrip, isUpdating, updatePassword, regeneratePassword, deleteTrip, unlockTrip } = useTrips();
  const { 
    trip, addService, updateService, deleteService, uploadVoucher, 
    replaceVoucher, removeVoucher, isAddingService, isUpdatingService, editHistory,
    reorderServices,
  } = useTrip(id && id !== "nova" ? id : undefined);

  const { activities: itineraryActivities } = useItineraryActivities(id && id !== "nova" ? id : undefined);

  const [selectedServiceType, setSelectedServiceType] = useState<TripServiceType | null>(null);
  const [editingService, setEditingService] = useState<TripService | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAgentProfile(user.id, supabase).then(setAgentProfile);
    }
  }, [user?.id]);

  const handleCreateTrip = async (data: TripFormData) => {
    const newTrip = await createTrip(data);
    navigate(`/ferramentas-ia/trip-wallet/${newTrip.id}`, { replace: true });
  };

  const handleUpdateTrip = async (data: { client_name: string; destination: string; start_date: string; end_date: string; status: string }) => {
    if (!id) return;
    await updateTrip({ id, ...data });
    setIsEditingTrip(false);
  };

  const handleAddService = async (serviceData: any, files?: File[]) => {
    if (!selectedServiceType) return;
    try {
      setIsUploading(true);
      const attachments: { url: string; name: string }[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const result = await uploadVoucher(file);
          attachments.push(result);
        }
      }
      await addService({ 
        service_type: selectedServiceType, 
        service_data: serviceData, 
        voucher_url: attachments[0]?.url, 
        voucher_name: attachments[0]?.name,
        attachments,
      });
      setSelectedServiceType(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportServices = async (services: { service_type: TripServiceType; service_data: any }[]) => {
    setIsImporting(true);
    try {
      for (const svc of services) {
        await addService({
          service_type: svc.service_type,
          service_data: svc.service_data,
        });
      }
      toast({ title: "Serviços importados", description: `${services.length} serviço(s) importado(s) com sucesso.` });
    } catch (err: any) {
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleEditService = (service: TripService) => {
    setEditingService(service);
    setSelectedServiceType(service.service_type);
  };

  const handleUpdateService = async (serviceData: any, files?: File[]) => {
    if (!editingService) return;
    try {
      setIsUploading(true);
      let newAttachments: { url: string; name: string }[] | undefined;
      if (files && files.length > 0) {
        newAttachments = [];
        for (const file of files) {
          const result = await uploadVoucher(file);
          newAttachments.push(result);
        }
      }
      await updateService({
        serviceId: editingService.id,
        service_data: serviceData,
        ...(newAttachments ? { 
          voucher_url: newAttachments[0]?.url, 
          voucher_name: newAttachments[0]?.name,
          attachments: [...(editingService.attachments || []), ...newAttachments],
        } : {}),
      });
      setEditingService(null);
      setSelectedServiceType(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddAttachment = async (serviceId: string, file: File) => {
    try {
      setIsUploading(true);
      const result = await uploadVoucher(file);
      const service = trip?.services?.find(s => s.id === serviceId);
      const currentAttachments = service?.attachments || [];
      await updateService({
        serviceId,
        service_data: service?.service_data!,
        attachments: [...currentAttachments, result],
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async (serviceId: string, index: number) => {
    const service = trip?.services?.find(s => s.id === serviceId);
    if (!service) return;
    const newAttachments = (service.attachments || []).filter((_, i) => i !== index);
    await updateService({
      serviceId,
      service_data: service.service_data,
      attachments: newAttachments,
    });
  };

  const handleCancelServiceForm = () => {
    setSelectedServiceType(null);
    setEditingService(null);
  };

  const handleAIImport = async (result: AIImportResult) => {
    await addService({
      service_type: result.service_type as TripServiceType,
      service_data: result.service_data as any,
    });
  };

  const handleReplaceVoucher = async (serviceId: string, file: File) => {
    await replaceVoucher({ serviceId, file });
  };

  const handleUploadServiceImage = async (serviceId: string, file: File) => {
    try {
      setIsUploading(true);
      // Upload to public bucket (same pattern as Orçamentos) so the image
      // can be displayed directly via public URL — no signed URL needed.
      const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `trip-services/${id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("quote-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("quote-images").getPublicUrl(path);
      await supabase
        .from("trip_services")
        .update({ image_url: urlData.publicUrl })
        .eq("id", serviceId);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast({ title: "Imagem adicionada" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveServiceImage = async (serviceId: string) => {
    try {
      await supabase.from("trip_services").update({ image_url: null }).eq("id", serviceId);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast({ title: "Imagem removida" });
    } catch (err: any) {
      toast({ title: "Erro ao remover imagem", description: err.message, variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    if (!trip) return;
    const url = trip.slug 
      ? `${PUBLIC_DOMAIN}/c/${trip.slug}`
      : trip.share_token 
        ? `${PUBLIC_DOMAIN}/viagem/${trip.share_token}` 
        : '';
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "O link da carteira foi copiado." });
  };

  const handleCopyPassword = () => {
    if (!trip?.access_password) return;
    navigator.clipboard.writeText(trip.access_password);
    toast({ title: "Senha copiada!", description: "A senha foi copiada." });
  };

  const handleUpdatePassword = async () => {
    if (!id || !newPassword || newPassword.length < 4) {
      toast({ title: "Senha inválida", description: "A senha deve ter pelo menos 4 caracteres.", variant: "destructive" });
      return;
    }
    await updatePassword({ id, password: newPassword });
    setEditingPassword(false);
    setNewPassword("");
  };

  const handleRegeneratePassword = async () => {
    if (!id) return;
    await regeneratePassword(id);
  };

  const handleDeleteTrip = async () => {
    if (!id) return;
    await deleteTrip(id);
    navigate("/ferramentas-ia/trip-wallet");
  };

  const handleArchiveTrip = async () => {
    if (!id || !trip) return;
    const newStatus = trip.status === "archived" ? "active" : "archived";
    await updateTrip({ id, status: newStatus });
  };

  const handleGeneratePDF = async () => {
    if (trip) await generateTripPDF(trip, agentProfile, itineraryActivities as ItineraryActivityForPDF[], { mode: "authenticated" });
  };

  // Listing view
  if (!id) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="trip-wallet"
            title="Carteira Digital"
            subtitle="Organize vouchers, documentos e serviços das viagens"
            icon={Wallet}
          />
          <TripWalletList agencyName={agentProfile?.agency_name || undefined} />
        </div>
      </DashboardLayout>
    );
  }

  // Create new trip
  if (id === "nova") {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia/trip-wallet")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                Nova Carteira
              </h1>
              <p className="text-muted-foreground">Crie uma carteira digital para a viagem do cliente</p>
            </div>
          </div>
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Informações da Viagem</CardTitle></CardHeader>
            <CardContent>
              <TripForm onSubmit={handleCreateTrip} isLoading={isCreating} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Loading
  if (!trip) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const startDate = parseLocalDate(trip.start_date);
  const endDate = parseLocalDate(trip.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia/trip-wallet")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                {trip.client_name}
              </h1>
              <p className="text-muted-foreground">
                {trip.destination} • {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })} ({days} dias)
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsEditingTrip(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar Carteira
            </Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchiveTrip}>
              <Archive className="mr-2 h-4 w-4" /> {trip.status === "archived" ? "Reativar" : "Arquivar"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir carteira permanentemente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A carteira de <strong>{trip.client_name}</strong> será excluída permanentemente, incluindo todos os serviços, documentos e histórico. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTrip}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir Permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Edit Trip Form */}
        {isEditingTrip && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Editar Carteira</CardTitle>
            </CardHeader>
            <CardContent>
              <TripEditForm
                trip={trip}
                onSubmit={handleUpdateTrip}
                onCancel={() => setIsEditingTrip(false)}
                isLoading={isUpdating}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Services Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Serviços da Viagem</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedServiceType ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">
                      {editingService ? "Editar " : ""}{SERVICE_TYPE_LABELS[selectedServiceType]}
                    </h3>
                    <PassengerPoolProvider services={trip.services || []}>
                      <TripServiceForm
                        serviceType={selectedServiceType}
                        onSubmit={editingService ? handleUpdateService : handleAddService}
                        onCancel={handleCancelServiceForm}
                        isLoading={isAddingService || isUpdatingService || isUploading}
                        defaultValues={editingService?.service_data as any}
                        isEditing={!!editingService}
                      />
                    </PassengerPoolProvider>
                  </div>
                ) : (
                  <>
                    {/* AI Import banner */}
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-4 mt-2 flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">Importar serviço com IA</div>
                        <p className="text-xs text-muted-foreground">
                          Envie um voucher, confirmação, PDF, imagem ou texto para a IA preencher os dados do serviço automaticamente.
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setShowAIImport(true)}>
                        <Sparkles className="h-3.5 w-3.5 mr-1" /> Importar com IA
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6 mt-4">
                      {(Object.keys(SERVICE_TYPE_LABELS) as TripServiceType[]).map((type) => (
                        <Button key={type} variant="outline" size="sm" onClick={() => setSelectedServiceType(type)}>
                          <Plus className="mr-1 h-3 w-3" /> {SERVICE_TYPE_LABELS[type]}
                        </Button>
                      ))}
                    </div>
                    <TripServiceList
                      services={trip.services || []}
                      onDeleteService={deleteService}
                      onEditService={handleEditService}
                      onReplaceVoucher={handleReplaceVoucher}
                      onRemoveVoucher={removeVoucher}
                      onAddAttachment={handleAddAttachment}
                      onRemoveAttachment={handleRemoveAttachment}
                      onUploadServiceImage={handleUploadServiceImage}
                      onRemoveServiceImage={handleRemoveServiceImage}
                      groupByType={false}
                      onReorder={(orderedIds) => reorderServices(orderedIds)}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Day by Day Itinerary */}
            <TripItinerary
              tripId={trip.id}
              destination={trip.destination}
              startDate={trip.start_date}
              endDate={trip.end_date}
              services={trip.services || []}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Access Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Acesso do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trip.is_locked ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="text-xs text-destructive space-y-1">
                        <p className="font-semibold">Acesso bloqueado por segurança</p>
                        <p className="text-destructive/90">
                          O cliente errou a senha 3 vezes e o acesso público foi bloqueado automaticamente.
                          Desbloqueie abaixo (mantendo a senha atual) ou regenere uma nova senha.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full h-8 text-xs"
                      onClick={async () => {
                        await unlockTrip(trip.id);
                      }}
                    >
                      <Unlock className="mr-1 h-3 w-3" /> Desbloquear acesso
                    </Button>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Senha de acesso</p>
                  {editingPassword ? (
                    <div className="flex gap-2">
                      <Input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nova senha"
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="outline" className="h-8" onClick={handleUpdatePassword}>Salvar</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditingPassword(false); setNewPassword(""); }}>✕</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono flex-1">
                        {showPassword ? trip.access_password : "••••••"}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyPassword}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditingPassword(true)}>
                      Editar senha
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleRegeneratePassword}>
                      <RefreshCw className="mr-1 h-3 w-3" /> Regenerar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-1">Compartilhar</p>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowShareModal(true)}>
                    <Share2 className="mr-2 h-3 w-3" /> Link, QR Code e Senha
                  </Button>
                  {trip.slug && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      /c/{trip.slug}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{trip.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destino</span>
                  <span className="font-medium">{trip.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período</span>
                  <span className="font-medium">{days} dias</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviços</span>
                  <span className="font-medium">{trip.services?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documentos</span>
                  <span className="font-medium">{trip.services?.filter(s => s.voucher_url).length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{trip.status === "archived" ? "Arquivada" : "Ativa"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Edit History */}
            <TripEditHistory history={editHistory} />
          </div>
        </div>

        {/* Share Modal */}
        <ShareTripModal trip={trip} agencyName={agentProfile?.agency_name || undefined} open={showShareModal} onOpenChange={setShowShareModal} />
      </div>
    </DashboardLayout>
  );
}
