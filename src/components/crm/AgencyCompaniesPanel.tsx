import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Loader2, Pencil, Plus, Search } from "lucide-react";
import { useAgencyCompanies } from "@/hooks/useTravelFiles";
import { useDebouncedValue } from "@/hooks/useClientsPaged";
import { usePermissions } from "@/hooks/usePermissions";
import type { AgencyCompany } from "@/types/travelFile";
import { toast } from "sonner";

/**
 * Empresas contratantes da agência dentro da área de Clientes.
 * Reutiliza a tabela companies existente pelas RPCs seguras; uma empresa pode
 * existir sozinha e o contato responsável é sempre uma pessoa já cadastrada.
 */
export function AgencyCompaniesPanel({
  createRequested = false,
  onCreateHandled,
}: {
  /** Pedido de abertura do cadastro vindo da ação principal da área. */
  createRequested?: boolean;
  /** Confirma o consumo do pedido: ele nunca reabre sozinho depois. */
  onCreateHandled?: () => void;
}) {
  const { can } = usePermissions();
  const canCreate = can("clients.create");
  const canEdit = can("clients.edit");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const {
    companies,
    isLoading,
    isFetching,
    error: listError,
    refetch,
    saveCompany,
  } = useAgencyCompanies(debounced);



  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyCompany | null>(null);
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    setFieldError(null);
    setName(editing?.name || "");
    setTradeName(editing?.trade_name || "");
    setCnpj(editing?.cnpj || "");
    setEmail(editing?.email || "");
    setPhone(editing?.phone || "");
  }, [dialogOpen, editing]);

  const openDialog = (company?: AgencyCompany) => {
    setEditing(company ?? null);
    setDialogOpen(true);
  };

  // A ação principal da área de Clientes abre este mesmo cadastro quando a
  // visão selecionada é Empresas — sem duplicar formulário.
  useEffect(() => {
    if (createSignal > 0 && canCreate) {
      setEditing(null);
      setDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSignal]);


  const submit = async () => {
    setFieldError(null);
    if (!name.trim()) {
      setFieldError("Informe o nome da empresa.");
      return;
    }
    setSaving(true);
    try {
      await saveCompany.mutateAsync({
        companyId: editing?.id || null,
        name: name.trim(),
        tradeName: tradeName.trim() || null,
        cnpj: cnpj.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      toast.success(editing ? "Empresa atualizada." : "Empresa cadastrada.");
      setDialogOpen(false);
    } catch (error: any) {
      setFieldError(error?.message || "Não foi possível salvar agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar empresas"
            placeholder="Buscar empresa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {canCreate && (
          <Button size="sm" className="h-9 gap-2" onClick={() => openDialog()}>
            <Plus className="h-4 w-4" />
            Nova empresa
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="rounded-2xl border-border/60 p-10">
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </Card>
      ) : companies.length === 0 ? (
        <Card className="rounded-2xl border-border/60 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {debounced ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada ainda"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {debounced
              ? "Ajuste a busca para ver outras empresas."
              : "Cadastre empresas para usar como contratantes nas reservas."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border/60">
          <div className="divide-y divide-border/50">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {company.trade_name && <span className="truncate">{company.trade_name}</span>}
                    {company.cnpj && <span>CNPJ {company.cnpj}</span>}
                    {company.email && <span className="truncate">{company.email}</span>}
                    {company.phone && <span>{company.phone}</span>}
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => openDialog(company)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
              </div>
            ))}
          </div>
          {isFetching && (
            <p className="px-4 py-2 text-xs text-muted-foreground">Atualizando…</p>
          )}
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(next) => (saving ? null : setDialogOpen(next))}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>
              Só o nome é obrigatório. Os demais dados podem ser preenchidos depois.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2 sm:col-span-2">
              <Label htmlFor="empresa-nome">Nome da empresa</Label>
              <Input id="empresa-nome" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="empresa-fantasia">Nome fantasia (opcional)</Label>
              <Input
                id="empresa-fantasia"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="empresa-cnpj">CNPJ (opcional)</Label>
              <Input id="empresa-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="empresa-email">E-mail (opcional)</Label>
              <Input id="empresa-email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="empresa-telefone">Telefone (opcional)</Label>
              <Input id="empresa-telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          {fieldError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {fieldError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
