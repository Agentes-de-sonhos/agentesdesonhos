import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, CloudOff, Cloud } from "lucide-react";
import { useQuoteAutosave, getLocalDraft, clearLocalDraft, type SaveStatus } from "@/hooks/useQuoteAutosave";
import { buildOrcamentoLink, ORCAMENTO_DOMAIN } from "@/lib/orcamento-domain";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, FileText, Link as LinkIcon, Loader2, Lock, Eye, EyeOff,
  CalendarIcon, CreditCard, Trash2, Copy, ExternalLink, MapPin, Users,
  Pencil, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuoteClientForm } from "@/components/quote/QuoteClientForm";
import { ServiceForm } from "@/components/quote/ServiceForms";
import { ServiceList } from "@/components/quote/ServiceCard";
import { QuoteSummary } from "@/components/quote/QuoteSummary";
import { QuoteDateEditor } from "@/components/quote/QuoteDateEditor";
import { generateQuotePDF } from "@/components/quote/QuotePDF";
import { QuoteDocuments } from "@/components/quote/QuoteDocuments";
import { useQuotes, useQuote } from "@/hooks/useQuotes";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentProfile, AgentProfile } from "@/hooks/useAgentProfile";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ServiceType, QuoteFormData, ServiceData, Quote, QuoteService } from "@/types/quote";
import { SERVICE_TYPE_LABELS, MULTI_OPTION_TYPES } from "@/types/quote";
import { ServicePaymentForm } from "@/components/quote/ServicePaymentForm";
import type { ServicePaymentConfig } from "@/lib/servicePayment";
import { extractServicePaymentConfig } from "@/lib/servicePayment";
import { formatQuoteCurrency, getQuoteCurrencyInfo, getCurrencySymbol, type QuoteCurrency } from "@/lib/quoteCurrency";
import { DestinationIntroEditor } from "@/components/quote/DestinationIntroEditor";
import { AIImportServiceModal, type AIImportResult } from "@/components/shared/AIImportServiceModal";
import { Sparkles } from "lucide-react";

function formatCurrency(value: number, currency: QuoteCurrency = 'BRL') {
  return formatQuoteCurrency(value, currency);
}

function parseDateOnly(dateStr?: string | null) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateShort(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
  } catch { return dateStr; }
}

type PaymentDisplayMode = "installments" | "installments_with_entry" | "full_payment";

const PAYMENT_MODE_OPTIONS: { value: PaymentDisplayMode; label: string; description: string }[] = [
  { value: "installments", label: "Parcelado (sem entrada)", description: "Ex: 10x de R$ 2.400" },
  { value: "installments_with_entry", label: "Parcelado com entrada", description: "Ex: Entrada + 9x de R$ 2.400" },
  { value: "full_payment", label: "À vista", description: "Ex: R$ 24.000 à vista" },
];

const PAYMENT_METHOD_OPTIONS = ["Cartão de Crédito", "Pix", "Boleto", "Transferência Bancária"];

function QuoteHistoryRow({
  q,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  q: Quote;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{q.client_name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {q.destination} • {formatDateShort(q.start_date)} — {formatDateShort(q.end_date)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={q.status === "published" ? "default" : "secondary"} className="capitalize">
          {q.status === "published" ? "Publicado" : "Rascunho"}
        </Badge>
        <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate}>Duplicar</Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>Excluir</Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function GerarOrcamento() {
  const [editingDestination, setEditingDestination] = useState(false);
  const [destinationDraft, setDestinationDraft] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { quotes, isLoading: quotesLoading, createQuote, isCreating, publishQuote, isPublishing, deleteQuote, duplicateQuote, isDuplicating } = useQuotes();
  const { quote, addService, updateService, deleteService, isAddingService } = useQuote(id);
  const { canUse: canCreateQuote, remaining: quotesRemaining, hasLimit, incrementUsage } = useDailyLimit("quote_generator");

  // Persist UI state in sessionStorage so tab switches don't lose progress
  const storageKey = id ? `quote-editor-${id}` : null;

  const readPersistedState = useCallback(() => {
    if (!storageKey) return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [storageKey]);

  const persisted = readPersistedState();

  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(
    persisted?.selectedServiceType || null
  );
  const [editingService, setEditingService] = useState<import("@/types/quote").QuoteService | null>(
    persisted?.editingService || null
  );
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [validityDisclaimer, setValidityDisclaimer] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [paymentDisplayMode, setPaymentDisplayMode] = useState<PaymentDisplayMode>("full_payment");
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [entryPercentage, setEntryPercentage] = useState(30);
  const [paymentMethodLabel, setPaymentMethodLabel] = useState("");
  const [fullPaymentDiscountPercent, setFullPaymentDiscountPercent] = useState(0);
  
  const [showDetailedLocal, setShowDetailedLocal] = useState<boolean | null>(null);
  const [showInvestmentLocal, setShowInvestmentLocal] = useState<boolean | null>(null);
  const [headerEditDates, setHeaderEditDates] = useState(false);
  const [useServicePayment, setUseServicePayment] = useState(false);
  const [servicePaymentConfigs, setServicePaymentConfigs] = useState<Record<string, ServicePaymentConfig>>({});
  const [newServicePaymentConfig, setNewServicePaymentConfig] = useState<ServicePaymentConfig>({ is_custom_payment: false, payment_type: null, installments: null, entry_value: null, discount_type: null, discount_value: null, payment_method: null });
  const [openSections, setOpenSections] = useState<
    Record<"services" | "destination" | "payment" | "validity" | "documents", boolean>
  >({
    services: false,
    destination: false,
    payment: false,
    validity: false,
    documents: false,
  });
  const toggleSection = (key: "services" | "destination" | "payment" | "validity" | "documents") =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const [draftBanner, setDraftBanner] = useState<ReturnType<typeof getLocalDraft>>(null);

  // Check for unsaved draft on mount (only on list screen)
  useEffect(() => {
    if (!id) {
      const draft = getLocalDraft();
      if (draft) setDraftBanner(draft);
    }
  }, [id]);

  // Flush refs for autosave on page leave
  const flushPaymentRef = useRef<(() => void) | undefined>();
  const flushValidityRef = useRef<(() => void) | undefined>();
  const flushPendingSave = useCallback(() => {
    flushPaymentRef.current?.();
    flushValidityRef.current?.();
  }, []);

  const { saveStatus, showSaved, showSaving, showError } = useQuoteAutosave(
    id,
    quote?.client_name,
    quote?.destination,
    flushPendingSave,
  );

  const quoteLoadedRef = useRef(false);
  const quoteInitializedRef = useRef(false);
  const paymentSnapshotRef = useRef("");
  const validitySnapshotRef = useRef("");

  const showAutoSavedFeedback = useCallback(() => {
    showSaved();
  }, [showSaved]);

  const buildPaymentSnapshot = useCallback(() => JSON.stringify({
    payment_terms: paymentTerms || null,
    payment_display_mode: paymentDisplayMode,
    installments_count: installmentsCount,
    entry_percentage: entryPercentage,
    payment_method_label: paymentMethodLabel || null,
    full_payment_discount_percent: fullPaymentDiscountPercent,
  }), [paymentTerms, paymentDisplayMode, installmentsCount, entryPercentage, paymentMethodLabel, fullPaymentDiscountPercent]);

  const buildValiditySnapshot = useCallback(() => JSON.stringify({
    valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
    validity_disclaimer: validityDisclaimer || "",
  }), [validUntil, validityDisclaimer]);

  useEffect(() => {
    if (user?.id) { fetchAgentProfile(user.id, supabase).then(setAgentProfile); }
  }, [user?.id]);

  useEffect(() => {
    if (quote && !quoteInitializedRef.current) {
      quoteInitializedRef.current = true;

      const initialPaymentTerms = (quote as any).payment_terms || "";
      const initialValidUntil = parseDateOnly((quote as any).valid_until);
      const initialValidityDisclaimer = (quote as any).validity_disclaimer || "Valores sujeitos à alteração sem aviso prévio devido à variação cambial e disponibilidade de tarifas.";
      const initialPaymentDisplayMode = ((quote as any).payment_display_mode as PaymentDisplayMode) || "full_payment";
      const initialInstallmentsCount = (quote as any).installments_count || 10;
      const initialEntryPercentage = (quote as any).entry_percentage || 30;
      const initialPaymentMethodLabel = (quote as any).payment_method_label || "";
      const initialFullPaymentDiscountPercent = (quote as any).full_payment_discount_percent || 0;

      setPaymentTerms(initialPaymentTerms);
      setValidUntil(initialValidUntil);
      setValidityDisclaimer(initialValidityDisclaimer);
      setPaymentDisplayMode(initialPaymentDisplayMode);
      setInstallmentsCount(initialInstallmentsCount);
      setEntryPercentage(initialEntryPercentage);
      setPaymentMethodLabel(initialPaymentMethodLabel);
      setFullPaymentDiscountPercent(initialFullPaymentDiscountPercent);
      setUseServicePayment((quote as any).use_service_payment ?? false);

      paymentSnapshotRef.current = JSON.stringify({
        payment_terms: initialPaymentTerms || null,
        payment_display_mode: initialPaymentDisplayMode,
        installments_count: initialInstallmentsCount,
        entry_percentage: initialEntryPercentage,
        payment_method_label: initialPaymentMethodLabel || null,
        full_payment_discount_percent: initialFullPaymentDiscountPercent,
      });

      validitySnapshotRef.current = JSON.stringify({
        valid_until: initialValidUntil ? format(initialValidUntil, "yyyy-MM-dd") : null,
        validity_disclaimer: initialValidityDisclaimer || "",
      });

      const configs: Record<string, ServicePaymentConfig> = {};
      (quote.services || []).forEach((s: any) => {
        configs[s.id] = extractServicePaymentConfig(s);
      });
      setServicePaymentConfigs(configs);

      setTimeout(() => { quoteLoadedRef.current = true; }, 2500);
    }
  }, [quote]);
  const handleSavePaymentConfig = useCallback(async (showToast = false) => {
    if (!quote) return;

    const nextSnapshot = buildPaymentSnapshot();
    const hasChanges = nextSnapshot !== paymentSnapshotRef.current;

    if (hasChanges) {
      const payload = JSON.parse(nextSnapshot);
      const { error } = await supabase.from("quotes").update(payload as any).eq("id", quote.id);
      if (error) {
        toast({ title: "Erro ao salvar configuração", description: error.message, variant: "destructive" });
        return;
      }
      paymentSnapshotRef.current = nextSnapshot;
      showAutoSavedFeedback();
    }

    if (showToast) {
      toast({ title: "Configuração salva", description: "As configurações de pagamento foram salvas com sucesso." });
    }
  }, [quote, buildPaymentSnapshot, toast, showAutoSavedFeedback]);

  const handleSaveValidity = useCallback(async (showToast = false) => {
    if (!quote) return;

    const nextSnapshot = buildValiditySnapshot();
    const hasChanges = nextSnapshot !== validitySnapshotRef.current;

    if (hasChanges) {
      const payload = JSON.parse(nextSnapshot);
      const { error } = await supabase.from("quotes").update(payload as any).eq("id", quote.id);
      if (error) {
        toast({ title: "Erro ao salvar validade", description: error.message, variant: "destructive" });
        return;
      }
      validitySnapshotRef.current = nextSnapshot;
      showAutoSavedFeedback();
    }

    if (showToast) {
      toast({ title: "Configuração salva", description: "As configurações de validade e termos foram salvas com sucesso." });
    }
  }, [quote, buildValiditySnapshot, toast, showAutoSavedFeedback]);

  // Wire up flush refs for beforeunload/visibilitychange
  useEffect(() => {
    flushPaymentRef.current = () => handleSavePaymentConfig();
    flushValidityRef.current = () => handleSaveValidity();
  }, [handleSavePaymentConfig, handleSaveValidity]);

  // Debounced auto-save for payment config
  useEffect(() => {
    if (!quote || !quoteLoadedRef.current) return;
    if (buildPaymentSnapshot() === paymentSnapshotRef.current) return;
    const timer = setTimeout(() => { handleSavePaymentConfig(); }, 2000);
    return () => clearTimeout(timer);
  }, [quote, buildPaymentSnapshot, handleSavePaymentConfig]);

  // Debounced auto-save for validity config
  useEffect(() => {
    if (!quote || !quoteLoadedRef.current) return;
    if (buildValiditySnapshot() === validitySnapshotRef.current) return;
    const timer = setTimeout(() => { handleSaveValidity(); }, 2000);
    return () => clearTimeout(timer);
  }, [quote, buildValiditySnapshot, handleSaveValidity]);

  const handleToggleDetailedPrices = async (checked: boolean) => {
    if (!quote) return;
    setShowDetailedLocal(checked);
    await supabase.from("quotes").update({ show_detailed_prices: checked } as any).eq("id", quote.id);
  };

  const handleToggleServicePayment = async (checked: boolean) => {
    if (!quote) return;
    setUseServicePayment(checked);
    await supabase.from("quotes").update({ use_service_payment: checked } as any).eq("id", quote.id);
  };

  const handleServicePaymentChange = async (serviceId: string, config: ServicePaymentConfig) => {
    setServicePaymentConfigs((prev) => ({ ...prev, [serviceId]: config }));
    await supabase.from("quote_services").update({
      is_custom_payment: config.is_custom_payment,
      payment_type: config.payment_type,
      installments: config.installments,
      entry_value: config.entry_value,
      discount_type: config.discount_type,
      discount_value: config.discount_value,
      payment_method: config.payment_method,
    } as any).eq("id", serviceId);

    // Auto-enable use_service_payment on the quote when any service gets custom payment
    if (config.is_custom_payment && !useServicePayment && quote) {
      setUseServicePayment(true);
      await supabase.from("quotes").update({ use_service_payment: true } as any).eq("id", quote.id);
    }
  };

  // Pre-fill data coming from a CRM opportunity (via navigation state)
  const opportunityPrefill = (location.state as {
    opportunity_id?: string;
    client_id?: string;
    client_name?: string;
    destination?: string;
    start_date?: string | null;
    end_date?: string | null;
    adults_count?: number;
    children_count?: number;
  } | null) || null;

  const handleCreateQuote = async (formData: QuoteFormData) => {
    const newQuote = await createQuote({
      ...formData,
      opportunity_id: opportunityPrefill?.opportunity_id || formData.opportunity_id || null,
    });
    incrementUsage();
    setDraftBanner(null);
    navigate(`/ferramentas-ia/gerar-orcamento/${newQuote.id}`);
  };

  const handleGeneratePDF = () => {
    if (!quote) return;
    generateQuotePDF(quote, agentProfile);
  };

  const handlePublish = async () => {
    if (!quote) return;

    const token = quote.share_token || await publishQuote(quote.id);

    // Always use the seuorcamento.tur.br domain. Prefer the new format
    // (agency-slug + access-code) when available; otherwise fall back to the
    // legacy /orcamento/:token route on the same domain.
    const accessCode = (quote as any).public_access_code;
    const agencyName = agentProfile?.agency_name;
    const publicUrl = accessCode && agencyName
      ? buildOrcamentoLink(agencyName, accessCode)
      : `${ORCAMENTO_DOMAIN}/orcamento/${token}`;

    clearLocalDraft();
    await navigator.clipboard.writeText(publicUrl);
    toast({
      title: quote.share_token ? "Link copiado" : "Orçamento publicado",
      description: quote.share_token ? "O link foi copiado para a área de transferência." : "O link do orçamento foi copiado para a área de transferência.",
    });
  };

  const handleEditService = (service: QuoteService) => {
    setSelectedServiceType(service.service_type);
    setEditingService(service);
  };

  const handleAddService = async (
    service_data: ServiceData,
    amount: number,
    option_label?: string,
    description?: string,
    image_url?: string,
    image_urls?: string[],
  ) => {
    if (!selectedServiceType) return;

    if (editingService) {
      await updateService({
        serviceId: editingService.id,
        service_type: selectedServiceType,
        service_data,
        amount,
        option_label,
        description,
        image_url,
        image_urls,
      });
    } else {
      const newSvc = await addService({
        service_type: selectedServiceType,
        service_data,
        amount,
        option_label,
        description,
        image_url,
        image_urls,
      });

      // Save payment config for the newly created service
      if (newSvc?.id && newServicePaymentConfig.is_custom_payment) {
        await supabase.from("quote_services").update({
          is_custom_payment: newServicePaymentConfig.is_custom_payment,
          payment_type: newServicePaymentConfig.payment_type,
          installments: newServicePaymentConfig.installments,
          entry_value: newServicePaymentConfig.entry_value,
          discount_type: newServicePaymentConfig.discount_type,
          discount_value: newServicePaymentConfig.discount_value,
          payment_method: newServicePaymentConfig.payment_method,
        }).eq("id", newSvc.id);
        setServicePaymentConfigs((prev) => ({ ...prev, [newSvc.id]: newServicePaymentConfig }));
        if (!useServicePayment) setUseServicePayment(true);
      }
      setNewServicePaymentConfig({ is_custom_payment: false, payment_type: null, installments: null, entry_value: null, discount_type: null, discount_value: null, payment_method: null });
    }

    setSelectedServiceType(null);
    setEditingService(null);
  };

  const handleDeleteQuote = async (qId: string) => {
    await deleteQuote(qId);
    setDeleteConfirmId(null);
  };

  const handleDuplicate = async (qId: string) => {
    const dup = await duplicateQuote(qId);
    navigate(`/ferramentas-ia/gerar-orcamento/${dup.id}`);
  };

  /* ─── Trip date range for constraining service calendars ─── */
  const tripStartDate = quote?.start_date ? (() => { const [y, m, d] = quote.start_date.split("-").map(Number); return new Date(y, m - 1, d); })() : undefined;
  const tripEndDate = quote?.end_date ? (() => { const [y, m, d] = quote.end_date.split("-").map(Number); return new Date(y, m - 1, d); })() : undefined;

  /* ═══════════════════  INITIAL SCREEN (no id) ═══════════════════ */
  if (!id) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader pageKey="gerar-orcamento" title="Gerar Orçamento" subtitle="Crie um orçamento profissional para seu cliente" icon={FileText} />

          {hasLimit && (
            <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${canCreateQuote ? 'bg-muted/50 text-muted-foreground' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              {canCreateQuote ? (
                <><FileText className="h-4 w-4" /> Você pode criar mais {quotesRemaining} orçamento(s) hoje.</>
              ) : (
                <><Lock className="h-4 w-4" /> Limite diário atingido. Faça upgrade para orçamentos ilimitados.</>
              )}
            </div>
          )}

          {/* Draft recovery banner */}
          {draftBanner && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Rascunho encontrado</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {draftBanner.clientName} — {draftBanner.destination}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { clearLocalDraft(); setDraftBanner(null); }}
                >
                  Descartar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDraftBanner(null);
                    navigate(`/ferramentas-ia/gerar-orcamento/${draftBanner.quoteId}`);
                  }}
                >
                  Continuar editando
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            {/* ── New Quote Form ── */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Novo Orçamento</CardTitle></CardHeader>
              <CardContent>
                <QuoteClientForm
                  onSubmit={handleCreateQuote}
                  isLoading={isCreating}
                  defaults={
                    opportunityPrefill
                      ? {
                          client_id: opportunityPrefill.client_id,
                          client_name: opportunityPrefill.client_name,
                          destination: opportunityPrefill.destination,
                          start_date: opportunityPrefill.start_date,
                          end_date: opportunityPrefill.end_date,
                          adults_count: opportunityPrefill.adults_count,
                          children_count: opportunityPrefill.children_count,
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>

            {/* ── Quote History ── */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Meus Orçamentos
                  {quotes.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">{quotes.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : quotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum orçamento criado ainda. Crie o primeiro ao lado!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {quotes.map((q) => (
                      <QuoteHistoryRow
                        key={q.id}
                        q={q}
                        onEdit={() => navigate(`/ferramentas-ia/gerar-orcamento/${q.id}`)}
                        onDuplicate={() => handleDuplicate(q.id)}
                        onDelete={() => setDeleteConfirmId(q.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Delete confirmation dialog */}
          <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os serviços do orçamento serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteConfirmId && handleDeleteQuote(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardLayout>
    );
  }

  /* ═══════════════════  LOADING ═══════════════════ */
  if (!quote) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const showDetailed = showDetailedLocal !== null ? showDetailedLocal : (quote as any).show_detailed_prices !== false;
  const { currency: quoteCurrencyCode } = getQuoteCurrencyInfo(quote);
  const fmt = (v: number) => formatCurrency(v, quoteCurrencyCode);
  const serviceCountByType: Record<string, number> = {};
  (quote.services || []).forEach(s => {
    serviceCountByType[s.service_type] = (serviceCountByType[s.service_type] || 0) + 1;
  });

  /* ═══════════════════  QUOTE EDITOR ═══════════════════ */
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate("/ferramentas-ia/gerar-orcamento")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg sm:text-2xl font-bold truncate">Orçamento: {quote.client_name}</h1>
                {quoteCurrencyCode !== 'BRL' && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {getCurrencySymbol(quoteCurrencyCode)} {(quote as any).currency_mode === 'conversion' ? 'Conversão' : 'Fixa'}
                  </Badge>
                )}
              </div>
              {/* Trip Title inline edit */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Input
                  className="h-6 text-xs border-dashed w-48"
                  placeholder="Título da viagem (opcional)"
                  defaultValue={(quote as any).trip_title || ""}
                  onBlur={async (e) => {
                    const val = e.target.value.trim() || null;
                    if (val !== ((quote as any).trip_title || null)) {
                      await supabase.from("quotes").update({ trip_title: val } as any).eq("id", quote.id);
                    }
                  }}
                />
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-wrap">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {editingDestination ? (
                  <span className="flex items-center gap-1">
                    <Input
                      className="h-6 text-xs w-40"
                      value={destinationDraft}
                      onChange={(e) => setDestinationDraft(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && destinationDraft.trim()) {
                          await supabase.from("quotes").update({ destination: destinationDraft.trim() } as any).eq("id", quote.id);
                          setEditingDestination(false);
                        }
                        if (e.key === "Escape") setEditingDestination(false);
                      }}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={async () => {
                      if (destinationDraft.trim()) {
                        await supabase.from("quotes").update({ destination: destinationDraft.trim() } as any).eq("id", quote.id);
                      }
                      setEditingDestination(false);
                    }}>✓</Button>
                  </span>
                ) : (
                  <span className="truncate cursor-pointer hover:underline" onClick={() => { setDestinationDraft(quote.destination); setEditingDestination(true); }}>{quote.destination}</span>
                )}
                <span className="text-xs">•</span>
                <span className="whitespace-nowrap">{formatDateShort(quote.start_date)} — {formatDateShort(quote.end_date)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-0.5 shrink-0" onClick={() => setHeaderEditDates(true)} title="Editar datas">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </p>
              {headerEditDates && (
                <div className="mt-2">
                  <QuoteDateEditor
                    quoteId={quote.id}
                    startDateStr={quote.start_date}
                    endDateStr={quote.end_date}
                    onClose={() => setHeaderEditDates(false)}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0 flex-wrap">
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 animate-fade-in">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 animate-fade-in">
                <Cloud className="h-3 w-3 text-primary" />
                Rascunho salvo
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                <CloudOff className="h-3 w-3" />
                Erro ao salvar
              </span>
            )}
            <Button variant="outline" size="sm" className="sm:size-default" onClick={handleGeneratePDF}>
              <FileText className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">PDF</span><span className="sm:hidden">PDF</span>
            </Button>
            <Button size="sm" className="sm:size-default" onClick={handlePublish} disabled={isPublishing}>
              <LinkIcon className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">{quote.share_token ? "Copiar Link" : "Publicar"}</span><span className="sm:hidden">{quote.share_token ? "Link" : "Publicar"}</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Serviços - Collapsible */}
            <Card>
              <button
                type="button"
                onClick={() => toggleSection("services")}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">Adicionar Serviços</span>
                  {quote.services && quote.services.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      ({quote.services.length})
                    </span>
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openSections.services && "rotate-180")} />
              </button>
              {openSections.services && (
              <CardContent className="pt-0">
                {selectedServiceType ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">
                      {editingService ? "Editando: " : ""}{SERVICE_TYPE_LABELS[selectedServiceType]}
                      {!editingService && MULTI_OPTION_TYPES.includes(selectedServiceType) && serviceCountByType[selectedServiceType] ? (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Opção {(serviceCountByType[selectedServiceType] || 0) + 1})
                        </span>
                      ) : null}
                    </h3>
                    {tripStartDate && tripEndDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Período da viagem: {format(tripStartDate, "dd/MM", { locale: ptBR })} a {format(tripEndDate, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                    <ServiceForm
                      key={editingService?.id || "new"}
                      serviceType={selectedServiceType}
                      onSubmit={handleAddService}
                      onCancel={() => { setSelectedServiceType(null); setEditingService(null); setNewServicePaymentConfig({ is_custom_payment: false, payment_type: null, installments: null, entry_value: null, discount_type: null, discount_value: null, payment_method: null }); }}
                      isLoading={isAddingService}
                      showOptionLabel={MULTI_OPTION_TYPES.includes(selectedServiceType)}
                      tripStartDate={tripStartDate}
                      tripEndDate={tripEndDate}
                      adultsCount={quote.adults_count}
                      childrenCount={quote.children_count}
                      initialData={editingService ? {
                        service_data: editingService.service_data,
                        amount: editingService.amount,
                        option_label: editingService.option_label,
                        description: editingService.description,
                        image_url: editingService.image_url,
                        image_urls: editingService.image_urls || [],
                      } : undefined}
                      paymentSlot={editingService ? (
                        (liveAmount: number) => (
                          <ServicePaymentForm
                            amount={liveAmount || editingService.amount}
                            config={servicePaymentConfigs[editingService.id] || { is_custom_payment: false, payment_type: null, installments: null, entry_value: null, discount_type: null, discount_value: null, payment_method: null }}
                            onChange={(config) => handleServicePaymentChange(editingService.id, config)}
                          />
                        )
                      ) : (
                        (liveAmount: number) => (
                          <ServicePaymentForm
                            amount={liveAmount}
                            config={newServicePaymentConfig}
                            onChange={setNewServicePaymentConfig}
                          />
                        )
                      )}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                      {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((type) => (
                        <Button key={type} variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9" onClick={() => setSelectedServiceType(type)}>
                          <Plus className="mr-1 h-3 w-3 shrink-0" />
                          <span className="truncate">{SERVICE_TYPE_LABELS[type]}</span>
                          {MULTI_OPTION_TYPES.includes(type) && serviceCountByType[type] ? (
                            <span className="ml-1 text-xs text-muted-foreground">({serviceCountByType[type]})</span>
                          ) : null}
                        </Button>
                      ))}
                    </div>
                    <ServiceList
                      services={quote.services || []}
                      onDeleteService={deleteService}
                      onEditService={handleEditService}
                    />
                  </>
                )}
              </CardContent>
              )}
            </Card>

            {/* Apresentação do Destino - Collapsible */}
            <Card>
              <button
                type="button"
                onClick={() => toggleSection("destination")}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">Apresentação do Destino</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openSections.destination && "rotate-180")} />
              </button>
              {openSections.destination && (
                <CardContent className="pt-0">
                  <DestinationIntroEditor
                    embedded
                    quoteId={quote.id}
                    destination={quote.destination}
                    showIntro={(quote as any).show_destination_intro !== false}
                    introText={(quote as any).destination_intro_text || null}
                    introImages={(quote as any).destination_intro_images || []}
                    onUpdate={() => {}}
                  />
                </CardContent>
              )}
            </Card>

            {/* Apresentação do Investimento - Collapsible */}
            <Card>
              <button
                type="button"
                onClick={() => toggleSection("payment")}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">Apresentação do Investimento</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    role="switch"
                    aria-checked={showInvestmentLocal !== null ? showInvestmentLocal : (quote as any).show_investment_section !== false}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex"
                  >
                    <Switch
                      id="show-investment-header"
                      checked={showInvestmentLocal !== null ? showInvestmentLocal : (quote as any).show_investment_section !== false}
                      onCheckedChange={async (checked) => {
                        if (!quote) return;
                        setShowInvestmentLocal(checked);
                        if (!checked) {
                          // Disabling investment → automatically show detailed prices per service
                          setShowDetailedLocal(true);
                          await supabase
                            .from("quotes")
                            .update({ show_investment_section: false, show_detailed_prices: true } as any)
                            .eq("id", quote.id);
                        } else {
                          await supabase
                            .from("quotes")
                            .update({ show_investment_section: true } as any)
                            .eq("id", quote.id);
                        }
                      }}
                    />
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openSections.payment && "rotate-180")} />
                </div>
              </button>
              {openSections.payment && (
                <CardContent className="space-y-4 pt-0">
                  {/* Tri-state display selector — centralizes financial display logic */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">O que exibir para o cliente?</Label>
                    {(() => {
                      const investOn = showInvestmentLocal !== null ? showInvestmentLocal : (quote as any).show_investment_section !== false;
                      const detailedOn = showDetailed;
                      const currentMode: "investment" | "detailed" | "both" =
                        investOn && detailedOn ? "both" : investOn ? "investment" : "detailed";
                      const modes: { value: "investment" | "detailed" | "both"; label: string; description: string }[] = [
                        { value: "investment", label: "Apenas Apresentação do Investimento", description: "Mostra valor total e condições de pagamento." },
                        { value: "detailed", label: "Apenas Valores Detalhados por Serviço", description: "Mostra o valor de cada serviço separadamente." },
                        { value: "both", label: "Ambos (Apresentação + Valores Detalhados)", description: "Exibe a apresentação e o detalhamento por serviço." },
                      ];
                      const applyMode = async (mode: "investment" | "detailed" | "both") => {
                        if (!quote) return;
                        const nextInvestment = mode === "investment" || mode === "both";
                        const nextDetailed = mode === "detailed" || mode === "both";
                        setShowInvestmentLocal(nextInvestment);
                        setShowDetailedLocal(nextDetailed);
                        await supabase
                          .from("quotes")
                          .update({
                            show_investment_section: nextInvestment,
                            show_detailed_prices: nextDetailed,
                          } as any)
                          .eq("id", quote.id);
                      };
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {modes.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => applyMode(opt.value)}
                              className={cn(
                                "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                                currentMode === opt.value
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                  : "border-border hover:border-border/80 hover:bg-muted/30"
                              )}
                            >
                              <div className={cn(
                                "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                                currentMode === opt.value ? "border-primary" : "border-muted-foreground/40"
                              )}>
                                {currentMode === opt.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{opt.label}</p>
                                <p className="text-xs text-muted-foreground">{opt.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Como exibir o valor para o cliente?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {PAYMENT_MODE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentDisplayMode(opt.value)}
                          className={cn(
                            "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                            paymentDisplayMode === opt.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border hover:border-border/80 hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                            paymentDisplayMode === opt.value ? "border-primary" : "border-muted-foreground/40"
                          )}>
                            {paymentDisplayMode === opt.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {paymentDisplayMode === "installments" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Nº de parcelas</Label>
                        <Input type="number" min={2} max={48} value={installmentsCount} onChange={(e) => setInstallmentsCount(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Meio de pagamento</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethodLabel} onChange={(e) => setPaymentMethodLabel(e.target.value)}>
                          <option value="">Selecione...</option>
                          {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      {quote && (
                        <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium text-primary">
                            Destaque: <span className="font-bold">{installmentsCount}x de {fmt(quote.total_amount / (installmentsCount || 1))}</span>
                            {paymentMethodLabel && <span className="text-muted-foreground font-normal"> no {paymentMethodLabel}</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentDisplayMode === "installments_with_entry" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">% da entrada</Label>
                        <Input type="number" min={1} max={90} value={entryPercentage} onChange={(e) => setEntryPercentage(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Nº de parcelas (saldo)</Label>
                        <Input type="number" min={1} max={48} value={installmentsCount} onChange={(e) => setInstallmentsCount(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Meio de pagamento</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethodLabel} onChange={(e) => setPaymentMethodLabel(e.target.value)}>
                          <option value="">Selecione...</option>
                          {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      {quote && (() => {
                        const entry = quote.total_amount * (entryPercentage / 100);
                        const remainder = quote.total_amount - entry;
                        const installmentValue = remainder / (installmentsCount || 1);
                        return (
                          <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                            <p className="text-sm font-medium text-primary">
                              Destaque: <span className="font-bold">Entrada de {fmt(entry)} + {installmentsCount}x de {fmt(installmentValue)}</span>
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {paymentDisplayMode === "full_payment" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Desconto à vista (%)</Label>
                        <Input type="number" min={0} max={50} value={fullPaymentDiscountPercent} onChange={(e) => setFullPaymentDiscountPercent(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Meio de pagamento</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethodLabel} onChange={(e) => setPaymentMethodLabel(e.target.value)}>
                          <option value="">Selecione...</option>
                          {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      {quote && (
                        <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium text-primary">
                            Destaque: <span className="font-bold">{fmt(quote.total_amount * (1 - fullPaymentDiscountPercent / 100))} à vista</span>
                            {fullPaymentDiscountPercent > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">({fullPaymentDiscountPercent}% de desconto{paymentMethodLabel ? ` via ${paymentMethodLabel}` : ""})</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-1.5">
                    <Label className="text-sm">Observações adicionais de pagamento</Label>
                    <Textarea
                      placeholder="Ex: Parcelamento sem juros. Desconto especial para pagamento via Pix."
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button variant="outline" size="sm" onClick={() => handleSavePaymentConfig(true)}>
                    Salvar Configuração
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Validade e Termos - Collapsible */}
            <Card>
              <button
                type="button"
                onClick={() => toggleSection("validity")}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">Validade e Termos</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openSections.validity && "rotate-180")} />
              </button>
              {openSections.validity && (
                <CardContent className="space-y-3 pt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Válido até</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !validUntil && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {validUntil ? format(validUntil, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Termos e condições</Label>
                    <Textarea
                      value={validityDisclaimer}
                      onChange={(e) => setValidityDisclaimer(e.target.value)}
                      rows={3}
                      placeholder="Valores sujeitos à alteração..."
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleSaveValidity(true)}>
                    Salvar
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Documentos do Orçamento - Collapsible */}
            <QuoteDocuments
              quoteId={quote.id}
              userId={quote.user_id}
              isOpen={openSections.documents}
              onToggle={() => toggleSection("documents")}
            />
          </div>
          <div className="space-y-4">
            <QuoteSummary quote={quote} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
