import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface TripFormData {
  destination: string;
  start_date: string | null;
  end_date: string | null;
  trip_type: string;
  trip_status: string;
  sale_amount: number;
  commission: number;
  payment_method: string;
  include_in_billing: boolean;
  sale_date: string;
  notes: string;
}

interface AddTripDialogProps {
  onSubmit: (data: TripFormData) => Promise<void>;
  isSubmitting?: boolean;
  initialData?: Partial<TripFormData>;
  trigger?: React.ReactNode;
}

export function AddTripDialog({ onSubmit, isSubmitting, initialData, trigger }: AddTripDialogProps) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState(initialData?.destination || "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.start_date ? new Date(initialData.start_date + "T12:00:00") : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData?.end_date ? new Date(initialData.end_date + "T12:00:00") : undefined
  );
  const [tripType, setTripType] = useState(initialData?.trip_type || "past");
  const [tripStatus, setTripStatus] = useState(initialData?.trip_status || "confirmed");
  const [saleAmount, setSaleAmount] = useState(initialData?.sale_amount?.toString() || "");
  const [commission, setCommission] = useState(initialData?.commission?.toString() || "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || "");
  const [includeInBilling, setIncludeInBilling] = useState(initialData?.include_in_billing ?? true);
  const [saleDate, setSaleDate] = useState<Date | undefined>(
    initialData?.sale_date ? new Date(initialData.sale_date + "T12:00:00") : new Date()
  );
  const [notes, setNotes] = useState(initialData?.notes || "");

  const resetForm = () => {
    setDestination("");
    setStartDate(undefined);
    setEndDate(undefined);
    setTripType("past");
    setTripStatus("confirmed");
    setSaleAmount("");
    setCommission("");
    setPaymentMethod("");
    setIncludeInBilling(true);
    setSaleDate(new Date());
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!destination.trim()) return;
    await onSubmit({
      destination: destination.trim(),
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      trip_type: tripType,
      trip_status: tripStatus,
      sale_amount: parseFloat(saleAmount) || 0,
      commission: parseFloat(commission) || 0,
      payment_method: paymentMethod,
      include_in_billing: includeInBilling,
      sale_date: saleDate ? format(saleDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      notes,
    });
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar viagem
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Viagem" : "Adicionar Viagem"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Destination */}
          <div className="space-y-1.5">
            <Label>Destino *</Label>
            <PlacesAutocomplete
              value={destination}
              onChange={setDestination}
              onPlaceSelect={(pred) => setDestination(pred.name)}
              placeType="city"
              placeholder="Ex: Paris, França"
              fetchDetailsOnSelect={false}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <DatePicker date={startDate} onSelect={setStartDate} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de fim</Label>
              <DatePicker date={endDate} onSelect={setEndDate} />
            </div>
          </div>

          {/* Trip type & status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tripType} onValueChange={setTripType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="past">Já realizada</SelectItem>
                  <SelectItem value="future">Futura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={tripStatus} onValueChange={setTripStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Orçamento</SelectItem>
                  <SelectItem value="confirmed">Confirmada / Vendida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor total (R$)</Label>
              <Input type="number" min="0" step="0.01" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Comissão (R$)</Label>
              <Input type="number" min="0" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Data da venda</Label>
              <DatePicker date={saleDate} onSelect={setSaleDate} />
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Incluir no faturamento</p>
              <p className="text-xs text-muted-foreground">Impacta metas e relatórios financeiros</p>
            </div>
            <Switch checked={includeInBilling} onCheckedChange={setIncludeInBilling} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
          </div>

          <Button onClick={handleSubmit} disabled={!destination.trim() || isSubmitting} className="w-full">
            {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Adicionar viagem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DatePicker({ date, onSelect }: { date?: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} locale={ptBR} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
