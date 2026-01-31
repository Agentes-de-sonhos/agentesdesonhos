import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { OpportunityCard } from "./OpportunityCard";
import { OpportunityForm } from "./OpportunityForm";
import { useOpportunities, useClients } from "@/hooks/useCRM";
import { STAGES_ORDER, STAGE_LABELS, STAGE_COLORS, type OpportunityStage, type Opportunity } from "@/types/crm";
import { cn } from "@/lib/utils";

export function KanbanBoard() {
  const { opportunities, isLoading, updateStage } = useOpportunities();
  const { clients } = useClients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
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

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
          {STAGES_ORDER.map((stage) => {
            const stageOpportunities = getOpportunitiesByStage(stage);
            const total = getTotalValue(stage);

            return (
              <div
                key={stage}
                className="w-[280px] flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", STAGE_COLORS[stage])} />
                      <h3 className="font-medium text-sm">{STAGE_LABELS[stage]}</h3>
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded">
                        {stageOpportunities.length}
                      </span>
                    </div>
                  </div>
                  {total > 0 && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Total: {formatCurrency(total)}
                    </p>
                  )}
                  <div className="space-y-2 min-h-[100px]">
                    {stageOpportunities.map((opportunity) => (
                      <OpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        onDragStart={handleDragStart}
                      />
                    ))}
                    {stageOpportunities.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Arraste cards aqui
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
