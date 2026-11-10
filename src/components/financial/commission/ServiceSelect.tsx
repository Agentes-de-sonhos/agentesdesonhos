import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateServiceType, useServiceCatalog } from "@/hooks/useSupplierServiceCatalog";
import { BASE_CATEGORY_LABELS, findDuplicateService, type ServiceOption } from "@/lib/supplierCommissionRules";
import type { ProductType } from "@/types/financial";

interface Props {
  value: string | null | undefined;
  onChange: (option: ServiceOption) => void;
  /** Chaves que não podem ser escolhidas (ex.: já usadas em outra linha da tabela). */
  disabledKeys?: string[];
  placeholder?: string;
}

/** Seleção de serviço do catálogo da agência, com criação inline sem fechar o formulário. */
export function ServiceSelect({ value, onChange, disabledKeys = [], placeholder = "Selecione o serviço" }: Props) {
  const { catalog } = useServiceCatalog();
  const create = useCreateServiceType();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [base, setBase] = useState<ProductType>("hotel");
  const dup = name.trim() ? findDuplicateService(name, catalog) : null;
  const system = catalog.filter((s) => !s.custom);
  const custom = catalog.filter((s) => s.custom);

  const handleCreate = async () => {
    const opt = await create.mutateAsync({ name, baseCategory: base, catalog });
    onChange(opt);
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Select
        value={value || undefined}
        onValueChange={(k) => { const o = catalog.find((s) => s.key === k); if (o) onChange(o); }}
      >
        <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Categorias</SelectLabel>
            {system.map((s) => (
              <SelectItem key={s.key} value={s.key} disabled={disabledKeys.includes(s.key) && s.key !== value}>{s.label}</SelectItem>
            ))}
          </SelectGroup>
          {custom.length > 0 && (
            <SelectGroup>
              <SelectLabel>Serviços da agência</SelectLabel>
              {custom.map((s) => (
                <SelectItem key={s.key} value={s.key} disabled={disabledKeys.includes(s.key) && s.key !== value}>
                  {s.label} <span className="text-muted-foreground">· {BASE_CATEGORY_LABELS[s.baseCategory]}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Criar novo serviço" title="Criar novo serviço">
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
          <p className="text-sm font-semibold">Novo serviço da agência</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Hospedagem internacional" maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria principal (relatórios)</Label>
            <Select value={base} onValueChange={(v) => setBase(v as ProductType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BASE_CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {dup && <p className="text-xs text-muted-foreground">Já existe "{dup.label}". Ele será selecionado em vez de criar outro.</p>}
          <Button type="button" size="sm" className="w-full" disabled={name.trim().length < 2 || create.isPending} onClick={handleCreate}>
            {dup ? "Usar existente" : create.isPending ? "Criando..." : "Criar serviço"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
