import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Pencil, Copy, X, Check } from "lucide-react";
import { BookingService, SERVICE_TYPES, SERVICE_ICONS, useClients } from "@/hooks/useBookings";
import { format } from "date-fns";

interface Props {
  bookingId: string;
  services: BookingService[];
  onAdd: (values: any) => void;
  onUpdate: (values: any) => void;
  onDelete: (id: string) => void;
  onDuplicate: (svc: BookingService) => void;
  isAdding: boolean;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const statusLabels: Record<string, string> = { pendente: "Pendente", confirmado: "Confirmado", cancelado: "Cancelado" };
const statusColors: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function calcCommission(salePrice: number, taxes: number, commType: string, commValue: number) {
  const base = salePrice - taxes;
  if (commType === "percentage") return base * (commValue / 100);
  return commValue;
}

function calcDU(salePrice: number, duType: string, duValue: number) {
  if (duType === "percentage") return salePrice * (duValue / 100);
  return duValue;
}

function ServiceForm({ bookingId, onSubmit, onCancel, isLoading, initial }: {
  bookingId: string;
  onSubmit: (v: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  initial?: BookingService;
}) {
  const { data: clients = [] } = useClients();
  const [serviceType, setServiceType] = useState(initial?.service_type || "hotel");
  const [supplierId, setSupplierId] = useState(initial?.supplier_id || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [salePrice, setSalePrice] = useState(initial ? String(initial.sale_price) : "");
  const [costPrice, setCostPrice] = useState(initial ? String(initial.cost_price) : "");
  const [taxes, setTaxes] = useState(initial ? String(initial.non_commissionable_taxes) : "0");
  const [commType, setCommType] = useState(initial?.commission_type || "percentage");
  const [commValue, setCommValue] = useState(initial ? String(initial.commission_value) : "");
  const [duType, setDuType] = useState(initial?.du_type || "fixed");
  const [duValue, setDuValue] = useState(initial ? String(initial.du_value) : "0");
  const [commissionDate, setCommissionDate] = useState(initial?.expected_commission_date || "");
  const [status, setStatus] = useState(initial?.status || "pendente");

  const isAereo = serviceType === "aereo";

  const computed = useMemo(() => {
    const sp = Number(salePrice) || 0;
    const tx = Number(taxes) || 0;
    const base = sp - tx;
    const commission = calcCommission(sp, tx, commType, Number(commValue) || 0);
    const du = isAereo ? calcDU(sp, duType, Number(duValue) || 0) : 0;
    const profit = commission + du;
    return { base, commission, du, profit };
  }, [salePrice, taxes, commType, commValue, duType, duValue, isAereo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...(initial ? { id: initial.id } : { booking_id: bookingId }),
      service_type: serviceType,
      supplier_id: supplierId || null,
      description: description || null,
      sale_price: Number(salePrice) || 0,
      cost_price: Number(costPrice) || 0,
      non_commissionable_taxes: Number(taxes) || 0,
      commission_type: commType,
      commission_value: Number(commValue) || 0,
      du_value: isAereo ? (Number(duValue) || 0) : 0,
      du_type: duType,
      expected_commission: computed.commission,
      expected_commission_date: commissionDate || null,
      status,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Tipo *</Label>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {Object.entries(SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{SERVICE_ICONS[k]} {v}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Fornecedor</Label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Selecione</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="Ex: Hotel Marriott Paris - 5 noites" />
      </div>

      {/* Valores */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Valor Venda *</Label>
          <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="mt-1" required />
        </div>
        <div>
          <Label className="text-xs">Custo</Label>
          <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Taxas não comissionáveis</Label>
          <Input type="number" step="0.01" value={taxes} onChange={(e) => setTaxes(e.target.value)} className="mt-1" placeholder="0" />
        </div>
      </div>

      {/* Comissão */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Tipo Comissão</Label>
          <select value={commType} onChange={(e) => setCommType(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="percentage">Percentual (%)</option>
            <option value="fixed">Valor Fixo (R$)</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">{commType === "percentage" ? "% Comissão" : "Valor Comissão (R$)"}</Label>
          <Input type="number" step="0.01" value={commValue} onChange={(e) => setCommValue(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Data Comissão</Label>
          <Input type="date" value={commissionDate} onChange={(e) => setCommissionDate(e.target.value)} className="mt-1" />
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs text-muted-foreground">Base: R$ {fmt(computed.base)}</p>
          <p className="text-xs font-medium text-foreground">Comissão: R$ {fmt(computed.commission)}</p>
        </div>
      </div>

      {/* DU - Aéreo only */}
      {isAereo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-md border border-dashed border-primary/30 bg-primary/5">
          <div className="col-span-full">
            <Label className="text-xs font-semibold">DU (Taxa de serviço do agente) — Aéreo</Label>
          </div>
          <div>
            <Label className="text-xs">Tipo DU</Label>
            <select value={duType} onChange={(e) => setDuType(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="fixed">Valor Fixo (R$)</option>
              <option value="percentage">Percentual (%)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">{duType === "percentage" ? "% DU" : "Valor DU (R$)"}</Label>
            <Input type="number" step="0.01" value={duValue} onChange={(e) => setDuValue(e.target.value)} className="mt-1" />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-xs font-medium text-foreground">DU: R$ {fmt(computed.du)}</p>
          </div>
        </div>
      )}

      {/* Lucro resumo */}
      <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
        <span className="text-sm font-medium">Lucro do Agente</span>
        <span className="text-sm font-bold text-foreground">
          R$ {fmt(computed.profit)}
          {isAereo && computed.du > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-1">(Comissão R$ {fmt(computed.commission)} + DU R$ {fmt(computed.du)})</span>
          )}
        </span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          {initial ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

export function ServicesList({ bookingId, services, onAdd, onUpdate, onDelete, onDuplicate, isAdding }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {services.map((s) => {
        if (editingId === s.id) {
          return (
            <ServiceForm
              key={s.id}
              bookingId={bookingId}
              initial={s}
              onSubmit={(v) => { onUpdate(v); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
              isLoading={false}
            />
          );
        }
        const taxes = Number(s.non_commissionable_taxes) || 0;
        const commission = calcCommission(Number(s.sale_price), taxes, s.commission_type, Number(s.commission_value));
        const du = s.service_type === "aereo" ? calcDU(Number(s.sale_price), s.du_type, Number(s.du_value)) : 0;
        const profit = commission + du;

        return (
          <Card key={s.id} className="group hover:shadow-sm transition-shadow">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="text-2xl mt-0.5">{SERVICE_ICONS[s.service_type] || "📦"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{SERVICE_TYPES[s.service_type] || s.service_type}</span>
                      <Badge className={`${statusColors[s.status] || ""} border-0 text-[10px]`}>
                        {statusLabels[s.status] || s.status}
                      </Badge>
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{s.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Fornecedor: {s.supplier?.name || "—"}
                      {s.expected_commission_date && ` • Comissão: ${format(new Date(s.expected_commission_date + "T00:00:00"), "dd/MM/yyyy")}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-foreground">R$ {fmt(Number(s.sale_price))}</p>
                  {taxes > 0 && <p className="text-xs text-muted-foreground">Taxas: R$ {fmt(taxes)}</p>}
                  <p className="text-xs text-muted-foreground">Custo: R$ {fmt(Number(s.cost_price))}</p>
                  <p className={`text-xs font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    Lucro: R$ {fmt(profit)}
                    {s.service_type === "aereo" && du > 0 && <span className="text-muted-foreground font-normal"> (Com+DU)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setEditingId(s.id)}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => onDuplicate(s)}>
                  <Copy className="h-3 w-3" /> Duplicar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive" onClick={() => onDelete(s.id)}>
                  <Trash2 className="h-3 w-3" /> Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {showForm ? (
        <ServiceForm
          bookingId={bookingId}
          onSubmit={(v) => { onAdd(v); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
          isLoading={isAdding}
        />
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" /> Adicionar Serviço
        </Button>
      )}
    </div>
  );
}
