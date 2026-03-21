import { useState, useRef, useCallback } from "react";
import { format, differenceInDays, differenceInHours, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Filter, Clock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpportunityCard } from "./OpportunityCard";
import { OpportunityForm } from "./OpportunityForm";
import { useOpportunities, useClients } from "@/hooks/useCRM";
import {
  STAGES_ORDER,
  STAGE_LABELS,
  STAGE_COLORS,
  STAGE_BG_COLORS,
  STAGE_BORDER_COLORS,
  STAGE_TEXT_COLORS,
  type OpportunityStage,
  type Opportunity,
} from "@/types/crm";
import { cn } from "@/lib/utils";

export function KanbanBoard() {
  const { opportunities, isLoading, updateStage } = useOpportunities();
  const { clients } = useClients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Drag-to-scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingScroll = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only initiate drag-scroll if clicking on the background, not on a card
    if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
    isDraggingScroll.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingScroll.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingScroll.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "";
    }
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }, []);

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.destination.toLowerCase().includes(search.toLowerCase()) ||
      opp.client?.name.toLowerCase().includes(search.toLowerCase());
    const matchesClient = filterClient === "all" || opp.client_id === filterClient;
    return matchesSearch && matchesClient;
  });

  const getOpportunitiesByStage = (stage: OpportunityStage) =>
    filteredOpportunities.filter((o) => o.stage === stage);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, toStage: OpportunityStage) => {
    e.preventDefault();
    if (!draggedId) return;

    const opportunity = opportunities.find((o) => o.id === draggedId);
    if (opportunity && opportunity.stage !== toStage) {
      await updateStage({
        id: draggedId,
        fromStage: opportunity.stage,
        toStage,
      });
    }
    setDraggedId(null);
  };

  const getTotalValue = (stage: OpportunityStage) =>
    getOpportunitiesByStage(stage).reduce((sum, o) => sum + o.estimated_value, 0);

  const getAverageTimeInStage = (stage: OpportunityStage) => {
    const stageOpps = getOpportunitiesByStage(stage);
    if (stageOpps.length === 0) return null;

    const totalHours = stageOpps.reduce((sum, opp) => {
      const enteredAt = new Date(opp.stage_entered_at);
      return sum + differenceInHours(new Date(), enteredAt);
    }, 0);

    const avgHours = totalHours / stageOpps.length;
    if (avgHours < 24) return `${Math.round(avgHours)}h`;
    return `${Math.round(avgHours / 24)}d`;
  };

  const hasOverdueFollowUp = (opp: Opportunity) => {
    if (!opp.follow_up_date) return false;
    const followUpDate = new Date(opp.follow_up_date);
    return isPast(followUpDate) && !isToday(followUpDate);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar oportunidades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova Oportunidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Oportunidade</DialogTitle>
              </DialogHeader>
              <OpportunityForm
                onSuccess={() => setIsDialogOpen(false)}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Scroll navigation arrows */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => scrollBy("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Arraste ou use as setas para navegar entre as etapas
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => scrollBy("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Kanban container with drag-to-scroll and edge fades */}
        <div className="relative">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="overflow-x-auto cursor-grab pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
            style={{ scrollbarWidth: "thin" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="flex gap-4" style={{ minWidth: "max-content" }}>
              {STAGES_ORDER.map((stage) => {
                const stageOpportunities = getOpportunitiesByStage(stage);
                const total = getTotalValue(stage);
                const avgTime = getAverageTimeInStage(stage);
                const overdueCount = stageOpportunities.filter(hasOverdueFollowUp).length;

                return (
                  <div
                    key={stage}
                    className="w-[290px] flex-shrink-0"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage)}
                  >
                    <div
                      className={cn(
                        "rounded-xl border p-3 min-h-[400px]",
                        STAGE_BG_COLORS[stage],
                        STAGE_BORDER_COLORS[stage]
                      )}
                    >
                      {/* Column header with colored top bar */}
                      <div className={cn("h-1.5 rounded-full mb-3", STAGE_COLORS[stage])} />

                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className={cn("font-semibold text-sm", STAGE_TEXT_COLORS[stage])}>
                            {STAGE_LABELS[stage]}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs px-1.5 py-0 font-bold",
                              STAGE_TEXT_COLORS[stage]
                            )}
                          >
                            {stageOpportunities.length}
                          </Badge>
                        </div>
                        {overdueCount > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="destructive" className="text-xs px-1.5 py-0 gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {overdueCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {overdueCount} follow-up(s) atrasado(s)
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mb-3 text-xs font-medium">
                        {total > 0 && (
                          <span className={cn(STAGE_TEXT_COLORS[stage])}>
                            {formatCurrency(total)}
                          </span>
                        )}
                        {avgTime && (
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{avgTime}</span>
                            </TooltipTrigger>
                            <TooltipContent>Tempo médio na etapa</TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="space-y-2.5 min-h-[100px]">
                        {stageOpportunities.map((opportunity) => (
                          <OpportunityCard
                            key={opportunity.id}
                            opportunity={opportunity}
                            onDragStart={handleDragStart}
                            isOverdue={hasOverdueFollowUp(opportunity)}
                            stageColor={stage}
                          />
                        ))}
                        {stageOpportunities.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg border-muted-foreground/20">
                            Arraste cards aqui
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
