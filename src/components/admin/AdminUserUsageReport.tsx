import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLAN_LABELS, type SubscriptionPlan } from "@/types/subscription";

type PresetKey = "today" | "week" | "month" | "30d" | "90d" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "custom", label: "Personalizado" },
];

function getRange(preset: PresetKey, customStart?: string, customEnd?: string): { start: Date; end: Date } | null {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { start, end };
    case "week": {
      const day = start.getDay(); // 0=sun
      start.setDate(start.getDate() - day);
      return { start, end };
    }
    case "month": {
      start.setDate(1);
      return { start, end };
    }
    case "30d": {
      start.setDate(start.getDate() - 29);
      return { start, end };
    }
    case "90d": {
      start.setDate(start.getDate() - 89);
      return { start, end };
    }
    case "custom": {
      if (!customStart || !customEnd) return null;
      const [sy, sm, sd] = customStart.split("-").map(Number);
      const [ey, em, ed] = customEnd.split("-").map(Number);
      if (!sy || !ey) return null;
      const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      const e = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      return { start: s, end: e };
    }
  }
}

function engagement(total: number): string {
  if (total === 0) return "Sem uso";
  if (total < 5) return "Baixo";
  if (total < 20) return "Médio";
  return "Alto";
}

function topModules(row: any): string {
  const map: Record<string, number> = {
    Orçamentos: row.quotes_count,
    Carteiras: row.wallets_count,
    Roteiros: row.itineraries_count,
    Cartões: row.business_cards_count,
    Vitrines: row.showcases_count,
    "Captação de Leads": row.lead_forms_count,
    "Páginas de Vendas": row.sales_landings_count,
    CRM:
      (row.clients_count || 0) +
      (row.opportunities_count || 0) +
      (row.operations_count || 0),
    Financeiro:
      (row.sales_count || 0) +
      (row.income_entries_count || 0) +
      (row.expense_entries_count || 0) +
      (row.invoices_count || 0) +
      (row.customer_payments_count || 0),
  };
  return Object.entries(map)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");
}

export function AdminUserUsageReport() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<PresetKey>("month");
  const [customStart, setCustomStart] = useState<string>(format(new Date(), "yyyy-MM-01"));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const range = getRange(preset, customStart, customEnd);
    if (!range) {
      toast({ title: "Selecione as datas do período personalizado", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_user_usage_report" as any, {
        _start: range.start.toISOString(),
        _end: range.end.toISOString(),
      });

      if (error) throw error;
      const rows = (data || []) as any[];

      if (rows.length === 0) {
        toast({ title: "Nenhum usuário encontrado" });
        return;
      }

      const sheetRows = rows.map((r) => ({
        Nome: r.name || "",
        "E-mail": r.email || "",
        Telefone: r.phone || "",
        Agência: r.agency_name || "",
        Permissão: r.role || "",
        Plano: PLAN_LABELS[r.plan as SubscriptionPlan] || r.plan || "",
        Status: r.is_active ? "Ativo" : "Inativo",
        "Cadastrado em": r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd HH:mm") : "",
        "Último acesso": r.last_active_at ? format(new Date(r.last_active_at), "yyyy-MM-dd HH:mm") : "",
        Orçamentos: Number(r.quotes_count) || 0,
        "Carteiras Digitais": Number(r.wallets_count) || 0,
        Roteiros: Number(r.itineraries_count) || 0,
        "Cartões de Visita": Number(r.business_cards_count) || 0,
        "Vitrines de Ofertas": Number(r.showcases_count) || 0,
        "Formulários de Leads": Number(r.lead_forms_count) || 0,
        "Páginas de Vendas": Number(r.sales_landings_count) || 0,
        "CRM - Clientes": Number(r.clients_count) || 0,
        "CRM - Oportunidades": Number(r.opportunities_count) || 0,
        "CRM - Operações": Number(r.operations_count) || 0,
        "Financeiro - Vendas": Number(r.sales_count) || 0,
        "Financeiro - Entradas": Number(r.income_entries_count) || 0,
        "Financeiro - Despesas": Number(r.expense_entries_count) || 0,
        "Financeiro - Faturas": Number(r.invoices_count) || 0,
        "Financeiro - Pagamentos": Number(r.customer_payments_count) || 0,
        Vendedores: Number(r.sellers_count) || 0,
        "Membros da Equipe": Number(r.team_members_count) || 0,
        "Total de Ações": Number(r.total_actions) || 0,
        "Principais Módulos": topModules(r),
        Engajamento: engagement(Number(r.total_actions) || 0),
      }));

      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Uso da Plataforma");

      const periodLabel =
        preset === "custom"
          ? `${customStart}_a_${customEnd}`
          : preset;

      XLSX.writeFile(wb, `relatorio-uso-${periodLabel}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({ title: `Relatório gerado (${rows.length} usuários)` });
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao gerar relatório",
        description: e?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Relatório de Uso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Relatório de Uso da Plataforma</DialogTitle>
          <DialogDescription>
            Escolha o período. A planilha será gerada sob demanda e baixada em XLSX.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                type="button"
                variant={preset === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="usage-start">Data inicial</Label>
                <Input
                  id="usage-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="usage-end">Data final</Label>
                <Input
                  id="usage-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            As contagens consideram a data de criação dos registros em cada módulo
            dentro do período selecionado.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={generate} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Gerar e baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}