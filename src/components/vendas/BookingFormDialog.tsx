import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BOOKING_STATUSES } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    client_id?: string;
    trip_name: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

export function BookingFormDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const { user } = useAuth();
  const [tripName, setTripName] = useState("");
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("lead");
  const [notes, setNotes] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open && user) {
      supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name")
        .then(({ data }) => setClients(data ?? []));
    }
  }, [open, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      trip_name: tripName,
      client_id: clientId || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status,
      notes: notes || undefined,
    });
    setTripName("");
    setClientId("");
    setStartDate("");
    setEndDate("");
    setStatus("lead");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Venda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da Viagem *</Label>
            <Input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="Ex: Europa 2026" required />
          </div>
          <div>
            <Label>Cliente</Label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(BOOKING_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={isLoading || !tripName} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Venda
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
