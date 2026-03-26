import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CompanyInfoEditFormProps {
  data: {
    category: string;
    founded_year: number | null;
    annual_revenue: string | null;
    employees: number | null;
    executive_team: string | null;
  };
  onChange: (data: CompanyInfoEditFormProps["data"]) => void;
}

export function CompanyInfoEditForm({ data, onChange }: CompanyInfoEditFormProps) {
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });

  return (
    <div className="p-4 space-y-3">
      <label className="text-xs font-medium text-muted-foreground">Informações da Empresa</label>
      <div>
        <label className="text-xs text-muted-foreground">Categoria</label>
        <Input value={data.category || ""} onChange={(e) => update("category", e.target.value)} className="mt-1 rounded-xl" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Ano de Fundação</label>
        <Input type="number" value={data.founded_year || ""} onChange={(e) => update("founded_year", e.target.value ? Number(e.target.value) : null)} className="mt-1 rounded-xl" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Faturamento Anual</label>
        <Input value={data.annual_revenue || ""} onChange={(e) => update("annual_revenue", e.target.value || null)} className="mt-1 rounded-xl" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Funcionários</label>
        <Input type="number" value={data.employees || ""} onChange={(e) => update("employees", e.target.value ? Number(e.target.value) : null)} className="mt-1 rounded-xl" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Equipe Executiva</label>
        <Textarea value={data.executive_team || ""} onChange={(e) => update("executive_team", e.target.value || null)} className="mt-1 rounded-xl" />
      </div>
    </div>
  );
}
