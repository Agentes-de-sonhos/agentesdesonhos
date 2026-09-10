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
import { toast } from "sonner";
import { useAgencyCompanies, useCreateManualReservation } from "@/hooks/useTravelFiles";
import { useAuth } from "@/hooks/useAuth";
import {
  ContractorPicker,
  type ClientOption,
  type CompanyOption,
  type ContractorType,
} from "@/components/reservas/ContractorPicker";

const newManualKey = () =>
  (globalThis.crypto?.randomUUID?.() as string) ||
  `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;


export interface NovaReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recebe o processo criado (rascunho) para abrir a ficha. */
  onCreated?: (result: { fileId: string; fileNumber: string }) => void;
}

/**
 * Cadastro manual de reserva: salva como RASCUNHO com o mínimo necessário
 * (contratante e nome da viagem ou destino). Não cria oportunidade, operação,
 * orçamento, carteira nem lançamento financeiro.
 */
export function NovaReservaDialog({ open, onOpenChange, onCreated }: NovaReservaDialogProps) {
  const { user } = useAuth();
  const [contractorType, setContractorType] = useState<ContractorType>("individual");
  // A escolha guarda o registro inteiro: o nome continua visível mesmo depois
  // de digitar outra busca, e nunca é enviado um contratante invisível.
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [selectedContact, setSelectedContact] = useState<ClientOption | null>(null);
  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Chave de intenção: um clique duplo nunca gera duas reservas.
  const [manualKey, setManualKey] = useState(newManualKey);

  // Só o cadastro rápido de empresa é usado aqui; a busca fica no seletor.
  const { saveCompany } = useAgencyCompanies("", false);
  const createReservation = useCreateManualReservation();

  // Ao abrir, começa uma nova intenção de cadastro. O formulário só é limpo
  // depois de salvar com sucesso, para não perder o que já foi digitado.
  useEffect(() => {
    if (open) setManualKey(newManualKey());
  }, [open]);

  // Trocar de conta na mesma aba nunca mantém contratante de outra agência.
  useEffect(() => {
    setSelectedClient(null);
    setSelectedCompany(null);
    setSelectedContact(null);
  }, [user?.id]);

  const clientId = selectedClient?.id ?? null;
  const companyId = selectedCompany?.id ?? null;
  const contactClientId = selectedContact?.id ?? null;

  const reset = () => {
    setContractorType("individual");
    setSelectedClient(null);
    setSelectedCompany(null);
    setNewCompanyName("");
    setSelectedContact(null);
    setTripName("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    setAdults("1");
    setChildren("0");
    setFieldError(null);
  };


  const submit = async () => {
    setFieldError(null);
    if (contractorType === "individual" && !clientId) {
      setFieldError("Escolha a pessoa que está contratando.");
      return;
    }
    if (contractorType === "company" && !companyId && !newCompanyName.trim()) {
      setFieldError("Escolha uma empresa da lista ou informe o nome de uma nova.");
      return;
    }
    if (!tripName.trim() && !destination.trim()) {
      setFieldError("Informe o nome da viagem ou o destino.");
      return;
    }

    try {
      let finalCompanyId = companyId;
      if (contractorType === "company" && !finalCompanyId) {
        finalCompanyId = await saveCompany.mutateAsync({
          name: newCompanyName.trim(),
          contactClientId: contactClientId || null,
        });
        setSelectedCompany({ id: finalCompanyId, name: newCompanyName.trim() });
      }

      const result = await createReservation.mutateAsync({
        manualKey,
        contractorType,
        clientId: contractorType === "individual" ? clientId : null,
        companyId: contractorType === "company" ? finalCompanyId : null,
        contactClientId: contractorType === "company" ? contactClientId : null,
        tripName: tripName.trim() || null,
        primaryDestination: destination.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        adultsCount: Math.max(0, parseInt(adults, 10) || 0),
        childrenCount: Math.max(0, parseInt(children, 10) || 0),
      });

      toast.success(
        result.duplicate
          ? `Reserva já cadastrada (nº ${result.fileNumber}).`
          : `Rascunho salvo com o nº ${result.fileNumber}.`,
      );
      reset();
      onOpenChange(false);
      onCreated?.({ fileId: result.fileId, fileNumber: result.fileNumber });
    } catch (error: any) {
      // Em caso de falha o formulário é preservado e a mesma chave é reusada.
      setFieldError(error?.message || "Não foi possível salvar agora. Tente novamente.");
    }
  };

  const saving = createReservation.isPending || saveCompany.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova reserva</DialogTitle>
          <DialogDescription>
            Salve como rascunho com o essencial. Datas e detalhes podem entrar depois. Salvar não
            confirma a venda nem registra pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quem está contratando</Label>
            <div className="flex gap-2">
              {(
                [
                  { id: "individual", label: "Pessoa" },
                  { id: "company", label: "Empresa" },
                ] as { id: ContractorType; label: string }[]
              ).map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant={contractorType === option.id ? "default" : "outline"}
                  size="sm"
                  aria-pressed={contractorType === option.id}
                  onClick={() => setContractorType(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {contractorType === "individual" ? (
            <div className="space-y-2">
              <Label htmlFor="reserva-cliente">Pessoa contratante</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reserva-cliente"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar pelo nome..."
                  className="pl-9"
                />
              </div>
              {clientName && (
                <p className="text-xs text-muted-foreground">Selecionado: {clientName}</p>
              )}
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60">
                {clients.isLoading ? (
                  <p className="p-3 text-xs text-muted-foreground">Carregando...</p>
                ) : clients.error ? (
                  <SearchErrorNotice onRetry={() => clients.refetch()} />
                ) : (clients.data || []).length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">
                    Nenhuma pessoa encontrada. Cadastre em Clientes e volte aqui.
                  </p>
                ) : (
                  (clients.data || []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClient(c)}
                      className={cn(
                        "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted/60",
                        clientId === c.id && "bg-primary/10",
                      )}
                    >
                      <span className="min-w-0 [overflow-wrap:anywhere]">{c.name}</span>
                      {c.email && (
                        <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                          {c.email}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reserva-empresa">Empresa contratante</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reserva-empresa"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    placeholder="Buscar pelo nome da empresa..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60">
                  {loadingCompanies ? (
                    <p className="p-3 text-xs text-muted-foreground">Carregando...</p>
                  ) : companiesError ? (
                    <SearchErrorNotice onRetry={() => refetchCompanies()} />
                  ) : companies.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">
                      Nenhuma empresa cadastrada ainda. Informe o nome abaixo para criar.
                    </p>
                  ) : (
                    companies.map((co) => (
                      <button
                        key={co.id}
                        type="button"
                        onClick={() => {
                          setSelectedCompany({ id: co.id, name: co.name });
                          setNewCompanyName("");
                        }}
                        className={cn(
                          "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted/60",
                          companyId === co.id && "bg-primary/10",
                        )}
                      >
                        <span className="min-w-0 [overflow-wrap:anywhere]">{co.name}</span>
                        {co.trade_name && (
                          <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                            {co.trade_name}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                {selectedCompany && (
                  <p className="text-xs text-muted-foreground">
                    Selecionada: {selectedCompany.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reserva-nova-empresa">Ou cadastre uma nova empresa</Label>
                <Input
                  id="reserva-nova-empresa"
                  value={newCompanyName}
                  onChange={(e) => {
                    setNewCompanyName(e.target.value);
                    if (e.target.value.trim()) setSelectedCompany(null);
                  }}
                  placeholder="Nome da empresa"
                />
                <p className="text-xs text-muted-foreground">
                  A empresa pode existir sozinha. O contato responsável é opcional.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reserva-contato">Contato responsável (opcional)</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reserva-contato"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Buscar pessoa já cadastrada..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-border/60">
                  {contacts.error ? (
                    <SearchErrorNotice onRetry={() => contacts.refetch()} />
                  ) : (contacts.data || []).length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">Nenhuma pessoa encontrada.</p>
                  ) : (
                    (contacts.data || []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContact(contactClientId === c.id ? null : c)}
                        className={cn(
                          "flex w-full px-3 py-2 text-left text-sm hover:bg-muted/60",
                          contactClientId === c.id && "bg-primary/10",
                        )}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
                {selectedContact && (
                  <p className="text-xs text-muted-foreground">
                    Contato: {selectedContact.name}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="reserva-viagem">Nome da viagem</Label>
              <Input
                id="reserva-viagem"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="Ex.: Lua de mel"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="reserva-destino">Destino</Label>
              <Input
                id="reserva-destino"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex.: Lisboa"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="reserva-inicio">Ida (opcional)</Label>
              <Input
                id="reserva-inicio"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="reserva-fim">Volta (opcional)</Label>
              <Input
                id="reserva-fim"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="reserva-adultos">Adultos</Label>
              <Input
                id="reserva-adultos"
                inputMode="numeric"
                value={adults}
                onChange={(e) => setAdults(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="reserva-criancas">Crianças</Label>
              <Input
                id="reserva-criancas"
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
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
