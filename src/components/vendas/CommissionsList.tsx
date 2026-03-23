import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2, X, Check } from "lucide-react";
import { BookingService, BookingCommission, SERVICE_TYPES, SERVICE_ICONS } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  services: BookingService[];
  commissions: BookingCommission[];
  onAdd: (v: any) => void;
  onUpdate: (v: any) => void;
  isAdding: boolean;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

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

  const totalReceived = commissions.filter((c) => c.status === "recebido").reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPending = commissions.filter((c) => c.status !== "recebido").reduce((s, c) => s + Number(c.commission_amount), 0);

  return (
    <div className="space-y-2">
      {/* Mini summary */}
      {commissions.length > 0 && (
        <div className="flex items-center gap-4 text-sm mb-2 px-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Recebido: R$ {fmt(totalReceived)}</span>
          <span className="text-violet-600 dark:text-violet-400 font-medium">◷ A receber: R$ {fmt(totalPending)}</span>
        </div>
      )}

      {commissions.map((c) => {
        const svc = services.find((s) => s.id === c.booking_service_id);
        return (
          <Card key={c.id} className="group hover:shadow-sm transition-shadow">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{svc ? SERVICE_ICONS[svc.service_type] || "📦" : "📦"}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">R$ {fmt(Number(c.commission_amount))}</span>
                    <Badge className={`border-0 text-[10px] ${c.status === "recebido" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"}`}>
                      {c.status === "recebido" ? "Recebido" : "A Receber"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {svc && `${SERVICE_TYPES[svc.service_type] || svc.service_type} • `}
                    Fornecedor: {c.supplier?.name || "—"}
                    {c.expected_date && ` • Previsto: ${format(new Date(c.expected_date + "T00:00:00"), "dd/MM/yyyy")}`}
                    {c.received_date && ` • Recebido: ${format(new Date(c.received_date + "T00:00:00"), "dd/MM/yyyy")}`}
                  </p>
                </div>
              </div>
              {c.status !== "recebido" && (
                <Button variant="ghost" size="sm" onClick={() => markReceived(c)} className="gap-1 text-emerald-600 h-7 px-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5" /> Recebido
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Adicione serviços primeiro para registrar comissões.
          </CardContent>
        </Card>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div>
            <Label className="text-xs">Serviço *</Label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Selecione o serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{SERVICE_ICONS[s.service_type]} {SERVICE_TYPES[s.service_type] || s.service_type} - {s.description || s.supplier?.name || "Sem descrição"}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor Comissão *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Data Prevista</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
            <Button type="submit" size="sm" disabled={isAdding}>
              {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Registrar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" /> Adicionar Comissão
        </Button>
      )}
    </div>
  );
}
