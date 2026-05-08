import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, FileText, Copy, Loader2, Wallet, Lock, RefreshCw, Eye, EyeOff, Pencil, Archive, Trash2, Share2, ShieldAlert, Unlock, Check, X, Upload, Camera } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Sparkles, FileText as FileTextIcon } from "lucide-react";
import { ImportQuoteIntoWalletDialog } from "@/components/trip/ImportQuoteIntoWalletDialog";
import { ClientSelector } from "@/components/shared/ClientSelector";
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
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const editingService = editingServiceId
    ? trip?.services?.find((s) => s.id === editingServiceId) ?? null
    : null;
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [showImportQuote, setShowImportQuote] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  const openServicesAccordion = () => {
    setAccordionValue((prev) => (prev.includes("services") ? prev : [...prev, "services"]));
    setTimeout(() => {
      document.getElementById("trip-services-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  // Inline edit state for the Resumo block
  const [editingField, setEditingField] = useState<null | "client_name" | "trip_title" | "destination" | "start_date" | "end_date" | "status">(null);
  const [fieldDraft, setFieldDraft] = useState<string>("");

  const startEditField = (field: typeof editingField, currentValue: string) => {
    setEditingField(field);
    setFieldDraft(currentValue ?? "");
  };

  const cancelEditField = () => {
    setEditingField(null);
    setFieldDraft("");
  };

  const saveEditField = async () => {
    if (!id || !editingField) return;
    const val = fieldDraft.trim();
    if (editingField !== "status" && !val) return;
    await updateTrip({ id, [editingField]: val } as any);
    setEditingField(null);
    setFieldDraft("");
  };

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
    setEditingServiceId(service.id);
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
      setEditingServiceId(null);
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
    setEditingServiceId(null);
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
            <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
              <FileText className="mr-2 h-4 w-4" /> Gerar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar link
            </Button>
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

        <Accordion type="multiple" className="space-y-3" value={accordionValue} onValueChange={(v) => setAccordionValue(v as string[])}>
          {/* 1. Serviços da Viagem */}
          <AccordionItem value="services" id="trip-services-section" className="border border-border rounded-lg overflow-hidden bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
              <span className="text-base font-semibold">Serviços da Viagem</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {selectedServiceType && !editingService ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">{SERVICE_TYPE_LABELS[selectedServiceType]}</h3>
                    <PassengerPoolProvider services={trip.services || []}>
                      <TripServiceForm
                        serviceType={selectedServiceType}
                        onSubmit={handleAddService}
                        onCancel={handleCancelServiceForm}
                        isLoading={isAddingService || isUpdatingService || isUploading}
                      />
                    </PassengerPoolProvider>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6 mt-4">
                      {(Object.keys(SERVICE_TYPE_LABELS) as TripServiceType[]).map((type) => (
                        <Button key={type} variant="outline" size="sm" onClick={() => setSelectedServiceType(type)}>
                          <Plus className="mr-1 h-3 w-3" /> {SERVICE_TYPE_LABELS[type]}
                        </Button>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => setShowImportQuote(true)}>
                        <FileTextIcon className="mr-1 h-3 w-3" /> Importar orçamento
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAIImport(true)}>
                        <Sparkles className="mr-1 h-3 w-3" /> Importar com IA
                      </Button>
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
            </AccordionContent>
          </AccordionItem>

          {/* Edit Service Dialog */}
          <Dialog open={!!editingService && !!selectedServiceType} onOpenChange={(open) => { if (!open) handleCancelServiceForm(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Editar {selectedServiceType ? SERVICE_TYPE_LABELS[selectedServiceType] : "Serviço"}
                </DialogTitle>
              </DialogHeader>
              {editingService && selectedServiceType && (
                <div className="space-y-4">
                  <PassengerPoolProvider services={trip.services || []}>
                    <TripServiceForm
                      serviceType={selectedServiceType}
                      onSubmit={handleUpdateService}
                      onCancel={handleCancelServiceForm}
                      isLoading={isAddingService || isUpdatingService || isUploading}
                      defaultValues={editingService.service_data as any}
                      isEditing={true}
                      imageSlot={
                        <div className="space-y-2">
                          {editingService.image_url && /^https?:\/\//i.test(editingService.image_url) && (
                            <div className="relative overflow-hidden rounded-md bg-muted flex items-center justify-center">
                              <img
                                src={editingService.image_url}
                                alt="Imagem do serviço"
                                className="w-full max-h-48 object-contain"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100"
                                onClick={() => handleRemoveServiceImage(editingService.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <label className="inline-flex">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadServiceImage(editingService.id, file);
                                e.target.value = "";
                              }}
                            />
                            <Button type="button" variant="outline" size="sm" asChild>
                              <span className="cursor-pointer">
                                <Camera className="h-3.5 w-3.5 mr-1" /> {editingService.image_url ? "Trocar Imagem" : "Adicionar Imagem"}
                              </span>
                            </Button>
                          </label>
                        </div>
                      }
                    />
                  </PassengerPoolProvider>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 2. Roteiro dia a dia */}
          <AccordionItem value="itinerary" className="border border-border rounded-lg overflow-hidden bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
              <span className="text-base font-semibold">Roteiro dia a dia</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <TripItinerary
                tripId={trip.id}
                destination={trip.destination}
                startDate={trip.start_date}
                endDate={trip.end_date}
                services={trip.services || []}
                onRequestAddService={openServicesAccordion}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 3. Acesso do Cliente */}
          <AccordionItem value="access" className="border border-border rounded-lg overflow-hidden bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
              <span className="text-base font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" /> Acesso do Cliente
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyPassword} title="Copiar senha">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingPassword(true)} title="Editar senha">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRegeneratePassword} title="Regenerar senha">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-1">Compartilhar</p>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowShareModal(true)}>
                    <Share2 className="mr-2 h-3 w-3" /> Compartilhar
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Resumo */}
          <AccordionItem value="summary" className="border border-border rounded-lg overflow-hidden bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
              <span className="text-base font-semibold">Resumo</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2 text-sm">
                {/* Cliente — editável */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Cliente:</span>
                  {editingField === "client_name" ? (
                    <>
                      <div className="flex-1 min-w-[200px]">
                        <ClientSelector
                          value={(trip as any).client_id ? { id: (trip as any).client_id, name: trip.client_name } : null}
                          onChange={async (c) => {
                            if (!c) return;
                            await updateTrip({ id: trip.id, client_name: c.name, client_id: c.id } as any);
                            cancelEditField();
                          }}
                          required
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditField} title="Fechar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{trip.client_name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditField("client_name", trip.client_name)} title="Editar cliente">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Título da viagem (opcional) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Título:</span>
                  {editingField === "trip_title" ? (
                    <>
                      <Input
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditField(); if (e.key === "Escape") cancelEditField(); }}
                        className="h-7 text-sm flex-1 min-w-[200px]"
                        placeholder="Título da viagem (opcional)"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEditField} disabled={isUpdating} title="Salvar">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditField} title="Cancelar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => startEditField("trip_title", (trip as any).trip_title || "")}
                      >
                        {(trip as any).trip_title || <span className="text-muted-foreground italic font-normal">Adicionar título</span>}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditField("trip_title", (trip as any).trip_title || "")} title="Editar título">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Destino — editável */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Destino:</span>
                  {editingField === "destination" ? (
                    <>
                      <Input
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditField(); if (e.key === "Escape") cancelEditField(); }}
                        className="h-7 text-sm flex-1 min-w-[160px]"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEditField} disabled={isUpdating} title="Salvar">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditField} title="Cancelar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{trip.destination}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditField("destination", trip.destination)} title="Editar destino">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Período — editáveis (data início + fim) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Período:</span>
                  {editingField === "start_date" ? (
                    <>
                      <Input
                        type="date"
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditField(); if (e.key === "Escape") cancelEditField(); }}
                        className="h-7 text-sm w-[160px]"
                        autoFocus
                      />
                      <span className="text-muted-foreground">a</span>
                      <span className="font-medium">{format(endDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEditField} disabled={isUpdating} title="Salvar">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditField} title="Cancelar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : editingField === "end_date" ? (
                    <>
                      <span className="font-medium">{format(startDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="date"
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditField(); if (e.key === "Escape") cancelEditField(); }}
                        className="h-7 text-sm w-[160px]"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEditField} disabled={isUpdating} title="Salvar">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditField} title="Cancelar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">
                        {format(startDate, "dd/MM/yyyy", { locale: ptBR })} a {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-muted-foreground">({days} dias)</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditField("start_date", trip.start_date)} title="Editar data de início">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditField("end_date", trip.end_date)} title="Editar data de fim">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Serviços — somente leitura (calculado) */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Serviços:</span>
                  <span className="font-medium">{trip.services?.length || 0}</span>
                </div>

                {/* Documentos — somente leitura (calculado) */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Documentos:</span>
                  <span className="font-medium">{trip.services?.filter(s => s.voucher_url).length || 0}</span>
                </div>

                {/* Status — toggle editável */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Status:</span>
                  {editingField === "status" ? (
                    <>
                      <select
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        className="h-7 text-sm rounded border border-input bg-background px-2"
                        autoFocus
                      >
                        <option value="active">Ativa</option>
                        <option value="archived">Arquivada</option>
                      </select>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEditField} disabled={isUpdating} title="Salvar">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditField} title="Cancelar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{trip.status === "archived" ? "Arquivada" : "Ativa"}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditField("status", trip.status)} title="Editar status">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Histórico de Alterações */}
          <AccordionItem value="history" className="border border-border rounded-lg overflow-hidden bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
              <span className="text-base font-semibold">Histórico de Alterações</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <TripEditHistory history={editHistory} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Share Modal */}
        <ShareTripModal trip={trip} agencyName={agentProfile?.agency_name || undefined} open={showShareModal} onOpenChange={setShowShareModal} />

        {/* AI Import Modal */}
        <AIImportServiceModal
          open={showAIImport}
          onOpenChange={setShowAIImport}
          onImport={handleAIImport}
        />
        <ImportQuoteIntoWalletDialog
          open={showImportQuote}
          onOpenChange={setShowImportQuote}
          tripId={trip.id}
          currentServiceCount={trip.services?.length || 0}
        />
      </div>
    </DashboardLayout>
  );
}
