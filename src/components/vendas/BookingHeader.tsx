import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X, CalendarDays, User } from "lucide-react";
import { Booking, BOOKING_STATUSES, STATUS_COLORS, useClients } from "@/hooks/useBookings";
import { useBookings } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  booking: Booking;
}

export function BookingHeader({ booking }: Props) {
  const { updateBooking } = useBookings();
  const { data: clients = [] } = useClients();
  const [editing, setEditing] = useState(false);
  const [tripName, setTripName] = useState(booking.trip_name);
  const [clientId, setClientId] = useState(booking.client_id || "");
  const [status, setStatus] = useState(booking.status);
  const [startDate, setStartDate] = useState(booking.start_date || "");
  const [endDate, setEndDate] = useState(booking.end_date || "");

  const save = () => {
    updateBooking.mutate({
      id: booking.id,
      trip_name: tripName,
      client_id: clientId || null,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setEditing(false);
  };

  const cancel = () => {
    setTripName(booking.trip_name);
    setClientId(booking.client_id || "");
    setStatus(booking.status);
    setStartDate(booking.start_date || "");
    setEndDate(booking.end_date || "");
    setEditing(false);
  };

  const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.lead;

  if (editing) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Viagem</label>
              <Input value={tripName} onChange={(e) => setTripName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Sem cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(BOOKING_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Início</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fim</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={cancel} className="gap-1"><X className="h-3 w-3" /> Cancelar</Button>
            <Button size="sm" onClick={save} className="gap-1"><Check className="h-3 w-3" /> Salvar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{booking.trip_name}</h1>
              <Badge className={`${colors.bg} ${colors.text} border-0`}>
                {BOOKING_STATUSES[booking.status] || booking.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {booking.client?.name || "Sem cliente vinculado"}
              </span>
              {booking.start_date && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(new Date(booking.start_date + "T00:00:00"), "dd/MM/yyyy")}
                  {booking.end_date && ` → ${format(new Date(booking.end_date + "T00:00:00"), "dd/MM/yyyy")}`}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
