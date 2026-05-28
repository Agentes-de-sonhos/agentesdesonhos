import { useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import {
  Calendar, Users, DollarSign, AlertCircle, Wallet, Plane,
  MoreVertical, Tag, MessageSquare, Edit2, User, History, ListChecks, Paperclip, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Operation } from "@/types/operations";
import { parseLocalDate } from "@/lib/dateParsing";
import { useOperationLabelAssignments } from "@/hooks/useOperationLabels";
import { useOperations } from "@/hooks/useOperations";
import { OperationLabelPicker } from "./OperationLabelPicker";
import { OperationHistoryDialog } from "./OperationHistoryDialog";
import { EditClientDialog } from "../EditClientDialog";

export type OperationCardTab = "overview" | "checklist" | "timeline" | "attachments";

interface Props {
  operation: Operation;
  onClick?: () => void;
  onOpenTab?: (tab: OperationCardTab) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
}

function textColorFor(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1a1a1a" : "#ffffff";
}

export function OperationCard({ operation, onClick, onOpenTab, onDragStart }: Props) {
  const { byOperation } = useOperationLabelAssignments();
  const { deleteOperation } = useOperations();
  const [showLabels, setShowLabels] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const appliedLabels = byOperation[operation.id] || [];

  const daysToTravel = operation.travel_start_date
    ? differenceInCalendarDays(parseLocalDate(operation.travel_start_date)!, new Date())
    : null;

  const travelClose = daysToTravel !== null && daysToTravel >= 0 && daysToTravel <= 14;

  const openTab = (tab: OperationCardTab) => {
    onOpenTab ? onOpenTab(tab) : onClick?.();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, operation.id)}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30",
        operation.priority === "urgente" && "border-l-4 border-l-rose-500"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
          {operation.client?.name || "Cliente"}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          {operation.priority === "urgente" && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Urgente</Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={stop}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground opacity-60 hover:opacity-100"
                aria-label="Ações"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" onClick={stop}>
              <DropdownMenuItem onClick={() => setShowLabels(true)}>
                <Tag className="mr-2 h-4 w-4" /> Etiquetas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTab("timeline")}>
                <MessageSquare className="mr-2 h-4 w-4" /> Anotações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTab("overview")}>
                <Edit2 className="mr-2 h-4 w-4" /> Editar viagem
              </DropdownMenuItem>
              {operation.client && (
                <DropdownMenuItem onClick={() => setShowEditClient(true)}>
                  <User className="mr-2 h-4 w-4" /> Editar cliente
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowHistory(true)}>
                <History className="mr-2 h-4 w-4" /> Histórico
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTab("checklist")}>
                <ListChecks className="mr-2 h-4 w-4" /> Checklist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTab("attachments")}>
                <Paperclip className="mr-2 h-4 w-4" /> Anexos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDelete(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir operação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {appliedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {appliedLabels.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: l.color, color: textColorFor(l.color) }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      {operation.destination && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <Plane className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{operation.destination}</span>
        </div>
      )}

      <div className="space-y-1 text-xs text-muted-foreground">
        {operation.travel_start_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>
              {new Date(operation.travel_start_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </span>
            {daysToTravel !== null && daysToTravel >= 0 && (
              <span className={cn("ml-auto font-medium", travelClose ? "text-orange-600" : "text-muted-foreground")}>
                {daysToTravel === 0 ? "Hoje" : `em ${daysToTravel}d`}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {operation.passengers_count}
          </span>
          {operation.sale_amount > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {operation.sale_amount.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {operation.payment_status !== "pago" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <Wallet className="h-2.5 w-2.5" /> Pgto. {operation.payment_status}
          </Badge>
        )}
        {travelClose && (
          <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-100">
            <AlertCircle className="h-2.5 w-2.5 mr-1" /> Viagem próxima
          </Badge>
        )}
      </div>
    </div>

    <OperationLabelPicker
      operationId={operation.id}
      open={showLabels}
      onOpenChange={setShowLabels}
    />
    <OperationHistoryDialog
      operationId={operation.id}
      open={showHistory}
      onOpenChange={setShowHistory}
    />
    {operation.client && (
      <EditClientDialog
        client={operation.client as any}
        open={showEditClient}
        onOpenChange={setShowEditClient}
      />
    )}
    <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir operação?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Todos os dados, checklist, anotações e anexos serão removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await deleteOperation(operation.id);
              setShowDelete(false);
            }}
            className="bg-destructive text-destructive-foreground"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}