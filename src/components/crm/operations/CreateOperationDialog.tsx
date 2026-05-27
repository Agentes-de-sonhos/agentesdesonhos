import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/useCRM";
import { useOperations } from "@/hooks/useOperations";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreateOperationDialog({ open, onOpenChange }: Props) {
  const { clients } = useClients();
  const { createOperation } = useOperations();
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pax, setPax] = useState(1);
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setClientId(""); setTitle(""); setDestination("");
    setStartDate(""); setEndDate(""); setPax(1); setAmount(0);
  };

  const handleSubmit = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      await createOperation({
        client_id: clientId,
        title: title || `${destination || "Viagem"}`,
        destination,
        travel_start_date: startDate || null,
        travel_end_date: endDate || null,
        passengers_count: pax,
        sale_amount: amount,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Operação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Lua de mel Maldivas" />
          </div>
          <div>
            <Label>Destino</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Embarque</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Retorno</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>Passageiros</Label>
              <Input type="number" min={1} value={pax} onChange={(e) => setPax(Number(e.target.value))} />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!clientId || saving}>
              {saving ? "Salvando..." : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}