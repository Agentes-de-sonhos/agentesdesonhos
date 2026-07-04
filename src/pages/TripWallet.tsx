import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, FileText, Copy, Loader2, Wallet, Lock, RefreshCw, Eye, EyeOff, Pencil, Archive, Trash2, Share2, ShieldAlert, Unlock, Check, X, Upload, Camera, Image as ImageIcon, Map as MapIcon, Plane, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, TramFront, Package, ClipboardSignature, History, UserCircle2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Search, Globe2 } from "lucide-react";
import { parseDestinationParts } from "@/lib/destination-parts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceFormHeader } from "@/components/quote/ServiceModeChooser";
import type { ServiceType as QuoteServiceType } from "@/types/quote";
const toQuoteServiceType = (t: string): QuoteServiceType =>
  (t === "train" ? "rail_transport" : t) as QuoteServiceType;
import { TripItineraryV2 } from "@/components/wallet/TripItineraryV2";
import { LegacyItinerarySection } from "@/components/wallet/LegacyItinerarySection";
import { TripForm } from "@/components/trip/TripForm";
import { TripServiceForm } from "@/components/trip/TripServiceForms";
import { GoogleHotelPhotos } from "@/components/shared/GoogleHotelPhotos";
import { PassengerPoolProvider } from "@/components/trip/PassengerPoolContext";
import { TravelImporter } from "@/components/trip/TravelImporter";
import { TripServiceList } from "@/components/trip/TripServiceCard";
import { TripWalletList } from "@/components/trip/TripWalletList";
import { TripEditForm } from "@/components/trip/TripEditForm";
import { DocumentSignatureCard } from "@/components/quote/QuoteSignatureCard";
import { TripEditHistory } from "@/components/trip/TripEditHistory";
import { generateTripPDF, type ItineraryActivityForPDF } from "@/components/trip/TripPDF";
import { useItineraryActivities } from "@/hooks/useItineraryActivities";
import { ShareTripModal } from "@/components/trip/ShareTripModal";
import { AIImportServiceModal, type AIImportResult } from "@/components/shared/AIImportServiceModal";
import { FileText as FileTextIcon } from "lucide-react";
import { ImportQuoteIntoWalletDialog } from "@/components/trip/ImportQuoteIntoWalletDialog";
import { ImportQuoteAsNewWalletDialog } from "@/components/trip/ImportQuoteAsNewWalletDialog";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { SupplierSelector, type SupplierSelectorValue } from "@/components/financial/SupplierSelector";
import { useTrips, useTrip } from "@/hooks/useTrips";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentProfile, AgentProfile } from "@/hooks/useAgentProfile";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

const TRIP_CATEGORIES: Array<{ type: TripServiceType; title: string; icon: any; color: string; iconColor: string }> = [
  { type: "flight",     title: "Passagem Aérea", icon: Plane,          color: "bg-sky-100 text-sky-700",         iconColor: "text-sky-500" },
  { type: "hotel",      title: "Hospedagem",      icon: Hotel,          color: "bg-amber-100 text-amber-700",     iconColor: "text-amber-500" },
  { type: "car_rental", title: "Locação",         icon: Car,            color: "bg-emerald-100 text-emerald-700", iconColor: "text-emerald-500" },
  { type: "transfer",   title: "Transfer",        icon: ArrowRightLeft, color: "bg-indigo-100 text-indigo-700",   iconColor: "text-indigo-500" },
  { type: "attraction", title: "Ingressos",       icon: Ticket,         color: "bg-pink-100 text-pink-700",       iconColor: "text-pink-500" },
  { type: "insurance",  title: "Seguro",          icon: Shield,         color: "bg-rose-100 text-rose-700",       iconColor: "text-rose-500" },
  { type: "cruise",     title: "Cruzeiro",        icon: Ship,           color: "bg-cyan-100 text-cyan-700",       iconColor: "text-cyan-500" },
  { type: "train",      title: "Trem",            icon: TramFront,      color: "bg-teal-100 text-teal-700",       iconColor: "text-teal-500" },
  { type: "other",      title: "Outros",          icon: Package,        color: "bg-slate-100 text-slate-700",     iconColor: "text-slate-500" },
];

function TripServiceCategoryGrid({
  services,
  onSelect,
  onImportQuote,
}: {
  services: TripService[];
  onSelect: (type: TripServiceType) => void;
  onImportQuote: () => void;
}) {
  const countByType = services.reduce<Record<string, number>>((acc, s) => {
    acc[s.service_type] = (acc[s.service_type] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="grid gap-3 w-full" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
      {TRIP_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const count = countByType[cat.type] || 0;
        return (
          <button
            key={cat.type}
            type="button"
            onClick={() => onSelect(cat.type)}
            aria-label={`Adicionar ${cat.title}`}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border",
              cat.color,
              "border-transparent hover:scale-[1.02] hover:shadow-md hover:border-border/60",
            )}
          >
            <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-foreground/70 shadow-sm opacity-80 group-hover:opacity-100">
              <Plus className="h-3 w-3" />
            </span>
            {count > 0 && (
              <span className="absolute top-2 left-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[10px] font-semibold shadow-sm">
                {count}
              </span>
            )}
            <Icon className={cn("h-6 w-6", cat.iconColor)} />
            <span className="text-center leading-tight px-1">{cat.title}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onImportQuote}
        aria-label="Importar orçamento"
        className={cn(
          "group relative flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border",
          "bg-gradient-to-br from-fuchsia-100 to-fuchsia-50 text-fuchsia-700",
          "border-transparent hover:scale-[1.02] hover:shadow-md hover:border-border/60",
        )}
      >
        <FileTextIcon className="h-6 w-6 text-fuchsia-500" />
        <span className="text-center leading-tight px-1">Importar orçamento</span>
      </button>
    </div>
  );
}

function WalletCoverPicker({
  trip,
  onChange,
  isSaving,
}: {
  trip: any;
  onChange: (url: string | null) => void | Promise<void>;
  isSaving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current: string | null = trip?.wallet_cover_url || null;
  const serviceCandidates: string[] = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of (trip?.services || []) as TripService[]) {
      const all = [s.image_url, ...((s as any).image_urls || [])].filter(
        (u): u is string => typeof u === "string" && !!u
      );
      for (const u of all) {
        if (!seen.has(u)) { seen.add(u); out.push(u); }
      }
    }
    return out;
  })();

  const destinationParts = parseDestinationParts(trip?.destination);
  const initialQuery = destinationParts[0] || trip?.destination || "";
  const [query, setQuery] = useState<string>(initialQuery);
  const [searchInput, setSearchInput] = useState<string>(initialQuery);
  const [internetPhotos, setInternetPhotos] = useState<Array<{ photo_url: string; thumb_url: string; source: string }>>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const photoCache = useState(() => new Map<string, Array<{ photo_url: string; thumb_url: string; source: string }>>())[0];

  const runInternetSearch = async (term: string) => {
    const q = (term || "").trim();
    if (q.length < 2) return;
    setQuery(q);
    if (photoCache.has(q)) {
      setInternetPhotos(photoCache.get(q)!);
      return;
    }
    setLoadingPhotos(true);
    setInternetPhotos([]);
    try {
      const { data, error } = await supabase.functions.invoke("activity-photo", {
        body: { query: q, destination: q, limit: 18 },
      });
      if (error) throw error;
      const list = (data?.photos ?? []) as Array<{ photo_url: string; thumb_url: string; source: string }>;
      photoCache.set(q, list);
      setInternetPhotos(list);
    } catch (e) {
      console.warn("cover internet search failed", e);
      setInternetPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Auto-run initial search when opening
  useEffect(() => {
    if (open && initialQuery) {
      setSearchInput(initialQuery);
      runInternetSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-muted-foreground">Foto de capa:</span>
      {current ? (
        <img
          src={current}
          alt="Foto de capa atual"
          className="h-10 w-16 rounded-md object-cover border"
        />
      ) : (
        <span className="text-muted-foreground italic font-normal">Automática</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <ImageIcon className="h-3.5 w-3.5 mr-1" />
        {current ? "Trocar" : "Escolher"}
      </Button>
      {current && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => onChange(null)}
          disabled={isSaving}
        >
          Remover
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escolher foto de capa</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            A foto selecionada aparece como capa principal da Carteira Digital pública.
            Busque imagens panorâmicas do destino ou escolha uma foto já adicionada aos serviços.
          </p>

          {/* Search bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); runInternetSearch(searchInput); }}
            className="flex gap-2"
          >
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ex: Florença, Coliseu, Duomo de Florença…"
            />
            <Button type="submit" size="sm" disabled={loadingPhotos} className="gap-1.5">
              {loadingPhotos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Buscar
            </Button>
          </form>

          {/* Suggestion chips from destination parts */}
          {destinationParts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-muted-foreground self-center mr-1">Sugestões:</span>
              {destinationParts.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => { setSearchInput(part); runInternetSearch(part); }}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition",
                    query.toLowerCase() === part.toLowerCase()
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 hover:bg-muted text-foreground border-border"
                  )}
                >
                  {part}
                </button>
              ))}
            </div>
          )}

          {/* Automática */}
          <button
            type="button"
            onClick={async () => { await onChange(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm hover:bg-muted/40 transition",
              !current && "border-primary ring-2 ring-primary"
            )}
          >
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">Automática</div>
              <div className="text-xs text-muted-foreground">Usar a foto sugerida pelo destino.</div>
            </div>
          </button>

          {/* Internet photo grid */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              Imagens da internet {query ? `— "${query}"` : ""}
            </div>
            {loadingPhotos && internetPhotos.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : internetPhotos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                Nenhuma foto encontrada. Tente refinar a busca.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {internetPhotos.map((p) => {
                  const selected = current === p.photo_url;
                  return (
                    <button
                      key={p.photo_url}
                      type="button"
                      onClick={async () => { await onChange(p.photo_url); setOpen(false); }}
                      className={cn(
                        "relative aspect-[16/10] rounded-lg overflow-hidden border bg-muted transition",
                        selected ? "border-primary ring-2 ring-primary" : "hover:opacity-90"
                      )}
                    >
                      <img
                        src={p.thumb_url || p.photo_url}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1 text-[9px] uppercase tracking-wider bg-black/55 text-white rounded px-1 py-0.5">
                        {p.source.replace("_", " ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Photos from trip services */}
          {serviceCandidates.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">
                Fotos dos serviços da viagem
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {serviceCandidates.map((url) => {
                  const selected = current === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={async () => { await onChange(url); setOpen(false); }}
                      className={cn(
                        "relative aspect-[16/10] rounded-lg overflow-hidden border bg-muted transition",
                        selected ? "border-primary ring-2 ring-primary" : "hover:opacity-90"
                      )}
                    >
                      <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  const location = useLocation();
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
  // Hotel autocomplete / gallery state for ADD flow
  const [addPlaceId, setAddPlaceId] = useState<string | null>(null);
  const [addImageUrls, setAddImageUrls] = useState<string[]>([]);
  // Supplier (tour_operators) link for the ADD flow
  const [addSupplier, setAddSupplier] = useState<SupplierSelectorValue>({ operator_id: null, supplier_name: "" });
  // Supplier confirmation flow (asked AFTER first save when nothing was provided)
  const [confirmSupplierOpen, setConfirmSupplierOpen] = useState(false);
  const [confirmLinkMode, setConfirmLinkMode] = useState(false);
  const [pendingSupplier, setPendingSupplier] = useState<SupplierSelectorValue>({ operator_id: null, supplier_name: "" });
  const pendingAddPayloadRef = useRef<{ serviceData: any; files?: File[] } | null>(null);
  // Hotel place id for EDIT flow (mirrors DB and is updated when user picks new prediction)
  const [editPlaceId, setEditPlaceId] = useState<string | null>(null);
  // Supplier (tour_operators) link for the EDIT flow
  const [editSupplier, setEditSupplier] = useState<SupplierSelectorValue>({ operator_id: null, supplier_name: "" });
  const editingService = editingServiceId
    ? trip?.services?.find((s) => s.id === editingServiceId) ?? null
    : null;
  useEffect(() => {
    setEditPlaceId(editingService?.place_id ?? null);
    const sd = (editingService?.service_data as any) || {};
    setEditSupplier({
      operator_id: sd?.supplier_operator_id ?? null,
      supplier_name: sd?.supplier_name ?? "",
    });
  }, [editingServiceId, editingService?.place_id]);
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
  const [showImportQuoteAsNew, setShowImportQuoteAsNew] = useState(false);
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
    if (editingField !== "status" && editingField !== "trip_title" && !val) return;
    await updateTrip({ id, [editingField]: editingField === "trip_title" ? (val || null) : val } as any);
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
    // Register event in opportunity timeline when created from CRM
    if (data.opportunity_id) {
      try {
        await supabase.from("opportunity_history").insert({
          opportunity_id: data.opportunity_id,
          to_stage: "Carteira digital criada",
          notes: `Carteira "${data.client_name} • ${data.destination}" criada.`,
        } as any);
      } catch { /* non-fatal */ }
    }
    navigate(`/ferramentas-ia/trip-wallet/${newTrip.id}`, { replace: true });
  };

  const handleUpdateTrip = async (data: { client_name: string; destination: string; start_date: string; end_date: string; status: string }) => {
    if (!id) return;
    await updateTrip({ id, ...data });
    setIsEditingTrip(false);
  };

  // Persist a brand-new service. Supplier is asked AFTER the user fills the form.
  const persistNewService = async (
    serviceData: any,
    files: File[] | undefined,
    supplier: SupplierSelectorValue,
  ) => {
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
      const mergedServiceData = {
        ...(serviceData || {}),
        ...(supplier.operator_id ? { supplier_operator_id: supplier.operator_id } : {}),
        ...(supplier.supplier_name ? { supplier_name: supplier.supplier_name } : {}),
      };
      await addService({
        service_type: selectedServiceType,
        service_data: mergedServiceData,
        voucher_url: attachments[0]?.url,
        voucher_name: attachments[0]?.name,
        attachments,
        image_urls: addImageUrls,
        place_id: addPlaceId,
      });
      setSelectedServiceType(null);
      setAddPlaceId(null);
      setAddImageUrls([]);
      setAddSupplier({ operator_id: null, supplier_name: "" });
    } finally {
      setIsUploading(false);
    }
  };

  // Called when TripServiceForm submits (Add flow). Ask the supplier question
  // ONLY now — never up-front. If something was already typed (rare, since the
  // selector is hidden), skip the prompt.
  const handleAddService = async (serviceData: any, files?: File[]) => {
    if (!selectedServiceType) return;
    const hasSupplier = Boolean(addSupplier.operator_id || (addSupplier.supplier_name || "").trim());
    if (hasSupplier) {
      await persistNewService(serviceData, files, addSupplier);
      return;
    }
    pendingAddPayloadRef.current = { serviceData, files };
    setPendingSupplier({ operator_id: null, supplier_name: "" });
    setConfirmLinkMode(false);
    setConfirmSupplierOpen(true);
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
      const mergedServiceData = {
        ...(serviceData || {}),
        supplier_operator_id: editSupplier.operator_id ?? null,
        ...(editSupplier.supplier_name
          ? { supplier_name: editSupplier.supplier_name }
          : { supplier_name: null }),
      };
      await updateService({
        serviceId: editingService.id,
        service_data: mergedServiceData,
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
    setAddPlaceId(null);
    setAddImageUrls([]);
    setEditPlaceId(null);
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
      if (!user?.id) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        return;
      }
      const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/trip-services/${id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("quote-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("quote-images").getPublicUrl(path);
      const service = trip?.services?.find(s => s.id === serviceId);
      const current = service?.image_urls || [];
      const next = [...current, urlData.publicUrl];
      await supabase
        .from("trip_services")
        .update({ image_urls: next })
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
      await supabase.from("trip_services").update({ image_url: null, image_urls: [] }).eq("id", serviceId);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast({ title: "Imagens removidas" });
    } catch (err: any) {
      toast({ title: "Erro ao remover imagens", description: err.message, variant: "destructive" });
    }
  };

  const handleAddServiceImageUrls = async (serviceId: string, urls: string[]) => {
    if (urls.length === 0) return;
    try {
      const service = trip?.services?.find(s => s.id === serviceId);
      const current = service?.image_urls || [];
      const next = [...current, ...urls.filter(u => !current.includes(u))];
      await supabase.from("trip_services").update({ image_urls: next }).eq("id", serviceId);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast({ title: "Fotos adicionadas" });
    } catch (err: any) {
      toast({ title: "Erro ao adicionar fotos", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveServiceImageAt = async (serviceId: string, index: number) => {
    try {
      const service = trip?.services?.find(s => s.id === serviceId);
      const current = service?.image_urls || [];
      const next = current.filter((_, i) => i !== index);
      await supabase.from("trip_services").update({ image_urls: next }).eq("id", serviceId);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
    } catch (err: any) {
      toast({ title: "Erro ao remover foto", description: err.message, variant: "destructive" });
    }
  };

  const handleEditPlaceIdChange = async (serviceId: string, newPlaceId: string | null) => {
    setEditPlaceId(newPlaceId);
    try {
      await supabase.from("trip_services").update({ place_id: newPlaceId }).eq("id", serviceId);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
    } catch {}
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
    const activeTab = (location.hash === "#list" ? "list" : "create") as "create" | "list";
    const setActiveTab = (val: "create" | "list") => {
      navigate({ pathname: location.pathname, hash: val === "list" ? "#list" : "" }, { replace: true });
    };

    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="trip-wallet"
            title="Carteira Digital"
            subtitle="Organize vouchers, documentos e serviços das viagens"
            icon={Wallet}
          />
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "list")} className="w-full">
            <div className="flex items-end justify-between gap-4 border-b border-border/60">
              <TabsList className="h-auto bg-transparent p-0 gap-6 rounded-none justify-start">
                <TabsTrigger
                  value="create"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  Nova Carteira
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  <span className="flex items-center gap-2">
                    Minhas Carteiras
                  </span>
                </TabsTrigger>
              </TabsList>

              {activeTab === "list" && (
                <Button
                  size="sm"
                  onClick={() => setActiveTab("create")}
                  className="mb-2 h-9 rounded-lg px-3.5 text-sm shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Nova Carteira
                </Button>
              )}
            </div>

            <TabsContent value="create" className="mt-5">
              <Card className="max-w-3xl rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Informações da Viagem
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preencha os dados iniciais para criar uma carteira digital.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <TripForm
                    onSubmit={handleCreateTrip}
                    isLoading={isCreating}
                    defaultValues={(() => {
                      const s = (location.state as {
                        opportunity_id?: string;
                        client_id?: string;
                        client_name?: string;
                        destination?: string;
                        start_date?: string | null;
                        end_date?: string | null;
                      } | null) || null;
                      if (!s) return undefined;
                      return {
                        client_id: s.client_id,
                        client_name: s.client_name || "",
                        destination: s.destination || "",
                        start_date: s.start_date || "",
                        end_date: s.end_date || "",
                        opportunity_id: s.opportunity_id || null,
                      };
                    })()}
                  />
                  <div className="mt-6 pt-6 border-t flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground">ou aproveite informações já cadastradas</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full h-10 rounded-lg"
                      onClick={() => setShowImportQuoteAsNew(true)}
                    >
                      <FileTextIcon className="h-4 w-4 mr-2" />
                      Importar de um Orçamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="mt-5">
              <TripWalletList agencyName={agentProfile?.agency_name || undefined} />
            </TabsContent>
          </Tabs>
        </div>
        <ImportQuoteAsNewWalletDialog
          open={showImportQuoteAsNew}
          onOpenChange={setShowImportQuoteAsNew}
        />
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
              <TripForm
                onSubmit={handleCreateTrip}
                isLoading={isCreating}
                defaultValues={(() => {
                  const s = (location.state as {
                    opportunity_id?: string;
                    client_id?: string;
                    client_name?: string;
                    destination?: string;
                    start_date?: string | null;
                    end_date?: string | null;
                  } | null) || null;
                  if (!s) return undefined;
                  return {
                    client_id: s.client_id,
                    client_name: s.client_name || "",
                    destination: s.destination || "",
                    start_date: s.start_date || "",
                    end_date: s.end_date || "",
                    opportunity_id: s.opportunity_id || null,
                  };
                })()}
              />
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

        {/* Adicionar Serviços — botões sempre visíveis (padrão Orçamentos) */}
        <Card className="shadow-card">
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="w-fit">
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-sky-500" />
                Adicionar Serviços
              </h2>
              <div className="mt-2 h-1 w-full rounded-full bg-sky-500" />
            </div>
            <TripServiceCategoryGrid
              services={trip.services || []}
              onSelect={(type) => setSelectedServiceType(type)}
              onImportQuote={() => setShowImportQuote(true)}
            />
          </CardContent>
        </Card>

        <Accordion type="multiple" className="grid gap-4 sm:gap-6" value={accordionValue} onValueChange={(v) => setAccordionValue(v as string[])}>
          {/* 1. Serviços Incluídos — apenas listagem/edição */}
          <AccordionItem value="services" id="trip-services-section" className="border-0 rounded-lg overflow-hidden bg-card shadow-card">
            <AccordionTrigger className="px-5 sm:px-6 pt-5 pb-4 hover:no-underline">
              <div className="w-fit">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  Serviços Incluídos
                  {trip.services && trip.services.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">{trip.services.length}</Badge>
                  )}
                </h2>
                <div className="mt-2 h-1 w-full rounded-full bg-emerald-500" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 sm:px-6 pb-5 pt-0">
              {(!trip.services || trip.services.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum serviço adicionado ainda. Use a área acima para adicionar.
                </p>
              ) : (
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
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Add Service Dialog */}
          <Dialog open={!!selectedServiceType && !editingService} onOpenChange={(open) => { if (!open) handleCancelServiceForm(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card">
              <DialogHeader className="sr-only">
                <DialogTitle>
                  Adicionar {selectedServiceType ? SERVICE_TYPE_LABELS[selectedServiceType] : "Serviço"}
                </DialogTitle>
              </DialogHeader>
              {selectedServiceType && !editingService && (
                <ServiceFormHeader serviceType={toQuoteServiceType(selectedServiceType)} />
              )}
              {selectedServiceType && !editingService && (
                <div className="space-y-4">
                  <PassengerPoolProvider services={trip.services || []}>
                    <TripServiceForm
                      serviceType={selectedServiceType}
                      onSubmit={handleAddService}
                      onCancel={handleCancelServiceForm}
                      isLoading={isAddingService || isUpdatingService || isUploading}
                      placeId={addPlaceId}
                      onPlaceIdChange={setAddPlaceId}
                      googlePhotoSlot={
                        ["hotel","attraction","transfer","car_rental","cruise"].includes(selectedServiceType) ? (
                          <GoogleHotelPhotos
                            placeId={addPlaceId}
                            existingUrls={addImageUrls}
                            loadingLabel={`Buscando fotos do Google...`}
                            headingLabel="Fotos do Google"
                            autoShow
                            onPhotosSelected={(urls) => setAddImageUrls(prev => [...prev, ...urls.filter(u => !prev.includes(u))])}
                            onPhotoRemoved={(url) => setAddImageUrls(prev => prev.filter(u => u !== url))}
                          />
                        ) : null
                      }
                    />
                  </PassengerPoolProvider>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Service Dialog */}
          <Dialog open={!!editingService && !!selectedServiceType} onOpenChange={(open) => { if (!open) handleCancelServiceForm(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card">
              <DialogHeader className="sr-only">
                <DialogTitle>
                  Editar {selectedServiceType ? SERVICE_TYPE_LABELS[selectedServiceType] : "Serviço"}
                </DialogTitle>
              </DialogHeader>
              {editingService && selectedServiceType && (
                <ServiceFormHeader
                  serviceType={toQuoteServiceType(selectedServiceType)}
                  subtitle={`Edite os dados de ${SERVICE_TYPE_LABELS[selectedServiceType].toLowerCase()}.`}
                />
              )}
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
                      placeId={editPlaceId}
                      onPlaceIdChange={(pid) => handleEditPlaceIdChange(editingService.id, pid)}
                      googlePhotoSlot={
                        ["hotel","attraction","transfer","car_rental","cruise"].includes(selectedServiceType) ? (
                          <GoogleHotelPhotos
                            placeId={editPlaceId}
                            existingUrls={editingService.image_urls || []}
                            loadingLabel={`Buscando fotos do Google...`}
                            headingLabel="Fotos do Google"
                            autoShow
                            onPhotosSelected={(urls) => handleAddServiceImageUrls(editingService.id, urls)}
                            onPhotoRemoved={async (url) => {
                              const current = editingService.image_urls || [];
                              const idx = current.indexOf(url);
                              if (idx >= 0) await handleRemoveServiceImageAt(editingService.id, idx);
                            }}
                          />
                        ) : null
                      }
                      imageSlot={
                        <div className="space-y-2">
                          {(() => {
                            if (editPlaceId) return null;
                            const gallery = (editingService.image_urls && editingService.image_urls.length > 0)
                              ? editingService.image_urls
                              : (editingService.image_url ? [editingService.image_url] : []);
                            if (gallery.length === 0) return null;
                            return (
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {gallery.map((url, i) => (
                                  <div key={i} className="relative shrink-0">
                                    <img src={url} alt={`Foto ${i+1}`} className="h-24 w-32 object-cover rounded-md border" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editingService.image_urls && editingService.image_urls.length > 0) {
                                          handleRemoveServiceImageAt(editingService.id, i);
                                        } else {
                                          handleRemoveServiceImage(editingService.id);
                                        }
                                      }}
                                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-90 hover:opacity-100"
                                      aria-label="Remover foto"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
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
                                <Camera className="h-3.5 w-3.5 mr-1" /> Adicionar foto manual
                              </span>
                            </Button>
                          </label>
                        </div>
                      }
                    />
                  </PassengerPoolProvider>
                  {/* Fornecedor — última seção do formulário de edição */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-semibold">Fornecedor</label>
                    </div>
                    <SupplierSelector value={editSupplier} onChange={setEditSupplier} />
                    <p className="text-xs text-muted-foreground">
                      Selecione um fornecedor cadastrado ou digite livremente. A vinculação é aplicada ao salvar.
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Supplier confirmation — shown after Save when no supplier was set */}
          <AlertDialog
            open={confirmSupplierOpen}
            onOpenChange={(o) => { setConfirmSupplierOpen(o); if (!o) setConfirmLinkMode(false); }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmLinkMode ? "Vincular fornecedor" : "Deseja vincular um fornecedor a este serviço?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmLinkMode
                    ? "Busque um fornecedor existente ou digite o nome livremente."
                    : "Vincular um fornecedor ajuda no controle financeiro, pagamentos, comissões e acompanhamento operacional. Você pode fazer isso agora ou depois, na edição do serviço."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {confirmLinkMode && (
                <div className="py-2">
                  <SupplierSelector value={pendingSupplier} onChange={setPendingSupplier} />
                </div>
              )}
              <AlertDialogFooter>
                {confirmLinkMode ? (
                  <>
                    <Button variant="outline" onClick={() => setConfirmLinkMode(false)}>Voltar</Button>
                    <Button
                      disabled={!pendingSupplier.operator_id && !(pendingSupplier.supplier_name || "").trim()}
                      onClick={async () => {
                        const payload = pendingAddPayloadRef.current;
                        pendingAddPayloadRef.current = null;
                        setAddSupplier(pendingSupplier);
                        setConfirmSupplierOpen(false);
                        setConfirmLinkMode(false);
                        if (payload) await persistNewService(payload.serviceData, payload.files, pendingSupplier);
                      }}
                    >
                      Salvar com fornecedor
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setConfirmLinkMode(true)}>
                      Vincular fornecedor
                    </Button>
                    <Button
                      onClick={async () => {
                        const payload = pendingAddPayloadRef.current;
                        pendingAddPayloadRef.current = null;
                        setConfirmSupplierOpen(false);
                        if (payload) await persistNewService(payload.serviceData, payload.files, { operator_id: null, supplier_name: "" });
                      }}
                    >
                      Agora não
                    </Button>
                  </>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 2. Roteiro dia a dia */}
          <AccordionItem value="itinerary" className="border-0 rounded-lg overflow-hidden bg-card shadow-card">
            <AccordionTrigger className="px-5 sm:px-6 pt-5 pb-4 hover:no-underline">
              <div className="w-fit">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapIcon className="h-5 w-5 text-amber-500" />
                  Roteiro dia a dia
                </h2>
                <div className="mt-2 h-1 w-full rounded-full bg-amber-500" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 sm:px-6 pb-5 pt-0">
              {trip.itinerary_mode === "v2" ? (
                <TripItineraryV2 trip={trip} />
              ) : trip.itinerary_mode === "legacy" ? (
                <LegacyItinerarySection trip={trip} onRequestAddService={openServicesAccordion} />
              ) : (
                <TripItineraryV2 trip={trip} />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 3. Acesso do Cliente */}
          <AccordionItem value="access" className="border-0 rounded-lg overflow-hidden bg-card shadow-card">
            <AccordionTrigger className="px-5 sm:px-6 pt-5 pb-4 hover:no-underline">
              <div className="w-fit">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-5 w-5 text-violet-500" />
                  Acesso do Cliente
                </h2>
                <div className="mt-2 h-1 w-full rounded-full bg-violet-500" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 sm:px-6 pb-5 pt-0">
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
          <AccordionItem value="summary" className="border-0 rounded-lg overflow-hidden bg-card shadow-card">
            <AccordionTrigger className="px-5 sm:px-6 pt-5 pb-4 hover:no-underline">
              <div className="w-fit">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  Resumo
                </h2>
                <div className="mt-2 h-1 w-full rounded-full bg-emerald-500" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 sm:px-6 pb-5 pt-0">
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

                {/* Foto de capa — escolhida pelo agente, usada na Carteira pública */}
                <WalletCoverPicker
                  trip={trip}
                  isSaving={isUpdating}
                  onChange={async (url) => {
                    await updateTrip({ id: trip.id, wallet_cover_url: url } as any);
                  }}
                />

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

          {/* 4.5. Assinatura Comercial */}
          <AccordionItem value="signature" className="border-0 rounded-lg overflow-hidden bg-card shadow-card">
            <AccordionTrigger className="px-5 sm:px-6 pt-5 pb-4 hover:no-underline">
              <div className="w-fit">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <UserCircle2 className="h-5 w-5 text-sky-500" />
                  Assinatura Comercial
                </h2>
                <div className="mt-2 h-1 w-full rounded-full bg-sky-500" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 sm:px-6 pb-5 pt-0">
              <div className="max-w-2xl">
                <DocumentSignatureCard
                  table="trips"
                  docId={trip.id}
                  initialSnapshot={(trip as any).signature_snapshot ?? null}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ["trip", id] })}
                  unwrapped
                  hideHeader
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Histórico de Alterações */}
          <AccordionItem value="history" className="border-0 rounded-lg overflow-hidden bg-card shadow-card">
            <AccordionTrigger className="px-5 sm:px-6 pt-5 pb-4 hover:no-underline">
              <div className="w-fit">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-500" />
                  Histórico de Alterações
                </h2>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-500" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 sm:px-6 pb-5 pt-0">
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
