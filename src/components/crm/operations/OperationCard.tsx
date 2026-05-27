import { differenceInCalendarDays } from "date-fns";
import { Calendar, Users, DollarSign, AlertCircle, FileWarning, Wallet, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Operation } from "@/types/operations";
import { parseLocalDate } from "@/lib/dateParsing";

interface Props {
  operation: Operation;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
}

export function OperationCard({ operation, onClick, onDragStart }: Props) {
  const daysToTravel = operation.travel_start_date
    ? differenceInCalendarDays(parseLocalDate(operation.travel_start_date)!, new Date())
    : null;

  const travelClose = daysToTravel !== null && daysToTravel >= 0 && daysToTravel <= 14;

  return (
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
        <h4 className="font-semibold text-sm leading-tight line-clamp-2">
          {operation.client?.name || "Cliente"}
        </h4>
        {operation.priority === "urgente" && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Urgente
          </Badge>
        )}
      </div>

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
  );
}