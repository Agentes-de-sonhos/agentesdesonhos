import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAgencyCompanies } from "@/hooks/useTravelFiles";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export type ContractorType = "individual" | "company";

export interface ClientOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface CompanyOption {
  id: string;
  name: string;
  trade_name?: string | null;
}

/**
 * Busca de clientes da própria agência (RLS garante o isolamento). A chave da
 * consulta inclui a identidade do usuário: ao trocar de conta na mesma aba,
 * nada do cache anterior é reaproveitado.
 */
export function useClientSearch(search: string, enabled: boolean, identity?: string | null) {
  return useQuery({
    queryKey: ["reservas-client-search", identity ?? "anon", search.trim()],
    enabled: !!identity && enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ClientOption[]> => {
      let query = supabase.from("clients").select("id, name, email, phone").order("name").limit(20);
      const term = search.trim();
      if (term) query = query.ilike("name", `%${term}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ClientOption[];
    },
  });
}

/**
 * Falha de rede ou de permissão na busca. Nunca dizemos "nada encontrado" nesse
 * caso: quem está cadastrando não deve ser levado a duplicar um cadastro.
 */
export function SearchErrorNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-2 p-3">
      <p className="text-xs font-medium text-destructive">
        Não foi possível buscar agora. Verifique a conexão e tente novamente.
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

export interface ContractorPickerProps {
  /** Habilita as buscas somente quando o formulário está visível. */
  active: boolean;
  idPrefix: string;
  contractorType: ContractorType;
  onContractorTypeChange: (next: ContractorType) => void;
  selectedClient: ClientOption | null;
  onSelectClient: (client: ClientOption | null) => void;
  selectedCompany: CompanyOption | null;
  onSelectCompany: (company: CompanyOption | null) => void;
  selectedContact: ClientOption | null;
  onSelectContact: (contact: ClientOption | null) => void;
  /** Quando informado, mostra o campo de cadastro rápido de empresa. */
  newCompanyName?: string;
  onNewCompanyNameChange?: (value: string) => void;
}

/**
 * Seletor de contratante compartilhado pelo cadastro e pela edição de rascunho:
 * pessoa (client_id) OU empresa (company_id) com contato responsável opcional,
 * sempre uma pessoa já cadastrada na mesma agência. company_id e client_id
 * seguem separados — a empresa nunca vira pessoa.
 */
export function ContractorPicker({
  active,
  idPrefix,
  contractorType,
  onContractorTypeChange,
  selectedClient,
  onSelectClient,
  selectedCompany,
  onSelectCompany,
  selectedContact,
  onSelectContact,
  newCompanyName,
  onNewCompanyNameChange,
}: ContractorPickerProps) {
  const { user } = useAuth();
  const [clientSearch, setClientSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  const clients = useClientSearch(
    clientSearch,
    active && contractorType === "individual",
    user?.id,
  );
  const contacts = useClientSearch(contactSearch, active && contractorType === "company", user?.id);
  const {
    companies,
    isFetching: loadingCompanies,
    error: companiesError,
    refetch: refetchCompanies,
  } = useAgencyCompanies(companySearch, active && contractorType === "company");

  const clientId = selectedClient?.id ?? null;
  const companyId = selectedCompany?.id ?? null;
  const contactClientId = selectedContact?.id ?? null;
  const allowCreateCompany = typeof onNewCompanyNameChange === "function";

  return (
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
              onClick={() => onContractorTypeChange(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {contractorType === "individual" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-cliente`}>Pessoa contratante</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${idPrefix}-cliente`}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Buscar pelo nome..."
              className="pl-9"
            />
          </div>
          {selectedClient?.name && (
            <p className="text-xs text-muted-foreground">Selecionado: {selectedClient.name}</p>
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
                  onClick={() => onSelectClient(c)}
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
            <Label htmlFor={`${idPrefix}-empresa`}>Empresa contratante</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`${idPrefix}-empresa`}
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
                  {allowCreateCompany
                    ? "Nenhuma empresa cadastrada ainda. Informe o nome abaixo para criar."
                    : "Nenhuma empresa encontrada. Cadastre em Clientes › Empresas."}
                </p>
              ) : (
                companies.map((co) => (
                  <button
                    key={co.id}
                    type="button"
                    onClick={() => {
                      onSelectCompany({ id: co.id, name: co.name, trade_name: co.trade_name });
                      onNewCompanyNameChange?.("");
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
              <p className="text-xs text-muted-foreground">Selecionada: {selectedCompany.name}</p>
            )}
          </div>
          {allowCreateCompany && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-nova-empresa`}>Ou cadastre uma nova empresa</Label>
              <Input
                id={`${idPrefix}-nova-empresa`}
                value={newCompanyName ?? ""}
                onChange={(e) => {
                  onNewCompanyNameChange?.(e.target.value);
                  if (e.target.value.trim()) onSelectCompany(null);
                }}
                placeholder="Nome da empresa"
              />
              <p className="text-xs text-muted-foreground">
                A empresa pode existir sozinha. O contato responsável é opcional.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-contato`}>Contato responsável (opcional)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`${idPrefix}-contato`}
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
                    onClick={() => onSelectContact(contactClientId === c.id ? null : c)}
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
              <p className="text-xs text-muted-foreground">Contato: {selectedContact.name}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
