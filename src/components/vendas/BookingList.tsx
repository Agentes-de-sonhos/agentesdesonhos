import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye } from "lucide-react";
import { Booking, BOOKING_STATUSES } from "@/hooks/useBookings";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  negociacao: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-blue-100 text-blue-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

interface Props {
  bookings: Booking[];
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function BookingList({ bookings, onNew, onSelect, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vendas ({bookings.length})</h2>
        <Button onClick={onNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Venda
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma venda cadastrada. Clique em "Nova Venda" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b) => (
            <Card key={b.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(b.id)}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.trip_name}</span>
                    <Badge className={statusColors[b.status] || ""}>{BOOKING_STATUSES[b.status] || b.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {b.client?.name || "Sem cliente"} 
                    {b.start_date && ` • ${format(new Date(b.start_date + "T00:00:00"), "dd/MM/yyyy")}`}
                    {b.end_date && ` - ${format(new Date(b.end_date + "T00:00:00"), "dd/MM/yyyy")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-primary">
                    R$ {Number(b.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
