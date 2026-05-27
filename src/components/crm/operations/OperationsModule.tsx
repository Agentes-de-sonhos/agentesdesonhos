import { useMemo, useState } from "react";
import { Plus, Kanban as KanbanIcon, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOperations } from "@/hooks/useOperations";
import { OPERATION_STAGES, type Operation, type OperationStage } from "@/types/operations";
import { OperationCard } from "./OperationCard";
import { OperationDetailDialog } from "./OperationDetailDialog";
import { CreateOperationDialog } from "./CreateOperationDialog";
import { parseLocalDate } from "@/lib/dateParsing";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function OperationsModule() {
  const { operations, isLoading, moveStage } = useOperations();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [calDate, setCalDate] = useState<Date | undefined>(new Date());

  const filtered = useMemo(
    () =>
      operations.filter((o) => {
        const q = search.toLowerCase();
        return (
          !q ||
          o.title.toLowerCase().includes(q) ||
          o.destination?.toLowerCase().includes(q) ||
          o.client?.name?.toLowerCase().includes(q)
        );
      }),
    [operations, search]
  );

  const byStage = useMemo(() => {
    const m = new Map<OperationStage, Operation[]>();
    OPERATION_STAGES.forEach((s) => m.set(s.key, []));
    filtered.forEach((o) => m.get(o.stage)?.push(o));
    return m;
  }, [filtered]);

  // Calendar events: travel_start_date (embarque) + travel_end_date (retorno)
  const eventsByDate = useMemo(() => {
    const m = new Map<string, { op: Operation; type: "embarque" | "retorno" }[]>();
    filtered.forEach((o) => {
      if (o.travel_start_date) {
        const k = o.travel_start_date;
        m.set(k, [...(m.get(k) || []), { op: o, type: "embarque" }]);
      }
      if (o.travel_end_date) {
        const k = o.travel_end_date;
        m.set(k, [...(m.get(k) || []), { op: o, type: "retorno" }]);
      }
    });
    return m;
  }, [filtered]);

  const eventsOnSelected = useMemo(() => {
    if (!calDate) return [];
    const key = format(calDate, "yyyy-MM-dd");
    return eventsByDate.get(key) || [];
  }, [calDate, eventsByDate]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, stage: OperationStage) => {
    e.preventDefault();
    if (!draggedId) return;
    const op = operations.find((o) => o.id === draggedId);
    if (op && op.stage !== stage) {
      await moveStage({ id: draggedId, stage });
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar operações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Operação
        </Button>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1.5"><KanbanIcon className="h-4 w-4" />Kanban</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" />Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-6 text-center">Carregando operações...</div>
          ) : filtered.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
              <p className="font-medium">Nenhuma operação ainda</p>
              <p className="text-sm mt-1">Feche uma oportunidade ou clique em "Nova Operação" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4 touch-pan-x">
              <div className="flex gap-4" style={{ minWidth: "max-content" }}>
                {OPERATION_STAGES.map((stage) => {
                  const ops = byStage.get(stage.key) || [];
                  return (
                    <div
                      key={stage.key}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage.key)}
                      className={cn("w-[290px] flex-shrink-0 rounded-xl border p-3 min-h-[400px]", stage.bg, stage.border)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                          <h3 className={cn("font-semibold text-sm", stage.text)}>{stage.label}</h3>
                        </div>
                        <Badge variant="secondary" className="text-xs">{ops.length}</Badge>
                      </div>
                      <div className="space-y-2.5">
                        {ops.map((op) => (
                          <OperationCard
                            key={op.id}
                            operation={op}
                            onClick={() => setSelected(op)}
                            onDragStart={handleDragStart}
                          />
                        ))}
                        {ops.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground/70 border-2 border-dashed rounded-lg border-muted-foreground/15">
                            Nenhuma operação
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="grid md:grid-cols-[auto_1fr] gap-6">
            <div>
              <Calendar
                mode="single"
                selected={calDate}
                onSelect={setCalDate}
                locale={ptBR}
                modifiers={{
                  hasEvent: (date) => eventsByDate.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersClassNames={{
                  hasEvent: "font-bold bg-primary/10 text-primary",
                }}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">
                {calDate ? format(calDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
              </h3>
              {eventsOnSelected.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma operação neste dia.</p>
              ) : (
                eventsOnSelected.map(({ op, type }) => (
                  <div
                    key={`${op.id}-${type}`}
                    onClick={() => setSelected(op)}
                    className="cursor-pointer p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{op.client?.name}</span>
                      <Badge variant={type === "embarque" ? "default" : "secondary"} className="text-[10px]">
                        {type === "embarque" ? "Embarque" : "Retorno"}
                      </Badge>
                    </div>
                    {op.destination && <p className="text-xs text-muted-foreground mt-1">{op.destination}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateOperationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <OperationDetailDialog
        operation={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}