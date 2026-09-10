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
import {
  ContractorPicker,
  type ClientOption,
  type CompanyOption,
  type ContractorType,
} from "@/components/reservas/ContractorPicker";

export interface EditarRascunhoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: TravelFile;
  /** Registros já vinculados, para manter nome visível ao abrir. */
  currentClient?: ClientOption | null;
  currentCompany?: CompanyOption | null;
  currentContact?: ClientOption | null;
  /** Rascunho manual permite corrigir o contratante; demais casos, não. */
  canEditContractor?: boolean;
  onSave: (input: {
    /** Campos de contratante só vêm quando realmente foram alterados. */
    contractorType?: "individual" | "company";
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
 * Edição dos dados básicos de uma reserva cadastrada à mão. Em rascunho também
 * permite corrigir o contratante (pessoa ou empresa) e trocar o contato
 * responsável, reutilizando o mesmo seletor do cadastro. company_id e client_id
 * seguem separados: escolher empresa limpa a pessoa e vice-versa.
 */
export function EditarRascunhoDialog({
  open,
  onOpenChange,
  file,
  currentClient,
  currentCompany,
  currentContact,
  canEditContractor = false,
  onSave,
}: EditarRascunhoDialogProps) {
  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [contractorType, setContractorType] = useState<ContractorType>("individual");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [selectedContact, setSelectedContact] = useState<ClientOption | null>(null);
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
    setContractorType((file.contractor_type || "individual") as ContractorType);
    setSelectedClient(
      currentClient ?? (file.client_id ? { id: file.client_id, name: "Pessoa vinculada" } : null),
    );
    setSelectedCompany(
      currentCompany ?? (file.company_id ? { id: file.company_id, name: "Empresa vinculada" } : null),
    );
    setSelectedContact(
      currentContact ??
        (file.contact_client_id ? { id: file.contact_client_id, name: "Contato vinculado" } : null),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file]);

  const submit = async () => {
    setFieldError(null);
    if (!tripName.trim() && !destination.trim()) {
      setFieldError("Informe o nome da viagem ou o destino.");
      return;
    }
    const nextType = canEditContractor
      ? contractorType
      : ((file.contractor_type || "individual") as ContractorType);
    const nextClientId = canEditContractor ? (selectedClient?.id ?? null) : file.client_id;
    const nextCompanyId = canEditContractor ? (selectedCompany?.id ?? null) : file.company_id;
    const nextContactId = canEditContractor ? (selectedContact?.id ?? null) : file.contact_client_id;

    if (canEditContractor && nextType === "individual" && !nextClientId) {
      setFieldError("Escolha a pessoa que está contratando.");
      return;
    }
    if (canEditContractor && nextType === "company" && !nextCompanyId) {
      setFieldError("Escolha a empresa contratante.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        contractorType: nextType,
        // Contratante e empresa nunca convivem: o lado não usado vai nulo.
        clientId: nextType === "individual" ? nextClientId : null,
        companyId: nextType === "company" ? nextCompanyId : null,
        contactClientId: nextType === "company" ? nextContactId : null,
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
            {canEditContractor
              ? "Corrija o contratante, o contato responsável, a viagem, as datas e os passageiros. Nada aqui confirma a venda."
              : "Ajuste a viagem, o destino, as datas e os passageiros. Nada aqui confirma a venda."}
          </DialogDescription>
        </DialogHeader>

        {canEditContractor && (
          <ContractorPicker
            active={open}
            idPrefix="rascunho"
            contractorType={contractorType}
            onContractorTypeChange={setContractorType}
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            selectedCompany={selectedCompany}
            onSelectCompany={setSelectedCompany}
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
          />
        )}

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
