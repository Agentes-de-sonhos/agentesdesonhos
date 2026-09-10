import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { TravelFile } from "@/types/travelFile";

export interface EditarRascunhoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: TravelFile;
  onSave: (input: {
    contractorType: "individual" | "company";
    clientId?: string | null;
    companyId?: string | null;
    contactClientId?: string | null;
    tripName?: string | null;
    primaryDestination?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    adultsCount?: number;
    childrenCount?: number;
  }) => Promise<void>;
}

/**
 * Edição dos dados básicos de uma reserva cadastrada à mão. Só altera viagem,
 * destino, datas e passageiros — o contratante permanece o que foi escolhido no
 * cadastro e é reenviado sem alteração.
 */
export function EditarRascunhoDialog({ open, onOpenChange, file, onSave }: EditarRascunhoDialogProps) {
  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFieldError(null);
    setTripName(file.trip_name || "");
    setDestination(file.primary_destination || "");
    setStartDate(file.start_date || "");
    setEndDate(file.end_date || "");
    setAdults(String(file.adults_count ?? 1));
    setChildren(String(file.children_count ?? 0));
  }, [open, file]);

  const submit = async () => {
    setFieldError(null);
    if (!tripName.trim() && !destination.trim()) {
      setFieldError("Informe o nome da viagem ou o destino.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        contractorType: (file.contractor_type || "individual") as "individual" | "company",
        clientId: file.client_id,
        companyId: file.company_id,
        contactClientId: file.contact_client_id,
        tripName: tripName.trim() || null,
        primaryDestination: destination.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        adultsCount: Math.max(0, parseInt(adults, 10) || 0),
        childrenCount: Math.max(0, parseInt(children, 10) || 0),
      });
      onOpenChange(false);
    } catch (error: any) {
      setFieldError(error?.message || "Não foi possível salvar agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar dados da reserva</DialogTitle>
          <DialogDescription>
            Ajuste a viagem, o destino, as datas e os passageiros. Nada aqui confirma a venda.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rascunho-viagem">Nome da viagem</Label>
            <Input
              id="rascunho-viagem"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rascunho-destino">Destino</Label>
            <Input
              id="rascunho-destino"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rascunho-inicio">Ida (opcional)</Label>
            <Input
              id="rascunho-inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rascunho-fim">Volta (opcional)</Label>
            <Input
              id="rascunho-fim"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rascunho-adultos">Adultos</Label>
            <Input
              id="rascunho-adultos"
              inputMode="numeric"
              value={adults}
              onChange={(e) => setAdults(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rascunho-criancas">Crianças</Label>
            <Input
              id="rascunho-criancas"
              inputMode="numeric"
              value={children}
              onChange={(e) => setChildren(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>

        {fieldError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {fieldError}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
