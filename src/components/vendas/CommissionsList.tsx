import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2 } from "lucide-react";
import { BookingService, BookingCommission, SERVICE_TYPES } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  services: BookingService[];
  commissions: BookingCommission[];
  onAdd: (v: any) => void;
  onUpdate: (v: any) => void;
  isAdding: boolean;
}

export function CommissionsList({ services, commissions, onAdd, onUpdate, isAdding }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const svc = services.find((s) => s.id === serviceId);
    onAdd({
      booking_service_id: serviceId,
      supplier_id: svc?.supplier_id || null,
      commission_amount: Number(amount),
      expected_date: expectedDate || null,
      status: "a_receber",
    });
    setShowForm(false);
    setAmount("");
    setExpectedDate("");
    setServiceId("");
  };

  const markReceived = (c: BookingCommission) => {
    onUpdate({ id: c.id, status: "recebido", received_date: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-3">
      {commissions.map((c) => (
        <Card key={c.id}>
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">R$ {Number(c.commission_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <Badge className={c.status === "recebido" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                  {c.status === "recebido" ? "Recebido" : "A Receber"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Fornecedor: {c.supplier?.name || "—"}
                {c.expected_date && ` • Previsto: ${format(new Date(c.expected_date + "T00:00:00"), "dd/MM/yyyy")}`}
                {c.received_date && ` • Recebido: ${format(new Date(c.received_date + "T00:00:00"), "dd/MM/yyyy")}`}
              </p>
            </div>
            {c.status !== "recebido" && (
              <Button variant="ghost" size="sm" onClick={() => markReceived(c)} className="gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" /> Recebido
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Adicione serviços primeiro para registrar comissões.</p>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
          <div>
            <Label>Serviço *</Label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Selecione o serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{SERVICE_TYPES[s.service_type] || s.service_type} - {s.description || s.supplier?.name || "Sem descrição"}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor Comissão *</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div><Label>Data Prevista</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isAdding}>{isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Registrar</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Adicionar Comissão
        </Button>
      )}
    </div>
  );
}
