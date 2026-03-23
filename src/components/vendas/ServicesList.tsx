import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { BookingService, SERVICE_TYPES } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  bookingId: string;
  services: BookingService[];
  onAdd: (values: any) => void;
  onDelete: (id: string) => void;
  isAdding: boolean;
}

export function ServicesList({ bookingId, services, onAdd, onDelete, isAdding }: Props) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [serviceType, setServiceType] = useState("hotel");
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [expectedCommission, setExpectedCommission] = useState("");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (showForm && user) {
      supabase.from("clients").select("id, name").eq("user_id", user.id).order("name").then(({ data }) => setSuppliers(data ?? []));
    }
  }, [showForm, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      booking_id: bookingId,
      service_type: serviceType,
      supplier_id: supplierId || null,
      description: description || null,
      sale_price: Number(salePrice) || 0,
      cost_price: Number(costPrice) || 0,
      expected_commission: Number(expectedCommission) || 0,
      status: "pendente",
    });
    setShowForm(false);
    setDescription("");
    setSalePrice("");
    setCostPrice("");
    setExpectedCommission("");
    setSupplierId("");
  };

  return (
    <div className="space-y-3">
      {services.map((s) => (
        <Card key={s.id}>
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{SERVICE_TYPES[s.service_type] || s.service_type}</Badge>
                <span className="text-sm">{s.description || "Sem descrição"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fornecedor: {s.supplier?.name || "—"} • Venda: R$ {Number(s.sale_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Custo: R$ {Number(s.cost_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo *</Label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {suppliers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Valor Venda</Label><Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required /></div>
            <div><Label>Custo</Label><Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} /></div>
            <div><Label>Comissão Esperada</Label><Input type="number" step="0.01" value={expectedCommission} onChange={(e) => setExpectedCommission(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isAdding}>{isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Adicionar</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Adicionar Serviço
        </Button>
      )}
    </div>
  );
}
