import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CloudOff, Cloud } from "lucide-react";
import { useQuoteAutosave, getLocalDraft, clearLocalDraft, type SaveStatus } from "@/hooks/useQuoteAutosave";
import { buildOrcamentoLink, ORCAMENTO_DOMAIN } from "@/lib/orcamento-domain";
import { PublicLinkActions } from "@/components/shared/PublicLinkActions";
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
  Pencil, MoreHorizontal, Play,
} from "lucide-react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientAvatar } from "@/components/shared/ClientAvatar";
import { QuoteClientForm } from "@/components/quote/QuoteClientForm";
import { ServiceForm } from "@/components/quote/ServiceForms";
import { QuoteServicesOrganizer } from "@/components/quote/QuoteServicesOrganizer";
import { QuoteSummary } from "@/components/quote/QuoteSummary";
import { QuoteDateEditor } from "@/components/quote/QuoteDateEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateQuotePDF } from "@/components/quote/QuotePDF";
import { QuoteDocuments } from "@/components/quote/QuoteDocuments";
import { ServiceCategoryGrid } from "@/components/quote/ServiceCategoryGrid";
import { ServiceModal } from "@/components/quote/ServiceModal";
import { FullPackageImportModal, type FullPackageImportResult } from "@/components/quote/full-package-import/FullPackageImportModal";
import { QuoteSettingsModal, type QuoteSettingsStep } from "@/components/quote/QuoteSettingsModal";
import { QuoteSignatureCard } from "@/components/quote/QuoteSignatureCard";
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
import { WhatsIncludedEditor } from "@/components/quote/WhatsIncludedEditor";
import { QuoteAdvancedSettings } from "@/components/quote/QuoteAdvancedSettings";
import { AIImportServiceModal, type AIImportResult } from "@/components/shared/AIImportServiceModal";
import { Sparkles, Wallet } from "lucide-react";
import { ExportQuoteToWalletDialog } from "@/components/quote/ExportQuoteToWalletDialog";
import { QuoteEntryExtrasManager } from "@/components/quote/QuoteEntryExtrasManager";
import { MultiSelect } from "@/components/ui/multi-select";
import { parsePaymentMethods, serializePaymentMethods, formatPaymentMethodsInline } from "@/lib/paymentMethods";

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

type PaymentDisplayMode = "installments" | "installments_with_entry" | "full_payment" | "total_only";

/** Layout principal da apresentação do investimento. */
type InvestmentLayout = "legacy" | "consolidated" | "ungrouped" | "grouped";

const PAYMENT_MODE_OPTIONS_INVESTMENT: { value: PaymentDisplayMode; label: string; description: string }[] = [
  { value: "installments", label: "Parcelado (sem entrada)", description: "Ex: 10x de R$ 2.400" },
  { value: "installments_with_entry", label: "Parcelado com entrada", description: "Ex: Entrada + 9x de R$ 2.400" },
  { value: "full_payment", label: "À vista", description: "Ex: R$ 24.000 à vista" },
];

const PAYMENT_MODE_OPTIONS_BOTH: { value: PaymentDisplayMode; label: string; description: string }[] = [
  { value: "installments", label: "Parcelado (sem entrada)", description: "Ex: 10x de R$ 2.400" },
  { value: "installments_with_entry", label: "Parcelado com entrada", description: "Ex: Entrada + 9x de R$ 2.400" },
  { value: "total_only", label: "Valor Total", description: "Exibe o valor consolidado da viagem sem destacar uma condição específica de pagamento." },
];

const PAYMENT_METHOD_OPTIONS = ["Cartão de Crédito", "Pix", "Boleto", "Transferência Bancária"];
const PAYMENT_METHOD_SELECT_OPTIONS = PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }));



function StatusBadge({ status }: { status: Quote["status"] }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Publicado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
      Rascunho
    </span>
  );
}

function IconAction({
  label,
  onClick,
  children,
  destructive,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground/80 transition-colors",
            "hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
            destructive && "hover:bg-rose-50 hover:text-rose-600",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function QuoteHistoryRow({
  q,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  q: Quote;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group grid grid-cols-1 md:grid-cols-[1fr_140px_160px] gap-3 md:gap-6 items-start md:items-center px-4 md:px-5 py-3.5 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3 min-w-0">
        <ClientAvatar name={q.client_name} className="h-10 w-10" />
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate text-[14px] leading-5">{q.client_name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {q.destination && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{q.destination}</span>
              </span>
            )}
            {q.start_date && q.end_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatDateShort(q.start_date)} — {formatDateShort(q.end_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="md:justify-self-start">
        <StatusBadge status={q.status} />
      </div>

      <div className="flex items-center gap-0.5 md:justify-self-end opacity-100 md:opacity-70 md:group-hover:opacity-100 transition-opacity">
        <IconAction label="Visualizar" onClick={onView}><Eye className="h-4 w-4" /></IconAction>
        <IconAction label="Editar" onClick={onEdit}><Pencil className="h-4 w-4" /></IconAction>
        <IconAction label="Duplicar" onClick={onDuplicate}><Copy className="h-4 w-4" /></IconAction>
        <IconAction label="Excluir" onClick={onDelete} destructive><Trash2 className="h-4 w-4" /></IconAction>
      </div>
    </div>
  );
}

type StatusFilter = "all" | "published" | "draft";

function QuotesListSection({
  quotes,
  isLoading,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onCreate,
}: {
  quotes: Quote[];
  isLoading: boolean;
  onView: (q: Quote) => void;
  onEdit: (q: Quote) => void;
  onDuplicate: (q: Quote) => void;
  onDelete: (q: Quote) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = quotes.filter((q) => {
    if (statusFilter !== "all") {
      const target = statusFilter === "published" ? "published" : "draft";
      if (q.status !== target) return false;
    }
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return (
      (q.client_name || "").toLowerCase().includes(needle) ||
      (q.destination || "").toLowerCase().includes(needle)
    );
  });

  const publishedCount = quotes.filter((q) => q.status === "published").length;
  const draftCount = quotes.length - publishedCount;

  return (
    <div className="space-y-4">
      {/* Métricas compactas */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Total", value: quotes.length, dot: "bg-foreground/40" },
            { label: "Publicados", value: publishedCount, dot: "bg-emerald-500" },
            { label: "Rascunhos", value: draftCount, dot: "bg-muted-foreground/50" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                <span className="text-xs font-medium text-muted-foreground truncate">{m.label}</span>
              </div>
              <span className="text-lg font-semibold text-foreground tabular-nums">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar: busca em destaque + filtros sutis */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 sm:max-w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente ou destino..."
            className="pl-9 h-10 rounded-lg bg-background"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-lg gap-2 text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-sm">
                Filtros
                {statusFilter !== "all" && (
                  <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary">
                    1
                  </span>
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Status</p>
            {([
              { v: "all", label: "Todos" },
              { v: "published", label: "Publicado" },
              { v: "draft", label: "Rascunho" },
            ] as { v: StatusFilter; label: string }[]).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setStatusFilter(opt.v)}
                className={cn(
                  "w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors",
                  statusFilter === opt.v ? "bg-muted text-foreground font-medium" : "hover:bg-muted/60",
                )}
              >
                {opt.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Card container */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Header row (desktop) */}
        {filtered.length > 0 && (
          <div className="hidden md:grid grid-cols-[1fr_140px_160px] gap-6 items-center px-5 py-2.5 border-b border-border/60 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Cliente</div>
            <div>Status</div>
            <div className="justify-self-end pr-1">Ações</div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {quotes.length === 0 ? "Nenhum orçamento ainda" : "Nenhum resultado encontrado"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {quotes.length === 0
                ? "Crie seu primeiro orçamento profissional para compartilhar com seus clientes."
                : "Ajuste sua busca ou filtros para encontrar o orçamento desejado."}
            </p>
            {quotes.length === 0 && (
              <Button onClick={onCreate} className="mt-4 h-10 rounded-lg">
                <Plus className="h-4 w-4" />
                Novo Orçamento
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((q) => (
              <QuoteHistoryRow
                key={q.id}
                q={q}
                onView={() => onView(q)}
                onEdit={() => onEdit(q)}
                onDuplicate={() => onDuplicate(q)}
                onDelete={() => onDelete(q)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function GerarOrcamento() {
  const [editingDestination, setEditingDestination] = useState(false);
  const [destinationDraft, setDestinationDraft] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { quotes, isLoading: quotesLoading, createQuote, isCreating, publishQuote, isPublishing, deleteQuote, duplicateQuote, isDuplicating } = useQuotes();
  const {
    quote, addService, updateService, deleteService, reorderServices, isAddingService,
    createSection, renameSection, deleteSection, reorderSections, saveServiceLayout, isSavingSections,
  } = useQuote(id);
  // Seção destino quando o usuário cria um serviço a partir de uma seção
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);
  const [sectionServicePickerOpen, setSectionServicePickerOpen] = useState(false);
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
  const [showAIImport, setShowAIImport] = useState(false);
  const [showFullPackage, setShowFullPackage] = useState(false);
  const [showExportWallet, setShowExportWallet] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [validityDisclaimer, setValidityDisclaimer] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [paymentDisplayMode, setPaymentDisplayMode] = useState<PaymentDisplayMode>("full_payment");
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [entryPercentage, setEntryPercentage] = useState(30);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [fullPaymentDiscountPercent, setFullPaymentDiscountPercent] = useState(0);
  const [investmentSummaryLayout, setInvestmentSummaryLayout] = useState<InvestmentLayout>("legacy");
  const [hideInvestmentTotal, setHideInvestmentTotal] = useState(false);
  
  const [showDetailedLocal, setShowDetailedLocal] = useState<boolean | null>(null);
  const [showInvestmentLocal, setShowInvestmentLocal] = useState<boolean | null>(null);
  const [headerEditDates, setHeaderEditDates] = useState(false);
  const [useServicePayment, setUseServicePayment] = useState(false);
  const [servicePaymentConfigs, setServicePaymentConfigs] = useState<Record<string, ServicePaymentConfig>>({});
  const [newServicePaymentConfig, setNewServicePaymentConfig] = useState<ServicePaymentConfig>({ is_custom_payment: false, payment_type: null, installments: null, entry_value: null, discount_type: null, discount_value: null, payment_method: null });
  const [openSections, setOpenSections] = useState<
    Record<"services" | "summary", boolean>
  >({
    services: false,
    summary: true,
  });
  const toggleSection = (key: "services" | "summary") =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStep, setSettingsStep] = useState<QuoteSettingsStep>("destination");
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
    payment_method_label: serializePaymentMethods(paymentMethods),
    full_payment_discount_percent: fullPaymentDiscountPercent,
    investment_summary_layout: investmentSummaryLayout,
    hide_investment_total: hideInvestmentTotal,
  }), [paymentTerms, paymentDisplayMode, installmentsCount, entryPercentage, paymentMethods, fullPaymentDiscountPercent, investmentSummaryLayout, hideInvestmentTotal]);

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
      const initialPaymentMethods = parsePaymentMethods((quote as any).payment_method_label);
      const initialFullPaymentDiscountPercent = (quote as any).full_payment_discount_percent || 0;
      const initialInvestmentSummaryLayout = ((quote as any).investment_summary_layout as InvestmentLayout | null) || "legacy";
      const initialHideInvestmentTotal = (quote as any).hide_investment_total || false;

      setPaymentTerms(initialPaymentTerms);
      setValidUntil(initialValidUntil);
      setValidityDisclaimer(initialValidityDisclaimer);
      setPaymentDisplayMode(initialPaymentDisplayMode);
      setInstallmentsCount(initialInstallmentsCount);
      setEntryPercentage(initialEntryPercentage);
      setPaymentMethods(initialPaymentMethods);
      setFullPaymentDiscountPercent(initialFullPaymentDiscountPercent);
      setUseServicePayment((quote as any).use_service_payment ?? false);
      setInvestmentSummaryLayout(initialInvestmentSummaryLayout);
      setHideInvestmentTotal(initialHideInvestmentTotal);

      paymentSnapshotRef.current = JSON.stringify({
        payment_terms: initialPaymentTerms || null,
        payment_display_mode: initialPaymentDisplayMode,
        installments_count: initialInstallmentsCount,
        entry_percentage: initialEntryPercentage,
        payment_method_label: serializePaymentMethods(initialPaymentMethods),
        full_payment_discount_percent: initialFullPaymentDiscountPercent,
        investment_summary_layout: initialInvestmentSummaryLayout,
        hide_investment_total: initialHideInvestmentTotal,
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

  const handleToggleHideInvestmentTotal = async (checked: boolean) => {
    if (!quote) return;
    setHideInvestmentTotal(checked);
    await supabase.from("quotes").update({ hide_investment_total: checked } as any).eq("id", quote.id);
  };

  const handleToggleServicePayment = async (checked: boolean) => {
    if (!quote) return;
    setUseServicePayment(checked);
    await supabase.from("quotes").update({ use_service_payment: checked } as any).eq("id", quote.id);
  };

  /**
   * Define o layout principal da apresentação do investimento e sincroniza
   * as flags legadas (show_investment_section / show_detailed_prices) para
   * preservar compatibilidade com orçamentos antigos e com a renderização
   * pública em modo `legacy`.
   */
  const handleSetInvestmentLayout = async (value: InvestmentLayout) => {
    setInvestmentSummaryLayout(value);
    if (!quote) return;

    // Sincroniza flags legadas com base na nova escolha
    const nextShowInvestment = true;
    const nextShowDetailed = value === "grouped" || value === "ungrouped";
    setShowInvestmentLocal(nextShowInvestment);
    setShowDetailedLocal(nextShowDetailed);

    // Normaliza o modo de pagamento: "total_only" só faz sentido nos modos
    // detalhados/agrupados; no consolidado, força um valor inicial coerente.
    let nextPaymentMode = paymentDisplayMode;
    if (value === "consolidated" && paymentDisplayMode === "total_only") {
      nextPaymentMode = "full_payment";
      setPaymentDisplayMode("full_payment");
    }

    // Default: nos modos detalhados/agrupados, o total consolidado fica oculto.
    // O usuário pode reverter manualmente. Mantém escolha existente nos demais casos.
    let nextHideInvestmentTotal = hideInvestmentTotal;
    if ((value === "ungrouped" || value === "grouped") && !hideInvestmentTotal) {
      nextHideInvestmentTotal = true;
      setHideInvestmentTotal(true);
    }

    const { error } = await supabase
      .from("quotes")
      .update({
        investment_summary_layout: value,
        show_investment_section: nextShowInvestment,
        show_detailed_prices: nextShowDetailed,
        payment_display_mode: nextPaymentMode,
        hide_investment_total: nextHideInvestmentTotal,
      } as any)
      .eq("id", quote.id);
    if (error) {
      toast({ title: "Erro ao salvar apresentação", description: error.message, variant: "destructive" });
      return;
    }

    // Mantém o snapshot sincronizado para o autosave debounced não sobrescrever
    try {
      const prev = paymentSnapshotRef.current ? JSON.parse(paymentSnapshotRef.current) : {};
      paymentSnapshotRef.current = JSON.stringify({
        ...prev,
        investment_summary_layout: value,
        payment_display_mode: nextPaymentMode,
        hide_investment_total: nextHideInvestmentTotal,
      });
    } catch { /* ignore */ }
    showAutoSavedFeedback();
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

  const handleGeneratePDF = async () => {
    if (!quote) return;
    await generateQuotePDF(quote, agentProfile);
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

  const handleAIImport = async (result: AIImportResult) => {
    const sd: any = result.service_data || {};
    const amount =
      Number(sd.price) ||
      Number(sd.adult_price) ||
      Number(sd.total) ||
      0;
    await addService({
      service_type: result.service_type as ServiceType,
      service_data: sd,
      amount,
    });
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
    const activeTab = (location.hash === "#list" ? "list" : "create") as "create" | "list";
    const setActiveTab = (val: "create" | "list") => {
      navigate({ pathname: location.pathname, hash: val === "list" ? "#list" : "" }, { replace: true });
    };

    return (
      <DashboardLayout>
        <TooltipProvider delayDuration={150}>
        <div className="space-y-3 animate-fade-in">
          <PageHeader
            pageKey="gerar-orcamento"
            title="Gerar Orçamento"
            subtitle="Crie um orçamento profissional para seu cliente"
            icon={FileText}
          />

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

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "list")} className="w-full">
            <div className="flex items-end justify-between gap-4 border-b border-border/60">
              <TabsList className="h-auto bg-transparent p-0 gap-6 rounded-none justify-start">
                <TabsTrigger
                  value="create"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  Novo Orçamento
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  <span className="flex items-center gap-2">
                    Meus Orçamentos
                    {quotes.length > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                        {quotes.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              </TabsList>

              {activeTab === "list" && quotes.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setActiveTab("create")}
                  className="mb-2 h-9 rounded-lg px-3.5 text-sm shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Novo Orçamento
                </Button>
              )}
            </div>

            <TabsContent value="create" className="mt-5">
              <Card className="max-w-3xl rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-lg font-semibold tracking-tight">Novo Orçamento</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preencha os dados iniciais para criar um orçamento profissional.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
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
            </TabsContent>

            <TabsContent value="list" className="mt-5">
              <QuotesListSection
                quotes={quotes}
                isLoading={quotesLoading}
                onView={(q) => navigate(`/ferramentas-ia/gerar-orcamento/${q.id}`)}
                onEdit={(q) => navigate(`/ferramentas-ia/gerar-orcamento/${q.id}`)}
                onDuplicate={(q) => handleDuplicate(q.id)}
                onDelete={(q) => setDeleteConfirmId(q.id)}
                onCreate={() => setActiveTab("create")}
              />
            </TabsContent>
          </Tabs>

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
        </TooltipProvider>
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
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="sm:size-default" onClick={handleGeneratePDF}>
            <FileText className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Gerar PDF</span><span className="sm:hidden">Gerar PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="sm:size-default"
            onClick={() => setShowExportWallet(true)}
            disabled={!quote.services || quote.services.length === 0}
            title="Reaproveitar serviços numa Carteira Digital"
          >
            <Wallet className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Gerar Carteira</span>
            <span className="sm:hidden">Carteira</span>
          </Button>
          {quote.share_token ? (
            (() => {
              const accessCode = (quote as any).public_access_code;
              const agencyName = agentProfile?.agency_name;
              const publicUrl = accessCode && agencyName
                ? buildOrcamentoLink(agencyName, accessCode)
                : `${ORCAMENTO_DOMAIN}/orcamento/${quote.share_token}`;
              const serviceTypes = (quote.services || []).map((s: any) => s.service_type).filter(Boolean);
              return (
                <div className="flex flex-col gap-2 rounded-md border bg-muted/40 px-2 py-2 max-w-full">
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      readOnly
                      value={publicUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="bg-transparent text-xs outline-none w-[180px] sm:w-[280px] truncate"
                    />
                  </div>
                  <PublicLinkActions
                    type="quote"
                    publicUrl={publicUrl}
                    message={{
                      clientFirstName: quote.client_name,
                      destination: quote.destination,
                      startDate: quote.start_date,
                      endDate: quote.end_date,
                      travelers: {
                        adults: (quote as any).adults_count,
                        children: (quote as any).children_count,
                        infants: (quote as any).infants_count,
                      },
                      serviceTypes,
                      agencyName: agentProfile?.agency_name,
                    }}
                    size="sm"
                  />
                </div>
              );
            })()
          ) : (
            <Button size="sm" className="sm:size-default" onClick={handlePublish} disabled={isPublishing}>
              <LinkIcon className="mr-1 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Gerar Link</span><span className="sm:hidden">Gerar Link</span>
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:gap-6">
          <div className="space-y-4">
            {/* Adicionar Serviços */}
            <Card className="shadow-card">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="w-fit">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                    <Plus className="h-5 w-5 text-sky-500" />
                    Adicionar Serviços
                  </h2>
                  <div className="mt-2 h-1 w-full rounded-full bg-sky-500" />
                </div>
                <ServiceCategoryGrid
                  countByType={serviceCountByType}
                  onSelect={(type) => { setEditingService(null); setSelectedServiceType(type); }}
                  onOpenFullPackage={() => setShowFullPackage(true)}
                  showFullPackage
                />
              </CardContent>
            </Card>

            {/* Serviços adicionados (lista colapsável) */}
            <Card className="shadow-card">
              <button
                type="button"
                onClick={() => toggleSection("services")}
                className="w-full flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 text-left"
                aria-expanded={openSections.services}
              >
                <div className="w-fit">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    Serviços adicionados
                    {quote.services && quote.services.length > 0 && (
                      <Badge variant="secondary" className="text-xs ml-1">{quote.services.length}</Badge>
                    )}
                  </h2>
                  <div className="mt-2 h-1 w-full rounded-full bg-emerald-500" />
                </div>
                <ChevronDown className={cn("h-5 w-5 mt-1 text-muted-foreground transition-transform duration-200 flex-shrink-0", openSections.services && "rotate-180")} />
              </button>
              {openSections.services && (
                <CardContent className="pt-0">
                  {(!quote.services || quote.services.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum serviço adicionado ainda. Use a área acima para adicionar.
                    </p>
                  ) : (
                    <QuoteServicesOrganizer
                      services={quote.services}
                      sections={quote.sections || []}
                      onDeleteService={deleteService}
                      onEditService={handleEditService}
                      onReorderServices={reorderServices}
                      onSaveLayout={saveServiceLayout}
                      onCreateSection={createSection}
                      onRenameSection={renameSection}
                      onDeleteSection={deleteSection}
                      onReorderSections={reorderSections}
                      onAddServiceToSection={(sectionId) => {
                        setPendingSectionId(sectionId);
                        setSectionServicePickerOpen(true);
                      }}
                      isSaving={isSavingSections}
                      currency={quoteCurrencyCode}
                    />
                  )}
                </CardContent>
              )}
            </Card>

            {/* Configurações do Orçamento — clique em qualquer lugar abre o modal */}
            <Card className="shadow-card">
              <button
                type="button"
                onClick={() => { setSettingsStep("destination"); setSettingsOpen(true); }}
                className="w-full text-left px-5 sm:px-6 pt-5 pb-5 hover:bg-muted/30 transition-colors rounded-lg flex items-center justify-between gap-4"
              >
                <div>
                  <div className="w-fit">
                    <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-violet-500" />
                      Configurações do Orçamento
                    </h2>
                    <div className="mt-2 h-1 w-full rounded-full bg-violet-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Destino, investimento, validade e documentos — em etapas guiadas.
                  </p>
                </div>
                <div className="shrink-0 h-10 w-10 rounded-full bg-violet-500 flex items-center justify-center shadow-md">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </button>
            </Card>

            {/* Resumo do Orçamento */}
            <Card className="shadow-card">
              <button
                type="button"
                onClick={() => toggleSection("summary")}
                className="w-full flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 text-left"
                aria-expanded={openSections.summary}
              >
                <div className="w-fit">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-500" />
                    Resumo do Orçamento
                  </h2>
                  <div className="mt-2 h-1 w-full rounded-full bg-amber-500" />
                </div>
                <ChevronDown className={cn("h-5 w-5 mt-1 text-muted-foreground transition-transform duration-200 flex-shrink-0", openSections.summary && "rotate-180")} />
              </button>
              {openSections.summary && (
                <CardContent className="pt-0">
                  <QuoteSummary quote={quote} />
                </CardContent>
              )}
            </Card>

            {/* Escolha uma Assinatura */}
            <QuoteSignatureCard quote={quote} onSaved={() => queryClient.invalidateQueries({ queryKey: ["quote", id] })} />
          </div>
        </div>
      </div>

      {/* Modal de serviço (criação/edição) */}
      <ServiceModal
        open={!!selectedServiceType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedServiceType(null);
            setEditingService(null);
            setPendingSectionId(null);
            setNewServicePaymentConfig({ is_custom_payment: false, payment_type: null, installments: null, entry_value: null, discount_type: null, discount_value: null, payment_method: null });
          }
        }}
        serviceType={selectedServiceType}
        editingService={editingService}
        serviceCountByType={serviceCountByType}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        adultsCount={quote.adults_count}
        childrenCount={quote.children_count}
        isLoading={isAddingService}
        onSubmit={handleAddService}
        newServicePaymentConfig={newServicePaymentConfig}
        setNewServicePaymentConfig={setNewServicePaymentConfig}
        servicePaymentConfigs={servicePaymentConfigs}
        onServicePaymentChange={handleServicePaymentChange}
      />

      {/* Wizard de configurações do orçamento */}
      <QuoteSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialStep={settingsStep}
        onBeforeNavigate={async () => {
          await Promise.all([handleSavePaymentConfig(), handleSaveValidity()]);
        }}
        renderDestination={() => (
          <DestinationIntroEditor
            embedded
            quoteId={quote.id}
            destination={quote.destination}
            showIntro={(quote as any).show_destination_intro !== false}
            introText={(quote as any).destination_intro_text || null}
            introImages={(quote as any).destination_intro_images || []}
            onUpdate={() => {}}
          />
        )}
        renderIncluded={() => (
          <WhatsIncludedEditor
            quote={quote}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["quote", id] });
            }}
          />
        )}
        renderPayment={() => {
          const investOn = showInvestmentLocal !== null ? showInvestmentLocal : (quote as any).show_investment_section !== false;
          const detailedOn = showDetailed;

          // Deriva o layout efetivo: orçamentos antigos (legacy) são mapeados
          // automaticamente para a opção mais próxima na nova UI, sem alterar
          // a configuração persistida até que o agente confirme uma escolha.
          const effectiveLayout: Exclude<InvestmentLayout, "legacy"> =
            investmentSummaryLayout === "legacy"
              ? (detailedOn ? (investOn ? "grouped" : "ungrouped") : "consolidated")
              : investmentSummaryLayout;

          const activePaymentModeOptions = effectiveLayout === "consolidated"
            ? PAYMENT_MODE_OPTIONS_INVESTMENT
            : PAYMENT_MODE_OPTIONS_BOTH;

          // Alerta inteligente: condições de pagamento heterogêneas + consolidado
          const hasMixedServiceConditions = (() => {
            const cfgs = (quote.services || [])
              .map((s: any) => extractServicePaymentConfig(s))
              .filter((c) => c.is_custom_payment && !!c.payment_type);
            if (cfgs.length < 2) return useServicePayment && cfgs.length >= 1;
            const sig = (c: ReturnType<typeof extractServicePaymentConfig>) =>
              `${c.payment_type}|${c.installments}|${c.entry_value}|${c.discount_type}|${c.discount_value}|${c.payment_method ?? ""}`;
            const first = sig(cfgs[0]);
            return cfgs.some((c) => sig(c) !== first);
          })();

          const layoutOptions: { value: Exclude<InvestmentLayout, "legacy">; label: string; description: string }[] = [
            {
              value: "consolidated",
              label: "Valor total do orçamento",
              description: "Soma todos os itens do orçamento em um único valor consolidado. Ideal quando todos os serviços possuem a mesma condição de pagamento, entrada e parcelamento.",
            },
            {
              value: "ungrouped",
              label: "Valores detalhados por serviço",
              description: "Exibe cada serviço separadamente na apresentação do investimento, com seu respectivo valor e condição de pagamento.",
            },
            {
              value: "grouped",
              label: "Agrupar por tipo de serviço",
              description: "Agrupa serviços semelhantes por tipo e condição de pagamento, exibindo o total por categoria e o investimento total da viagem no final.",
            },
          ];

          return (
          <div className="space-y-4">
                  {/* Nova lógica: O QUE exibir para o cliente (3 opções consolidadas) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">O que exibir para o cliente?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {layoutOptions.map((opt) => {
                        const active = effectiveLayout === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSetInvestmentLayout(opt.value)}
                            className={cn(
                              "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                              active
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border hover:border-border/80 hover:bg-muted/30"
                            )}
                            aria-pressed={active}
                          >
                            <div className={cn(
                              "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                              active ? "border-primary" : "border-muted-foreground/40"
                            )}>
                              {active && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Alerta inteligente: condições heterogêneas + consolidado */}
                    {effectiveLayout === "consolidated" && hasMixedServiceConditions && (
                      <div
                        role="alert"
                        className="mt-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                      >
                        <span className="font-semibold">Atenção:</span> este orçamento possui serviços com condições
                        de pagamento diferentes. A opção <span className="font-semibold">“Valor total do orçamento”</span>
                        apresenta uma condição consolidada única. Para evitar confusão, considere usar
                        <span className="font-semibold"> “Valores detalhados por serviço”</span> ou
                        <span className="font-semibold"> “Agrupar por tipo de serviço”</span>. Este aviso aparece somente para você.
                      </div>
                    )}

                    {/* Ocultar total do investimento — disponível nos modos detalhados */}
                    {(effectiveLayout === "ungrouped" || effectiveLayout === "grouped") && (
                      <div className="mt-2 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors">
                        <div className="mt-0.5 shrink-0">
                          <input
                            id="hide-investment-total"
                            type="checkbox"
                            checked={hideInvestmentTotal}
                            onChange={(e) => handleToggleHideInvestmentTotal(e.target.checked)}
                            className="h-4 w-4 rounded border-muted-foreground/40 text-primary focus:ring-primary"
                          />
                        </div>
                        <div className="min-w-0">
                          <label htmlFor="hide-investment-total" className="cursor-pointer text-sm font-medium">
                            Ocultar o valor total do investimento
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Esconde o investimento total consolidado no final do orçamento público. O cliente continua vendo os valores e condições de pagamento de cada serviço individualmente.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {effectiveLayout === "consolidated" && (
                  <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Como exibir o valor para o cliente?</Label>
                    <p className="text-xs text-muted-foreground">
                      {effectiveLayout === "consolidated"
                        ? "Define a condição de pagamento aplicada ao valor consolidado do orçamento."
                        : "Define a condição de pagamento padrão para serviços/grupos que não tenham condição própria configurada."}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {activePaymentModeOptions.map((opt) => (
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
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-sm">Nº de parcelas</Label>
                        <Input type="number" min={2} max={48} value={installmentsCount} onChange={(e) => setInstallmentsCount(Number(e.target.value))} />
                      </div>
                      {quote && (
                        <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium text-primary">
                            Destaque: <span className="font-bold">{installmentsCount}x de {fmt(quote.total_amount / (installmentsCount || 1))}</span>
                            {paymentMethods.length > 0 && <span className="text-muted-foreground font-normal"> via {formatPaymentMethodsInline(paymentMethods)}</span>}
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
                      {quote && effectiveLayout === "consolidated" && (
                        <div className="sm:col-span-2">
                          <QuoteEntryExtrasManager
                            quoteId={quote.id}
                            totalServicos={quote.total_amount}
                            baseEntryValue={quote.total_amount * (entryPercentage / 100)}
                            installmentsCount={installmentsCount}
                            initial={(quote as any).entry_extras || []}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {paymentDisplayMode === "full_payment" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-sm">Desconto à vista (%)</Label>
                        <Input type="number" min={0} max={50} value={fullPaymentDiscountPercent} onChange={(e) => setFullPaymentDiscountPercent(Number(e.target.value))} />
                      </div>
                      {quote && (
                        <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium text-primary">
                            Destaque: <span className="font-bold">{fmt(quote.total_amount * (1 - fullPaymentDiscountPercent / 100))} à vista</span>
                            {fullPaymentDiscountPercent > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">({fullPaymentDiscountPercent}% de desconto{paymentMethods.length > 0 ? ` via ${formatPaymentMethodsInline(paymentMethods)}` : ""})</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                      {paymentDisplayMode === "total_only" && quote && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium text-primary">
                            Destaque: <span className="font-bold">{fmt(quote.total_amount)}</span>
                            <span className="text-xs text-muted-foreground ml-1">(valor total da viagem)</span>
                          </p>
                        </div>
                      )}
                  </>
                  )}

                  <Separator />

                  <div className="space-y-1.5">
                    <Label className="text-sm">Meio de pagamento</Label>
                    <p className="text-xs text-muted-foreground">
                      Selecione um ou mais meios de pagamento aceitos. Eles aparecerão para o cliente em todos os formatos de apresentação do investimento.
                    </p>
                    <MultiSelect
                      options={PAYMENT_METHOD_SELECT_OPTIONS}
                      selected={paymentMethods}
                      onChange={setPaymentMethods}
                      placeholder="Selecione os meios de pagamento..."
                      searchPlaceholder="Buscar meio de pagamento..."
                    />
                  </div>

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

          </div>
          );
        }}
        renderValidity={() => (
          <div className="space-y-3">
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
          </div>
        )}
        renderDocuments={() => (
          <QuoteDocuments
            quoteId={quote.id}
            userId={quote.user_id}
            isOpen={true}
            onToggle={() => {}}
          />
        )}
        renderAdvanced={() => (
          <QuoteAdvancedSettings
            quote={quote}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ["quote", id] })}
          />
        )}
      />

      <AIImportServiceModal
        open={showAIImport}
        onOpenChange={setShowAIImport}
        allowedTypes={["flight","hotel","car_rental","transfer","attraction","insurance","cruise","other"]}
        onImport={handleAIImport}
      />
      <FullPackageImportModal
        open={showFullPackage}
        onOpenChange={setShowFullPackage}
        quoteId={id}
        onConfirmService={async (svc: FullPackageImportResult) => {
          await addService({
            service_type: svc.service_type,
            service_data: svc.service_data as any,
            amount: Number(svc.amount) || 0,
            option_label: svc.option_label ?? null,
            description: svc.description ?? null,
          } as any);
        }}
      />
      <ExportQuoteToWalletDialog
        open={showExportWallet}
        onOpenChange={setShowExportWallet}
        quote={quote}
      />
    </DashboardLayout>
  );
}
