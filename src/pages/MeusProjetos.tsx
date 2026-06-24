import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SlidersHorizontal,
  FileText,
  Wallet,
  Route,
  StickyNote,
  Pencil,
  Copy,
  Trash2,
  Loader2,
  FolderOpen,
  MapPin,
  Calendar,
  Star,
  Eye,
  Link2,
  Plus,
} from "lucide-react";
import { ClientAvatar } from "@/components/shared/ClientAvatar";
import { useNotes } from "@/hooks/useNotes";
import { BlocoNotasContent } from "@/pages/BlocoNotas";
import { useQuotes } from "@/hooks/useQuotes";
import { useTrips } from "@/hooks/useTrips";
import { useItineraries } from "@/hooks/useItineraries";
import { useSubscription } from "@/hooks/useSubscription";
import { useItineraryTemplates } from "@/hooks/useItineraryTemplates";
import { TemplatesGrid } from "@/components/itinerary/TemplatesGrid";
import { SaveAsTemplateDialog } from "@/components/itinerary/SaveAsTemplateDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
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
import type { Itinerary } from "@/types/itinerary";

type StatusFilter = "all" | "draft" | "published";
type SortOrder = "recent" | "az";
type ProjectType = "quote" | "trip" | "itinerary";

interface ProjectItem {
  id: string;
  name: string;
  destination: string;
  date: string;
  status: "draft" | "published";
  type: ProjectType;
}

const TYPE_LABELS: Record<ProjectType, string> = {
  quote: "Orçamento",
  trip: "Carteira Digital",
  itinerary: "Roteiro",
};

const TYPE_ICON: Record<ProjectType, React.ElementType> = {
  quote: FileText,
  trip: Wallet,
  itinerary: Route,
};

function normalizeItems(
  quotes: any[],
  trips: any[],
  itineraries: any[]
): { quotes: ProjectItem[]; trips: ProjectItem[]; itineraries: ProjectItem[] } {
  return {
    quotes: quotes.map((q) => ({
      id: q.id,
      name: q.client_name || "Sem nome",
      destination: q.destination || "—",
      date: q.created_at,
      status: q.status === "published" ? "published" : "draft",
      type: "quote" as const,
    })),
    trips: trips.map((t) => ({
      id: t.id,
      name: t.client_name || "Sem nome",
      destination: t.destination || "—",
      date: t.created_at,
      status: t.status === "active" ? "published" : "draft",
      type: "trip" as const,
    })),
    itineraries: itineraries.map((i) => ({
      id: i.id,
      name: i.destination || "Sem nome",
      destination: i.destination || "—",
      date: i.createdAt || i.created_at,
      status: i.status === "published" || i.status === "approved" ? "published" : "draft",
      type: "itinerary" as const,
    })),
  };
}

function filterAndSort(
  items: ProjectItem[],
  search: string,
  statusFilter: StatusFilter,
  sortOrder: SortOrder
): ProjectItem[] {
  let filtered = items;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.destination.toLowerCase().includes(q)
    );
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((item) => item.status === statusFilter);
  }

  if (sortOrder === "az") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered = [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  return filtered;
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: ProjectItem["status"] }) {
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
            destructive && "hover:bg-rose-50 hover:text-rose-600"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function TypeBadge({ type }: { type: ProjectType }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon className="h-3 w-3" />
      {TYPE_LABELS[type]}
    </span>
  );
}

export default function MeusProjetos() {
  const navigate = useNavigate();
  const { plan, isPromotor } = useSubscription();
  const isStartPlan = !isPromotor && plan === "start";
  const [activeTab, setActiveTab] = useState(isStartPlan ? "roteiros" : "orcamentos");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [templateTarget, setTemplateTarget] = useState<Itinerary | null>(null);

  const { quotes, isLoading: quotesLoading, deleteQuote, duplicateQuote } = useQuotes();
  const { trips, isLoading: tripsLoading, deleteTrip } = useTrips();
  const { itineraries, isLoading: itinerariesLoading, deleteItinerary } = useItineraries();
  const { templates } = useItineraryTemplates();

  const normalized = useMemo(
    () => normalizeItems(quotes, trips, itineraries),
    [quotes, trips, itineraries]
  );

  const itemsByTab = useMemo(() => {
    switch (activeTab) {
      case "orcamentos":
        return normalized.quotes;
      case "carteiras":
        return normalized.trips;
      case "roteiros":
        return normalized.itineraries;
      default:
        return [];
    }
  }, [activeTab, normalized]);

  const filteredItems = useMemo(
    () => filterAndSort(itemsByTab, search, statusFilter, sortOrder),
    [itemsByTab, search, statusFilter, sortOrder]
  );

  const isLoading = quotesLoading || tripsLoading || itinerariesLoading;

  const handleEdit = (item: ProjectItem) => {
    switch (item.type) {
      case "quote":
        navigate(`/ferramentas-ia/gerar-orcamento/${item.id}`);
        break;
      case "trip":
        navigate(`/ferramentas-ia/trip-wallet/${item.id}`);
        break;
      case "itinerary":
        navigate(`/ferramentas-ia/criar-roteiro/${item.id}`);
        break;
    }
  };

  const handleDuplicate = (item: ProjectItem) => {
    if (item.type === "quote") {
      duplicateQuote(item.id);
    } else {
      toast.info("Funcionalidade de duplicar disponível em breve para este tipo.");
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case "quote":
        deleteQuote(deleteTarget.id);
        break;
      case "trip":
        deleteTrip(deleteTarget.id);
        break;
      case "itinerary":
        deleteItinerary.mutate(deleteTarget.id);
        break;
    }
    setDeleteTarget(null);
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case "orcamentos":
        return normalized.quotes.length;
      case "carteiras":
        return normalized.trips.length;
      case "roteiros":
        return normalized.itineraries.length;
      case "modelos":
        return templates.length;
      default:
        return 0;
    }
  };

  const metrics = useMemo(() => {
    const total = itemsByTab.length;
    const published = itemsByTab.filter((i) => i.status === "published").length;
    const draft = total - published;
    return { total, published, draft };
  }, [itemsByTab]);

  const emptyStateMessage = () => {
    if (search || statusFilter !== "all") {
      return {
        title: "Nenhum resultado encontrado",
        description: "Ajuste sua busca ou filtros para encontrar o projeto desejado.",
      };
    }
    switch (activeTab) {
      case "orcamentos":
        return {
          title: "Nenhum orçamento ainda",
          description: "Crie seu primeiro orçamento profissional para compartilhar com seus clientes.",
          cta: { label: "Novo Orçamento", path: "/ferramentas-ia/gerar-orcamento" },
        };
      case "carteiras":
        return {
          title: "Nenhuma carteira digital ainda",
          description: "Crie sua primeira carteira digital para organizar a viagem do seu cliente.",
          cta: { label: "Nova Carteira", path: "/ferramentas-ia/trip-wallet" },
        };
      case "roteiros":
        return {
          title: "Nenhum roteiro ainda",
          description: "Crie seu primeiro roteiro com a ajuda da IA ou manualmente.",
          cta: { label: "Novo Roteiro", path: "/ferramentas-ia/criar-roteiro" },
        };
      default:
        return { title: "Nenhum item encontrado", description: "" };
    }
  };

  const ProjectRow = ({ item }: { item: ProjectItem }) => {
    return (
      <div className="group grid grid-cols-1 md:grid-cols-[1fr_140px_180px] gap-3 md:gap-6 items-start md:items-center px-4 md:px-5 py-3.5 transition-colors hover:bg-muted/40">
        <div className="flex items-start gap-3 min-w-0">
          <ClientAvatar name={item.name} className="h-10 w-10" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="font-medium text-foreground truncate text-[14px] leading-5 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleEdit(item)}
              >
                {item.name}
              </p>
              <TypeBadge type={item.type} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{item.destination}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(item.date)}
              </span>
            </div>
          </div>
        </div>

        <div className="md:justify-self-start">
          <StatusBadge status={item.status} />
        </div>

        <div className="flex items-center gap-0.5 md:justify-self-end opacity-100 md:opacity-70 md:group-hover:opacity-100 transition-opacity">
          <IconAction label="Visualizar" onClick={() => handleEdit(item)}>
            <Eye className="h-4 w-4" />
          </IconAction>
          <IconAction label="Editar" onClick={() => handleEdit(item)}>
            <Pencil className="h-4 w-4" />
          </IconAction>
          {item.type !== "itinerary" ? (
            <IconAction label="Duplicar" onClick={() => handleDuplicate(item)}>
              <Copy className="h-4 w-4" />
            </IconAction>
          ) : (
            <IconAction
              label="Salvar como modelo"
              onClick={() => {
                const found = itineraries.find((i: any) => i.id === item.id);
                if (found) setTemplateTarget(found as Itinerary);
              }}
            >
              <Star className="h-4 w-4" />
            </IconAction>
          )}
          {item.type === "itinerary" && (
            <IconAction label="Publicar / Link" onClick={() => handleEdit(item)}>
              <Link2 className="h-4 w-4" />
            </IconAction>
          )}
          {item.type === "itinerary" && (
            <IconAction label="Gerar PDF" onClick={() => handleEdit(item)}>
              <FileText className="h-4 w-4" />
            </IconAction>
          )}
          <IconAction label="Excluir" destructive onClick={() => setDeleteTarget(item)}>
            <Trash2 className="h-4 w-4" />
          </IconAction>
        </div>
      </div>
    );
  };

  const renderList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredItems.length === 0) {
      const message = emptyStateMessage();
      const Icon = TYPE_ICON[activeTab as ProjectType] || FolderOpen;
      return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{message.title}</p>
          {message.description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{message.description}</p>
          )}
          {message.cta && (
            <Button onClick={() => navigate(message.cta!.path)} className="mt-4 h-10 rounded-lg">
              <Plus className="h-4 w-4" />
              {message.cta!.label}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="divide-y divide-border/50">
        {filteredItems.map((item) => (
          <ProjectRow key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Meus Projetos
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Gerencie todos os seus orçamentos, carteiras digitais e roteiros em um só lugar.
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1 sm:max-w-[380px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cliente ou destino..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-lg bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
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
                  {(
                    [
                      { v: "all", label: "Todos" },
                      { v: "published", label: "Publicado" },
                      { v: "draft", label: "Rascunho" },
                    ] as { v: StatusFilter; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setStatusFilter(opt.v)}
                      className={cn(
                        "w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors",
                        statusFilter === opt.v
                          ? "bg-muted text-foreground font-medium"
                          : "hover:bg-muted/60"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                <SelectTrigger className="w-[150px] h-10 rounded-lg">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="az">Nome A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-border/60">
              <TabsList className="h-auto w-full sm:w-auto bg-transparent p-0 gap-4 sm:gap-6 rounded-none justify-start overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                {!isStartPlan && (
                  <TabsTrigger
                    value="orcamentos"
                    className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Orçamentos</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                      {getTabCount("orcamentos")}
                    </Badge>
                  </TabsTrigger>
                )}
                {!isStartPlan && (
                  <TabsTrigger
                    value="carteiras"
                    className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                  >
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">Carteiras</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                      {getTabCount("carteiras")}
                    </Badge>
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="roteiros"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  <Route className="h-4 w-4" />
                  <span className={cn(isStartPlan ? "inline" : "hidden sm:inline")}>Roteiros</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                    {getTabCount("roteiros")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="modelos"
                  className="relative h-auto rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100"
                >
                  <Star className="h-4 w-4" />
                  <span className={cn(isStartPlan ? "inline" : "hidden sm:inline")}>Modelos</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                    {getTabCount("modelos")}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            {!isStartPlan && (
              <TabsContent value="orcamentos" className="mt-5 space-y-4">
                {metrics.total > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "Total", value: metrics.total, dot: "bg-foreground/40" },
                      { label: "Publicados", value: metrics.published, dot: "bg-emerald-500" },
                      { label: "Rascunhos", value: metrics.draft, dot: "bg-muted-foreground/50" },
                    ].map((m) => (
                      <Card
                        key={m.label}
                        className="rounded-xl border-border/60 bg-card px-4 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                          <span className="text-xs font-medium text-muted-foreground truncate">{m.label}</span>
                        </div>
                        <span className="text-lg font-semibold text-foreground tabular-nums">{m.value}</span>
                      </Card>
                    ))}
                  </div>
                )}
                <Card className="rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                  {filteredItems.length > 0 && (
                    <div className="hidden md:grid grid-cols-[1fr_140px_180px] gap-6 items-center px-5 py-2.5 border-b border-border/60 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <div>Cliente</div>
                      <div>Status</div>
                      <div className="justify-self-end pr-1">Ações</div>
                    </div>
                  )}
                  {renderList()}
                </Card>
              </TabsContent>
            )}
            {!isStartPlan && (
              <TabsContent value="carteiras" className="mt-5 space-y-4">
                {metrics.total > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "Total", value: metrics.total, dot: "bg-foreground/40" },
                      { label: "Ativas", value: metrics.published, dot: "bg-emerald-500" },
                      { label: "Rascunhos", value: metrics.draft, dot: "bg-muted-foreground/50" },
                    ].map((m) => (
                      <Card
                        key={m.label}
                        className="rounded-xl border-border/60 bg-card px-4 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                          <span className="text-xs font-medium text-muted-foreground truncate">{m.label}</span>
                        </div>
                        <span className="text-lg font-semibold text-foreground tabular-nums">{m.value}</span>
                      </Card>
                    ))}
                  </div>
                )}
                <Card className="rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                  {filteredItems.length > 0 && (
                    <div className="hidden md:grid grid-cols-[1fr_140px_180px] gap-6 items-center px-5 py-2.5 border-b border-border/60 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <div>Cliente</div>
                      <div>Status</div>
                      <div className="justify-self-end pr-1">Ações</div>
                    </div>
                  )}
                  {renderList()}
                </Card>
              </TabsContent>
            )}
            <TabsContent value="roteiros" className="mt-5 space-y-4">
              {metrics.total > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Total", value: metrics.total, dot: "bg-foreground/40" },
                    { label: "Publicados", value: metrics.published, dot: "bg-emerald-500" },
                    { label: "Rascunhos", value: metrics.draft, dot: "bg-muted-foreground/50" },
                  ].map((m) => (
                    <Card
                      key={m.label}
                      className="rounded-xl border-border/60 bg-card px-4 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                        <span className="text-xs font-medium text-muted-foreground truncate">{m.label}</span>
                      </div>
                      <span className="text-lg font-semibold text-foreground tabular-nums">{m.value}</span>
                    </Card>
                  ))}
                </div>
              )}
              <Card className="rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                {filteredItems.length > 0 && (
                  <div className="hidden md:grid grid-cols-[1fr_140px_180px] gap-6 items-center px-5 py-2.5 border-b border-border/60 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <div>Cliente</div>
                    <div>Status</div>
                    <div className="justify-self-end pr-1">Ações</div>
                  </div>
                )}
                {renderList()}
              </Card>
            </TabsContent>
            <TabsContent value="modelos" className="mt-5">
              <TemplatesGrid />
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir item</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save as template */}
        {templateTarget && (
          <SaveAsTemplateDialog
            open={!!templateTarget}
            onOpenChange={(open) => !open && setTemplateTarget(null)}
            itinerary={templateTarget}
          />
        )}
      </TooltipProvider>
    </DashboardLayout>
  );
}
