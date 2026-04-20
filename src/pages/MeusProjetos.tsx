import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreVertical,
  FileText,
  Wallet,
  Route,
  Pencil,
  Copy,
  Trash2,
  Loader2,
  FolderOpen,
  MapPin,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { useTrips } from "@/hooks/useTrips";
import { useItineraries } from "@/hooks/useItineraries";
import { useSubscription } from "@/hooks/useSubscription";
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

type StatusFilter = "all" | "draft" | "published";
type SortOrder = "recent" | "az";

interface ProjectItem {
  id: string;
  name: string;
  destination: string;
  date: string;
  status: "draft" | "published";
  type: "quote" | "trip" | "itinerary";
}

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

export default function MeusProjetos() {
  const navigate = useNavigate();
  const { plan, isPromotor } = useSubscription();
  const isStartPlan = !isPromotor && plan === "start";
  const [activeTab, setActiveTab] = useState(isStartPlan ? "roteiros" : "orcamentos");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);

  const { quotes, isLoading: quotesLoading, deleteQuote, duplicateQuote } = useQuotes();
  const { trips, isLoading: tripsLoading, deleteTrip } = useTrips();
  const { itineraries, isLoading: itinerariesLoading, deleteItinerary } = useItineraries();

  const normalized = useMemo(
    () => normalizeItems(quotes, trips, itineraries),
    [quotes, trips, itineraries]
  );

  const filteredQuotes = useMemo(
    () => filterAndSort(normalized.quotes, search, statusFilter, sortOrder),
    [normalized.quotes, search, statusFilter, sortOrder]
  );
  const filteredTrips = useMemo(
    () => filterAndSort(normalized.trips, search, statusFilter, sortOrder),
    [normalized.trips, search, statusFilter, sortOrder]
  );
  const filteredItineraries = useMemo(
    () => filterAndSort(normalized.itineraries, search, statusFilter, sortOrder),
    [normalized.itineraries, search, statusFilter, sortOrder]
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
      case "orcamentos": return normalized.quotes.length;
      case "carteiras": return normalized.trips.length;
      case "roteiros": return normalized.itineraries.length;
      default: return 0;
    }
  };

  const renderList = (items: ProjectItem[], loading: boolean) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-muted-foreground font-medium">Nenhum item encontrado</p>
            <p className="text-sm text-muted-foreground/70">
              {search ? "Tente alterar os filtros de busca." : "Comece criando seu primeiro projeto!"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex h-10 w-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                  {item.type === "quote" && <FileText className="h-5 w-5 text-primary" />}
                  {item.type === "trip" && <Wallet className="h-5 w-5 text-primary" />}
                  {item.type === "itinerary" && <Route className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors" onClick={() => handleEdit(item)}>{item.name}</h3>
                    <Badge
                      variant={item.status === "published" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.status === "published" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {item.destination}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(item.date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hidden sm:flex"
                    onClick={() => handleEdit(item)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(item)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
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

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cliente ou destino..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-[150px]">
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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="orcamentos" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Orçamentos</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {getTabCount("orcamentos")}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="carteiras" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Carteiras</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {getTabCount("carteiras")}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="roteiros" className="gap-2">
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Roteiros</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {getTabCount("roteiros")}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orcamentos" className="mt-4">
            {renderList(filteredQuotes, quotesLoading)}
          </TabsContent>
          <TabsContent value="carteiras" className="mt-4">
            {renderList(filteredTrips, tripsLoading)}
          </TabsContent>
          <TabsContent value="roteiros" className="mt-4">
            {renderList(filteredItineraries, itinerariesLoading)}
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
    </DashboardLayout>
  );
}
